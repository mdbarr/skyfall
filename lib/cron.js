'use strict';

const CronJob = require('cron').CronJob;

function Cron(skyfall) {
  this.jobs = new Map();

  this.job = (pattern, name, callback) => {
    const id = skyfall.utils.id();
    const alias = `$${ name.toLowerCase().replace(/[^\w]+/, '') }`;

    const cronjob = {
      id,
      name,
      alias,
      pattern
    };

    if (!callback) {
      const type = `cron:${ name }:tick`;
      let sequence = 0;

      callback = () => {
        skyfall.events.emit({
          type,
          data: {
            ...cronjob,
            sequence: sequence++
          },
          source: id
        });
      };
    }

    const job = new CronJob(pattern, callback, null, false, skyfall.config.cron.timezone);

    skyfall.utils.hidden(cronjob, 'job', job);
    skyfall.utils.hidden(cronjob, 'callback', callback);

    skyfall.utils.hidden(cronjob, 'start', () => {
      this.start(cronjob.id);
    });

    skyfall.utils.hidden(cronjob, 'stop', () => {
      this.stop(cronjob.id);
    });

    this.jobs.set(id, cronjob);

    Object.defineProperty(this, alias, {
      configurable: false,
      enumerable: false,
      value: cronjob,
      writable: false
    });

    cronjob.start();

    return cronjob;
  };

  this.start = (id) => {
    if (this.jobs.has(id)) {
      const cronjob = this.jobs.get(id);
      if (!cronjob.job.running) {
        cronjob.job.start();

        skyfall.events.emit({
          type: `cron:${ cronjob.name }:started`,
          data: cronjob,
          source: cronjob.id
        });

        return true;
      }
    }

    return false;
  };

  this.stop = (id) => {
    if (this.jobs.has(id)) {
      const cronjob = this.jobs.get(id);
      if (cronjob.job.running) {
        cronjob.job.stop();

        skyfall.events.emit({
          type: `cron:${ cronjob.name }:stopped`,
          data: cronjob,
          source: cronjob.id
        });

        return true;
      }
    }

    return false;
  };
}

module.exports = function(skyfall) {
  return new Cron(skyfall);
};
