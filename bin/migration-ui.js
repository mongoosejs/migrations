'use strict';

const express = require('express');
const mongoose = require('mongoose');
const ui = require('../src/ui');

const app = express();

const port = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/migrationstest');

app.use('/', ui(mongoose, express));

const server = app.listen(port, err => {
  if (err != null) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Listening on ' + port);
});