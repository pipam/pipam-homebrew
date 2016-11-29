'use strict';

const {
  packageList,
  cancelList,
  install,
  installLogs,
  uninstallLogs,
  uninstall,
  info,
  search,
  update,
  updateLogs
} = require('./lib');

module.exports = {
  properties: {
    emitsProgressEvents: false,
    isSearchable: true,
    isLoggable: true
  },
  packageList,
  cancelList,
  install,
  installLogs,
  uninstallLogs,
  uninstall,
  info,
  search,
  update,
  updateLogs
};
