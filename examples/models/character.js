'use strict';

const mongoose = require('mongoose');

module.exports = mongoose.model('Character', mongoose.Schema({
  name: {
    type: String
  },
  rank: {
    type: String
  },
  ship: {
    type: String
  }
}));