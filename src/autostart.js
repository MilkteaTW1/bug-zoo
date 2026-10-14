'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const W = require('./wrappers');

const REGISTER = path.resolve(__dirname, 'register.js');
const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
// Backslashes are escape characters inside NODE_OPTIONS quotes; forward slashes work on every platform.
const REGISTER_ARG = REGISTER.replace(/\\/g, '/');
const TOKEN = `--require "${REGISTER_ARG}"`;
const OURS_RE = /\s*--require\s+"[^"]*[\\/]src[\\/]register\.js"/g;
const START = '# >>> bugzoo >>>';
const END = '# <<< bugzoo <<<';
const REG_KEY = 'HKCU\\Software\\Microsoft\\Command Processor';

function removeToken(value) {
  return String(value || '').replace(OURS_RE, '').trim();
}

function addToken(value) {
  const base = removeToken(value);
  return `${base ? `${base} ` : ''}${TOKEN}`;
}

const hasToken = (value) => String(value || '').includes(TOKEN);

// --- Windows helpers ---------------------------------------------------------------------------

const run = (file, args) => execFileSync(file, args,
  { encoding: 'utf8', timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const ps = (script) => run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;

const winGetNodeOptions = () => ps("[Environment]::GetEnvironmentVariable('NODE_OPTIONS','User')");
const winSetNodeOptions = (v) => ps(
  `[Environment]::SetEnvironmentVariable('NODE_OPTIONS', ${v ? psQuote(v) : '$null'}, 'User')`);

function regGetAutorun() {
  try {
    const m = run('reg', ['query', REG_KEY, '/v', 'AutoRun']).match(/AutoRun\s+REG_(?:EXPAND_)?SZ\s+(.*)/i);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

function regSetAutorun(value) {
  if (value) run('reg', ['add', REG_KEY, '/v', 'AutoRun', '/t', 'REG_SZ', '/d', value, '/f']);
  else {
    try {
      run('reg', ['delete', REG_KEY, '/v', 'AutoRun', '/f']);
    } catch { /* nothing to delete */ }
  }
}

function autorunFile() {
  const dir = process.env.BUGZOO_HOME || path.join(os.homedir(), '.bugzoo');
  return path.join(dir, 'autorun.cmd');
}

function psProfiles() {
  const found = [];
  for (const exe of ['powershell.exe', 'pwsh.exe']) {
    try {
      const p = run(exe, ['-NoProfile', '-NonInteractive', '-Command', '$PROFILE.CurrentUserCurrentHost']);
      if (p) found.push(p);
    } catch { /* that PowerShell is not installed */ }
  }
  return [...new Set(found)];
}

function psExecutionPolicy() {
  try {
    return ps('Get-ExecutionPolicy');
  } catch {
    return '';
  }
}

// --- macOS / Linux -----------------------------------------------------------------------------

function rcFile(env = process.env) {
  const shell = path.basename(env.SHELL || '');
  if (shell === 'zsh') return path.join(os.homedir(), '.zshrc');
  if (shell === 'bash') return path.join(os.homedir(), '.bashrc');
  return null;
}

function block(exe = process.execPath, bin = BIN) {
  return [
    START,
    'case "$NODE_OPTIONS" in',
    '  *src/register.js*) ;;',
    `  *) export NODE_OPTIONS="\${NODE_OPTIONS:+$NODE_OPTIONS }--require \\"${REGISTER_ARG}\\"" ;;`,
    'esac',
    W.shFunctions(exe, bin),
    END,
  ].join('\n');
}

function stripBlock(text) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e < s) return text;
  return (text.slice(0, s) + text.slice(e + END.length)).replace(/\n{3,}/g, '\n\n');
}

// --- public API --------------------------------------------------------------------------------

function status() {
  const out = { enabled: false, node: false, wrappers: false };
  try {
    if (process.platform === 'win32') {
      out.node = hasToken(winGetNodeOptions());
      out.wrappers = regGetAutorun().includes(autorunFile());
    } else {
      const rc = rcFile();
      out.node = out.wrappers = Boolean(rc && fs.existsSync(rc) && fs.readFileSync(rc, 'utf8').includes(START));
    }
  } catch { /* report what we know */ }
  out.enabled = out.node || out.wrappers;
  return out;
}

/**
 * Turn on capture for everything the player runs by hand.
 * Returns { ok, error?, steps: [{ code, params }], warnings: [{ code, params }] }. Idempotent.
 */
function enable() {
  const steps = [];
  const warnings = [];
  try {
    if (process.platform === 'win32') {
      winSetNodeOptions(addToken(winGetNodeOptions()));
      steps.push({ code: 'node', params: {} });

      const file = autorunFile();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, W.cmdScript(process.execPath, BIN));
      regSetAutorun(W.mergeAutorun(regGetAutorun(), file));
      steps.push({ code: 'cmd', params: {} });

      const block1 = W.psBlock(process.execPath, BIN);
      for (const p of psProfiles()) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        const text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '﻿';
        fs.writeFileSync(p, W.upsertBlock(text, block1));
        steps.push({ code: 'ps', params: { file: p } });
      }
      const policy = psExecutionPolicy();
      if (/^(Restricted|AllSigned)$/i.test(policy)) warnings.push({ code: 'policy', params: { policy } });
      return { ok: true, steps, warnings };
    }

    const rc = rcFile();
    if (!rc) return { ok: false, error: 'unsupported shell (use `bugzoo hook` for fish or others)', steps, warnings };
    const text = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
    fs.writeFileSync(rc, `${stripBlock(text).replace(/\s*$/, '\n')}\n${block()}\n`);
    steps.push({ code: 'sh', params: { file: rc } });
    return { ok: true, steps, warnings };
  } catch (err) {
    return { ok: false, error: err.message, steps, warnings };
  }
}

function disable() {
  try {
    if (process.platform === 'win32') {
      winSetNodeOptions(removeToken(winGetNodeOptions()));
      const file = autorunFile();
      regSetAutorun(W.stripAutorun(regGetAutorun(), file));
      try {
        fs.rmSync(file, { force: true });
      } catch { /* ignore */ }
      for (const p of psProfiles()) {
        if (fs.existsSync(p)) fs.writeFileSync(p, W.stripBlock(fs.readFileSync(p, 'utf8')));
      }
      return { ok: true, steps: [], warnings: [] };
    }
    const rc = rcFile();
    if (rc && fs.existsSync(rc)) fs.writeFileSync(rc, stripBlock(fs.readFileSync(rc, 'utf8')));
    return { ok: true, steps: [], warnings: [] };
  } catch (err) {
    return { ok: false, error: err.message, steps: [], warnings: [] };
  }
}

module.exports = {
  REGISTER, REGISTER_ARG, BIN, TOKEN, addToken, removeToken, hasToken, stripBlock, block, status, enable, disable,
};
