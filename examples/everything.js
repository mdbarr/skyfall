#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyfall = require('../lib/skyfall');
const skyfall = new Skyfall();

skyfall.use('memory');
skyfall.use('mqtt');
skyfall.use('redis');
skyfall.use('replay');
skyfall.use('watch');

skyfall.memory.memorize('*');

skyfall.events.on('*', (event, context, shared) => {
  console.pp({
    event,
    context,
    shared
  });
});

skyfall.events.link('foo', 'foo:{{ info }}:{{ bar }}');

skyfall.events.emit({
  type: 'foo',
  data: {
    foo: true,
    bar: 'yes',
    info: 'nah'
  }
});

skyfall.api.get({
  path: '/foo',
  name: 'foo'
});

skyfall.api.post({
  path: '/github',
  name: 'github'
});

skyfall.api.static({
  root: __dirname,
  prefix: '/static/'
});

skyfall.api.start();

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
    source: 'everything.js'
  });
}

skyfall.events.debounce('unibounce:*', { timeout: 1000, unique: true }, (events) => {
  console.pp(events);
});

for (let i = 0; i < 6; i++) {
  skyfall.events.emit({
    type: `unibounce:${ i % 2 }`,
    data: Math.random(),
    source: 'everything.js'
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

skyfall.redis.connect('redis://localhost', 'local', () => {
  skyfall.redis.connection('redis://localhost').subscribe([ 'skyfall', 'skyfall-test' ]);

  skyfall.events.on('redis:local:subscribed', { topic: 'skyfall' }, () => {
    skyfall.redis.$local.publish('skyfall', 'testing...');
  });
});

skyfall.events.transform('redis:skyfall:message', 'skyfall:transform:message', (data, next) => {
  const value = { messages: [ data.message, 'foo' ] };
  next(value);
});

skyfall.watch.file('everything.js', 'index');

console.pp(skyfall.events.eventNames());
