'use strict';

const uuid = require('uuid/v4');

module.exports = {
  id: uuid,
  timestamp () {
    return Date.now();
  },
  hidden (object, key, value) {
    Object.defineProperty(object, key, {
      value,
      enumerable: false,
      writable: false,
      configurable: false
    });
    return object;
  }
};
