'use strict';

const async = require('async');

class EventBus {
  constructor() {
    this.$listeners = {};
    this.object = 'event-bus';
  }

  $parsePattern(pattern) {
    let regExp;

    if (pattern instanceof RegExp) {
      regExp = pattern;
    } else if (pattern.startsWith('/') && pattern.endsWith('/')) {
      regExp = new RegExp(pattern.substring(1, pattern.length - 1));
    } else {
      pattern = `^${ pattern.
        replace(/([*+])/g, '.$1').
        replace(/(\/)/g, '\\\\') }$`;
      regExp = new RegExp(pattern);
    }

    const key = regExp.toString();

    return [ key, regExp ];
  }

  $emit(type, data) {
    const callbacks = new Set();

    for (const key in this.$listeners) {
      const listener = this.$listeners[key];
      if (listener.regExp.test(type)) {
        listener.listeners.forEach(cb => { return callbacks.add(cb); });
      }
    }

    return async.map(Array.from(callbacks), (handler, next) => { handler(data, next); });
  }

  $on(pattern, callback) {
    const [ key, regExp ] = this.$parsePattern(pattern);

    if (!this.$listeners[key]) {
      this.$listeners[key] = {
        pattern: key,
        regExp,
        listeners: new Set()
      };
    }

    this.$listeners[key].listeners.add(callback);
  }

  $off(pattern, callback) {
    const [ key ] = this.$parsePattern(pattern);

    if (this.$listeners[key]) {
      this.$listeners[key].listeners.delete(callback);
    }
  }
}

module.exports = EventBus;
