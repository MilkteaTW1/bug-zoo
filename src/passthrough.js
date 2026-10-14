'use strict';

const path = require('node:path');

/**
 * Commands that need a real terminal (prompts, one-time passwords, installers asking "ok to proceed?").
 * Capturing their output would turn their stdout into a pipe, and many of them stop prompting when it
 * is not a TTY. These run completely untouched: no capture, no record.
 */
const PROMPTING_SUBCOMMANDS = {
  npm: ['publish', 'unpublish', 'login', 'logout', 'adduser', 'init', 'create', 'owner', 'access', 'team',
    'token', 'profile', 'deprecate', 'dist-tag', 'org', 'hook', 'star', 'unstar', 'exec', 'x', 'set-script'],
  pnpm: ['publish', 'login', 'logout', 'init', 'create', 'dlx', 'exec', 'deprecate', 'dist-tag', 'access', 'team'],
  yarn: ['publish', 'login', 'logout', 'init', 'create', 'dlx', 'exec', 'npm', 'set'],
  cargo: ['login', 'publish', 'owner', 'yank'],
};
const ALWAYS = new Set(['npx']);

function programName(argv) {
  return path.basename(String(argv[0] || '')).replace(/\.(exe|cmd|bat|com|ps1)$/i, '').toLowerCase();
}

function needsTerminal(argv) {
  const name = programName(argv);
  if (ALWAYS.has(name)) return true;
  const list = PROMPTING_SUBCOMMANDS[name];
  if (!list) return false;
  const sub = argv.slice(1).find((a) => !a.startsWith('-'));
  return list.includes(String(sub || '').toLowerCase());
}

module.exports = { needsTerminal, programName };
