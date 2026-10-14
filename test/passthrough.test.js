'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { needsTerminal } = require('../src/passthrough');

test('commands that prompt are passed through untouched', () => {
  for (const argv of [
    ['npm', 'publish'], ['npm', 'publish', '--otp=123456'], ['npm', '--silent', 'login'], ['npm.cmd', 'init', '-y'],
    ['npx', 'create-vite'], ['npx.cmd', 'something'], ['pnpm', 'create', 'vite'], ['yarn', 'publish'],
    ['cargo', 'login'], ['C:\\Program Files\\nodejs\\npm.cmd', 'adduser'],
  ]) assert.equal(needsTerminal(argv), true, argv.join(' '));
});

test('everyday commands are still captured', () => {
  for (const argv of [
    ['npm', 'run', 'build'], ['npm', 'test'], ['npm', 'install'], ['pnpm', 'run', 'dev'], ['yarn', 'build'],
    ['python', 'app.py'], ['pytest', '-q'], ['go', 'test', './...'], ['cargo', 'build'], ['dotnet', 'run'],
  ]) assert.equal(needsTerminal(argv), false, argv.join(' '));
});

test('BUGZOO_DISABLE=1 runs the command untouched: no card, no record, exit code kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-raw-'));
  const home = path.join(dir, 'home');
  fs.writeFileSync(path.join(dir, 'boom.js'), 'null.x;\n');
  const bin = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', NODE_OPTIONS: '', BUGZOO_DISABLE: '1' };
  const r = spawnSync(process.execPath, [bin, 'run', 'node', 'boom.js'], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /TypeError/);
  assert.ok(!/wild/.test(r.stderr));
  assert.ok(!fs.existsSync(path.join(home, 'dex.json')));
});
