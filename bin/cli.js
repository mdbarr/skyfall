#!/usr/bin/env node
'use strict';

require('barrkeep/pp');
const path = require('path');
const argv = require('yargs').argv;
const Skyfall = require('../lib/skyfall');

let config = {};
if (argv.config) {
  config = require(path.join(process.cwd(), argv.config));
}

const skyfall = new Skyfall(config);
global.skyfall = skyfall;

if (argv.load) {
  if (!Array.isArray(argv.load)) {
    argv.load = [ argv.load ];
  }

  for (const file of argv.load) {
    const module = require(path.join(process.cwd(), file));
    if (typeof module === 'function') {
      module(skyfall);
    }
  }
}

if (argv.api !== false) {
  skyfall.api.start();
}
