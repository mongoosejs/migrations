'use strict';

const migrations = require('../');

const Character = require('./models/character');
const mongoose = require('mongoose');

run().catch(err => { console.error(err); process.exit(-1); });

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');
  await migrations.startMigration();

  try {
    await Character.updateMany({}, { $set: { ship: 'USS Enterprise' } });
  } finally {
    await migrations.endMigration();
    await mongoose.disconnect();
  }
}