#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyjack = require('./lib/skyjack');
const skyjack = new Skyjack();

skyjack.events.on('*', (event, done) => {
  console.pp(event);
  done();
});

skyjack.events.emit({
  type: 'foo',
  data: { foo: true }
});

skyjack.api.get({
  path: '/foo',
  type: 'api:foo'
});

skyjack.api.post({
  path: '/github',
  type: 'api:github:post'
});

skyjack.start();

skyjack.rest.get('https://cat-fact.herokuapp.com/facts/random', 'rest:cat-fact');
