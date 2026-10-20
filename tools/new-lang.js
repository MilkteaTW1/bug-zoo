#!/usr/bin/env node
'use strict';

// Start a new language: copies the English file to src/locales/<code>.js for you to translate.
//   npm run lang -- ja 日本語
//   npm run lang -- pt-BR "Português (Brasil)"
const fs = require('node:fs');
const path = require('node:path');

const [code, ...rest] = process.argv.slice(2);
const label = rest.join(' ').trim();
if (!code || !label || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code)) {
  console.error('Usage: npm run lang -- <code> <name in that language>\n  e.g. npm run lang -- ja 日本語');
  process.exit(2);
}

const source = path.join(__dirname, '..', 'src', 'locales');
const dir = process.env.BUGZOO_LOCALES_OUT || source; // tests write elsewhere
const target = path.join(dir, `${code}.js`);
if (fs.existsSync(target)) {
  console.error(`${path.relative(process.cwd(), target)} already exists.`);
  process.exit(1);
}

const lower = code.toLowerCase();
const detect = lower.includes('-') ? `'${lower}', '${lower.split('-')[0]}'` : `'${lower}'`;
const out = fs.readFileSync(path.join(source, 'en.js'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace("code: 'en',", `code: '${code}',`)
  .replace("label: 'English',", `label: ${JSON.stringify(label)},`)
  .replace(/\n  order: .*\n/, '\n')
  .replace("detect: ['en'],", `detect: [${detect}],`);
fs.writeFileSync(target, out);
console.log(`Created ${path.relative(process.cwd(), target)}.
Translate every text in "help" and "messages" (keep {placeholders} as they are), then run: npm test
See which texts are still English: npm run lang:check`);
