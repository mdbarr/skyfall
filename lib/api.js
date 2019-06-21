'use strict';

const fastify = require('fastify');

function Api(skyjack) {
  this.server = fastify();

  this.$endpoint = function({
    method, path, type, response = { message: 'ok' }, code = 200
  }) {
    this.server[method](path, (request, reply) => {
      skyjack.events.$emit({
        type,
        data: request.body
      });

      reply.
        code(code).
        send(response);
    });

    skyjack.events.$emit({
      type: 'api:endpoint:added',
      data: {
        method,
        path,
        type,
        response,
        code
      }
    });
  };

  this.$get = (options) => {
    options.method = 'get';
    return this.$endpoint(options);
  };

  this.$post = (options) => {
    options.method = 'post';
    return this.$endpoint(options);
  };

  this.$put = (options) => {
    options.method = 'put';
    return this.$endpoint(options);
  };

  this.$delete = (options) => {
    options.method = 'delete';
    return this.$endpoint(options);
  };

  this.start = async () => {
    try {
      skyjack.events.$emit({
        type: 'api:starting',
        data: {}
      });
      await this.server.listen(skyjack.config.api.port);
      skyjack.events.$emit({
        type: 'api:started',
        data: { address: this.server.server.address() }
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
