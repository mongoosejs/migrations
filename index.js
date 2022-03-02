'use strict';

const migrationSchema = require('./src/schemas/migrationSchema');
const mongoose = require('mongoose');

let Migration = null;
let migration = null;

const mongooseObjToOp = new WeakMap();

exports._initMigrationFramework = function _initMigrationFramework(conn) {
  conn = conn || mongoose.connection;

  if (conn.models._Migration) {
    return;
  }

  Migration = Migration || conn.model('_Migration', migrationSchema, '_migrations');

  mongoose.plugin(function(schema) {
    schema.pre(['updateOne', 'updateMany', 'replaceOne'], async function() {
      migration.operations.push({
        modelName: this.model.modelName,
        opName: this.op,
        parameters: {
          filter: this.getFilter(),
          update: this.getUpdate()
        }
      });
      mongooseObjToOp.set(this, migration.operations[migration.operations.length - 1]);

      await migration.save();
    });

    schema.post(['updateOne', 'updateMany', 'replaceOne'], async function(res) {
      const op = mongooseObjToOp.get(this);
      console.log('X', op, res);
      if (op == null) {
        return;
      }
      op.endedAt = new Date();
      op.status = 'complete';
      op.result = res;

      await migration.save();
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
};