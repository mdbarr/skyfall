'use strict';

const url = require('url');
const mqtt = require('mqtt');

function MQTT(skyfall) {
  const connections = new Map();

  this.connection = (address) => {
    if (connections.has(address)) {
      return connections.get(address);
    } else if (address.startsWith('mqtt://')) {
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
    const client = mqtt.connect(address, connectOptions);

    const parsed = url.parse(address);
    const name = parsed.hostname;

    const connection = {
      id,
      name,
      address,
      get connected() {
        return client.connected;
      }
    };

    connections.set(id, connection);
    connections.set(address, connection);

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

    skyfall.utils.hidden(connection, 'subscribe', (topic) => {
      client.subscribe(topic, (error) => {
        if (!mqttError(error)) {
          skyfall.events.emit({
            type: `mqtt:${ topic }:subscribed`,
            data: {
              name,
              address,
              message: `subscribed to ${ topic.toString() }`
            },
            source: id
          });
        }
      });
    });

    skyfall.utils.hidden(connection, 'unsubscribe', (topic) => {
      client.unsubscribe(topic, (error) => {
        if (!mqttError(error)) {
          skyfall.events.emit({
            type: `mqtt:${ topic }:unsubscribed`,
            data: {
              name,
              address,
              topic,
              message: `unsubscribed from ${ topic.toString() }`
            },
            source: id
          });
        }
      });
    });

    skyfall.utils.hidden(connection, 'publish', (topic, message, options) => {
      client.publish(topic, message, options, (error) => {
        mqttError(error);
      });
    });

    client.on('message', (topic, payload) => {
      skyfall.events.emit({
        type: `mqtt:${ topic }:message`,
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
      if (callback) {
        return callback(connection);
      }
      return connection;
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
