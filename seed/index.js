'use strict';

const migrations = require('../');
const mongoose = require('mongoose');

const stack = new Error().stack;

void async function main() {
  await mongoose.connect('mongodb://localhost:27017/migrationstest');
  await mongoose.connection.dropDatabase();

  migrations.initMigrationModels();
  const { _Migration: Migration, _Operation: Operation } = mongoose.models;

  const now = Date.now();

  const [success, fail] = await Migration.create([
    {
      name: 'setShip',
      status: 'complete',
      startedAt: new Date(now - 10000),
      endedAt: new Date(now - 8472)
    },
    {
      name: 'setName',
      status: 'error',
      startedAt: new Date(now - 5000),
      endedAt: new Date(now - 4822)
    }
  ]);

  await Operation.create([
    {
      migrationId: success._id,
      modelName: 'User',
      opName: 'updateMany',
      status: 'complete',
      startedAt: new Date(now - 9999),
      endedAt: new Date(now - 8600),
      result: { nModified: 4, nMatched: 4 }
    },
    {
      migrationId: fail._id,
      modelName: 'User',
      opName: 'eachAsync',
      status: 'error',
      startedAt: new Date(now - 4998),
      endedAt: new Date(now - 4897),
      firstSeenSortKey: 0,
      lastSeenSortKey: 2,
      error: {
        message: 'TypeError: Cannot read properties of null (reading \'b\')',
        stack
      }
    }
  ]);

  console.log('Done');
  process.exit(0);
}();