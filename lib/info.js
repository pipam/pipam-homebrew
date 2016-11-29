'use strict';

const { get } = require('http');
const { exec } = require('then-utils');

module.exports = (pkg, { skipInstalledCheck = false, skipUpToDateCheck = false, isInstalled = false } = {}) => {
  return new Promise((resolve, reject) => {
    // brewformulas.org doesn't resolve casked formulas
    // (e.g. Caskroom/cask/node-profiler, homebrew/versions/node5, etc.)
    if (pkg.includes('/')) return reject(404);

    const obj = {
      name: pkg,
      displayName: pkg,
      description: 'Failed to fetch description',
      version: 'unknown',
      installed: isInstalled || false,
      upToDate: true
    };

    // parallelization/concurrency 🙂
    // (resolve info quicker)
    let cmdDone = false;
    let reqDone = false;

    let cmdProm = null;
    let reqProm = null;

    cmdProm = Promise.resolve();
    if (!skipInstalledCheck) {
      cmdProm = exec(`brew ls --versions ${pkg}`).then(({ stdout, stderr }) => {
        stdout = String(stdout);
        if (stdout !== '') {
          // stdout isn't empty, some version is installed
          obj.installed = true;
          obj.version = stdout.split(' ')[1];
        }
      }, err => {
        return Promise.resolve();
      });
    }
    cmdProm = cmdProm.then(() => {
      if (!skipUpToDateCheck) {
        return exec(`brew outdated ${pkg}`).then(({ stdout, stderr }) => {
          return;
        }, err => {
          // errors are returned when it exits with a non-zero exit code,
          // and when there's an update available, it exits with a non-zero exit code,
          // so...
          obj.upToDate = false;
          return Promise.resolve();
        });
      }
    }).then(() => {
      cmdDone = true;
      if (!reqDone) {
        reqProm.then(() => resolve(obj), err => reject(err));
      }
    });

    reqProm = new Promise((resolve2, reject2) => {
      get(`http://brewformulas.org/${pkg}.json`, res => {
        if (res.statusCode !== 200) return reject2(res.statusCode);

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          obj.description = json.description;
          reqDone = true;
          resolve2();
          if (!cmdDone) {
            cmdProm.then(() => resolve(obj), err => reject(err));
          }
        });
      });
    });
  });
};
