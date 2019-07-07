'use strict';

const path = require('path');

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
      throw new Error(`Unable to locate or load ${ paths[0] }`);
    } else {
      return plugin.install(skyfall, options);
    }
  };
}

module.exports = function(skyfall) {
  return new Plugins(skyfall);
};
