'use strict';

const url = require('url');
const redis = require('redis');

function Redis(skyfall) {
  const connections = new Map();

  this.connection = (address) => {
    if (connections.has(address)) {
      return connections.get(address);
    } else if (address.startsWith('redis://')) {
      return this.connect(address);
    }
    return false;
  };

  this.connect = (...args) => {
    const address = args.shift();
    const callback = args.pop();
    const connectOptions = args.pop();

    if (connections.has(address)) {
      return connections.get(address);
    }

    const id = skyfall.utils.id();
    const pubClient = redis.createClient(address, connectOptions);
    const subClient = redis.createClient(address, connectOptions);

    const parsed = url.parse(address);
    const name = parsed.hostname;

    const connection = {
      id,
      name,
      address,
      get connected() {
        return subClient.connected && pubClient.connected;
      },
      subscriptions: new Set()
    };

    connections.set(id, connection);
    connections.set(address, connection);

    const redisClientError = (error) => {
      if (error) {
        skyfall.events.emit({
          type: `redis:${ name }:error`,
          data: {
            name,
            address,
            message: error.toString()
          },
          source: id
        });
      }
    };

    skyfall.utils.hidden(connection, 'subscribe', (topics) => {
      subClient.subscribe(topics);
    });

    skyfall.utils.hidden(connection, 'unsubscribe', (topics) => {
      subClient.unsubscribe(topics);
    });

    skyfall.utils.hidden(connection, 'publish', (topic, message) => {
      pubClient.publish(topic.toString(), message.toString());
    });

    skyfall.events.on(`redis:${ name }:publish`, (event) => {
      connection.publish(event.data.topic, event.data.message);
    });

    subClient.on('subscribe', (topic) => {
      connection.subscriptions.add(topic);

      skyfall.events.emit({
        type: `redis:${ topic }:subscribed`,
        data: {
          name,
          address,
          topic,
          message: `subscribed to ${ topic }`
        },
        source: id
      });
    });

    subClient.on('unsubscribe', (topic) => {
      connection.subscriptions.delete(topic);

      skyfall.events.emit({
        type: `redis:${ topic }:unsubscribed`,
        data: {
          name,
          address,
          topic,
          message: `unsubscribed from ${ topic }`
        },
        source: id
      });
    });

    subClient.on('message', (topic, payload) => {
      skyfall.events.emit({
        type: `redis:${ topic }:message`,
        data: {
          name,
          address,
          topic,
          message: payload.toString()
        },
        source: id
      });
    });

    pubClient.on('error', (error) => {
      redisClientError(error);
    });

    subClient.on('error', (error) => {
      redisClientError(error);
    });

    let callbackInvoked = false;
    const connected = () => {
      if (connection.connected) {
        if (callback && !callbackInvoked) {
          callbackInvoked = true;

          skyfall.events.emit({
            type: `redis:${ name }:connected`,
            data: connection,
            source: id
          });

          return callback(connection);
        }
        return connection;
      }
      return false;
    };

    pubClient.on('connect', connected);
    subClient.on('connect', connected);

    skyfall.events.emit({
      type: `redis:${ name }:connecting`,
      data: connection,
      source: id
    });

    return connection;
  };
}

module.exports = {
  name: 'redis',
  install: (skyfall, options) => {
    skyfall.redis = new Redis(skyfall, options);
  }
};
