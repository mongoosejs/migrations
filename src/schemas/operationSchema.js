'use strict';

const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  migrationId: {
    type: 'ObjectId',
    ref: '_Migration',
    required: true
  },
  modelName: {
    type: String,
    required: true
  },
  opName: {
    type: String,
    required: true
  },
  userFunctionName: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['not_started', 'in_progress', 'error', 'complete'],
    default: 'in_progress'
  },
  error: {
    message: String,
    stack: String
  },
  startedAt: {
    type: Date,
    required: true,
    default: () => Date.now()
  },
  endedAt: {
    type: Date
  },
  state: 'Mixed',
  firstSeenSortKey: 'Mixed',
  lastSeenSortKey: 'Mixed',
  parameters: 'Mixed',
  result: 'Mixed'
});