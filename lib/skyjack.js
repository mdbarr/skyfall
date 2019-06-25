'use strict';

require('barrkeep/shim');

const {
  Event, EventBus
} = require('./events');

const defaults = { api: { port: 7520 } };

function Skyjack(options = {}) {
  this.config = Object.$merge(defaults, options, true);

  this.types = { Event };

  this.events = new EventBus();

  this.api = require('./api')(this);
  this.cron = require('./cron')(this);
  this.rest = require('./rest')(this);

  this.start = async () => {
    await this.api.start();
  };
}

module.exports = Skyjack;
