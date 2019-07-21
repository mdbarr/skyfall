#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyfall = require('./lib/skyfall');
const skyfall = new Skyfall();

skyfall.use('memory');
skyfall.use('mqtt');
skyfall.use('redis');
skyfall.use('replay');

skyfall.memory.memorize('*');

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
  name: 'foo'
});

skyfall.api.post({
  path: '/github',
  name: 'github'
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
    data: Math.random(),
    source: 'index.js'
  });
}

skyfall.replay.capture('api:foo:get');

skyfall.mqtt.connect('mqtt://localhost', 'local', () => {
  skyfall.mqtt.$local.subscribe('skyfall-testing');
  skyfall.mqtt.$local.subscribe([ 'skyfall', 'skyfall-test' ]);
  skyfall.mqtt.$local.publish('skyfall-testing', 'testing...');

  skyfall.events.on('mqtt:local:skyfall', { address: 'mqtt://localhost' }, (event) => {
    console.pp(event);
  });
});

skyfall.redis.connect('redis://localhost', (redis) => {
  skyfall.redis.connection('redis://localhost').subscribe([ 'skyfall', 'skyfall-test' ]);

  skyfall.events.on('redis:skyfall:subscribed', () => {
    redis.publish('skyfall', 'testing...');
  });
});

skyfall.events.link('redis:skyfall:message', 'skyfall:transform:message', (data, next) => {
  const value = { messages: [ data.message, 'foo' ] };
  next(value);
});

console.pp(skyfall.events.eventNames());
