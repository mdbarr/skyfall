'use strict';

const uuid = require('uuid/v4');

module.exports = {
  alias (name = '') {
    return `$${ name.toLowerCase().
      replace(/-/g, '_').
      replace(/[^\w]+/, '') }`;
  },
  hidden (object, key, value) {
    Object.defineProperty(object, key, {
      value,
      enumerable: false,
      writable: false,
      configurable: false
    });
    return object;
  },
  id: uuid,
  timestamp () {
    return Date.now();
  },
  toObject (data) {
    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      json = data;
    }
    return json;
  },
  toString (data) {
    if (typeof data === 'string') {
      return data;
    }
    let string;
    try {
      string = JSON.stringify(data);
    } catch (e) {
      string = data;
    }
    return string;
  }
};
