'use strict';

const {
  Event, EventBus
} = require('./events');
const { merge } = require('barrkeep/utils');

const defaults = { api: {
  port: 7520,
  host: '0.0.0.0'
} };

function Skyfall(options = {}) {
  this.name = require('../package.json').name;
  this.version = require('../package.json').version;

  this.config = merge(defaults, options, true);

  this.utils = require('./utils');

  this.types = { Event };

  this.events = new EventBus(this.config.shared);

  this.api = require('./api')(this);
  this.cron = require('./cron')(this);
  this.rest = require('./rest')(this);

  this.plugins = require('./plugins')(this);

  this.start = async () => {
    return await this.api.start();
  };
}

module.exports = Skyfall;
