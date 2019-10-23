'use strict';

const path = require('path');
const { Exception } = require('./events');

function Plugins(skyfall) {
  function loader(attempt) {
    let plugin;

    try {
      plugin = require(attempt);
    } catch (error) {
      plugin = false;
    }

    return plugin;
  }

  skyfall.use = function(plugin, options = {}) {
    if (typeof plugin === 'string') {
      const paths = [
        plugin,
        path.join(process.cwd(), plugin),
        path.join('../plugins/', plugin),
        `${ skyfall.name }/${ plugin }`
      ];
      for (const attempt of paths) {
        plugin = loader(attempt);
        if (typeof plugin === 'object' && plugin.install) {
          return plugin.install(skyfall, options);
        }
      }

      const error = new Error(`Unable to locate or load ${ paths[0] }`);
      skyfall.events.emit(new Exception(error, 'skyfall:plugin:error'));

      return error;
    }

    if (typeof plugin === 'function') {
      return plugin(skyfall, options);
    } else if (typeof plugin === 'object') {
      if (typeof plugin.install === 'function') {
        return plugin.install(skyfall, options);
      } else if (typeof plugin.register === 'function') {
        return plugin.register(skyfall, options);
      }
    }

    const error = new Error('Unsure how to install plugin');
    return skyfall.events.emit(new Exception(error, 'skyfall:plugin:error'));
  };

  skyfall.register = skyfall.use;
}

module.exports = function(skyfall) {
  return new Plugins(skyfall);
};
