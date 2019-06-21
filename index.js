#!/usr/bin/env node
'use strict';

require('barrkeep/pp');

const Skyjack = require('./lib/skyjack');
const skyjack = new Skyjack();

skyjack.events.$on('*', (event, next) => {
  console.pp(event);
  next();
});

skyjack.events.$emit({
  type: 'foo',
  data: { foo: true }
});

skyjack.api.$get({
  path: '/foo',
  type: 'api:foo'
});

skyjack.start();
