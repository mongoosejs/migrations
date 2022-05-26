'use strict';

const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['not_started', 'in_progress', 'error', 'complete'],
    default: 'in_progress'
  },
  sourceCode: {
    type: String
  },
  githash: {
    type: String
  },
  author: {
    name: String,
    email: String
  },
  error: {
    message: String,
    stack: String
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date
  },
  restartedFromId: {
    type: 'ObjectId',
    ref: '_Migration'
  },
  originalMigrationId: {
    type: 'ObjectId',
    ref: '_Migration'
  },
  lastOperationId: {
    type: 'ObjectId',
    ref: '_Operation'
  }
}, { timestamps: true, minimize: false });