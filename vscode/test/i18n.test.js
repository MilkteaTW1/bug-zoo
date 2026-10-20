'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-vscode-i18n-'));
delete process.env.BUGZOO_LANG;

const { buildState, say, creatureName } = require('../lib/state');
const { i18n, store } = require('../lib/engine');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const english = () => { i18n.setLang('en'); return i18n.bundle('vs.'); };

test('every text the views and the editor ask for exists in the language files', () => {
  const have = new Set(Object.keys(english()));
  const used = (file, re) => [...read(file).matchAll(re)].map((m) => m[1]);
  const asked = [
    ...used('media/zoo.js', /\btr\('([\w.]+)'\)/g),
    ...used('media/arena.js', /\btr\('([\w.]+)'\)/g),
    ...used('extension.js', /\bsay\(\s*'([\w.]+)'/g),
    ...used('extension.js', /\bsay\([^'\n]*\?\s*'([\w.]+)'\s*:\s*'([\w.]+)'/g),
    'kind.code', 'kind.url', 'kind.file', 'kind.ladder', 'practiceNote', 'friendUpdated', 'friendAdded', 'friendSelf', 'friendBad',
    'captureOn', 'captureOff',
  ];
  assert.ok(asked.length > 40, 'found the texts the code asks for');
  assert.deepStrictEqual([...new Set(asked)].filter((k) => !have.has(k)), []);
});

test('every language has all the extension texts (English fills any gap)', () => {
  const en = english();
  for (const code of i18n.LANGS) {
    i18n.setLang(code);
    assert.deepStrictEqual(Object.keys(i18n.bundle('vs.')).sort(), Object.keys(en).sort(), code);
  }
  i18n.setLang('en');
});

test('the state carries the texts in the player\'s language, chosen in `bugzoo setup`', () => {
  const dex = store.load();
  dex.profile = { ...(dex.profile || {}), lang: 'zh-CN' };
  store.save(dex);
  const state = buildState();
  assert.strictEqual(state.lang, 'zh-CN');
  assert.strictEqual(state.text.caught, '已捕获');
  assert.strictEqual(say('friendAdded', { name: 'amy' }), '已添加 amy。');
  assert.strictEqual(creatureName({ name: 'Wibble', type: 'TypeError' }), 'Wibble（TypeError）');

  dex.profile.lang = 'en';
  store.save(dex);
  assert.strictEqual(buildState().text.caught, 'caught');
});

test('without a saved language the editor language is used, and unknown ones fall back to English', () => {
  const dex = store.load();
  delete dex.profile.lang;
  store.save(dex);
  process.env.BUGZOO_LANG = 'zh-tw';
  assert.strictEqual(buildState().text.caught, '已捕獲');
  process.env.BUGZOO_LANG = 'xx-yy';
  assert.strictEqual(buildState().text.caught, 'caught');
  delete process.env.BUGZOO_LANG;
});

test('the manifest texts are localised through package.nls files that name the same keys', () => {
  const manifest = read('package.json');
  const keys = [...manifest.matchAll(/"%([\w.]+)%"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 5);
  for (const f of fs.readdirSync(root).filter((n) => /^package\.nls(\.[\w-]+)?\.json$/.test(n))) {
    const table = JSON.parse(read(f));
    assert.deepStrictEqual(keys.filter((k) => !(k in table)), [], `${f} is missing keys`);
  }
});
