'use strict';

// Scripted walkthrough for recording a demo GIF (ScreenToGif, vhs, asciinema + agg...).
// Usage: node demo/demo.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const bin = path.join(__dirname, '..', 'bin', 'bugzoo.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-demo-'));
const env = { ...process.env, BUGZOO_HOME: path.join(dir, '.home'), BUGZOO_LADDER_DIR: path.join(dir, 'no-ladder') };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function step(title, file, body, args) {
  if (body !== null) fs.writeFileSync(path.join(dir, file), body);
  console.log(`\n# ${title}`);
  console.log(`$ bugzoo ${args.join(' ')}`);
  sleep(700);
  try {
    execFileSync(process.execPath, [bin, ...args], { cwd: dir, env, stdio: 'inherit' });
  } catch { /* the demo's commands are meant to fail */ }
  sleep(1200);
}

fs.writeFileSync(path.join(dir, 'db.js'), 'module.exports = { get: () => null };\n');
fs.writeFileSync(path.join(dir, 'api.js'), "const db = require('./db');\nmodule.exports = () => db.get().rows;\n");

step('1. Something breaks - a bug appears', 'app.js', "require('./api')();\n", ['run', 'node', 'app.js']);
step('2. A "fix" that makes it worse - it escapes', 'app.js', 'throw new RangeError("off by one");\n', ['run', 'node', 'app.js']);
step('3. Really fix it - caught!', 'app.js', "console.log('all good');\n", ['run', 'node', 'app.js']);
step('4. Your strongest catches', null, null, ['team']);
step('5. Practice battle (the only opponent offline is the practice one)', null, null, ['battle', '--pick', '1']);
