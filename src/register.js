'use strict';

/**
 * Preloaded into every Node process via NODE_OPTIONS (`bugzoo setup`).
 * Watches the program it is loaded into and records the run when it exits,
 * so the player never has to type `bugzoo run`. Must stay cheap and must never throw.
 *
 * It only acts on programs the player started from a terminal (stdio is a TTY),
 * so editors, bundlers and other tools spawning Node in the background are left alone.
 */
(function bugzooRegister() {
  const path = require('node:path');
  const fs = require('node:fs');

  if (process.env.BUGZOO_ACTIVE || process.env.BUGZOO_DISABLE) return; // inside `bugzoo run`, or opted out
  const script = process.argv[1];
  if (!script) return; // REPL, -e, --test

  // Worker threads and forked children are tools talking to each other, not the player running something.
  if (!require('node:worker_threads').isMainThread || process.channel) return;

  const interactive = process.env.BUGZOO_FORCE || process.stdin.isTTY || process.stdout.isTTY || process.stderr.isTTY;
  if (!interactive) return;

  const abs = path.resolve(script);
  if (/(^|[\\/])node_modules[\\/]/.test(abs)) return; // tools, not the player's program
  const nodeDir = path.dirname(process.execPath);
  if (abs.startsWith(nodeDir + path.sep)) return; // npm, corepack...
  const pkg = path.resolve(__dirname, '..');
  if ([path.join(pkg, 'bin'), path.join(pkg, 'src'), path.join(pkg, 'test')].some((d) => abs.startsWith(d + path.sep))) return;

  const cwd = process.cwd();
  const argv = ['node', abs, ...process.argv.slice(2)];
  let lastError = null;
  let settled = false;

  const debug = (err) => {
    if (!process.env.BUGZOO_DEBUG) return;
    try {
      fs.writeSync(2, `[bugzoo] ${err && err.stack ? err.stack : err}\n`);
    } catch { /* ignore */ }
  };

  /** Record the run and print the card. Returns without throwing. */
  const settle = (code, err) => {
    if (settled) return;
    settled = true;
    try {
      if (code === 0) {
        // Healthy run: only matters if this command has history (pending bug or fail record).
        const { commandKey } = require('./session');
        const { dexPath } = require('./store');
        let raw = '';
        try {
          raw = fs.readFileSync(dexPath().file, 'utf8');
        } catch {
          return;
        }
        if (!raw.includes(commandKey(argv, cwd))) return;
      }
      const { settleRun } = require('./session');
      const stderr = code !== 0 && err ? String(err.stack || err) : '';
      const text = settleRun({ argv, exit: code, stderr, cwd });
      if (text) fs.writeSync(2, text);
    } catch (e) {
      debug(e); // never disturb the player's program
    }
  };

  /** What Node prints for an uncaught exception: the source line with a caret, then the error. */
  const defaultErrorText = (err) => {
    const util = require('node:util');
    let frame = '';
    try {
      const m = /\(?((?:[A-Za-z]:)?[^\s()]+):(\d+):(\d+)\)?\s*$/m.exec(String(err && err.stack).split('\n').slice(1).join('\n'));
      if (m && !m[1].startsWith('node:')) {
        const src = fs.readFileSync(m[1], 'utf8').split(/\r?\n/)[Number(m[2]) - 1];
        if (src !== undefined) frame = `${m[1]}:${m[2]}\n${src}\n${' '.repeat(Math.max(0, Number(m[3]) - 1))}^\n\n`;
      }
    } catch { /* no frame */ }
    return `${frame}${util.inspect(err)}\n\nNode.js ${process.version}\n`;
  };

  process.on('uncaughtExceptionMonitor', (err) => {
    lastError = err;
  });

  // If the program has no handler of its own, behave exactly like Node's default (print, exit 1)
  // but show the card AFTER the stack trace, where the player is looking. Otherwise stay out of the way.
  process.on('uncaughtException', (err) => {
    if (process.listenerCount('uncaughtException') > 1) return;
    try {
      fs.writeSync(2, defaultErrorText(err));
    } catch { /* stderr gone */ }
    settle(1, err);
    process.exit(1);
  });

  process.on('exit', (code) => {
    settle(code, lastError);
  });
})();
