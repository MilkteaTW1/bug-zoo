'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const i18n = require('../src/i18n');
const { zhName, localName, makeCreature } = require('../src/creature');
const auto = require('../src/autostart');

const REGISTER = auto.REGISTER_ARG; // same quoting-safe form that `bugzoo setup` writes

test('every language file has exactly the same keys as English', () => {
  const reference = new Set(Object.keys(i18n.LOCALES.en.messages));
  assert.ok(reference.size > 40);
  assert.ok(i18n.LANGS.includes('en') && i18n.LANGS.length >= 3);
  for (const code of i18n.LANGS) {
    if (code === 'en') continue;
    const keys = new Set(Object.keys(i18n.LOCALES[code].messages));
    assert.deepEqual([...reference].filter((k) => !keys.has(k)), [], `${code} is missing keys`);
    assert.deepEqual([...keys].filter((k) => !reference.has(k)), [], `${code} has keys English lacks`);
  }
});

test('every language file is complete: code, label, detect prefixes and help text', () => {
  for (const code of i18n.LANGS) {
    const loc = i18n.LOCALES[code];
    assert.equal(loc.code, code, `${code}.js declares another code`);
    assert.ok(loc.label && loc.detect.length > 0 && loc.help.includes('bugzoo'), `${code} is incomplete`);
    assert.equal(i18n.parseLang(code), code, `${code} cannot be chosen by its own code`);
    assert.equal(i18n.LANG_LABEL[code], loc.label);
  }
});

test('translations keep every {placeholder} of the English original', () => {
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const en = i18n.LOCALES.en.messages;
  for (const code of i18n.LANGS) {
    for (const [key, value] of Object.entries(i18n.LOCALES[code].messages)) {
      if (key in en) assert.deepEqual(holes(value), holes(en[key]), `${code}/${key} changed its placeholders`);
    }
  }
});

test('the language picker lists every language and accepts numbers, codes and locales', () => {
  const prompt = i18n.langPrompt();
  i18n.LANGS.forEach((code, i) => assert.ok(prompt.includes(`[${i + 1}] ${i18n.LANG_LABEL[code]}`)));
  assert.equal(i18n.parseLang('1'), i18n.LANGS[0]);
  assert.equal(i18n.parseLang('zh_CN.UTF-8'), 'zh-CN');
  assert.equal(i18n.parseLang('zh-HK'), 'zh-TW');
  assert.equal(i18n.parseLang('ko_KR'), 'ko');
  assert.equal(i18n.parseLang('EN'), 'en');
  assert.equal(i18n.parseLang('99'), null);
  assert.equal(i18n.parseLang('xx'), null);
});

test('npm run lang creates a ready-to-translate file with the English keys, then refuses to overwrite it', () => {
  const root = path.resolve(__dirname, '..');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-lang-'));
  const make = () => spawnSync(process.execPath, [path.join(root, 'tools', 'new-lang.js'), 'zz-ZZ', 'Zedish'],
    { encoding: 'utf8', env: { ...process.env, BUGZOO_LOCALES_OUT: out } });
  assert.equal(make().status, 0);
  const loc = require(path.join(out, 'zz-ZZ.js'));
  assert.equal(loc.code, 'zz-ZZ');
  assert.equal(loc.label, 'Zedish');
  assert.deepEqual(loc.detect, ['zz-zz', 'zz']);
  assert.equal(loc.order, undefined);
  assert.deepEqual(Object.keys(loc.messages), Object.keys(i18n.LOCALES.en.messages));
  assert.notEqual(make().status, 0, 'a second run must not overwrite the file');
  assert.equal(fs.existsSync(path.join(root, 'src', 'locales', 'zz-ZZ.js')), false, 'the test must not touch src/locales');
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
  // Korean
  assert.equal(i18n.detectLang({ LANG: 'ko_KR.UTF-8' }), 'ko');
  assert.equal(i18n.detectLang({ LANG: 'ko-KR' }), 'ko');
  assert.equal(i18n.detectLang({ LANG: 'ko' }), 'ko');
  // Everything else
  assert.equal(i18n.detectLang({ LANG: 'en_US.UTF-8' }), 'en');
  assert.equal(i18n.detectLang({ LANG: 'ja_JP.UTF-8' }), 'en');
  assert.equal(i18n.detectLang({ LANG: 'C' }), 'en');
  // LC_ALL wins over LANG; an empty value falls through to the next one
  assert.equal(i18n.detectLang({ LC_ALL: 'zh_CN', LANG: 'en_US' }), 'zh-CN');
  assert.equal(i18n.detectLang({ BUGZOO_LANG: '', LANG: 'zh_TW' }), 'zh-TW');
});

test('every language detectLang can return is registered', () => {
  for (const raw of ['zh_TW', 'zh_CN', 'zh-Hant', 'zh-Hans', 'zh', 'ko_KR', 'en_US', 'ja_JP']) {
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

test('`bugzoo lang` lists the languages, switches by code or number, and touches nothing else', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-lang-cli-'));
  const bin = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
  const run = (...args) => spawnSync(process.execPath, [bin, 'lang', ...args], {
    encoding: 'utf8', env: { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: '' },
  });
  const listed = run();
  assert.equal(listed.status, 0);
  for (const code of i18n.LANGS) assert.ok(listed.stdout.includes(code) && listed.stdout.includes(i18n.LANG_LABEL[code]));

  assert.equal(run('zh-CN').status, 0);
  assert.match(run().stdout, /\* 2\s+zh-CN/);
  assert.equal(run('1').status, 0);
  assert.match(run().stdout, /\* 1\s+zh-TW/);
  assert.equal(run('EN').stdout.trim(), 'Language set to English.');

  const bad = run('xx');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /xx/);
  const dex = JSON.parse(fs.readFileSync(path.join(home, 'dex.json'), 'utf8'));
  assert.equal(dex.profile.lang, 'en');
  assert.equal(dex.profile.name, undefined);
});

test('every language file has monster name lists, and localName follows them', () => {
  for (const code of i18n.LANGS) {
    const names = i18n.LOCALES[code].names;
    assert.ok(names && names.prefix.length > 0 && names.suffix.length > 0, `${code} has no names`);
    for (const w of [...names.prefix, ...names.suffix]) assert.ok(typeof w === 'string' && w.length > 0, `${code}: empty name part`);
  }
  const c = makeCreature('TypeError', 'x is undefined');
  assert.equal(localName(c.id, 'en'), null, 'English keeps the saved name');
  assert.equal(localName(c.id, 'xx'), null);
  const tw = localName(c.id, 'zh-TW');
  const cn = localName(c.id, 'zh-CN');
  assert.ok(tw && cn);
  assert.equal(tw, zhName(c.id));
  assert.match(cn, /^[一-鿿]+$/);
  assert.notEqual(cn, c.name, 'Simplified Chinese players get Chinese monster names');
});

test('a Simplified Chinese player sees simplified monster names in the CLI', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-names-'));
  const c = makeCreature('TypeError', 'x is undefined');
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: { [c.id]: { ...c, captures: 1, count: 1, escapes: 0 } }, pending: {}, runs: {}, battles: { wins: 0, losses: 0 },
    friends: [], profile: { name: 'tester', lang: 'zh-CN' }, trophies: [],
  }));
  const bin = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
  const out = spawnSync(process.execPath, [bin, 'dex'], { encoding: 'utf8', env: { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: '' } }).stdout;
  assert.ok(out.includes(localName(c.id, 'zh-CN')), out);
  assert.ok(!out.includes(localName(c.id, 'zh-TW')) || localName(c.id, 'zh-TW') === localName(c.id, 'zh-CN'));
});
