'use strict';

// Copies ../src into ./bugzoo-src so the packaged extension carries the exact engine the CLI uses.
const fs = require('node:fs');
const path = require('node:path');

const from = path.join(__dirname, '..', '..', 'src');
const to = path.join(__dirname, '..', 'bugzoo-src');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`vendored ${fs.readdirSync(to).length} files into bugzoo-src`);
