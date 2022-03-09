'use strict';

const { before } = require('mocha');
const migrations = require('../');
const mongoose = require('mongoose');

migrations._initMigrationFramework();

before(async function() {
  await mongoose.connect('mongodb://localhost:27017/test_migrations');

  await mongoose.connection.dropDatabase();
});

after(async function() {
  await mongoose.disconnect();
});