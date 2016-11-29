'use strict';

module.exports = {
  splitOutputString(str) {
    return String(str).split(/[\s\n]+/).filter((a) => a !== '');
  }
};
