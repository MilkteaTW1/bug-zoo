#!/usr/bin/env node
'use strict';

// Per language: keys missing or unknown, and how many texts are still identical to English.
const i18n = require('../src/i18n');

const en = i18n.LOCALES.en.messages;
let problems = 0;
for (const code of i18n.LANGS) {
  if (code === 'en') continue;
  const m = i18n.LOCALES[code].messages;
  const missing = Object.keys(en).filter((k) => !(k in m));
  const unknown = Object.keys(m).filter((k) => !(k in en));
  const same = Object.keys(en).filter((k) => k in m && m[k] === en[k]);
  const helpSame = i18n.LOCALES[code].help === i18n.LOCALES.en.help;
  problems += missing.length + unknown.length;
  console.log(`${code} (${i18n.LANG_LABEL[code]}): ${Object.keys(m).length}/${Object.keys(en).length} keys, ` +
    `${same.length} still English${helpSame ? ', help still English' : ''}` +
    `${missing.length ? `, missing: ${missing.join(', ')}` : ''}${unknown.length ? `, unknown: ${unknown.join(', ')}` : ''}`);
}
process.exit(problems ? 1 : 0);
