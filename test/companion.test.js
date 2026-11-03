'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeCreature, speciesName } = require('../src/creature');
const species = require('../src/species');
const achievements = require('../src/achievements');
const i18n = require('../src/i18n');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-comp-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}
const bug = (msg = 'x is undefined') => ({ ...makeCreature('TypeError', msg), sample: msg });
const at = (min, d = 4) => new Date(2026, 2, d, 12, 0, 0, 0 + min * 60000);

test('fifty species, each with a name in every language and three lines of art', () => {
  assert.equal(species.COUNT, 50);
  for (const code of i18n.LANGS) {
    const list = i18n.LOCALES[code].species;
    assert.equal(list.length, 50, `${code} species names`);
    assert.equal(new Set(list).size, 50, `${code} species names are distinct`);
  }
  const looks = new Set();
  for (let i = 0; i < 50; i += 1) {
    const art = species.draw(i, 'o o');
    assert.equal(art.length, 3);
    assert.ok(art.every((l) => typeof l === 'string' && !l.includes(String.fromCharCode(92))));
    looks.add(art.join('\n'));
  }
  assert.equal(looks.size, 50, 'no two species look the same');
});

test('a new monster gets a species, deterministically, and all species show up', () => {
  const a = makeCreature('TypeError', 'boom 1');
  assert.equal(typeof a.species, 'number');
  assert.deepEqual(makeCreature('TypeError', 'boom 1'), a);
  assert.ok(speciesName(a, 'en'));
  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) seen.add(makeCreature('KeyError', `key ${i.toString(26).replace(/[0-9]/g, (d) => 'qrstuvwxyz'[d])} missing`).species);
  assert.equal(seen.size, 50);
  assert.equal(speciesName({ id: 'old' }), '', 'monsters caught before species existed have none');
});

test('five commands in a row without an error bring a companion; an error resets the count', () => {
  const store = freshStore();
  store.applyRun('b', [bug()], null, at(0)); // creates the dex file
  for (let i = 1; i <= 4; i += 1) assert.equal(store.applyRun('ok', [], null, at(i)).gift, null);
  const gift = store.applyRun('ok', [], null, at(5)).gift;
  assert.ok(gift && gift.companion && gift.captures === 1);
  const dex = store.load();
  assert.ok(dex.trophies.some((t) => t.id === gift.id && t.companion), 'the companion can fight');
  assert.ok(dex.achievements.companion);

  for (let i = 6; i <= 9; i += 1) store.applyRun('ok', [], null, at(i));
  store.applyRun('b', [bug('other')], null, at(10)); // an error
  assert.equal(store.load().stats.streak, 0);
  for (let i = 11; i <= 14; i += 1) assert.equal(store.applyRun('ok', [], null, at(i)).gift, null);
});

test('a day hands out at most three companions', () => {
  const store = freshStore();
  store.applyRun('b', [bug()], null, at(0));
  let n = 0;
  for (let i = 1; i <= 40; i += 1) if (store.applyRun('ok', [], null, at(i)).gift) n += 1;
  assert.equal(n, 3);
  let tomorrow = 0;
  for (let i = 0; i < 10; i += 1) if (store.applyRun('ok', [], null, at(i, 5)).gift) tomorrow += 1;
  assert.ok(tomorrow >= 1, 'the cap resets on the next day');
});

test('a healthy run on a fresh install still writes nothing', () => {
  const store = freshStore();
  store.applyRun('ok', [], null, at(0));
  assert.ok(!fs.existsSync(store.dexPath().file));
});

test('species and holiday achievements', () => {
  const dex = { creatures: {}, trophies: [], battles: {}, friends: [], stats: {}, quests: {}, tower: {} };
  for (let i = 0; i < 30; i += 1) dex.creatures[`c${i}`] = { id: `c${i}`, species: i, captures: 1, type: 'T', rarity: 'common' };
  const ids = achievements.evaluate(dex);
  assert.ok(ids.includes('species-10') && ids.includes('species-25'));
  assert.ok(!ids.includes('species-50'));

  const xmas = { creatures: {}, trophies: [{ at: new Date(2026, 11, 25, 12).toISOString() }], stats: {}, quests: {}, tower: {} };
  assert.ok(achievements.evaluate(xmas).includes('holiday'));
  const plain = { creatures: {}, trophies: [{ at: new Date(2026, 2, 4, 12).toISOString() }], stats: {}, quests: {}, tower: {} };
  assert.ok(!achievements.evaluate(plain).includes('holiday'));
});

test('bugzoo nick names a caught monster and clears it again', () => {
  const store = freshStore();
  const b = bug();
  store.applyRun('c', [b], null, at(0));
  store.applyRun('c', [], null, at(1));
  const env = { ...process.env, BUGZOO_HOME: process.env.BUGZOO_HOME, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const run = (...a) => spawnSync(process.execPath, [BIN, ...a], { env, encoding: 'utf8' });
  assert.equal(run('nick', b.name, 'Biscuit', '<b>').status, 0);
  assert.equal(store.load().creatures[b.id].nick, 'Biscuit b');
  assert.match(run('dex').stdout, /Biscuit b/);
  assert.equal(run('nick', 'Biscuit b').status, 0);
  assert.equal(store.load().creatures[b.id].nick, undefined);
  assert.equal(run('nick', 'Nobody', 'x').status, 1);
});
