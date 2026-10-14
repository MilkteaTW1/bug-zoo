'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../src/wrappers');
const auto = require('../src/autostart');
const { normalizeArgv } = require('../src/key');

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('cmd script defines a doskey macro per runtime and never wraps node', () => {
  const s = W.cmdScript('C:\\Program Files\\nodejs\\node.exe', 'C:\\bz\\bin\\bugzoo.js');
  assert.match(s, /doskey python="C:\\Program Files\\nodejs\\node.exe" "C:\\bz\\bin\\bugzoo.js" run python \$\*/);
  assert.match(s, /doskey go=/);
  assert.ok(!/doskey node=/.test(s));
});

test('PowerShell and shell blocks are marked, wrap every runtime and keep REPLs untouched', () => {
  const ps = W.psBlock('C:\\n\\node.exe', 'C:\\bz\\bugzoo.js');
  assert.ok(ps.startsWith(W.START) && ps.endsWith(W.END));
  for (const c of W.COMMANDS) assert.ok(ps.includes(`function global:${c} `), c);
  assert.match(ps, /if \(\$args\.Count -eq 0\)/);
  const sh = W.shBlock('/usr/bin/node', '/bz/bin/bugzoo.js');
  assert.match(sh, /python\(\) \{ if \[ \$# -eq 0 \]; then command python;/);
});

test('upsertBlock is idempotent and strip removes only our block', () => {
  const block = W.psBlock('e', 'b');
  const once = W.upsertBlock('Set-Alias x y\n', block);
  const twice = W.upsertBlock(once, block);
  assert.equal(once, twice);
  const stripped = W.stripBlock(twice);
  assert.ok(stripped.includes('Set-Alias x y'));
  assert.ok(!stripped.includes('bugzoo'));
});

test('cmd AutoRun keeps the player\'s existing value and restores it', () => {
  const file = 'C:\\Users\\p\\.bugzoo\\autorun.cmd';
  assert.equal(W.mergeAutorun('', file), `"${file}"`);
  const merged = W.mergeAutorun('echo hi', file);
  assert.equal(merged, `echo hi & "${file}"`);
  assert.equal(W.mergeAutorun(merged, file), merged); // idempotent
  assert.equal(W.stripAutorun(merged, file), 'echo hi');
  assert.equal(W.stripAutorun(`"${file}"`, file), '');
});

test('unix profile block carries both the Node preload and the wrappers', () => {
  const b = auto.block('/usr/bin/node', '/bz/bin/bugzoo.js');
  assert.match(b, /NODE_OPTIONS/);
  assert.match(b, /cargo\(\)/);
  assert.ok(!auto.stripBlock(`a\n${b}\nb\n`).includes('cargo'));
});

test('command identity resolves file arguments, wherever they live', () => {
  const dir = tmp('bugzoo-key-');
  fs.writeFileSync(path.join(dir, 'app.py'), '');
  const a = normalizeArgv(['python', 'app.py', '--x'], dir);
  const b = normalizeArgv(['C:\\Python\\python.exe', './app.py'], dir);
  const c = normalizeArgv(['python', path.join(dir, 'app.py')], dir);
  assert.deepEqual(a, ['python', 'app.py']);
  assert.deepEqual(b, a);
  assert.deepEqual(c, a);
});

test('preload covers a project outside the current folder, but only terminal-started runs', () => {
  const project = tmp('bugzoo-proj-');
  const elsewhere = tmp('bugzoo-cwd-');
  fs.writeFileSync(path.join(project, 'app.js'), 'null.x;\n');
  const base = {
    ...process.env, BUGZOO_HOME: path.join(project, 'home'), BUGZOO_LANG: 'en',
    NODE_OPTIONS: `--require "${auto.REGISTER_ARG}"`,
  };
  delete base.BUGZOO_FORCE;

  // Started by a tool (no TTY): ignored.
  const tool = spawnSync(process.execPath, [path.join(project, 'app.js')], { cwd: elsewhere, env: base, encoding: 'utf8' });
  assert.ok(!/wild/.test(tool.stderr));

  // Started by the player (forced TTY): captured even though cwd is another folder.
  const hand = spawnSync(process.execPath, [path.join(project, 'app.js')],
    { cwd: elsewhere, env: { ...base, BUGZOO_FORCE: '1' }, encoding: 'utf8' });
  assert.match(hand.stderr, /A wild TypeError appeared!/);
});
