'use strict';

const uuid = require('uuid/v4');
const CronJob = require('cron').CronJob;

function Cron(skyfall) {
  this.jobs = new Map();

  this.job = (pattern, name, callback) => {
    const id = uuid();

    if (!callback) {
      const type = `cron:${ name }:tick`;
      let sequence = 0;

      callback = () => {
        skyfall.events.emit({
          type,
          data: {
            name,
            sequence: sequence++
          },
          source: id
        });
      };
    }

    const job = new CronJob(pattern, callback);

    const cronjob = {
      id,
      name,
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
          data: null,
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
          data: null,
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