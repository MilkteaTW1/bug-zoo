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

test('a globe button in the view title changes the language through a command the extension registers', () => {
  const manifest = JSON.parse(read('package.json'));
  const { commands, menus } = manifest.contributes;
  assert.ok(commands.some((c) => c.command === 'bugzoo.setLanguage' && c.icon));
  assert.ok(menus['view/title'].some((m) => m.command === 'bugzoo.setLanguage' && /bugzoo\.zoo/.test(m.when)));
  assert.ok(read('extension.js').includes("registerCommand('bugzoo.setLanguage'"));
});

test('the language command saves the picked language for the zoo and for the CLI', async () => {
  const Module = require('node:module');
  const handlers = {};
  let picked = null;
  const shown = [];
  const noop = () => {};
  const fake = {
    window: {
      registerWebviewViewProvider: noop, createWebviewPanel: noop, onDidCloseTerminal: noop, onDidOpenTerminal: noop,
      onDidStartTerminalShellExecution: noop, onDidEndTerminalShellExecution: noop, terminals: [],
      showQuickPick: async (items) => { picked = items; return items.find((i) => i.code === 'zh-CN'); },
      showInformationMessage: (m) => shown.push(m), showWarningMessage: noop, setStatusBarMessage: noop,
    },
    commands: { registerCommand: (id, fn) => { handlers[id] = fn; return { dispose: noop }; }, executeCommand: noop },
    workspace: {
      getConfiguration: () => ({ get: () => true, update: noop }), workspaceFolders: [], onDidChangeWorkspaceFolders: noop,
      onDidChangeConfiguration: noop,
    },
    env: { language: 'en' }, ConfigurationTarget: { Global: 1 }, ViewColumn: { Beside: 2 }, Uri: { joinPath: noop, parse: noop },
  };
  const real = Module._load;
  const realWatch = fs.watch;
  fs.watch = () => ({ close: noop }); // no real file watcher in the test (it trips a libuv assertion on 8.3 temp paths)
  Module._load = function (request, ...rest) { return request === 'vscode' ? fake : real.call(this, request, ...rest); };
  try {
    const ext = require('../extension');
    const context = { subscriptions: [], extensionUri: {} };
    ext.activate(context);
    assert.ok(handlers['bugzoo.setLanguage'], 'the command is registered');
    await handlers['bugzoo.setLanguage']();
    assert.deepStrictEqual(picked.map((p) => p.code), i18n.LANGS);
    assert.strictEqual(store.load().profile.lang, 'zh-CN');
    assert.ok(shown.some((m) => m.includes('简体中文')), shown.join('|'));
    ext.deactivate();
  } finally {
    Module._load = real;
    fs.watch = realWatch;
  }
});
