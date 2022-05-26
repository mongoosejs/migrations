'use strict';

const mongoose = require('mongoose');

module.exports = mongoose.model('Episode', mongoose.Schema({
  title: {
    type: String
  },
  date: {
    type: String
  },
  season: {
    type: Number
  }
}));