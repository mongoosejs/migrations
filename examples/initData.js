'use strict';

const Character = require('./models/character');
const Episode = require('./models/episode');
const mongoose = require('mongoose');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://localhost:27017/migrations_examples');

  await Character.deleteMany({});
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
      name: 'Worf', // <-- No last name
      rank: 'Lieutenant'
    },
    {
      name: 'Geordi La Forge',
      rank: 'Lieutenant'
    }
  ]);

  await Episode.deleteMany({});
  await Episode.create([
    {
      title: 'Encounter at Farpoint',
      date: 'September 28, 1987'
    },
    {
      title: 'The Naked Now',
      date: 'October 5, 1987'
    },
    {
      title: 'Code of Honor',
      date: 'October 12, 1987'
    },
    {
      title: 'The Last Outpost',
      date: 'October 19, 1987'
    },
    {
      title: 'Where No One Has Gone Before',
      date: 'October 26, 1987'
    },
    {
      title: 'Lonely Among Us',
      date: 'November 2, 1987'
    },
    {
      title: 'Justice',
      date: 'November 9, 1987'
    },
    {
      title: 'The Battle',
      date: 'November 16, 1987'
    },
    {
      title: 'Hide and Q',
      date: 'November 23, 1987'
    },
    {
      title: 'Haven',
      date: 'November 30, 1987'
    },
    {
      title: 'The Big Goodbye',
      date: 'January 11, 1988'
    },
    {
      title: 'Datalore',
      date: 'January 18, 1988'
    },
    {
      title: 'Angel One',
      date: 'January 25, 1988'
    },
    {
      title: '11001001',
      date: 'February 1, 1988'
    },
    {
      title: 'Too Short a Season',
      date: 'February 8, 1988'
    },
    {
      title: 'When the Bough Breaks',
      date: 'February 15, 1988'
    },
    {
      title: 'Home Soil',
      date: 'February 22, 1988'
    },
    {
      title: 'Coming of Age',
      date: 'March 14, 1988'
    },
    {
      title: 'Heart of Glory',
      date: 'March 21, 1988'
    },
    {
      title: 'The Arsenal of Freedom',
      date: 'April 11, 1988'
    },
    {
      title: 'Symbiosis',
      date: 'April 18, 1988'
    },
    {
      title: 'Skin of Evil',
      date: 'April 25, 1988'
    },
    {
      title: 'We\'ll Always Have Paris',
      date: 'May 2, 1988'
    },
    {
      title: 'Conspiracy',
      date: 'May 9, 1988'
    },
    {
      title: 'The Neutral Zone',
      date: 'May 16, 1988'
    }
  ]);

  await mongoose.disconnect();
}