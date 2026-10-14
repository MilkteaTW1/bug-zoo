'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripAnsi } = require('./parse');

/**
 * Bug Zoo for AI coding sessions. Claude Code reports every Bash tool call to a hook:
 *   PostToolUse         - the command succeeded            -> a clean run
 *   PostToolUseFailure  - the command exited non-zero      -> a failing run ("Exit code N\n<output>")
 * The card goes out as `systemMessage`, which is shown to the person and never to the model.
 */

/** Split a command line into words, honouring single and double quotes. */
function tokenize(text) {
  const out = [];
  let cur = '';
  let quote = null;
  let has = false;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || cur) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (has || cur) out.push(cur);
  return out;
}

/** Cut a command line at top-level `&&`, `||`, `;` and `|` (outside quotes). */
function splitSegments(cmd) {
  const segs = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    const two = cmd.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      segs.push({ text: cur, sep: two });
      cur = '';
      i += 1;
    } else if (ch === ';' || ch === '|' || ch === '\n') {
      segs.push({ text: cur, sep: ch });
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) segs.push({ text: cur, sep: '' });
  return segs;
}

/**
 * Reduce what an AI ran to the thing it is checking: leading `cd`s become the working folder,
 * pipes to tail/grep/head and redirections are dropped. Running `node app.js` by hand later
 * therefore lands on the same identity as the AI's `cd proj && node app.js 2>&1 | tail -20`.
 * Returns { argv, cwd }.
 */
function simplifyCommand(cmd, cwd) {
  let dir = cwd;
  const argv = [];
  let afterPipe = false;
  for (const seg of splitSegments(String(cmd || ''))) {
    const words = tokenize(seg.text.trim());
    const prevSepWasPipe = afterPipe;
    afterPipe = seg.sep === '|';
    if (words.length === 0 || prevSepWasPipe) continue; // `... | tail` : the right side is not the program under test
    if (words[0] === 'cd' && words[1]) {
      dir = path.resolve(dir, words[1]);
      continue;
    }
    const kept = [];
    for (let i = 0; i < words.length; i++) {
      if (/^\d*[<>]+&?\d*$/.test(words[i])) {
        // `> file` / `2> file` consume the next word; `2>&1` is a single word and falls through below
        if (!/&\d+$/.test(words[i])) i += 1;
        continue;
      }
      if (/^\d*[<>]+/.test(words[i])) continue; // `>file`, `2>&1`
      kept.push(words[i]);
    }
    if (kept.length === 0) continue;
    if (argv.length > 0) argv.push('&&');
    argv.push(...kept);
  }
  return { argv, cwd: dir };
}

const looksLikeBugzoo = (cmd) => /(^|[\s/\\"'])bugzoo(\.js)?(\s|$|["'])/i.test(String(cmd || ''));

/**
 * Handle one hook payload. Returns { message } (maybe empty) and never throws.
 * `settle` is injected for tests; it defaults to the real run settlement.
 */
function handle(payload, { settle } = {}) {
  try {
    if (!payload || payload.tool_name !== 'Bash') return { message: '' };
    const event = payload.hook_event_name;
    const command = payload.tool_input && payload.tool_input.command;
    if (!command || looksLikeBugzoo(command)) return { message: '' };

    let exit;
    let stderr = '';
    let stdout = '';
    if (event === 'PostToolUseFailure') {
      if (payload.is_interrupt) return { message: '' };
      const err = String(payload.error || '');
      const m = /^Exit code (\d+)/.exec(err);
      exit = m ? Number(m[1]) : 1;
      stderr = m ? err.slice(m[0].length).replace(/^\r?\n/, '') : err;
    } else if (event === 'PostToolUse') {
      const r = payload.tool_response;
      if (r && typeof r === 'object' && r.interrupted) return { message: '' };
      exit = 0;
    } else {
      return { message: '' };
    }

    const { argv, cwd } = simplifyCommand(command, payload.cwd || process.cwd());
    if (argv.length === 0) return { message: '' };

    const run = settle || require('./session').settleRun;
    const text = run({ argv, exit, stderr: stripAnsi(stderr), stdout: stripAnsi(stdout), cwd });
    return { message: stripAnsi(text).trim() };
  } catch {
    return { message: '' };
  }
}

// --- wiring it into Claude Code's settings ----------------------------------------------------

const HOOK_EVENTS = ['PostToolUse', 'PostToolUseFailure'];

function defaultSettingsFile() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

const slash = (p) => String(p).replace(/\\/g, '/');

function hookCommand(exe = process.execPath, bin = path.resolve(__dirname, '..', 'bin', 'bugzoo.js')) {
  return `"${slash(exe)}" "${slash(bin)}" ai-hook`;
}

const isOurs = (h) => h && typeof h.command === 'string' && /\bai-hook\b/.test(h.command) && /bugzoo/i.test(h.command);

function readSettings(file) {
  if (!fs.existsSync(file)) return { settings: {}, existed: false };
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return { settings: {}, existed: true };
  try {
    return { settings: JSON.parse(raw), existed: true };
  } catch {
    throw new Error(`${file} is not plain JSON; edit it by hand rather than letting Bug Zoo overwrite it`);
  }
}

function withoutOurs(settings) {
  const next = JSON.parse(JSON.stringify(settings));
  if (!next.hooks) return next;
  for (const ev of Object.keys(next.hooks)) {
    next.hooks[ev] = (next.hooks[ev] || [])
      .map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((h) => !isOurs(h)) }))
      .filter((entry) => (entry.hooks || []).length > 0);
    if (next.hooks[ev].length === 0) delete next.hooks[ev];
  }
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  return next;
}

function withOurs(settings, command) {
  const next = withoutOurs(settings);
  next.hooks = next.hooks || {};
  for (const ev of HOOK_EVENTS) {
    next.hooks[ev] = [...(next.hooks[ev] || []), { matcher: 'Bash', hooks: [{ type: 'command', command }] }];
  }
  return next;
}

function write(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Returns { ok, file, error? }. Idempotent; leaves every other setting and hook alone. */
function enable(file = defaultSettingsFile(), command = hookCommand()) {
  try {
    const { settings } = readSettings(file);
    write(file, withOurs(settings, command));
    return { ok: true, file };
  } catch (err) {
    return { ok: false, file, error: err.message };
  }
}

function disable(file = defaultSettingsFile()) {
  try {
    const { settings, existed } = readSettings(file);
    if (existed) write(file, withoutOurs(settings));
    return { ok: true, file };
  } catch (err) {
    return { ok: false, file, error: err.message };
  }
}

function status(file = defaultSettingsFile()) {
  try {
    const { settings } = readSettings(file);
    const hooks = settings.hooks || {};
    return { enabled: HOOK_EVENTS.every((ev) => (hooks[ev] || []).some((e) => (e.hooks || []).some(isOurs))), file };
  } catch {
    return { enabled: false, file };
  }
}

module.exports = {
  tokenize, splitSegments, simplifyCommand, looksLikeBugzoo, handle,
  hookCommand, defaultSettingsFile, enable, disable, status, withOurs, withoutOurs, HOOK_EVENTS,
};
