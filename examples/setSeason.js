'use strict';

const migrations = require('../');

const Episode = require('./models/episode');
const mongoose = require('mongoose');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');
  await migrations.startMigration();

  try {
    await migrations.eachAsync(Episode, async episode => {
      episode.season = 1;
      await episode.save();
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  } finally {
    await migrations.endMigration();
    await mongoose.disconnect();
  }
}