'use strict';

require('barrkeep/shim');

const uuid = require('uuid/v4');
const request = require('request');

class Session {
  constructor({
    baseUrl, headers = {}, jar, auth, simple
  } = {}, emitter) {
    this.id = uuid();

    this.emitter = emitter;
    this.baseUrl = baseUrl;
    this.headers = headers;
    this.jar = jar || request.jar();
    this.auth = auth;

    this.simple = simple || false;
  }

  $asOptions() {
    const options = {};
    if (this.baseUrl) {
      options.baseUrl = this.baseUrl;
    }
    options.headers = this.headers;
    options.jar = this.jar;
    options.json = true;

    if (this.auth) {
      options.auth = this.auth;
      options.sendImmediately = true;
    }

    return options;
  }

  $request(method, ...args) {
    let options = args.shift();
    const handler = args.pop();
    const body = args.pop();

    if (typeof options === 'string') {
      options = { url: options };
    }
    if (body) {
      options.body = body;
    }

    options.method = method;

    options = Object.$merge(this.$asOptions(), options);

    let callback;
    if (typeof handler === 'string') {
      const type = handler;

      callback = (error, response, body) => {
        if (error) {
          this.emitter.emit({
            type: 'rest:error',
            data: error,
            source: this.id
          });
        } else {
          this.emitter.emit({
            type,
            data: this.simple ? body : response.toJSON(),
            source: this.id
          });
        }
      };
    }

    request(options, callback);
  }

  get(...args) {
    this.$request('GET', ...args);
  }

  head(...args) {
    this.$request('HEAD', ...args);
  }

  post(...args) {
    this.$request('POST', ...args);
  }

  put(...args) {
    this.$request('PUT', ...args);
  }

  patch(...args) {
    this.$request('PATCH', ...args);
  }

  delete(...args) {
    this.$request('DELETE', ...args);
  }
}

function Rest(skyjack) {
  this.session = function(options) {
    return new Session(options, skyjack.events);
  };

  this.generic = new Session({ simple: true }, skyjack.events);

  this.get = (...args) => {
    this.generic.get(...args);
  };

  this.head = (...args) => {
    this.generic.head(...args);
  };

  this.post = (...args) => {
    this.generic.post(...args);
  };

  this.put = (...args) => {
    this.generic.put(...args);
  };

  this.patch = (...args) => {
    this.generic.patch(...args);
  };

  this.delete = (...args) => {
    this.generic.delete(...args);
  };
}

module.exports = function(skyjack) {
  return new Rest(skyjack);
};
