'use strict';

const { after, before } = require('mocha');
const mongoose = require('mongoose');

before(async function() {
  await mongoose.connect('mongodb://127.0.0.1:27017/test_migrations');

  await mongoose.connection.dropDatabase();
});

after(async function() {
  await mongoose.disconnect();
});