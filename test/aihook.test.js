'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ai = require('../src/aihook');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

// --- turning what an AI ran into "the thing under test" ----------------------------------------

test('plain commands stay as they are', () => {
  assert.deepEqual(ai.simplifyCommand('node app.js', '/p').argv, ['node', 'app.js']);
  assert.deepEqual(ai.simplifyCommand('python3 -m pytest -q tests/', '/p').argv, ['python3', '-m', 'pytest', '-q', 'tests/']);
});

test('cd becomes the working folder; pipes and redirections are dropped', () => {
  const r = ai.simplifyCommand('cd /work/app && python3 main.py --verbose 2>&1 | tail -20', '/p');
  assert.deepEqual(r.argv, ['python3', 'main.py', '--verbose']);
  assert.equal(path.resolve(r.cwd), path.resolve('/work/app'));
  assert.deepEqual(ai.simplifyCommand('npm test > out.txt 2>&1', '/p').argv, ['npm', 'test']);
});

test('compound commands keep every real step, quotes are respected', () => {
  assert.deepEqual(ai.simplifyCommand('npm run build && npm test', '/p').argv, ['npm', 'run', 'build', '&&', 'npm', 'test']);
  assert.deepEqual(ai.simplifyCommand('echo "a && b" | grep a', '/p').argv, ['echo', 'a && b']);
});

test('the AI and a person running the same thing land on the same identity', () => {
  const { commandKey } = require('../src/session');
  const dir = tmp('bz-ident-');
  fs.writeFileSync(path.join(dir, 'app.js'), '');
  const byAi = ai.simplifyCommand(`cd "${dir}" && node ./app.js 2>&1 | tail -5`, '/elsewhere');
  const byHand = ['node', 'app.js'];
  assert.equal(commandKey(byAi.argv, byAi.cwd), commandKey(byHand, dir));
});

test('commands about bugzoo itself are ignored', () => {
  assert.equal(ai.looksLikeBugzoo('bugzoo run node app.js'), true);
  assert.equal(ai.looksLikeBugzoo('node C:/x/bin/bugzoo.js battle'), true);
  assert.equal(ai.looksLikeBugzoo('node app.js'), false);
  assert.equal(ai.looksLikeBugzoo('echo bugzooish'), false);
});

// --- handling a hook event ---------------------------------------------------------------------

test('a failed Bash call is a failing run; the "Exit code" prefix is read and stripped', () => {
  let seen = null;
  const r = ai.handle({
    hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', cwd: '/p',
    tool_input: { command: 'node app.js' }, error: 'Exit code 3\nTypeError: boom\n    at x',
  }, { settle: (a) => { seen = a; return 'CARD'; } });
  assert.equal(r.message, 'CARD');
  assert.equal(seen.exit, 3);
  assert.equal(seen.stderr, 'TypeError: boom\n    at x');
  assert.deepEqual(seen.argv, ['node', 'app.js']);
});

test('a successful Bash call is a clean run', () => {
  let seen = null;
  ai.handle({
    hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: '/p',
    tool_input: { command: 'node app.js' }, tool_response: { stdout: 'ok', stderr: '', interrupted: false },
  }, { settle: (a) => { seen = a; return ''; } });
  assert.equal(seen.exit, 0);
});

test('other tools, interrupted calls, unknown events and bugzoo commands do nothing', () => {
  const never = () => { throw new Error('should not run'); };
  const base = { tool_name: 'Bash', cwd: '/p', tool_input: { command: 'node a.js' } };
  for (const p of [
    { ...base, tool_name: 'Read', hook_event_name: 'PostToolUse' },
    { ...base, hook_event_name: 'PostToolUseFailure', error: 'Exit code 1\nx', is_interrupt: true },
    { ...base, hook_event_name: 'PostToolUse', tool_response: { interrupted: true } },
    { ...base, hook_event_name: 'PreToolUse' },
    { ...base, hook_event_name: 'PostToolUse', tool_input: { command: 'bugzoo run node a.js' } },
    null,
  ]) assert.equal(ai.handle(p, { settle: never }).message, '');
});

test('end to end with a real dex: AI fails, AI fixes, the monster is caught; cards carry no colour codes', () => {
  const home = tmp('bz-ai-home-');
  process.env.BUGZOO_HOME = home;
  process.env.BUGZOO_LANG = 'en';
  const dir = tmp('bz-ai-proj-');
  const fail = {
    hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', cwd: dir,
    tool_input: { command: 'node app.js' }, error: "Exit code 1\nTypeError: Cannot read properties of null (reading 'x')",
  };
  const ok = {
    hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: dir,
    tool_input: { command: 'node app.js' }, tool_response: { stdout: 'fine', stderr: '', interrupted: false },
  };
  const a = ai.handle(fail).message;
  assert.match(a, /A wild TypeError appeared!/);
  assert.ok(!/\x1b\[/.test(a));
  const b = ai.handle(ok).message;
  assert.match(b, /\[CAUGHT\]/);
  assert.equal(ai.handle(ok).message, '', 'a healthy run with nothing pending says nothing');
});

// --- the settings file -------------------------------------------------------------------------

test('enable adds both events once, keeps everything else, and disable restores the file', () => {
  const file = path.join(tmp('bz-ai-set-'), 'settings.json');
  const before = {
    theme: 'dark',
    hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo mine' }] }] },
  };
  fs.writeFileSync(file, JSON.stringify(before));

  assert.equal(ai.status(file).enabled, false);
  assert.equal(ai.enable(file, '"node" "/x/bugzoo.js" ai-hook').ok, true);
  assert.equal(ai.enable(file, '"node" "/x/bugzoo.js" ai-hook').ok, true); // idempotent
  const on = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(on.theme, 'dark');
  assert.equal(on.hooks.PostToolUse.length, 2);
  assert.equal(on.hooks.PostToolUseFailure.length, 1);
  assert.equal(on.hooks.PostToolUseFailure[0].matcher, 'Bash');
  assert.equal(ai.status(file).enabled, true);

  assert.equal(ai.disable(file).ok, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), before);
  assert.equal(ai.status(file).enabled, false);
});

test('a settings file that is not plain JSON is never overwritten', () => {
  const file = path.join(tmp('bz-ai-bad-'), 'settings.json');
  const text = '{ // a comment\n "theme": "dark" }';
  fs.writeFileSync(file, text);
  const r = ai.enable(file);
  assert.equal(r.ok, false);
  assert.match(r.error, /not plain JSON/);
  assert.equal(fs.readFileSync(file, 'utf8'), text);
});

test('the hook command uses forward slashes and quotes, so it survives bash on Windows', () => {
  const c = ai.hookCommand('C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\me\\bug zoo\\bin\\bugzoo.js');
  assert.equal(c, '"C:/Program Files/nodejs/node.exe" "C:/Users/me/bug zoo/bin/bugzoo.js" ai-hook');
});

// --- the real CLI ------------------------------------------------------------------------------

test('`bugzoo ai-hook` reads an event on stdin and answers with a systemMessage', () => {
  const home = tmp('bz-ai-cli-');
  const dir = tmp('bz-ai-cliproj-');
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const run = (payload) => JSON.parse(spawnSync(process.execPath, [BIN, 'ai-hook'], { env, encoding: 'utf8', input: JSON.stringify(payload) }).stdout);

  const failed = run({
    hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', cwd: dir, tool_input: { command: 'python app.py' },
    error: 'Exit code 1\nTraceback (most recent call last):\n  File "app.py", line 1\nKeyError: \'k\'',
  });
  assert.match(failed.systemMessage, /A wild KeyError appeared!/);

  const nothing = run({ hook_event_name: 'PostToolUse', tool_name: 'Read', cwd: dir, tool_input: {} });
  assert.deepEqual(nothing, {});

  const fixed = run({
    hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: dir, tool_input: { command: 'python app.py' },
    tool_response: { stdout: 'ok', stderr: '', interrupted: false },
  });
  assert.match(fixed.systemMessage, /\[CAUGHT\]/);
});

test('`bugzoo setup --ai on|off --ai-file` edits only that file', () => {
  const file = path.join(tmp('bz-ai-setup-'), 'settings.json');
  const env = { ...process.env, BUGZOO_HOME: tmp('bz-ai-h-'), BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const on = spawnSync(process.execPath, [BIN, 'setup', '--lang', 'en', '--ai', 'on', '--ai-file', file], { env, encoding: 'utf8' });
  assert.match(on.stdout, /hook added/);
  assert.match(on.stdout, /AI sessions \(Claude Code\): on/);
  assert.match(fs.readFileSync(file, 'utf8'), /ai-hook/);
  const off = spawnSync(process.execPath, [BIN, 'setup', '--lang', 'en', '--ai', 'off', '--ai-file', file], { env, encoding: 'utf8' });
  assert.match(off.stdout, /hook removed/);
  assert.ok(!/ai-hook/.test(fs.readFileSync(file, 'utf8')));
});
