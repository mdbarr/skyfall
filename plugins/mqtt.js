'use strict';

const mqtt = require('mqtt');

function MQTT(skyfall) {
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
    const alias = `$${ name.toLowerCase().replace(/[^\w]+/, '') }`;
    const client = mqtt.connect(address, connectOptions);

    const connection = {
      id,
      name,
      alias,
      address,
      get connected() {
        return client.connected;
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
      writable: false,
    });

    const mqttError = (error) => {
      if (error) {
        skyfall.events.emit({
          type: `mqtt:${ name }:error`,
          data: {
            name,
            address,
            message: error.toString()
          },
          source: id
        });
        return error;
      }
      return false;
    };

    skyfall.utils.hidden(connection, 'subscribe', (topics) => {
      client.subscribe(topics, (error) => {
        if (!mqttError(error)) {
          if (!Array.isArray(topics)) {
            topics = [ topics ];
          }

          for (const topic of topics) {
            connection.subscriptions.add(topic);

            skyfall.events.emit({
              type: `mqtt:${ name }:subscribed`,
              data: {
                name,
                address,
                topic,
                message: `subscribed to ${ topic }`,
                subscriptions: connection.subscriptions
              },
              source: id
            });
          }
        }
      });
    });

    skyfall.utils.hidden(connection, 'unsubscribe', (topics) => {
      client.unsubscribe(topics, (error) => {
        if (!mqttError(error)) {
          if (!Array.isArray(topics)) {
            topics = [ topics ];
          }

          for (const topic of topics) {
            connection.subscriptions.delete(topic);

            skyfall.events.emit({
              type: `mqtt:${ name }:unsubscribed`,
              data: {
                name,
                address,
                topic,
                message: `unsubscribed from ${ topic }`,
                subscriptions: connection.subscriptions
              },
              source: id
            });
          }
        }
      });
    });

    skyfall.utils.hidden(connection, 'publish', (topic, message, options) => {
      client.publish(topic.toString(), message.toString(), options, (error) => {
        mqttError(error);
      });
    });

    skyfall.events.on(`mqtt:${ name }:publish`, (event) => {
      connection.publish(event.data.topic, event.data.message);
    });

    client.on('message', (topic, payload) => {
      skyfall.events.emit({
        type: `mqtt:${ name }:${ topic }`,
        data: {
          name,
          address,
          topic,
          message: payload.toString()
        },
        source: id
      });
    });

    client.on('error', (error) => {
      mqttError(error);
    });

    client.on('connect', () => {
      skyfall.events.emit({
        type: `mqtt:${ name }:connected`,
        data: connection,
        source: id
      });

      if (callback) {
        return callback(connection);
      }
      return connection;
    });

    skyfall.events.emit({
      type: `mqtt:${ name }:connecting`,
      data: connection,
      source: id
    });

    return connection;
  };
}

module.exports = {
  name: 'mqtt',
  install: (skyfall, options) => {
    skyfall.mqtt = new MQTT(skyfall, options);
  }
};
