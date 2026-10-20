'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-vscode-'));
process.env.BUGZOO_HOME = home;

const { recordCommand, splitCommand } = require('../lib/capture');
const { buildState, diffStates } = require('../lib/state');

const CRASH = [
  '/work/app.js:3',
  '  user.name.first();',
  '            ^',
  '',
  "TypeError: Cannot read properties of undefined (reading 'first')",
  '    at Object.<anonymous> (/work/app.js:3:13)',
].join('\n');

test('splitCommand keeps quoted arguments together', () => {
  assert.deepStrictEqual(splitCommand('node "my app.js" --flag'), ['node', 'my app.js', '--flag']);
});

test('a failing command spawns a wild monster, a clean re-run catches it', () => {
  const cwd = home;
  const before = buildState();
  assert.strictEqual(before.wild.length, 0);

  recordCommand({ commandLine: 'node app.js', exitCode: 1, cwd, output: CRASH });
  const wild = buildState();
  assert.strictEqual(wild.wild.length, 1);
  assert.strictEqual(wild.wild[0].type, 'TypeError');
  assert.strictEqual(diffStates(before, wild).spawned.length, 1);

  recordCommand({ commandLine: 'node app.js', exitCode: 0, cwd, output: '' });
  const done = buildState();
  assert.strictEqual(done.wild.length, 0);
  assert.strictEqual(done.caught.length, 1);
  assert.ok(done.caught[0].power > 0, 'a caught monster carries its battle power');
  assert.strictEqual(diffStates(wild, done).caught.length, 1);
});

test('unknown exit codes and bugzoo itself are ignored', () => {
  assert.strictEqual(recordCommand({ commandLine: 'node app.js', exitCode: undefined, output: CRASH }), null);
  assert.strictEqual(recordCommand({ commandLine: 'bugzoo dex', exitCode: 1, output: CRASH }), null);
  assert.strictEqual(recordCommand({ commandLine: '', exitCode: 1, output: CRASH }), null);
});

test('ANSI colour codes in terminal output do not hide the error', () => {
  const coloured = CRASH.replace('TypeError', '\x1b[31mTypeError\x1b[0m');
  recordCommand({ commandLine: 'node other.js', exitCode: 1, cwd: home, output: coloured });
  assert.ok(buildState().wild.some((c) => c.type === 'TypeError'));
});

test('only bugs from open project folders show as wild', () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-other-'));
  recordCommand({ commandLine: 'node elsewhere.js', exitCode: 1, cwd: other, output: CRASH.replace('first', 'second') });
  assert.ok(buildState().wild.length >= 1);
  assert.strictEqual(buildState([path.join(other, 'nope')]).wild.length, 0);
  assert.ok(buildState([other]).wild.length >= 1);
  assert.ok(buildState([path.dirname(other)]).wild.length >= 1, 'a bug in a sub-folder belongs to the parent folder');
});
