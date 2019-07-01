'use strict';

const url = require('url');
const mqtt = require('mqtt');

function MQTT(skyfall) {
  const connections = new Map();

  this.connect = (...args) => {
    const address = args.shift();
    const callback = args.pop();
    const connectOptions = args.pop();

    const id = skyfall.utils.id();
    const client = mqtt.connect(address, connectOptions);

    const parsed = url.parse(address);
    const name = parsed.hostname;

    const connection = {
      id,
      server: parsed.hostname,
      get connected() {
        return client.connected;
      }
    };

    connections.set(id, connection);

    const mqttError = (error) => {
      if (error) {
        skyfall.events.emit({
          type: `mqtt:${ name }:error`,
          data: error.toString(),
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
            type: `mqtt:${ name }:${ topic }:subscribed`,
            data: topic.toString(),
            source: id
          });
        }
      });
    });

    skyfall.utils.hidden(connection, 'unsubscribe', (topic) => {
      client.unsubscribe(topic, (error) => {
        mqttError(error);
      });
    });

    skyfall.utils.hidden(connection, 'publish', (topic, message, options) => {
      client.publish(topic, message, options, (error) => {
        mqttError(error);
      });
    });

    client.on('message', (topic, payload) => {
      skyfall.events.emit({
        type: `mqtt:${ name }:${ topic }`,
        data: payload.toString(),
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
