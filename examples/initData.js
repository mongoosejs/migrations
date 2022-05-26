'use strict';

const Character = require('./models/character');
const mongoose = require('mongoose');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');

  await Character.create([
    {
      name: 'Jean-Luc Picard',
      rank: 'Captain'
    },
    {
      name: 'Will Riker',
      rank: 'Commander'
    },
    {
      name: 'Geordi La Forge',
      rank: 'Lieutenant'
    }
  ])

  await mongoose.disconnect();
}