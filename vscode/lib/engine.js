'use strict';

const fs = require('node:fs');
const path = require('node:path');

// A packaged extension carries ./bugzoo-src (see scripts/vendor.js); inside the repo we use ../src.
const vendored = path.join(__dirname, '..', 'bugzoo-src');
const root = fs.existsSync(vendored) ? vendored : path.join(__dirname, '..', '..', 'src');

module.exports = {
  session: require(path.join(root, 'session')),
  store: require(path.join(root, 'store')),
  parse: require(path.join(root, 'parse')),
  power: require(path.join(root, 'power')),
};
