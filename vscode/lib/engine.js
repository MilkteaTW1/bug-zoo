'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Inside the repo we use ../src (always current); a packaged extension carries ./bugzoo-src (see scripts/vendor.js).
const repoSrc = path.join(__dirname, '..', '..', 'src');
const root = fs.existsSync(path.join(repoSrc, 'session.js')) ? repoSrc : path.join(__dirname, '..', 'bugzoo-src');

module.exports = {
  session: require(path.join(root, 'session')),
  store: require(path.join(root, 'store')),
  parse: require(path.join(root, 'parse')),
  power: require(path.join(root, 'power')),
  remote: require(path.join(root, 'remote')),
  ladder: require(path.join(root, 'ladder')),
};
