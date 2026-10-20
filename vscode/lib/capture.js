'use strict';

const path = require('node:path');
const { session, parse } = require('./engine');

const MAX_OUTPUT = 200 * 1024;

/** Split a command line into argv, honouring simple quotes. Good enough for building a command key. */
function splitCommand(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

const isBugzoo = (argv) => argv.length > 0 && /^bugzoo(\.cmd|\.js)?$/i.test(path.basename(argv[0]));

/**
 * Record one finished terminal command. Returns the CLI-style text (for tests/logging) or null when skipped.
 * Terminal shell integration merges stdout and stderr, so everything is handed over as stderr.
 */
function recordCommand({ commandLine, exitCode, cwd, output }) {
  if (exitCode === undefined || exitCode === null) return null;
  const argv = splitCommand(commandLine || '');
  if (argv.length === 0 || isBugzoo(argv)) return null;
  const text = parse.stripAnsi(String(output || '')).slice(-MAX_OUTPUT);
  return session.settleRun({ argv, exit: exitCode, stderr: text, stdout: '', cwd: cwd || process.cwd() });
}

module.exports = { splitCommand, recordCommand, MAX_OUTPUT };
