'use strict';

/**
 * Reduce a command line to the part that identifies "the same thing being run".
 * Flags (-x, --flag, --flag=value) and bare numbers (ports, counts) are ignored,
 * and "./app.js" equals "app.js", so `node app.js` and `node app.js --debug 3000`
 * are the same target.
 */
function normalizeArgv(argv) {
  const [prog, ...rest] = argv;
  const kept = rest
    .filter((a) => !/^-/.test(a) && !/^\d+$/.test(a))
    .map((a) => a.replace(/\\/g, '/').replace(/^\.\//, ''));
  return [prog, ...kept];
}

module.exports = { normalizeArgv };
