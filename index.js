'use strict';

const { exec } = require('child_process');
const fs = require('fs');
const migrationSchema = require('./src/schemas/migrationSchema');
const mongoose = require('mongoose');
const operationSchema = require('./src/schemas/operationSchema');

const debug = require('debug')('migrations');

let Migration = null;
let Operation = null;
let migration = null;
let didInit = false;

exports.models = { Migration: null, Operation: null };

const writeOps = [
  // Update
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'update',
  'updateMany',
  'updateOne',
  // Delete
  'deleteMany',
  'deleteOne',
  'findOneAndDelete',
  'findOneAndRemove',
  'remove'
];

const mongooseObjToOp = new WeakMap();

exports.initMigrationModels = function initMigrationModels(conn) {
  conn = conn || mongoose;
  if (conn.models._Migration) {
    return;
  }

  Migration = Migration || conn.model('_Migration', migrationSchema, '_migrations');
  exports.models.Migration = Migration;
  Operation = Operation || conn.model('_Operation', operationSchema, '_operations');
  exports.models.Operation = Operation;
};

exports.initMigrationFramework = function initMigrationFramework(conn) {
  conn = conn || mongoose.connection;
  didInit = true;

  exports.initMigrationModels(conn);

  mongoose.plugin(function(schema) {
    schema.pre(writeOps, { query: true, document: false }, async function(next) {
      if (migration == null) {
        return;
      }

      const opFilter = migration.lastOperationId ? { _id: { $gt: migration.lastOperationId } } : {};
      Object.assign(opFilter, {
        migrationId: migration._id,
        modelName: this.model.modelName,
        opName: this.op
      });
      const res = await Operation.findOneAndUpdate(
        opFilter,
        {
          $setOnInsert: {
            parameters: {
              filter: this.getFilter(),
              update: this.getUpdate()
            }
          }
        },
        { new: true, upsert: true, rawResult: true }
      );

      const op = res.value;

      migration.lastOperationId = op._id;
      await migration.save();

      debug(`${this.model.modelName}.${this.op}`);

      mongooseObjToOp.set(this, op);

      if (res.lastErrorObject.updatedExisting) {
        next(mongoose.skipMiddlewareFunction(op.result));
      }
    });

    schema.post(writeOps, { query: true, document: false }, async function(res) {
      if (migration == null) {
        return;
      }

      const op = mongooseObjToOp.get(this);

      if (op == null) {
        return;
      }

      if (op.status !== 'complete') {
        op.endedAt = new Date();
        op.status = 'complete';
        op.result = res;
      }

      debug(`${this.model.modelName}.${this.op}: ${res.modifiedCount} updated`);

      await op.save();
    });
  });
};

exports.initMigrationFramework();

exports.startMigration = async function startMigration(options) {
  if (!didInit) {
    exports.initMigrationFramework();
  }

  options = options || {};
  const defaultName = require.main.filename ? require.main.filename.slice(require.main.filename.lastIndexOf('/') + 1) : 'Unknown';
  const name = options.name || defaultName;
  if (options.restart) {
    return exports.restartMigration({ ...options, name });
  }

  const existingMigration = await Migration.exists({ name });
  if (existingMigration) {
    throw new Error(`Migration "${name}" already ran`);
  }

  const sourceCode = await new Promise(resolve => {
    try {
      fs.readFile(require.main.filename, (err, data) => {
        if (err != null) {
          return resolve(null);
        }
        resolve(data.toString('utf8'));
      });
    } catch (err) {
      resolve(null);
    }
  });

  const githash = await new Promise(resolve => {
    try {
      exec('git log -1 --format="%H"', (err, data) => {
        if (err != null) {
          return resolve(null);
        }
        resolve(data.toString('utf8'));
      });
    } catch (err) {
      resolve(null);
    }
  });

  const author = await new Promise(resolve => {
    if (!require.main.filename) {
      return resolve(null);
    }
    try {
      exec(`git blame -p ${require.main.filename}`, (err, data) => {
        if (err != null) {
          return resolve(null);
        }
        data = data.toString('utf8');
        const lines = data.split('\n');
        const name = lines[1].trim().replace(/^author/, '');
        const email = lines[2].trim().replace(/^author-mail/, '');
        resolve({ name, email });
      });
    } catch (err) {
      resolve(null);
    }
  });

  migration = await Migration.create({
    name,
    sourceCode,
    githash,
    author,
    startedAt: new Date()
  });

  migration._options = options;

  return migration;
};

exports.restartMigration = async function restartMigration(options) {
  if (!didInit) {
    exports.initMigrationFramework();
  }

  const { name } = options;
  const _migration = await Migration.findOne({ name }).sort({ createdAt: -1 });

  const ops = await Operation.find({ migrationId: _migration._id });

  const newMigration = await Migration.create({
    name,
    status: 'in_progress',
    startedAt: new Date(),
    restartedFromId: _migration._id,
    originalMigrationId: _migration.originalMigrationId || _migration._id
  });

  newMigration._options = options;

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
  if (!didInit) {
    exports.initMigrationFramework();
  }

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
  if (migration == null) {
    throw new Error('Cannot call `eachAsync()` without starting a migration first');
  }

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
    userFunctionName: options?.name || fn.name
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
    debug(`${op.opName} ${op.userFunctionName}: ${op.state.current} / ${op.state.totalCount}`);

    try {
      await fn(doc);
    } catch (err) {
      op.status = 'error';
      op.error.message = err.message;
      op.error.stack = err.stack;
      op.error.doc = doc;
      op.endedAt = new Date();
      --op.state.current;
      op.markModified('state.current');
      await op.save();

      migration.status = 'error';
      migration.error.message = err.message;
      migration.error.stack = err.stack;
      migration.error.doc = doc;
      migration.endedAt = new Date();
      await migration.save();

      throw err;
    }
  }

  op.status = 'complete';
  op.endedAt = new Date();
  await op.save();
};