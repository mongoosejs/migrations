'use strict';

const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['not_started', 'in_progress', 'error', 'complete'],
    default: 'in_progress'
  },
  runId: {
    type: 'ObjectId',
    required: true,
    default: () => new mongoose.Types.ObjectId()
  }
}, { timestamps: true });