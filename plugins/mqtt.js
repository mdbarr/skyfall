'use strict';

const url = require('url');
const mqtt = require('mqtt');
const uuid = require('uuid/v4');

function MQTT(skyfall) {
  const connections = new Map();

  this.connect = (...args) => {
    const address = args.shift();
    const callback = args.pop();
    const connectOptions = args.pop();

    const id = uuid();
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

    const mqttError = (error) => {
      if (error) {
        skyfall.events.emit({
          type: `mqtt:${ name }:error`,
          data: error.toString(),
          source: id
        });
      }
    };

    connection.subscribe = (topic) => {
      client.subscribe(topic, (error) => {
        mqttError(error);
      });
    };

    connection.unsubscribe = (topic) => {
      client.unsubscribe(topic, (error) => {
        mqttError(error);
      });
    };

    connection.publish = (topic, message, options) => {
      client.publish(topic, message, options, (error) => {
        mqttError(error);
      });
    };

    connections.set(id, connection);

    client.on('connect', () => {
      if (callback) {
        return callback(connection);
      }
      return connection;
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

    return connection;
  };
}

module.exports = {
  name: 'mqtt',
  install: (skyfall, options) => {
    skyfall.mqtt = new MQTT(skyfall, options);
  }
};
