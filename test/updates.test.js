'use strict';

const assert = require('assert');
const { before, describe, it, afterEach, beforeEach } = require('mocha');
const mongoose = require('mongoose');
const migrations = require('../');

describe('updates', function() {
  let TestModel;
  let migration;

  before(function() {
    console.log('Create new model');
    TestModel = mongoose.model('Test', mongoose.Schema({
      name: String,
      email: String
    }));
  });

  beforeEach(async function() {
    migration = await migrations.startMigration();
  });

  afterEach(() => migrations.endMigration());

  it('stores the update result if succeeded', async function() {
    await TestModel.collection.insertOne({ name: 'John Smith' });
    await TestModel.updateOne({ name: 'John Smith' }, { name: 'John Smythe' });

    assert.equal(migration.operations.length, 1);
    assert.deepEqual(migration.operations[0].result, {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null
    });
  });
});