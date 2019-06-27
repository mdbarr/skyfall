#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyjack = require('./lib/skyjack');
const skyjack = new Skyjack();

skyjack.use(require('./plugins/replay'));

skyjack.events.on('*', (event, context, shared) => {
  console.pp({
    event,
    context,
    shared
  });
});

skyjack.events.emit({
  type: 'foo',
  data: { foo: true }
});

skyjack.api.get({
  path: '/foo',
  type: 'foo'
});

skyjack.api.post({
  path: '/github',
  type: 'github'
});

skyjack.start();

skyjack.rest.get('https://cat-fact.herokuapp.com/facts/random', 'cat-fact').
  repeat().
  repeat();

skyjack.cron.job('0 */5 * * * *', 'every-5-minutes');

skyjack.events.debounce('bouncy', { timeout: 250 }, (events) => {
  console.pp(events);
});

for (let i = 0; i < 3; i++) {
  skyjack.events.emit({
    type: 'bouncy',
    data: Math.random()
  });
}

skyjack.replay.capture('api:foo:get');
