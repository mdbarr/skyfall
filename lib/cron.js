'use strict';

const CronJob = require('cron').CronJob;

function Cron(skyfall) {
  this.jobs = new Map();

  this.job = (pattern, name, callback) => {
    const id = skyfall.utils.id();

    if (!callback) {
      const type = `cron:${ name }:tick`;
      let sequence = 0;

      callback = () => {
        skyfall.events.emit({
          type,
          data: {
            name,
            pattern,
            sequence: sequence++
          },
          source: id
        });
      };
    }

    const job = new CronJob(pattern, callback, null, false, skyfall.config.cron.timezone);

    const cronjob = {
      id,
      name,
      pattern,
      job,
      callback
    };

    this.jobs.set(id, cronjob);

    this.start(id);

    return id;
  };

  this.start = (id) => {
    if (this.jobs.has(id)) {
      const cronjob = this.jobs.get(id);
      if (!cronjob.job.running) {
        cronjob.job.start();

        skyfall.events.emit({
          type: `cron:${ cronjob.name }:started`,
          data: {
            name: cronjob.name,
            pattern: cronjob.pattern
          },
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
          data: {
            name: cronjob.name,
            pattern: cronjob.pattern
          },
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
