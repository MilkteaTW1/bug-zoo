'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REGISTER = path.resolve(__dirname, 'register.js');
// Backslashes are escape characters inside NODE_OPTIONS quotes; forward slashes work on every platform.
const REGISTER_ARG = REGISTER.replace(/\\/g, '/');
const TOKEN = `--require "${REGISTER_ARG}"`;
const OURS_RE = /\s*--require\s+"[^"]*[\\/]src[\\/]register\.js"/g;
const START = '# >>> bugzoo >>>';
const END = '# <<< bugzoo <<<';

function removeToken(value) {
  return String(value || '').replace(OURS_RE, '').trim();
}

function addToken(value) {
  const base = removeToken(value);
  return `${base ? `${base} ` : ''}${TOKEN}`;
}

const hasToken = (value) => String(value || '').includes(TOKEN);

// --- Windows: user-level environment variable (works for cmd, PowerShell, npm scripts) ---

function ps(script) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', timeout: 15000, windowsHide: true }).trim();
}

const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;

function winGet() {
  return ps("[Environment]::GetEnvironmentVariable('NODE_OPTIONS','User')");
}

function winSet(value) {
  ps(`[Environment]::SetEnvironmentVariable('NODE_OPTIONS', ${value ? psQuote(value) : '$null'}, 'User')`);
}

// --- macOS / Linux: a marked block in the shell profile ---

function rcFile(env = process.env) {
  const shell = path.basename(env.SHELL || '');
  if (shell === 'zsh') return path.join(os.homedir(), '.zshrc');
  if (shell === 'bash') return path.join(os.homedir(), '.bashrc');
  return null;
}

function block() {
  return [
    START,
    'case "$NODE_OPTIONS" in',
    '  *src/register.js*) ;;',
    `  *) export NODE_OPTIONS="\${NODE_OPTIONS:+$NODE_OPTIONS }--require \\"${REGISTER_ARG}\\"" ;;`,
    'esac',
    END,
  ].join('\n');
}

function stripBlock(text) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e < s) return text;
  return (text.slice(0, s) + text.slice(e + END.length)).replace(/\n{3,}/g, '\n\n');
}

function status() {
  try {
    if (process.platform === 'win32') return { enabled: hasToken(winGet()) };
    const rc = rcFile();
    return { enabled: Boolean(rc && fs.existsSync(rc) && fs.readFileSync(rc, 'utf8').includes(START)) };
  } catch {
    return { enabled: false };
  }
}

/** Returns { ok, error? }. Idempotent. */
function enable() {
  try {
    if (process.platform === 'win32') {
      winSet(addToken(winGet()));
      return { ok: true };
    }
    const rc = rcFile();
    if (!rc) return { ok: false, error: 'unsupported shell (use `bugzoo hook` for fish or others)' };
    const text = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
    fs.writeFileSync(rc, `${stripBlock(text).replace(/\s*$/, '\n')}\n${block()}\n`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function disable() {
  try {
    if (process.platform === 'win32') {
      winSet(removeToken(winGet()));
      return { ok: true };
    }
    const rc = rcFile();
    if (rc && fs.existsSync(rc)) fs.writeFileSync(rc, stripBlock(fs.readFileSync(rc, 'utf8')));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { REGISTER, REGISTER_ARG, TOKEN, addToken, removeToken, hasToken, stripBlock, block, status, enable, disable };
