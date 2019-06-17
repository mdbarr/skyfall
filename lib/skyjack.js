'use strict';

require('barrkeep/shim');
const EventBus = require('./eventBus');

const defaults = {
  port: 7520
};

function Skyjack(options = {}) {
  this.config = Object.$merge(defaults, options, true);

  this.$events = new EventBus();
}

module.exports = Skyjack;
