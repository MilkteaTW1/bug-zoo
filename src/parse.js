'use strict';

const crypto = require('node:crypto');

const SIGNAL_NAMES = { 11: 'SIGSEGV', 6: 'SIGABRT', 9: 'SIGKILL', 15: 'SIGTERM', 139: 'SIGSEGV', 134: 'SIGABRT' };
const MAX_ERRORS = 5; // a compiler can print dozens; five creatures per run is plenty

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
const stripAnsi = (s) => String(s || '').replace(ANSI, '');
const clip = (s) => String(s || '').trim().slice(0, 160);
const lastSegment = (name) => String(name).split(/[.$]/).filter(Boolean).pop();

const EXC = '((?:[\\w$]+\\.)*[A-Z][\\w$]*(?:Error|Exception))';

/**
 * Known error formats. Each rule: a multiline regex plus how to read a type and a message.
 * Covers Node, Python, pytest, Ruby, Java, .NET, Go, Rust, TypeScript, gcc/clang and Gradle.
 */
const RULES = [
  { // Ruby: "app.rb:3:in `<main>': undefined method `name' for nil:NilClass (NoMethodError)"
    re: /^\s*\S+\.rb:\d+(?::in `[^']*')?:\s*(.*?)\s+\(([\w:]+(?:Error|Exception))\)\s*$/gm,
    type: (m) => m[2],
    msg: (m) => m[1],
  },
  { // TypeError: x | java.lang.NullPointerException: x | Exception in thread "main" ... | Unhandled exception. System.X: y
    re: new RegExp(`^\\s*(?:Uncaught\\s+|Caused by:\\s+|Exception in thread "[^"]*"\\s+|Unhandled [Ee]xception[.:]\\s+)?${EXC}[ \\t]*(?::[ \\t]*(.*))?$`, 'gm'),
    type: (m) => lastSegment(m[1]),
    msg: (m) => m[2],
  },
  { // pytest: "E   KeyError: 'x'"
    re: new RegExp(`^E\\s+${EXC}[ \\t]*(?::[ \\t]*(.*))?$`, 'gm'),
    type: (m) => lastSegment(m[1]),
    msg: (m) => m[2],
  },
  { // pytest: "E   assert 1 + 1 == 3"
    re: /^E\s+(assert\b.*)$/gm,
    type: () => 'AssertionError',
    msg: (m) => m[1],
  },
  { re: /^error\[(E\d{4})\]:\s*(.*)$/gm, type: (m) => m[1], msg: (m) => m[2] }, // rustc
  { re: /^thread '[^']*' panicked at (.*)$/gm, type: () => 'Panic', msg: (m) => m[1] }, // Rust
  { re: /^panic:\s*(.*)$/gm, type: () => 'Panic', msg: (m) => m[1] }, // Go
  { re: /^(?:[\w.\\/-]+\.go):\d+:\d+:\s*(.*)$/gm, type: () => 'GoBuildError', msg: (m) => m[1] },
  { re: /\berror (CS\d{4}):\s*(.*)$/gm, type: (m) => m[1], msg: (m) => m[2] }, // C#
  { re: /\berror (TS\d{4}):\s*(.*)$/gm, type: (m) => m[1], msg: (m) => m[2] }, // TypeScript
  { re: /^[^\s:][^:\n]*:\d+(?::\d+)?:\s*(?:fatal )?error:\s*(.*)$/gm, type: () => 'CompileError', msg: (m) => m[1] }, // gcc/clang
  { // npm: "npm error code E403" then "npm error 403 403 Forbidden - ..." (older npm: "npm ERR!")
    re: /^npm (?:error|ERR!) code (\w+)\s*$/gm,
    type: (m) => m[1],
    msg: (m, text) => {
      const rest = text.slice(m.index + m[0].length);
      const reason = /^npm (?:error|ERR!) (?!code\b)(?:\d+ )?(\S.*)$/m.exec(rest);
      return reason ? reason[1] : `npm failed with ${m[1]}`;
    },
  },
  { // Gradle: the reason is the line after "* What went wrong:"
    re: /^FAILURE: Build failed with an exception\.?$/gm,
    type: () => 'BuildFailure',
    msg: (m, text) => {
      const rest = text.slice(m.index);
      const w = /\* What went wrong:\s*\r?\n(.*)/.exec(rest);
      return w ? w[1] : 'Build failed';
    },
  },
];

/** Every recognised error in `text`, in the order it appears, de-duplicated. */
function scan(text) {
  const found = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      if (m[0] === '') {
        rule.re.lastIndex += 1;
        continue;
      }
      const type = rule.type(m);
      if (type) found.push({ at: m.index, type, message: clip(rule.msg(m, text)) });
    }
  }
  found.sort((a, b) => a.at - b.at);
  const seen = new Map();
  for (const f of found) {
    const key = `${f.type}:${normalize(f.message)}`;
    if (!seen.has(key)) seen.set(key, { type: f.type, message: f.message });
  }
  return [...seen.values()];
}

/** Best guess when no known format matched: error codes, panics, signals, then a mystery. */
function fallback(text, exitCode) {
  const code = text.match(/\b(E[A-Z]{3,}|SIG[A-Z]+)\b/);
  if (code) {
    const line = text.split(/\r?\n/).find((l) => l.includes(code[1])) || firstLine(text);
    return { type: code[1], message: clip(line.replace(/^\s*(npm )?(error|ERR!):?\s*/i, '').replace(/^Error:\s*/, '')) };
  }

  if (/segmentation fault/i.test(text)) return { type: 'SIGSEGV', message: 'Segmentation fault' };
  if (/\bpanic\b/i.test(text)) return { type: 'Panic', message: firstLine(text) };
  if (/out of memory/i.test(text)) return { type: 'OutOfMemory', message: firstLine(text) };
  if (/stack overflow|maximum call stack/i.test(text)) return { type: 'StackOverflow', message: firstLine(text) };

  if (SIGNAL_NAMES[exitCode]) return { type: SIGNAL_NAMES[exitCode], message: `exited with code ${exitCode}` };
  return { type: 'MysteryError', message: firstLine(text) || `exited with code ${exitCode}` };
}

/** Extract one { type, message } (the last recognised error) from captured output and the exit code. */
function parseError(stderr, exitCode) {
  const text = stripAnsi(stderr);
  const found = scan(text);
  return found.length > 0 ? found[found.length - 1] : fallback(text, exitCode);
}

/**
 * Every distinct error of a run. stderr is read first; stdout is the backup for tools that
 * report failures there (pytest, many build tools).
 */
function parseErrors(stderr, exitCode, stdout = '') {
  const err = stripAnsi(stderr);
  const out = stripAnsi(stdout);
  for (const text of [err, out]) {
    const found = scan(text);
    if (found.length > 0) return found.slice(0, MAX_ERRORS);
  }
  return [fallback(err.trim() ? err : out, exitCode)];
}

function firstLine(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
  return line.trim().slice(0, 160);
}

/** Strip volatile bits (numbers, quoted names, paths) so similar errors share a "variant". */
function normalize(message) {
  return message
    .replace(/(['"`]).*?\1/g, '$1_$1')
    .replace(/[A-Za-z]:\\[^\s]+|\/[^\s]+/g, '<path>')
    .replace(/\d+/g, '#')
    .toLowerCase();
}

function hash(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

module.exports = { parseError, parseErrors, scan, stripAnsi, normalize, hash };
