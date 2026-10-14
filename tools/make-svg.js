'use strict';

// Writes docs/bestiary.en.svg and docs/bestiary.zh-TW.svg: a sample of what `bugzoo export` produces.
// The creatures come from the real generator (same error type + message => same monster).
const fs = require('node:fs');
const path = require('node:path');
const { makeCreature } = require('../src/creature');
const i18n = require('../src/i18n');
const { exportSvg } = require('../src/render');

const SAMPLE = [
  ['StackOverflow', 'Maximum call stack size exceeded', 1],
  ['E0425', 'cannot find value `x` in this scope', 2],
  ['RangeError', 'Invalid array length', 3],
  ['ENOENT', "no such file or directory, open 'settings.json'", 1],
  ['TypeError', "Cannot read properties of undefined (reading 'rows')", 4],
  ['KeyError', "'name'", 2],
  ['ValueError', 'invalid literal for int()', 0],
  ['IndexError', 'list index out of range', 0],
  ['AssertionError', 'assert 1 + 1 == 3', 1],
];

const dex = { creatures: {}, pending: {} };
for (const [type, message, captures] of SAMPLE) {
  const c = makeCreature(type, message);
  dex.creatures[c.id] = { ...c, count: captures + 1, captures, escapes: 0, sample: message };
}

const docs = path.resolve(__dirname, '..', 'docs');
for (const lang of ['en', 'zh-TW']) {
  i18n.setLang(lang);
  const file = path.join(docs, `bestiary.${lang}.svg`);
  fs.writeFileSync(file, exportSvg(dex));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
