'use strict';

const express = require('express');
const mongoose = require('mongoose');
const ui = require('../src/ui');

const app = express();

mongoose.connect('mongodb://localhost:27017/migrationstest');

app.use('/', ui(mongoose, express));

app.listen(3001, err => {
  if (err != null) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Listening on 3001');
});