'use strict';

const assert = require('assert');
const { before, describe, it, afterEach, beforeEach } = require('mocha');
const mongoose = require('mongoose');
const migrations = require('../');

describe('save', function() {
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
    await TestModel.collection.deleteMany({});

    migration = await migrations.startMigration({ name: 'test' });
  });

  afterEach(() => migrations.endMigration());
  afterEach(() => migrations.models.Migration.deleteMany({ name: 'test' }));

  it('stores the result', async function() {
    const doc = new TestModel({ name: 'John Smith' });
    await doc.save();

    const operations = await mongoose.model('_Operation').find({ migrationId: migration._id });
    assert.equal(operations.length, 1);
    assert.equal(operations[0].status, 'complete');
    assert.deepEqual(operations[0].parameters.changes, { $set: { name: 'John Smith' } });
  });

  it('skips if same op already exists', async function() {
    await mongoose.model('_Operation').create({
      migrationId: migration._id,
      modelName: 'Test',
      opName: 'save',
      status: 'complete',
      parameters: {
        where: null,
        isNew: true,
        changes: { $set: { name: 'John Smith' } }
      }
    });

    const doc = new TestModel({
      name: 'John Smith'
    });
    await doc.save();

    const operations = await mongoose.model('_Operation').find({ migrationId: migration._id });
    assert.equal(operations.length, 1);
    assert.equal(operations[0].status, 'complete');

    const count = await TestModel.countDocuments({});
    assert.equal(count, 0);
  });
});