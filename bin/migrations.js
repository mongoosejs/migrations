#!/usr/bin/env node

'use strict';

const argv = require('yargs').
  usage('Usage:').
  options('retry', {
    alias: 'boolean',
    default: 'false',
    describe: 'Set to retry last failed'
  }).
  argv;

const migrations = require('../');
const mongoose = require('mongoose');

migrations.startMigration().then(migration => {
  
});