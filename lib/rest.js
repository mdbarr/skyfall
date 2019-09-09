'use strict';

const http = require('http');
const uuid = require('uuid/v4');
const request = require('request');
const { merge } = require('barrkeep/utils');

class Session {
  constructor({
    baseUrl, headers = {}, jar, auth, simple = true
  } = {}, emitter) {
    this.id = uuid();

    this.emitter = emitter;
    this.baseUrl = baseUrl;
    this.headers = headers;
    this.jar = jar || request.jar();
    this.auth = auth;

    this.simple = Boolean(simple);
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
      options.auth.sendImmediately = true;
    }

    return options;
  }

  $request(method, ...args) {
    const id = uuid();
    let options = args.shift();
    let handler = args.pop();
    let body = args.pop();

    let promise = false;
    if (typeof handler === 'object' && !body) {
      body = handler;
      handler = undefined;
    }

    if (typeof options === 'string') {
      options = { url: options };
    }

    if (!options || !options.url) {
      return this.emitter.emit({
        type: 'rest:request:error',
        data: new Error('No URL specified'),
        source: this.id
      });
    }

    if (body) {
      options.body = body;
    }

    options.method = method;

    options = merge(this.$asOptions(), options);

    let callback;
    if (typeof handler === 'string') {
      const name = handler.toLowerCase();

      callback = (error, response, body) => {
        if (error) {
          this.emitter.emit({
            type: `rest:${ name }:error`,
            data: error,
            source: this.id
          });
        } else {
          const status = http.STATUS_CODES[response.statusCode].
            toLowerCase().
            replace(/\s/g, '-');

          const type = `rest:${ name }:${ status }`;

          if (this.simple) {
            this.emitter.emit({
              type,
              data: body,
              source: this.id
            });
          } else {
            this.emitter.emit({
              type,
              data: response.toJSON(),
              source: this.id
            });
          }
        }
      };
    } else if (typeof handler === 'function') {
      callback = handler;
    } else if (handler === undefined) {
      promise = true;
    }

    const context = {
      id,
      session: this.id,
      options,
      repeat: null
    };

    if (promise) {
      context.repeat = () => {
        return new Promise((resolve, reject) => {
          return request(options, (error, response, body) => {
            if (error || !response || response.statusCode < 200 || response.statusCode > 299) {
              const error = new Error('REST call failed');
              error.rejection = error;
              error.reponse = response;
              error.body = body;

              return reject(error);
            }

            if (this.simple) {
              return resolve(body);
            }
            return resolve({
              context,
              response,
              body
            });
          });
        });
      };
    } else {
      context.repeat = () => {
        request(options, callback);
        return context;
      };
    }

    return context.repeat();
  }

  get(...args) {
    return this.$request('GET', ...args);
  }

  head(...args) {
    return this.$request('HEAD', ...args);
  }

  post(...args) {
    return this.$request('POST', ...args);
  }

  put(...args) {
    return this.$request('PUT', ...args);
  }

  patch(...args) {
    return this.$request('PATCH', ...args);
  }

  delete(...args) {
    return this.$request('DELETE', ...args);
  }
}

function Rest(skyfall) {
  this.session = function(options) {
    return new Session(options, skyfall.events);
  };

  this.generic = new Session({ simple: true }, skyfall.events);

  this.get = (...args) => {
    return this.generic.get(...args);
  };

  this.head = (...args) => {
    return this.generic.head(...args);
  };

  this.post = (...args) => {
    return this.generic.post(...args);
  };

  this.put = (...args) => {
    return this.generic.put(...args);
  };

  this.patch = (...args) => {
    return this.generic.patch(...args);
  };

  this.delete = (...args) => {
    return this.generic.delete(...args);
  };
}

module.exports = function(skyfall) {
  return new Rest(skyfall);
};
