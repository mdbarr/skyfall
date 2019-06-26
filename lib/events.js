'use strict';

const uuid = require('uuid/v4');
const query = require('barrkeep/query');

class Event {
  constructor({
    type = 'unknown', data = {}, source
  }) {
    this.id = uuid();
    this.object = 'event';
    this.type = type;
    this.data = data;
    this.source = source || null;
    this.timestamp = Date.now();
  }
}

class EventBus {
  constructor() {
    this.id = uuid();
    this.object = 'event-bus';
    this.$groups = new Map();
    this.$ids = new Map();
  }

  $parsePattern(pattern) {
    let regexp;

    if (pattern instanceof RegExp) {
      regexp = pattern;
    } else if (pattern.startsWith('/') && pattern.endsWith('/')) {
      regexp = new RegExp(pattern.substring(1, pattern.length - 1));
    } else {
      pattern = `^${ pattern.
        replace(/([*+])/g, '.$1').
        replace(/(\/)/g, '\\\\') }$`;
      regexp = new RegExp(pattern);
    }

    const key = regexp.toString();

    return [ key, regexp ];
  }

  $addListener(pattern, condition, count, callback) {
    const [ key, regexp ] = this.$parsePattern(pattern);

    const id = uuid();

    let group;

    if (this.$groups.has(key)) {
      group = this.$groups.get(key);
    } else {
      group = {
        id: uuid(),
        key,
        regexp,
        listeners: new Map()
      };
      this.$groups.set(key, group);
    }

    const listener = {
      id,
      group,
      key,
      regexp,
      pattern,
      condition,
      count,
      context: {
        id,
        pattern
      },
      callback
    };

    this.$ids.set(id, listener);

    group.listeners.set(id, listener);

    return id;
  }

  emit(...args) {
    let event;

    if (args.length === 1) {
      event = args[0];

      if (event.object !== 'event') {
        event = new Event(event);
      }
    } else if (args.length === 2) {
      event = new Event({
        type: args[0],
        data: args[1]
      });
    }

    const contexts = new Map();
    const callbacks = new Set();

    for (const [ , group ] of this.$groups) {
      if (group.regexp.test(event.type)) {
        for (const [ , listener ] of group.listeners) {
          if (listener.count > 0 && query(event.data, listener.condition)) {
            callbacks.add(listener.callback);
            contexts.set(listener.callback, listener.context);
            listener.count--;

            if (listener.count <= 0) {
              group.listeners.delete(listener.id);
            }
          }
        }
      }
    }

    for (const callback of callbacks) {
      process.nextTick(callback, event, contexts.get(callback));
    }
  }

  on(...args) {
    const pattern = args.shift();
    const callback = args.pop();

    let count = Infinity;
    let condition = {};

    if (args.length === 2) {
      if (typeof args[0] === 'number') {
        count = args[0];
        condition = args[1];
      } else {
        condition = args[0];
        count = args[1];
      }
    } else if (args.length === 1) {
      if (typeof args[0] === 'number') {
        count = args[0];
      } else {
        condition = args[0];
      }
    }

    return this.$addListener(pattern, condition, count, callback);
  }

  once(...args) {
    const pattern = args.shift();
    const callback = args.pop();
    const condition = args.pop() || {};

    return this.$addListener(pattern, condition, 1, callback);
  }

  debounce(...args) {
    const pattern = args.shift();
    const options = args.shift();
    const callback = args.pop();
    const condition = args.pop() || {};

    let queue = [];
    let timeout = 0;

    const debouncer = (event) => {
      queue.push(event);

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        const events = queue;
        queue = [];
        timeout = 0;

        callback(events);
      }, options.timeout || 500);
    };

    return this.$addListener(pattern, condition, Infinity, debouncer);
  }

  off(...args) {
    if (args.length === 1) {
      const id = args[0];
      const listener = this.$ids.get(id);
      if (listener) {
        listener.group.delete(listener.id);
        return true;
      }
    } else if (args.length === 2) {
      const pattern = args[0];
      const callback = args[1];

      const [ key ] = this.$parsePattern(pattern);
      const group = this.$groups.get(key);

      if (group) {
        for (const [ id, listener ] of group.listeners) {
          if (listener.callback === callback) {
            group.listeners.delete(id);
            return true;
          }
        }
      }
    }
    return false;
  }
}

module.exports = {
  Event,
  EventBus
};
