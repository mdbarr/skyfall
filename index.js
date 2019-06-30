#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyfall = require('./lib/skyfall');
const skyfall = new Skyfall();

skyfall.use(require('./plugins/replay'));
skyfall.use(require('./plugins/mqtt'));

skyfall.events.on('*', (event, context, shared) => {
  console.pp({
    event,
    context,
    shared
  });
});

skyfall.events.emit({
  type: 'foo',
  data: { foo: true }
});

skyfall.api.get({
  path: '/foo',
  type: 'foo'
});

skyfall.api.post({
  path: '/github',
  type: 'github'
});

skyfall.start();

skyfall.rest.get('https://cat-fact.herokuapp.com/facts/random', 'cat-fact').
  repeat().
  repeat();

skyfall.cron.job('0 */5 * * * *', 'every-5-minutes');

skyfall.events.debounce('bouncy', { timeout: 250 }, (events) => {
  console.pp(events);
});

for (let i = 0; i < 3; i++) {
  skyfall.events.emit({
    type: 'bouncy',
    data: Math.random()
  });
}

skyfall.replay.capture('api:foo:get');

skyfall.mqtt.connect('mqtt://test.mosquitto.org', (mqtt) => {
  console.pp(mqtt);
  mqtt.subscribe('skyfall');
  mqtt.publish('skyfall', 'testing...');
});
