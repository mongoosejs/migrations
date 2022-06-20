'use strict';

const assert = require('assert');
const { before, describe, it, afterEach, beforeEach } = require('mocha');
const mongoose = require('mongoose');
const migrations = require('../');

describe('updates', function() {
  let TestModel;
  let migration;

  before(function() {
    mongoose.deleteModel(/Test/);

    TestModel = mongoose.model('Test', mongoose.Schema({
      name: String,
      email: String
    }));
  });

  beforeEach(async function() {
    migration = await migrations.startMigration({ name: 'test' });
  });

  afterEach(() => migrations.endMigration());
  afterEach(() => migrations.models.Migration.deleteMany({ name: 'test' }));

  it('stores the update result if succeeded', async function() {
    await TestModel.collection.insertOne({ name: 'John Smith' });
    await TestModel.updateOne({ name: 'John Smith' }, { name: 'John Smythe' });

    const operations = await mongoose.model('_Operation').find({ migrationId: migration._id });
    assert.equal(operations.length, 1);
    assert.deepEqual(operations[0].result, {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null
    });
  });

  it('handles findOneAndUpdate', async function() {
    await TestModel.collection.insertOne({ name: 'John Smith' });
    await TestModel.findOneAndUpdate(
      { name: 'John Smith' },
      { name: 'John Smythe' },
      { new: true }
    );

    const operations = await mongoose.model('_Operation').find({ migrationId: migration._id });
    assert.equal(operations.length, 1);
    assert.deepEqual(operations[0].result.name, 'John Smythe');
  });

  it('skips the update if there is already a compatible operation', async function() {
    const doc = { name: 'John Smith' };
    await TestModel.collection.insertOne(doc);

    await mongoose.model('_Operation').create({
      migrationId: migration._id,
      modelName: 'Test',
      opName: 'updateOne',
      status: 'complete',
      result: {
        matchedCount: 1,
        modifiedCount: 1,
        fakeProp: 2
      }
    });

    const res = await TestModel.updateOne({ name: 'John Smith' }, { name: 'John Smythe' });
    assert.deepEqual(res, {
      matchedCount: 1,
      modifiedCount: 1,
      fakeProp: 2
    });

    const operations = await mongoose.model('_Operation').find({ migrationId: migration._id });
    assert.equal(operations.length, 1);
    assert.deepEqual(operations[0].result, {
      matchedCount: 1,
      modifiedCount: 1,
      fakeProp: 2
    });

    const fromDb = await TestModel.collection.findOne({ _id: doc._id });
    assert.equal(fromDb.name, 'John Smith');
  });
});