'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Inside the repo we use ../src (always current); a packaged extension carries ./bugzoo-src (see scripts/vendor.js).
const repoSrc = path.join(__dirname, '..', '..', 'src');
const root = fs.existsSync(path.join(repoSrc, 'session.js')) ? repoSrc : path.join(__dirname, '..', 'bugzoo-src');
const load = (name) => require(path.join(root, name));

module.exports = {
  session: load('session'),
  store: load('store'),
  parse: load('parse'),
  power: load('power'),
  remote: load('remote'),
  ladder: load('ladder'),
  battle: load('battle'),
  friends: load('friends'),
  opponents: load('opponents'),
  accept: load('accept'),
  achievements: load('achievements'),
  score: load('score'),
  creature: load('creature'),
  i18n: load('i18n'),
};
