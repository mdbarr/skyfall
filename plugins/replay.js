'use strict';

require('barrkeep/shim');
const uuid = require('uuid/v4');

function Replay(skyjack, { size = 10 }) {
  const captures = new Map();

  skyjack.api.server.get('/replay/list', (request, reply) => {
    const response = [];

    for (const [ key ] of captures) {
      response.push(key);
    }

    reply.
      code(200).
      send(response);
  });

  skyjack.api.server.get('/replay/:id/list', (request, reply) => {
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

  skyjack.api.server.post('/replay/:id/:event', (request, reply) => {
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
    event = Object.$clone(event);
    event.timestamp = Date.now();
    event.replayed = true;

    skyjack.events.emit(event);
  };

  this.capture = (pattern, condition) => {
    const capture = {
      id: uuid(),
      object: 'capture',
      index: new Map(),
      events: []
    };

    skyjack.events.on(pattern, condition, (event) => {
      capture.events.push(event);
      capture.index.set(event.id, event);

      if (capture.events.length > size) {
        const old = capture.events.shift();
        capture.index.delete(old.id);
      }
    });

    captures.set(capture.id, capture);

    return capture;
  };
}

module.exports = {
  name: 'replay',
  install: (skyjack, options) => {
    skyjack.replay = new Replay(skyjack, options);
  }
};
