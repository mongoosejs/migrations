'use strict';

const assert = require('assert');
const { before, describe, it, afterEach, beforeEach } = require('mocha');
const mongoose = require('mongoose');
const migrations = require('../');

describe('eachAsync', function() {
  let TestModel;
  let migration;

  before(async function() {
    mongoose.deleteModel(/Test/);
    TestModel = mongoose.model('Test', mongoose.Schema({
      _id: Number,
      name: String,
      email: String,
      ship: String
    }));
  });

  beforeEach(async function() {
    await TestModel.collection.deleteMany({});
    await TestModel.collection.insertMany([
      { _id: 0, name: 'Jean-Luc Picard' },
      { _id: 1, name: 'Will Riker' },
      { _id: 2, name: 'Geordi La Forge' },
      { _id: 3, name: 'Deanna Troi' }
    ]);

    migration = await migrations.startMigration();
  });

  afterEach(() => migrations.endMigration());

  it('stores the current state of the cursor', async function() {
    let count = 0;
    await migrations.eachAsync(TestModel, async function addShip(doc) {
      ++count;
      const ops = await mongoose.model('_Operation').find({
        migrationId: migration._id,
        opName: 'eachAsync',
        userFunctionName: 'addShip'
      });
      assert.equal(ops.length, 1);

      const [op] = ops;
      assert.strictEqual(op.firstSeenSortKey, 0);
      assert.strictEqual(op.lastSeenSortKey, doc._id);

      doc.ship = 'USS Enterprise';
      await doc.save();
    });

    assert.equal(count, 4);
  });

  it('can pick up from last error if retrying', async function() {
    let count = 0;
    const err = await migrations.eachAsync(TestModel, async function addShip(doc) {
      if (doc._id === 2) {
        throw new Error('Oops!');
      }

      ++count;
      doc.ship = 'USS Enterprise';
      await doc.save();
    }).then(() => null, err => err);

    assert.equal(count, 2);
    assert.equal(err.message, 'Oops!');
    assert.equal(migration.status, 'error');

    let docs = await TestModel.find({ ship: 'USS Enterprise' }).sort({ _id: 1 });
    assert.deepStrictEqual(docs.map(doc => doc.name), ['Jean-Luc Picard', 'Will Riker']);

    await migrations.endMigration();

    migration = await migrations.restartMigration(migration);
    count = 0;
    await migrations.eachAsync(TestModel, async function addShip(doc) {
      ++count;

      const op = await mongoose.model('_Operation').findById(migration.lastOperationId);
      assert.equal(op.state.current, count + 2);
      doc.ship = 'USS Enterprise';
      await doc.save();
    });
    assert.equal(count, 2);
    docs = await TestModel.find({ ship: 'USS Enterprise' }).sort({ _id: 1 });
    assert.deepStrictEqual(docs.map(doc => doc.name), [
      'Jean-Luc Picard',
      'Will Riker',
      'Geordi La Forge',
      'Deanna Troi'
    ]);
  });
});