'use strict';

const uuid = require('uuid/v4');
const query = require('barrkeep/query');
const { merge } = require('barrkeep/utils');
const { Uscript } = require('@mdbarr/uscript');

const errorKeys = [ 'name', 'code', 'message',
  'actual', 'expected', 'operator',
  'address', 'dest', 'errno', 'info',
  'path', 'port', 'syscall', 'stack' ];

class Event {
  constructor({
    type = 'unknown', data = {}, source
  } = {}) {
    this.id = uuid();
    this.object = 'event';
    this.type = type;
    this.data = data;
    this.source = source || null;
    this.timestamp = Date.now();

    this.flags = {
      ignored: false,
      unhandled: false
    };

    this.origin = null;
  }

  static from(data, type, source) {
    if (data instanceof Error) {
      const object = {};
      for (const key of errorKeys) {
        if (data[key]) {
          object[key] = data[key];
        }
      }
      type = type || data.name.toLowerCase();

      return new Event({
        type,
        data: object,
        source
      });
    } else if (typeof data === 'object' && !type) {
      return new Event(data);
    }
    return new Event({
      type,
      data,
      source
    });
  }
}

class Exception extends Event {
  constructor(error, type = 'exception', source) {
    super();

    this.object = 'exception';
    this.type = type || error.name.toLowerCase();
    this.source = source || null;

    for (const key of errorKeys) {
      if (error[key]) {
        this.data[key] = error[key];
      }
    }
  }

  toError() {
    const error = new Error(this.data.message);
    Object.assign(error, this.data);

    return error;
  }
}

class EventBus {
  constructor(shared = {}, options = {}) {
    this.id = uuid();
    this.object = 'event-bus';
    this.$groups = new Map();
    this.$ids = new Map();

    this.$ignores = [];

    this.$options = options;
    this.$shared = merge(shared, { id: this.id }, true);
    this.$uscript = new Uscript(this.$shared);
  }

  $handlebars(string, environment) {
    return string.replace(/{{(.*?)}}/g, (match, expression) => {
      let evaluated;

      expression = expression.trim();

      try {
        evaluated = this.$uscript.eval(expression, environment);
      } catch (error) {
        evaluated = expression;
        this.emit(Event.from(error, `event-bus:handlerbars:${ error.name.toLowerCase() }`));
      }

      return evaluated;
    });
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

  ignore(pattern, condition = {}) {
    const [ key, regexp ] = this.$parsePattern(pattern);

    const id = uuid();
    const ignore = {
      id,
      pattern,
      condition,
      key,
      regexp
    };

    this.$ignores.push(ignore);

    return id;
  }

  unignore(pattern) {
    for (let i = 0; i < this.$ignores.length; i++) {
      const ignore = this.$ignores[i];

      if (ignore.pattern === pattern || ignore.id === pattern) {
        this.$ignores.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  emit(...args) {
    let event;

    if (args.length === 1) {
      if (args[0] instanceof Event || args[0].object === 'event' ||
          args[0].object === 'exception') {
        event = args[0];
      } else {
        event = new Event(args[0]);
      }
    } else if (args.length === 2) {
      event = new Event({
        type: args[0],
        data: args[1]
      });
    }

    for (const ignore of this.$ignores) {
      if (ignore.regexp.test(event.type) && query(event.data, ignore.condition)) {
        event.flags.ignored = true;
        return;
      }
    }

    event.origin = this.id;

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

    if (callbacks.size) {
      for (const callback of callbacks) {
        process.nextTick(callback, event, contexts.get(callback), this.$shared);
      }
    } else {
      event.flags.unhandled = true;

      if (event.object === 'exception' && this.$options.throwUnhandledExceptions) {
        throw event.toError();
      }
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
    const callback = args.pop();
    const options = args.shift() || {};
    const condition = args.pop() || {};

    const config = merge({
      timeout: 500,
      maximum: 10
    }, options);

    let queue = [];
    let timeout = 0;

    const debouncer = (event, context, shared) => {
      queue.push(event);

      if (timeout) {
        clearTimeout(timeout);
      }

      const invoke = () => {
        const events = queue;
        queue = [];
        timeout = 0;

        callback(events, context, shared);
      };

      if (queue.length >= config.maximum) {
        invoke();
      } else {
        timeout = setTimeout(invoke, config.timeout);
      }
    };

    return this.$addListener(pattern, condition, Infinity, debouncer);
  }

  transform(...args) {
    const inputType = args.shift();
    const transform = args.pop();
    const outputType = args.pop();
    const condition = args.shift() || {};

    const transformer = (event) => {
      if (transform.length === 2) {
        transform(event.data, (value) => {
          if (value !== false) {
            this.emit({
              type: this.$handlebars(outputType, event.data),
              data: value,
              source: event.id
            });
          }
        });
      } else {
        const value = transform(event.data);
        if (value !== false) {
          this.emit({
            type: this.$handlebars(outputType, event.data),
            data: value,
            source: event.id
          });
        }
      }
    };

    return this.$addListener(inputType, condition, Infinity, transformer);
  }

  link(...args) {
    const inputType = args.shift();
    const outputType = args.pop();
    const condition = args.shift();

    const linker = (event) => {
      this.emit({
        type: this.$handlebars(outputType, event.data),
        data: event.data,
        source: event.id
      });
    };

    return this.$addListener(inputType, condition, Infinity, linker);
  }

  eventNames() {
    const names = [];
    for (const [ , group ] of this.$groups) {
      for (const [ , listener ] of group.listeners) {
        names.push(listener.pattern);
      }
    }

    return names.sort();
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

  clear() {
    this.$groups.clear();
    this.$ids.clear();
  }
}

module.exports = {
  Event,
  EventBus,
  Exception
};
