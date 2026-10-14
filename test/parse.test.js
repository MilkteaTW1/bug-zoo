'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseErrors, parseError, scan } = require('../src/parse');
const { decodeOutput, legacyLabel } = require('../src/decode');

const types = (text, code = 1, stdout = '') => parseErrors(text, code, stdout).map((e) => e.type);
const first = (text, code = 1, stdout = '') => parseErrors(text, code, stdout)[0];

// Formats below are what each tool prints; the samples are trimmed but not invented.

test('Node: uncaught TypeError', () => {
  const t = "C:\\p\\app.js:2\no.x;\n  ^\n\nTypeError: Cannot read properties of null (reading 'x')\n    at Object.<anonymous> (C:\\p\\app.js:2:3)\n\nNode.js v24.0.0\n";
  assert.deepEqual(first(t), { type: 'TypeError', message: "Cannot read properties of null (reading 'x')" });
});

test('Python: traceback ends with the error', () => {
  const t = 'Traceback (most recent call last):\n  File "a.py", line 2, in <module>\n    print(d["k"])\nKeyError: \'k\'\n';
  assert.deepEqual(first(t), { type: 'KeyError', message: "'k'" });
});

test('pytest: errors are on stdout, failures use E-lines', () => {
  const out = '============ FAILURES ============\n    def test_math():\n>       assert 1 + 1 == 3\nE       assert (1 + 1) == 3\n\ntest_x.py:2: AssertionError\n';
  assert.equal(first('', 1, out).type, 'AssertionError');
  const exc = 'E       KeyError: \'name\'\n';
  assert.deepEqual(first('', 1, exc), { type: 'KeyError', message: "'name'" });
});

test('Java: exception in thread main, with and without a message, and Caused by', () => {
  const npe = 'Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "s" is null\n\tat Boom.main(Boom.java:1)\n';
  assert.deepEqual(first(npe), { type: 'NullPointerException', message: 'Cannot invoke "String.length()" because "s" is null' });
  assert.equal(first('Exception in thread "main" java.lang.IllegalStateException\n\tat A.b(A.java:1)\n').type, 'IllegalStateException');
  assert.deepEqual(types('Exception in thread "main" java.lang.RuntimeException: wrap\nCaused by: java.io.IOException: disk\n'),
    ['RuntimeException', 'IOException']);
});

test('.NET: unhandled exception and compiler errors', () => {
  const t = 'Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.\n   at Program.<Main>$(String[] args)\n';
  assert.deepEqual(first(t), { type: 'NullReferenceException', message: 'Object reference not set to an instance of an object.' });
  assert.equal(first('', 1, 'Program.cs(3,1): error CS1002: ; expected [C:\\p\\dn.csproj]\n').type, 'CS1002');
});

test('Go: panics and build errors', () => {
  assert.deepEqual(first('panic: runtime error: index out of range [5] with length 3\n\ngoroutine 1 [running]:\n'),
    { type: 'Panic', message: 'runtime error: index out of range [5] with length 3' });
  assert.equal(first('# demo\n./main.go:5:2: undefined: x\n').type, 'GoBuildError');
});

test('Rust: compiler error codes and panics', () => {
  assert.deepEqual(first('error[E0425]: cannot find value `x` in this scope\n --> src/main.rs:2:5\n'),
    { type: 'E0425', message: 'cannot find value `x` in this scope' });
  assert.equal(first("thread 'main' panicked at src/main.rs:2:5:\ncalled `Option::unwrap()` on a `None` value\n").type, 'Panic');
});

test('TypeScript, gcc and Gradle', () => {
  assert.equal(first("src/a.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.\n").type, 'TS2322');
  assert.equal(first("main.c:4:5: error: 'x' undeclared (first use in this function)\n").type, 'CompileError');
  const g = "FAILURE: Build failed with an exception.\n\n* What went wrong:\nScript compilation error\n\n* Try:\n";
  assert.deepEqual(first(g), { type: 'BuildFailure', message: 'Script compilation error' });
});

test('colour codes do not hide errors', () => {
  assert.equal(first('\x1b[31mTypeError: boom\x1b[0m\n').type, 'TypeError');
  assert.equal(first('', 1, '\x1b[1m\x1b[31mE       ValueError: nope\x1b[0m\n').type, 'ValueError');
});

test('a compiler flood is capped at five creatures', () => {
  const flood = Array.from({ length: 30 }, (_, i) => `a.ts(${i},1): error TS${2000 + i}: bad ${i}`).join('\n');
  assert.equal(parseErrors(flood, 1).length, 5);
});

test('stderr wins over stdout; stdout is only the backup', () => {
  assert.equal(first('RangeError: from stderr\n', 1, 'TypeError: from stdout\n').type, 'RangeError');
  assert.equal(first('', 1, 'TypeError: from stdout\n').type, 'TypeError');
});

test('ordinary program output that merely mentions errors is not a bug', () => {
  assert.deepEqual(scan('Error: invalid input, try again\nNo errors found\nerror handling is fun\n'), []);
});

test('fallbacks: error codes, signals and a plain failure', () => {
  assert.equal(first("Error: ENOENT: no such file or directory, open 'x.json'\n").type, 'ENOENT');
  assert.equal(first('', 139).type, 'SIGSEGV');
  assert.equal(first('', 3).type, 'MysteryError');
  assert.equal(parseError('TypeError: a\nRangeError: b\n', 1).type, 'RangeError');
});

// --- decoding ----------------------------------------------------------------------------------

test('decodeOutput keeps UTF-8 and falls back to the locale code page on Windows', () => {
  assert.equal(decodeOutput(Buffer.from('錯誤 ok'), { platform: 'win32', locale: 'zh-TW' }), '錯誤 ok');
  // invalid UTF-8 must not throw and must not stay as replacement characters when a legacy label exists
  const big5 = Buffer.from([0xb0, 0xf5, 0x20, 0x41]);
  const s = decodeOutput(big5, { platform: 'win32', locale: 'zh-TW' });
  assert.ok(!s.includes('\ufffd'));
  assert.ok(s.endsWith(' A'));
  assert.equal(legacyLabel('zh-CN'), 'gbk');
  assert.equal(legacyLabel('ja-JP'), 'shift_jis');
  assert.equal(legacyLabel('en-US'), 'windows-1252');
});

// --- end to end --------------------------------------------------------------------------------

test('`bugzoo run` catches an error that only appears on stdout, and still shows the output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-stdout-'));
  const home = path.join(dir, 'home');
  fs.writeFileSync(path.join(dir, 'tool.js'), "console.log('E       ValueError: only on stdout'); process.exit(1);\n");
  const bin = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const r = spawnSync(process.execPath, [bin, 'run', 'node', 'tool.js'], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /only on stdout/); // passed through untouched
  assert.match(r.stderr, /A wild ValueError appeared!/);
});
