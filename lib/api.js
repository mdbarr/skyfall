'use strict';

const fastify = require('fastify');
const fastifyStatic = require('fastify-static');

const { Exception } = require('./events');

const METHODS = [ 'get', 'head', 'post', 'put', 'delete', 'options', 'patch' ];

function Api(skyfall) {
  this.id = skyfall.utils.id();
  this.server = fastify();

  this.endpoint = function({
    methods, path, name,
    response = { message: 'ok' }, code = 200,
    simple = true, emit = true, root = false
  }) {
    if (!Array.isArray(methods)) {
      methods = [ methods ];
    }

    path = (root ? `/${ path }` : `/api/${ path }`).replace(/\/+/g, '/');

    for (let method of methods) {
      method = method.toLowerCase();

      if (!METHODS.includes(method)) {
        continue;
      }

      const id = skyfall.utils.id();
      const type = `api:${ name }:${ method }`;

      this.server[method](path, (request, reply) => {
        if (emit) {
          if (simple) {
            skyfall.events.emit({
              type,
              data: request.body,
              source: id
            });
          } else {
            skyfall.events.emit({
              type,
              data: {
                body: request.body,
                query: request.query,
                params: request.params,
                headers: request.headers,
                ip: request.ip,
                ips: request.ips,
                hostname: request.hostname,
                requestId: request.id
              },
              source: id
            });
          }
        }

        if (typeof response === 'function') {
          response(request, reply);
        } else {
          reply.
            code(code).
            send(response);
        }
      });

      skyfall.events.emit({
        type: 'api:endpoint:added',
        data: {
          id,
          method,
          path,
          type,
          response,
          code
        },
        source: this.id
      });
    }
  };

  this.get = (options) => {
    options.methods = [ 'get' ];
    return this.endpoint(options);
  };

  this.head = (options) => {
    options.methods = [ 'head' ];
    return this.endpoint(options);
  };

  this.post = (options) => {
    options.methods = [ 'post' ];
    return this.endpoint(options);
  };

  this.put = (options) => {
    options.methods = [ 'put' ];
    return this.endpoint(options);
  };

  this.delete = (options) => {
    options.methods = [ 'delete' ];
    return this.endpoint(options);
  };

  this.options = (options) => {
    options.methods = [ 'options' ];
    return this.endpoint(options);
  };

  this.patch = (options) => {
    options.methods = [ 'patch' ];
    return this.endpoint(options);
  };

  this.all = (options) => {
    options.methods = METHODS;
    return this.endpoint(options);
  };

  this.static = (options) => {
    this.server.register(fastifyStatic, options);
  };

  this.start = async () => {
    try {
      skyfall.events.emit({
        type: 'api:server:starting',
        data: {},
        source: this.id
      });
      await this.server.listen(skyfall.config.api.port, skyfall.config.api.host);
      skyfall.events.emit({
        type: 'api:server:started',
        data: { address: this.server.server.address() },
        source: this.id
      });
    } catch (error) {
      skyfall.events.emit(new Exception(error, 'api:server:error', this.id));
      console.log(error);
    }
  };
}

module.exports = function(skyfall) {
  return new Api(skyfall);
};
