#!/usr/bin/env node

'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const directories = argv['_'];

for (const directory of directories) {
  for (const file of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      continue;
    }
    execSync(`node ${fullPath}`, { stdio: 'inherit' });
  }
}