'use strict';

const uuid = require('uuid/v4');
const fastify = require('fastify');

function Api(skyjack) {
  this.id = uuid();
  this.server = fastify();

  this.endpoint = function({
    method, path, type, response = { message: 'ok' }, code = 200
  }) {
    const id = uuid();

    path = `/api/${ path }`.replace(/\/+/g, '/');

    this.server[method](path, (request, reply) => {
      skyjack.events.emit({
        type,
        data: request.body,
        source: id
      });

      reply.
        code(code).
        send(response);
    });

    skyjack.events.emit({
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
      skyjack.events.emit({
        type: 'api:server:starting',
        data: {},
        source: this.id
      });
      await this.server.listen(skyjack.config.api.port);
      skyjack.events.emit({
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

module.exports = function(skyjack) {
  return new Api(skyjack);
};
