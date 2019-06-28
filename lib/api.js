'use strict';

const uuid = require('uuid/v4');
const fastify = require('fastify');

function Api(skyfall) {
  this.id = uuid();
  this.server = fastify();

  this.endpoint = function({
    method, path, type, response = { message: 'ok' }, code = 200
  }) {
    const id = uuid();

    path = `/api/${ path }`.replace(/\/+/g, '/');

    type = `api:${ type }:${ method }`.toLowerCase();

    this.server[method](path, (request, reply) => {
      skyfall.events.emit({
        type,
        data: request.body,
        source: id
      });

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
  };

  this.get = (options) => {
    options.method = 'get';
    return this.endpoint(options);
  };

  this.head = (options) => {
    options.method = 'head';
    return this.endpoint(options);
  };

  this.post = (options) => {
    options.method = 'post';
    return this.endpoint(options);
  };

  this.put = (options) => {
    options.method = 'put';
    return this.endpoint(options);
  };

  this.delete = (options) => {
    options.method = 'delete';
    return this.endpoint(options);
  };

  this.options = (options) => {
    options.method = 'options';
    return this.endpoint(options);
  };

  this.patch = (options) => {
    options.method = 'patch';
    return this.endpoint(options);
  };

  this.start = async () => {
    try {
      skyfall.events.emit({
        type: 'api:server:starting',
        data: {},
        source: this.id
      });
      await this.server.listen(skyfall.config.api.port);
      skyfall.events.emit({
        type: 'api:server:started',
        data: { address: this.server.server.address() },
        source: this.id
      });
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
}

module.exports = function(skyfall) {
  return new Api(skyfall);
};
