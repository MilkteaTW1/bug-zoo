'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const i18n = require('../src/i18n');
const { zhName, makeCreature } = require('../src/creature');
const auto = require('../src/autostart');

const REGISTER = auto.REGISTER_ARG; // same quoting-safe form that `bugzoo setup` writes

test('every language has exactly the same keys as English', () => {
  // Reads the same tables through t(): a missing key would echo the key itself.
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'i18n.js'), 'utf8');
  const body = src.slice(src.indexOf('const M = {'), src.indexOf('\nlet current'));
  const blocks = [...body.matchAll(/^  (?:'([^']+)'|([a-zA-Z]+)): \{/gm)]
    .map((m, i, all) => ({
      lang: m[1] || m[2],
      text: body.slice(m.index, i + 1 < all.length ? all[i + 1].index : body.length),
    }));
  const keysOf = (text) => new Set([...text.matchAll(/^\s{4}'([^']+)':/gm)].map((m) => m[1]));

  // Every registered language must have a table, and English is the reference.
  assert.deepEqual(blocks.map((b) => b.lang).sort(), [...i18n.LANGS].sort());
  const reference = keysOf(blocks.find((b) => b.lang === 'en').text);
  assert.ok(reference.size > 40);

  for (const { lang, text } of blocks) {
    if (lang === 'en') continue;
    const keys = keysOf(text);
    assert.deepEqual([...reference].filter((k) => !keys.has(k)), [], `${lang} is missing keys`);
    assert.deepEqual([...keys].filter((k) => !reference.has(k)), [], `${lang} has keys English lacks`);
  }
});

test('translations keep every {placeholder} of the English original', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'i18n.js'), 'utf8');
  const body = src.slice(src.indexOf('const M = {'), src.indexOf('\nlet current'));
  const blocks = [...body.matchAll(/^  (?:'([^']+)'|([a-zA-Z]+)): \{/gm)]
    .map((m, i, all) => ({
      lang: m[1] || m[2],
      text: body.slice(m.index, i + 1 < all.length ? all[i + 1].index : body.length),
    }));
  const entriesOf = (text) => new Map([...text.matchAll(/^\s{4}'([^']+)': '((?:[^'\\]|\\.)*)'/gm)]
    .map((m) => [m[1], m[2]]));
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  const en = entriesOf(blocks.find((b) => b.lang === 'en').text);
  for (const { lang, text } of blocks) {
    if (lang === 'en') continue;
    const table = entriesOf(text);
    for (const [key, value] of table) {
      if (!en.has(key)) continue;
      assert.deepEqual(holes(value), holes(en.get(key)), `${lang}/${key} changed its placeholders`);
    }
  }
});

test('t() interpolates and falls back to English then the key', () => {
  i18n.setLang('zh-TW');
  assert.match(i18n.t('enc.appeared', { type: 'TypeError' }), /TypeError/);
  assert.equal(i18n.t('no.such.key'), 'no.such.key');
  i18n.setLang('en');
  assert.equal(i18n.t('enc.appeared', { type: 'X' }), 'A wild X appeared!');
});

test('language detection follows BUGZOO_LANG then the locale', () => {
  // Traditional Chinese
  assert.equal(i18n.detectLang({ BUGZOO_LANG: 'zh-TW' }), 'zh-TW');
  assert.equal(i18n.detectLang({ LANG: 'zh_TW.UTF-8' }), 'zh-TW');
  assert.equal(i18n.detectLang({ LANG: 'zh-Hant-TW' }), 'zh-TW');
  assert.equal(i18n.detectLang({ LANG: 'zh_HK.UTF-8' }), 'zh-TW');
  assert.equal(i18n.detectLang({ LANG: 'zh-MO' }), 'zh-TW');
  // Simplified Chinese
  assert.equal(i18n.detectLang({ LANG: 'zh_CN.UTF-8' }), 'zh-CN');
  assert.equal(i18n.detectLang({ LANG: 'zh-CN' }), 'zh-CN');
  assert.equal(i18n.detectLang({ LANG: 'zh-Hans-CN' }), 'zh-CN');
  assert.equal(i18n.detectLang({ LANG: 'zh-SG' }), 'zh-CN');
  assert.equal(i18n.detectLang({ LANG: 'zh' }), 'zh-CN');
  // Everything else
  assert.equal(i18n.detectLang({ LANG: 'en_US.UTF-8' }), 'en');
  assert.equal(i18n.detectLang({ LANG: 'ja_JP.UTF-8' }), 'en');
  assert.equal(i18n.detectLang({ LANG: 'C' }), 'en');
  // LC_ALL wins over LANG; an empty value falls through to the next one
  assert.equal(i18n.detectLang({ LC_ALL: 'zh_CN', LANG: 'en_US' }), 'zh-CN');
  assert.equal(i18n.detectLang({ BUGZOO_LANG: '', LANG: 'zh_TW' }), 'zh-TW');
});

test('every language detectLang can return is registered', () => {
  for (const raw of ['zh_TW', 'zh_CN', 'zh-Hant', 'zh-Hans', 'zh', 'en_US', 'ja_JP']) {
    assert.ok(i18n.LANGS.includes(i18n.detectLang({ LANG: raw })), `${raw} resolved to an unregistered language`);
  }
});

test('width counts CJK as two columns so tables stay aligned', () => {
  assert.equal(i18n.width('abc'), 3);
  assert.equal(i18n.width('陰森'), 4);
  assert.equal(i18n.pad('陰', 4), '陰  ');
});

test('Chinese creature names are deterministic and derived from the id', () => {
  const c = makeCreature('TypeError', 'x is undefined');
  assert.equal(zhName(c.id), zhName(c.id));
  assert.match(zhName(c.id), /^[一-鿿]+$/);
});

test('autostart token handling is idempotent and preserves other options', () => {
  const once = auto.addToken('--max-old-space-size=4096');
  assert.ok(auto.hasToken(once));
  assert.equal(auto.addToken(once), once);
  assert.equal(auto.removeToken(once), '--max-old-space-size=4096');
  assert.equal(auto.removeToken(auto.addToken('')), '');
});

test('shell profile block can be added and stripped cleanly', () => {
  const text = `export A=1\n${auto.block()}\nexport B=2\n`;
  const stripped = auto.stripBlock(text);
  assert.ok(!stripped.includes('bugzoo'));
  assert.ok(stripped.includes('export A=1') && stripped.includes('export B=2'));
});

test('preload: failing program spawns a bug, fixed program catches it - no `bugzoo run` needed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-pre-'));
  const home = path.join(dir, 'home');
  const env = {
    ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', BUGZOO_FORCE: '1', // pipes are not a TTY
    NODE_OPTIONS: `--require "${REGISTER}"`,
  };
  delete env.BUGZOO_ACTIVE;
  const run = () => spawnSync(process.execPath, ['app.js'], { cwd: dir, env, encoding: 'utf8' });

  fs.writeFileSync(path.join(dir, 'app.js'), 'const o = null;\no.x;\n');
  const first = run();
  assert.notEqual(first.status, 0);
  assert.match(first.stderr, /A wild TypeError appeared!/);

  fs.writeFileSync(path.join(dir, 'app.js'), "console.log('ok');\n");
  const second = run();
  assert.equal(second.status, 0);
  assert.match(second.stderr, /\[CAUGHT\]/);
});

test('preload stays silent for healthy programs and respects BUGZOO_ACTIVE', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-pre-'));
  fs.writeFileSync(path.join(dir, 'ok.js'), "console.log('fine');\n");
  fs.writeFileSync(path.join(dir, 'bad.js'), 'null.x;\n');
  const base = { ...process.env, BUGZOO_HOME: path.join(dir, 'home'), BUGZOO_LANG: 'en', NODE_OPTIONS: `--require "${REGISTER}"` };

  const ok = spawnSync(process.execPath, ['ok.js'], { cwd: dir, env: base, encoding: 'utf8' });
  assert.equal(ok.stderr, '');
  assert.ok(!fs.existsSync(path.join(dir, 'home', 'dex.json')));

  const inside = spawnSync(process.execPath, ['bad.js'], { cwd: dir, env: { ...base, BUGZOO_ACTIVE: '1' }, encoding: 'utf8' });
  assert.ok(!/wild/.test(inside.stderr));
});
