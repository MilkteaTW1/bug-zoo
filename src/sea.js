'use strict';

/** True when running as the single-file executable (Node's single executable application), not under `node`. */
function isSea() {
  try {
    return require('node:sea').isSea();
  } catch {
    return false; // Node older than 21.7: never a single executable
  }
}

const NEEDS_NPM = 'this needs the npm install (npm install -g bug-zoo): the standalone program has no Node to hook into';

module.exports = { isSea, NEEDS_NPM };
