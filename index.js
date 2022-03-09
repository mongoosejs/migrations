'use strict';

const migrationSchema = require('./src/schemas/migrationSchema');
const mongoose = require('mongoose');
const operationSchema = require('./src/schemas/operationSchema');

let Migration = null;
let Operation = null;
let migration = null;

const mongooseObjToOp = new WeakMap();

exports._initMigrationFramework = function _initMigrationFramework(conn) {
  conn = conn || mongoose.connection;

  if (conn.models._Migration) {
    return;
  }

  Migration = Migration || conn.model('_Migration', migrationSchema, '_migrations');
  Operation = Operation || conn.model('_Operation', operationSchema, '_operations');

  mongoose.plugin(function(schema) {
    schema.pre(['updateOne', 'updateMany', 'replaceOne'], async function() {
      const op = await Operation.create({
        migrationId: migration._id,
        modelName: this.model.modelName,
        opName: this.op,
        parameters: {
          filter: this.getFilter(),
          update: this.getUpdate()
        }
      });
      migration.lastOperationId = op._id;
      await migration.save();

      mongooseObjToOp.set(this, op);
    });

    schema.post(['updateOne', 'updateMany', 'replaceOne'], async function(res) {
      const op = mongooseObjToOp.get(this);

      if (op == null) {
        return;
      }
      op.endedAt = new Date();
      op.status = 'complete';
      op.result = res;

      await op.save();
    });
  });
};

exports.startMigration = async function startMigration() {
  migration = await Migration.create({
    startedAt: new Date()
  });

  return migration;
};

exports.restartMigration = async function restartMigration(_migration) {
  const ops = await Operation.find({ migrationId: _migration._id });

  const newMigration = await Migration.create({
    status: 'in_progress',
    startedAt: new Date(),
    restartedFromId: _migration._id,
    originalMigrationId: _migration.originalMigrationId || _migration._id
  });

  const newOps = ops.map(op => new Operation({
    ...op.toObject(),
    _id: new mongoose.Types.ObjectId(),
    migrationId: newMigration._id
  }));
  await Operation.create(newOps);

  migration = newMigration;

  return migration;
};

exports.endMigration = async function endMigration(error) {
  if (migration.status === 'in_progress') {
    if (error) {
      migration.status = 'error';
      migration.error.message = error.message;
      migration.error.stack = error.stack;
    } else {
      migration.status = 'complete';
    }
    migration.endedAt = new Date();
    await migration.save();
  }

  migration = null;
};

exports.eachAsync = async function eachAsync(model, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = null;
  }

  const totalCount = await model.countDocuments();

  const opFilter = migration.lastOperationId ? { _id: { $gt: migration.lastOperationId } } : {};
  Object.assign(opFilter, {
    migrationId: migration._id,
    modelName: model.modelName,
    opName: 'eachAsync',
    userFunctionName: options?.name || fn.name,
  });
  const op = await Operation.findOneAndUpdate(
    opFilter,
    {
      $setOnInsert: {
        parameters: {
          options
        },
        state: {
          current: 0,
          totalCount
        }
      }
    },
    { new: true, upsert: true }
  );

  migration.lastOperationId = op._id;
  await migration.save();

  const cursorFilter = op.lastSeenSortKey != null ? { _id: { $gte: op.lastSeenSortKey } } : {};
  const cursor = model.find(cursorFilter).sort({ _id: 1 }).cursor();

  for await (const doc of cursor) {
    if (op.firstSeenSortKey == null) {
      op.firstSeenSortKey = doc._id;
    }
    op.lastSeenSortKey = doc._id;
    ++op.state.current;
    op.markModified('state.current');
    await op.save();

    try {
      await fn(doc);
    } catch (err) {
      op.status = 'error';
      op.error.message = err.message;
      op.error.stack = err.stack;
      op.endedAt = new Date();
      --op.state.current;
      op.markModified('state.current');
      await op.save();

      migration.status = 'error';
      migration.endedAt = new Date();
      await migration.save();

      throw err;
    }
  }

  op.status = 'complete';
  op.endedAt = new Date();
  await op.save();
}