'use strict';

function Memory (skyfall, { limit = 1000 } = {}) {
  const memory = new Map();
  const timestamps = new Map();

  skyfall.api.server.get('/memory/:id', (request, reply) => {
    const id = request.params.id;

    if (!memory.has(id)) {
      reply.
        code(404).
        send({ message: `${ id } not found` });
    } else {
      reply.
        code(200).
        send(memory.get(id));
    }
  });

  this.prune = () => {
    if (memory.size > limit) {
      let timestamp = skyfall.utils.timestamp();
      let candidate = null;

      for (const [ value, key ] of timestamps) {
        if (value < timestamp) {
          timestamp = value;
          candidate = key;
        }
      }

      if (candidate) {
        memory.delete(candidate);
        timestamps.delete(candidate);
      }
    }
  };

  this.get = (id) => {
    if (memory.has(id)) {
      timestamps.set(id, skyfall.utils.timestamp());
      return memory.get(id);
    }
    return undefined;
  };

  this.has = (id) => {
    if (memory.has(id)) {
      timestamps.set(id, skyfall.utils.timestamp());
      return true;
    }
    return false;
  };

  this.memorize = (pattern) => {
    skyfall.events.on(pattern, (event) => {
      memory.set(event.type, event.data);
      timestamps.set(event.type, skyfall.utils.timestamp());

      this.prune();
    });
  };
}

module.exports = {
  name: 'memory',
  install: (skyfall, options) => {
    skyfall.memory = new Memory(skyfall, options);
  },
};
