'use strict';

const { splitOutputString } = require('./utils');
const { exec, asyncFor } = require('then-utils');
const { Readable: ReadableStream } = require('stream');
const pkgInfo = require('./info');

const notFoundMsg = 'No formula found for';

class ListStream extends ReadableStream {
  constructor(searchTerm) {
    super({
      objectMode: true
    });
    this.list = null;
    this.listI = 0;
    this.inCb = false;
    this.listPromise = exec(`brew search ${searchTerm}`).then(({ stdout }) => {
      this.list = splitOutputString(stdout);
    });
    this.listPromiseHandlerAdded = false;
  }
  _read() {
    const cb = () => {
      this.inCb = true;
      if (this.listI === this.list.length) return this.push(null);
      const item = this.list[this.listI];
      pkgInfo(item).then(obj => {
        const shouldContinue = this.push(obj);
        this.listI++;
        if (shouldContinue) return cb();
        this.inCb = false;
      }, err => {
        const shouldContinue = this.push({
          name: item,
          displayName: item,
          description: 'Failed to fetch description',
          version: 'unknown'
        });
        this.listI++;
        if (shouldContinue) return cb();
        this.inCb = false;
      });
    };
    if (this.list) {
      if (!this.inCb) cb();
    } else if (!this.listPromiseHandlerAdded) {
      this.listPromise.then(cb);
      this.listPromiseHandlerAdded = true;
    }
  }
}

module.exports = (searchTerm) => {
  return exec(`brew search ${searchTerm}`).then(({ stdout }) => {
    if (stdout.substr(0, notFoundMsg.length) === notFoundMsg) {
      // no results
      return Promise.reject(204);
    } else {
      return new ListStream(searchTerm);
    }
  });
};
