'use strict';

const { before } = require('mocha');
const migrations = require('../');
const mongoose = require('mongoose');

console.log('Init?');
migrations._initMigrationFramework();

before(async function() {
  await mongoose.connect('mongodb://localhost:27017/test_migrations');
});

after(async function() {
  await mongoose.disconnect();
});