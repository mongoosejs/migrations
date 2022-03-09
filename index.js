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
  migration = await Migration.create({});

  return migration;
};

exports.endMigration = async function endMigration(error) {
  if (error) {
    migration.status = 'error';
    migration.error.message = error.message;
    migration.error.stack = error.stack;
  } else {
    migration.status = 'complete';
  }
  migration.endedAt = new Date();
  await migration.save();

  migration = null;
};

exports.eachAsync = async function eachAsync(model, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = null;
  }

  const op = await Operation.create({
    migrationId: migration._id,
    modelName: model.modelName,
    opName: 'eachAsync',
    userFunctionName: options?.name || fn.name,
    parameters: {
      options
    }
  });

  const cursor = model.find().sort({ _id: 1 }).cursor();

  for await (const doc of cursor) {
    if (op.firstSeenSortKey == null) {
      op.firstSeenSortKey = doc._id;
    }
    op.lastSeenSortKey = doc._id;
    await op.save();

    try {
      await fn(doc);
    } catch (err) {
      op.status = 'error';
      op.error.message = err.message;
      op.error.stack = err.stack;
      op.endedAt = new Date();
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
};