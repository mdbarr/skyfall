'use strict';

const fs = require('fs');

function Watch(skyfall) {
  const watchers = new Map();

  this.file = (path, name, options = {}) => {
    const id = skyfall.utils.id();
    const alias = skyfall.utils.alias(name);
    const watch = {
      id,
      name,
      alias,
      path
    };

    const watcher = fs.watch(path, options, (eventType, filename) => {
      skyfall.events.emit({
        type: `watch:${ name }:${ eventType.toLowerCase() }`,
        data: {
          ...watch,
          eventType,
          filename: filename ? filename.toString() : path
        },
        source: id
      });
    });

    if (watcher) {
      watcher.on('close', () => {
        skyfall.events.emit({
          type: `watch:${ name }:closed`,
          data: watch,
          source: id
        });
      });

      watcher.on('error', (error) => {
        skyfall.events.emit({
          type: `watch:${ name }:error`,
          data: error,
          source: id
        });
      });

      skyfall.utils.hidden(watch, 'watcher', watcher);

      skyfall.utils.hidden(watch, 'close', () => {
        watcher.close();
      });

      watchers.set(id, watch);
      watchers.set(name, watch);

      Object.defineProperty(this, alias, {
        configurable: false,
        enumerable: false,
        value: watch,
        writable: false
      });

      skyfall.events.emit({
        type: `watch:${ name }:watching`,
        data: watch,
        source: id
      });

      return watch;
    }
    return false;
  };

  this.directory = (path, name, options = {}) => {
    options.recursive = true;
    return this.file(path, name, options);
  };
}

module.exports = {
  name: 'watch',
  install: (skyfall, options) => {
    skyfall.watch = new Watch(skyfall, options);
  }
};
