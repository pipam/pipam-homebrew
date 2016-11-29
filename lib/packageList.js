'use strict';

const { splitOutputString } = require('./utils');
const { exec, asyncFor } = require('then-utils');
const { Readable: ReadableStream } = require('stream');
const pkgInfo = require('./info');
const cancelList = require('./cancelList');

class ListStream extends ReadableStream {
  constructor(listType) {
    super({
      objectMode: true
    });
    this.list = null;
    this.listI = 0;
    this.listType = listType;
    this.inCb = false;
    this.canceled = false;
    this.cancelListener = cancelList.listener = () => this.canceled = true;
    this.listPromise = exec('brew list').then(({ stdout }) => {
      this.list = splitOutputString(stdout);
    });
    this.listPromiseHandlerAdded = false;
  }
  _read() {
    const cb = () => {
      if (this.canceled) return;
      this.inCb = true;
      if (this.listI === this.list.length) {
        if (cancelList.listener === this.cancelListener) cancelList.listener = null;
        return this.push(null);
      }
      const item = this.list[this.listI];
      switch(this.listType) {
        case 0:
          // Detailed
          pkgInfo(item, {
            skipInstalledCheck: true,
            skipUpToDateCheck: false,
            isInstalled: true
          }).then(obj => {
            const shouldContinue = this.push(obj);
            this.listI++;
            if (shouldContinue) return cb();
            this.inCb = false;
          }, err => {
            const shouldContinue = this.push({
              name: item,
              displayName: item,
              description: 'Failed to fetch description',
              version: 'unknown',
              installed: true,
              upToDate: true
            });
            this.listI++;
            if (shouldContinue) return cb();
            this.inCb = false;
          });
          break;
        case 1:
          // Simple
          const obj = {
            name: item,
            displayName: item,
            description: '',
            version: 'unknown',
            installed: true,
            upToDate: true
          };
          const shouldContinue = this.push(obj);
          this.listI++;
          if (shouldContinue) return cb();
          break;
      }
    };
    if (this.list) {
      if (!this.inCb) cb();
    } else if (!this.listPromiseHandlerAdded) {
      this.listPromise.then(cb);
      this.listPromiseHandlerAdded = true;
    }
  }
}

module.exports = (listType) => new ListStream(listType);
