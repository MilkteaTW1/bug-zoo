'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Reduce a command line to the part that identifies "the same thing being run".
 * Flags (-x, --flag, --flag=value) and bare numbers (ports, counts) are ignored.
 * With `cwd`, arguments that are existing files are resolved, so `node app.js`,
 * `node ./app.js` and `node C:\proj\app.js` are the same target.
 */
function normalizeArgv(argv, cwd) {
  const [prog, ...rest] = argv;
  const kept = rest
    .filter((a) => !/^-/.test(a) && !/^\d+$/.test(a))
    .map((a) => {
      let s = a.replace(/\\/g, '/').replace(/^\.\//, '');
      if (cwd) {
        try {
          const abs = path.resolve(cwd, a);
          if (fs.statSync(abs).isFile()) {
            const rel = path.relative(cwd, abs);
            const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
            s = (inside ? rel : abs).replace(/\\/g, '/');
          }
        } catch { /* not a file: keep the text */ }
      }
      return s;
    });
  // Split on both separators: a Windows-style path must still reduce to its program name on macOS/Linux.
  const name = String(prog).split(/[\\/]/).pop().replace(/\.(exe|cmd|bat|com)$/i, '');
  return [name, ...kept];
}

module.exports = { normalizeArgv };
