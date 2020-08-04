'use strict';

const { deepClone } = require('barrkeep/utils');

function Replay (skyfall, { size = 10 }) {
  const captures = new Map();

  skyfall.api.server.get('/replay', (request, reply) => {
    const response = [];

    for (const [ key ] of captures) {
      response.push(key);
    }

    reply.
      code(200).
      send(response);
  });

  skyfall.api.server.get('/replay/:id', (request, reply) => {
    const id = request.params.id;

    if (!captures.has(id)) {
      reply.
        code(404).
        send({ message: `${ id } not found` });
    } else {
      const response = [];
      const capture = captures.get(id);

      for (const event of capture.events) {
        response.push(event);
      }

      reply.
        code(200).
        send(response);
    }
  });

  skyfall.api.server.post('/replay/:id/:event', (request, reply) => {
    const id = request.params.id;
    const eventId = request.params.event;

    if (!captures.has(id)) {
      reply.
        code(404).
        send({ message: `${ id } not found` });
    } else {
      const capture = captures.get(id);
      if (!capture.index.has(eventId)) {
        reply.
          code(404).
          send({ message: `event ${ eventId } not found` });
      } else {
        const event = capture.index.get(eventId);
        this.emit(event);
        reply.
          code(200).
          send({ message: 'ok' });
      }
    }
  });

  this.emit = (event) => {
    event = deepClone(event);
    event.timestamp = Date.now();
    event.replayed = true;

    skyfall.events.emit(event);
  };

  this.capture = (pattern, condition) => {
    const capture = {
      id: pattern,
      object: 'capture',
      index: new Map(),
      events: [],
    };

    skyfall.events.on(pattern, condition, (event) => {
      if (!event.replayed) {
        capture.events.push(event);
        capture.index.set(event.id, event);

        if (capture.events.length > size) {
          const old = capture.events.shift();
          capture.index.delete(old.id);
        }
      }
    });

    captures.set(capture.id, capture);

    return capture;
  };
}

module.exports = {
  name: 'replay',
  install: (skyfall, options) => {
    skyfall.replay = new Replay(skyfall, options);
  },
};
