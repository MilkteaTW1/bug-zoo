'use strict';

const path = require('node:path');
const { parseErrors, hash } = require('./parse');
const { makeCreature } = require('./creature');
const { normalizeArgv } = require('./key');
const { analyze } = require('./scan');
const store = require('./store');
const render = require('./render');
const i18n = require('./i18n');

/** Identity of "the same command in the same folder". */
function commandKey(argv, cwd = process.cwd()) {
  return hash([cwd, ...normalizeArgv(argv, cwd)].join('\0'));
}

/**
 * Record the outcome of one run and return the text to show the player ('' if nothing to show).
 * Shared by `bugzoo run` (wraps a child process) and the Node preload (runs inside the program).
 */
function settleRun({ argv, exit, signal = null, stderr = '', cwd = process.cwd() }) {
  const dex = store.load();
  i18n.setLang((dex.profile && dex.profile.lang) || i18n.detectLang());

  let creatures = [];
  let ctx = null;
  if (exit !== 0) {
    creatures = parseErrors(stderr || signal || '', signal || exit)
      .map((e) => ({ ...makeCreature(e.type, e.message), sample: e.message }));
    try {
      ctx = { ...analyze(cwd, stderr), project: path.basename(cwd) };
    } catch {
      ctx = null; // scanning is best-effort; never break the player's program
    }
  }

  const result = store.applyRun(commandKey(argv, cwd), creatures, ctx);

  const out = [];
  for (const { entry, isNew } of result.encounters) {
    out.push(render.encounter(entry, isNew, result.powers[entry.id]));
  }
  const banner = render.outcomeBanner(result);
  if (banner) out.push('', banner);
  return out.length > 0 ? `${out.join('\n')}\n\n` : '';
}

module.exports = { commandKey, settleRun };
