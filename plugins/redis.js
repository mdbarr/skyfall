'use strict';

const redis = require('redis');

function Redis(skyfall) {
  const connections = new Map();

  this.connection = (id) => {
    if (connections.has(id)) {
      return connections.get(id);
    }
    return false;
  };

  this.connect = (...args) => {
    const address = args.shift();
    const name = args.shift();
    const callback = args.pop();
    const connectOptions = args.pop();

    if (connections.has(address)) {
      return connections.get(address);
    }

    const id = skyfall.utils.id();
    const alias = skyfall.utils.alias(name);
    const pubClient = redis.createClient(address, connectOptions);
    const subClient = redis.createClient(address, connectOptions);

    const connection = {
      id,
      name,
      alias,
      address,
      get connected() {
        return subClient.connected && pubClient.connected;
      },
      subscriptions: new Set()
    };

    connections.set(id, connection);
    connections.set(address, connection);
    connections.set(name, connection);

    Object.defineProperty(this, alias, {
      configurable: false,
      enumerable: false,
      value: connection,
      writable: false
    });

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
        type: `redis:${ name }:subscribed`,
        data: {
          name,
          address,
          topic,
          message: `subscribed to ${ topic }`,
          subscriptions: connection.subscriptions
        },
        source: id
      });
    });

    subClient.on('unsubscribe', (topic) => {
      connection.subscriptions.delete(topic);

      skyfall.events.emit({
        type: `redis:${ name }:unsubscribed`,
        data: {
          name,
          address,
          topic,
          message: `unsubscribed from ${ topic }`,
          subscriptions: connection.subscriptions
        },
        source: id
      });
    });

    subClient.on('message', (topic, payload) => {
      skyfall.events.emit({
        type: `redis:${ name }:${ topic }`,
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
