'use strict';

const {
  Event, EventBus, Exception
} = require('./events');
const { merge } = require('barrkeep/utils');

const defaults = {
  api: {
    port: 7520,
    host: '0.0.0.0'
  },
  cron: { timezone: 'America/New_York' },
  events: { throwUnhandledExceptions: true }
};

function Skyfall(options = {}) {
  this.name = require('../package.json').name;
  this.version = require('../package.json').version;

  this.utils = require('./utils');

  this.config = merge(defaults, options, true);
  this.config.identity = this.config.identity || this.utils.id();

  this.types = {
    Event,
    EventBus,
    Exception
  };

  this.events = new EventBus(this.config.shared, this.config.events);

  this.api = require('./api')(this);
  this.cron = require('./cron')(this);
  this.rest = require('./rest')(this);

  this.plugins = require('./plugins')(this);

  this.start = async () => {
    return await this.api.start();
  };
}

module.exports = Skyfall;
