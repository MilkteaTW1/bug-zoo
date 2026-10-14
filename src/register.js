'use strict';

/**
 * Preloaded into every Node process via NODE_OPTIONS (`bugzoo setup`).
 * Watches the program it is loaded into and records the run when it exits,
 * so the player never has to type `bugzoo run`. Must stay cheap and must never throw.
 */
(function bugzooRegister() {
  const path = require('node:path');
  const fs = require('node:fs');

  if (process.env.BUGZOO_ACTIVE || process.env.BUGZOO_DISABLE) return; // inside `bugzoo run`, or opted out
  const script = process.argv[1];
  if (!script) return; // REPL, -e, --test

  const cwd = process.cwd();
  const abs = path.resolve(script);
  const rel = path.relative(cwd, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return; // only the player's own project
  if (/(^|[\\/])node_modules[\\/]/.test(rel)) return;
  const pkg = path.resolve(__dirname, '..');
  if ([path.join(pkg, 'bin'), path.join(pkg, 'src'), path.join(pkg, 'test')].some((d) => abs.startsWith(d + path.sep))) return;

  let lastError = null;
  process.on('uncaughtExceptionMonitor', (err) => {
    lastError = err;
  });

  process.on('exit', (code) => {
    try {
      const argv = ['node', rel, ...process.argv.slice(2)];
      const failed = code !== 0;

      if (!failed) {
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
      const stderr = failed && lastError ? String(lastError.stack || lastError) : '';
      const text = settleRun({ argv, exit: code, stderr, cwd });
      if (text) fs.writeSync(2, text);
    } catch {
      /* never disturb the player's program */
    }
  });
})();
