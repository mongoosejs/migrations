'use strict';

const migrations = require('../');

const Character = require('./models/character');
const mongoose = require('mongoose');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');
  await migrations.startMigration({ restart: process.env.RESTART });

  try {
    await migrations.eachAsync(Character, async character => {
      const pieces = character.name.split(' ');
      const firstName = pieces[0];
      const lastName = pieces.slice(1).join(' ');
      character.set({ firstName, lastName });
      // Will throw an error on the 3rd of 4 characters, because
      // `name = 'Worf'` will lead to an empty `lastName`
      await character.save();
    });
  } finally {
    await migrations.endMigration();
    await mongoose.disconnect();
  }
}