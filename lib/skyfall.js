'use strict';

const {
  Event, EventBus
} = require('./events');
const { merge } = require('barrkeep/utils');

const defaults = { api: { port: 7520 } };

function Skyfall(options = {}) {
  this.config = merge(defaults, options, true);

  this.utils = require('./utils');

  this.types = { Event };

  this.events = new EventBus();

  this.api = require('./api')(this);
  this.cron = require('./cron')(this);
  this.rest = require('./rest')(this);

  this.use = (plugin, opts = {}) => {
    plugin.install(this, opts);
  };

  this.start = async () => {
    return await this.api.start();
  };
}

module.exports = Skyfall;
