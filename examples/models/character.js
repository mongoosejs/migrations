'use strict';

const mongoose = require('mongoose');

module.exports = mongoose.model('Character', mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rank: {
    type: String
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    // Not all characters have a last name!
    required: true
  },
  ship: {
    type: String
  }
}));