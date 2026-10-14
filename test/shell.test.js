'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../src/wrappers');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
const have = (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' }).status === 0;

// These exercise the generated bash/zsh functions in a real shell, so they only run where one exists.
const skip = process.platform === 'win32' || !have('bash') || !have('python3');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-shell-'));
  fs.writeFileSync(path.join(dir, 'fail.py'), 'd = {}\nprint(d["k"])\n');
  fs.writeFileSync(path.join(dir, 'ok.py'), 'print("fine")\n');
  const env = { ...process.env, BUGZOO_HOME: path.join(dir, 'home'), BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  delete env.BUGZOO_ACTIVE;
  delete env.BUGZOO_DISABLE;
  return { dir, env };
}

const run = (dir, env, script) => spawnSync('bash', ['-c', script], { cwd: dir, env, encoding: 'utf8' });
const block = () => W.shFunctions(process.execPath, BIN);

test('bash wrapper: a failing python3 script spawns a bug, the fixed one catches it', { skip }, () => {
  const { dir, env } = setup();
  const first = run(dir, env, `${block()}\npython3 fail.py`);
  assert.equal(first.status, 1);
  assert.match(first.stderr, /KeyError/); // the program's own output is still shown
  assert.match(first.stderr, /A wild KeyError appeared!/);

  fs.writeFileSync(path.join(dir, 'fail.py'), 'print("fixed")\n');
  const second = run(dir, env, `${block()}\npython3 fail.py`);
  assert.equal(second.status, 0);
  assert.match(second.stdout, /fixed/);
  assert.match(second.stderr, /\[CAUGHT\]/);
});

test('bash wrapper: a healthy run prints nothing extra and keeps its exit code', { skip }, () => {
  const { dir, env } = setup();
  const r = run(dir, env, `${block()}\npython3 ok.py`);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'fine\n');
  assert.equal(r.stderr, '');
});

test('bash wrapper: no arguments runs the real command untouched (REPLs keep working)', { skip }, () => {
  const { dir, env } = setup();
  const r = spawnSync('bash', ['-c', `${block()}\nprintf 'print(1+1)\\n' | python3`], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '2');
  assert.ok(!/wild/.test(r.stderr));
});

test('bash wrapper: the real profile block (Node preload + functions) is valid shell', { skip: process.platform === 'win32' || !have('bash') }, () => {
  const auto = require('../src/autostart');
  const r = spawnSync('bash', ['-n', '-c', auto.block(process.execPath, BIN)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
