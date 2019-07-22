'use strict';

const fastify = require('fastify');
const { Event } = require('./events');

function Api(skyfall) {
  this.id = skyfall.utils.id();
  this.server = fastify();

  this.endpoint = function({
    methods, path, name, simple = true, auto = true,
    response = { message: 'ok' }, code = 200
  }) {
    if (!Array.isArray(methods)) {
      methods = [ methods ];
    }

    path = `/api/${ path }`.replace(/\/+/g, '/');

    for (const method of methods) {
      const id = skyfall.utils.id();
      const type = `api:${ name }:${ method }`.toLowerCase();

      this.server[method](path, (request, reply) => {
        if (auto) {
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
    options.methods = [ 'get', 'head', 'post', 'put', 'delete', 'options', 'patch' ];
    return this.endpoint(options);
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
      skyfall.events.emit(Event.from(error, 'api:server:error', this.id));
      console.log(error);
    }
  };
}

module.exports = function(skyfall) {
  return new Api(skyfall);
};
