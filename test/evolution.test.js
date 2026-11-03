'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { stageOf, evolutionMult, maxEvolvedPower, maxPower } = require('../src/power');
const { boostTrophies, topTeam } = require('../src/battle');
const { makeCreature } = require('../src/creature');
const achievements = require('../src/achievements');
const render = require('../src/render');
const shop = require('../src/shop');
const i18n = require('../src/i18n');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-evo-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}

const bug = (type = 'TypeError', msg = 'x is undefined') => ({ ...makeCreature(type, msg), sample: msg });
// Local noon, so no test lands in the 0-5 am night-owl window whatever time zone the machine is in.
const at = (ms) => new Date(new Date(2026, 2, 4, 12, 0, 0).getTime() + ms);

// --- evolution ---------------------------------------------------------------------------------

test('forms change at 30 and 100 affection, each 1.5 times stronger', () => {
  assert.deepEqual([0, 10, 29, 30, 99, 100, 200].map(stageOf), [0, 0, 0, 1, 1, 2, 2]);
  assert.deepEqual([0, 1, 2].map(evolutionMult), [1, 1.5, 2.25]);
});

test('a shared monster can never claim more than its final form allows', () => {
  assert.equal(maxEvolvedPower('common'), Math.round(maxPower('common') * 2.25));
  assert.ok(maxEvolvedPower('legendary') > maxPower('legendary'));
});

test('evolution boosts the team, not the recorded trophy', () => {
  const trophies = [
    { id: 'a', name: 'A', type: 'T', rarity: 'common', power: 100 },
    { id: 'b', name: 'B', type: 'T', rarity: 'common', power: 100 },
    { id: 'c', name: 'C', type: 'T', rarity: 'common', power: 100 },
  ];
  const creatures = { a: { captures: 1, bond: 0 }, b: { captures: 1, bond: 30 }, c: { captures: 1, bond: 100 } };
  const team = topTeam(trophies, creatures);
  assert.deepEqual(team.map((m) => [m.name, m.power, m.stage]), [['C', 225, 2], ['B', 150, 1], ['A', 100, 0]]);
  assert.equal(trophies[1].power, 100, 'the trophy itself is untouched');
  assert.deepEqual(topTeam(trophies).map((m) => m.power), [100, 100, 100], 'no creature table: base form');
  assert.equal(boostTrophies(trophies, creatures)[2].bond, 100);
});

test('affection, not catching, evolves a monster: once per form, up to the cap', () => {
  const store = freshStore();
  store.applyRun('cmd', [bug()], null, at(0));
  store.applyRun('cmd', [], null, at(1000));
  const dex = store.load();
  const id = Object.keys(dex.creatures)[0];
  assert.equal(dex.creatures[id].bond, 0, 'catching it again and again changes nothing');
  const treat = shop.FOODS.find((f) => f.id !== shop.favoriteOf(id) && f.bond <= 10).id;
  dex.inventory[treat] = 200;
  const forms = [];
  for (let i = 0; i < 100; i += 1) {
    const r = shop.feed(dex, id, treat);
    if (!r.ok) break;
    if (r.evolved) forms.push([r.evolved, r.bond >= (r.evolved === 1 ? 30 : 100)]);
  }
  assert.deepEqual(forms, [[1, true], [2, true]]);
  assert.equal(dex.creatures[id].bond, shop.BOND_MAX);
  assert.equal(shop.feed(dex, id, treat).reason, 'max');
});

// --- achievements ------------------------------------------------------------------------------

test('first catch, persistence and escapes unlock as they happen, each once', () => {
  const store = freshStore();
  store.applyRun('c', [bug()], null, at(0));
  const first = store.applyRun('c', [], null, at(1000));
  assert.deepEqual(first.achievements, ['first-catch', 'quick-fix']); // fixed one second after it appeared: also a shiny catch

  // a different bug appears after a failure: the first one escapes
  store.applyRun('d', [bug('RangeError', 'bad')], null, at(2000));
  const escaped = store.applyRun('d', [bug('KeyError', 'k')], null, at(3000));
  assert.ok(escaped.achievements.includes('slippery'));

  const again = store.applyRun('c', [], null, at(4000));
  assert.deepEqual(again.achievements, []);
});

test('every achievement has a name and a description in both languages', () => {
  for (const lang of ['en', 'zh-TW']) {
    i18n.setLang(lang);
    for (const id of achievements.IDS) {
      for (const part of ['name', 'desc']) {
        const key = `ach.${id}.${part}`;
        assert.notEqual(i18n.t(key), key, `${lang} is missing ${key}`);
      }
    }
  }
  i18n.setLang('en');
});

test('streaks count consecutive days only', () => {
  const day = (n) => ({ at: `2026-03-${String(n).padStart(2, '0')}T10:00:00.000Z`, power: 1 });
  const ids = (days) => {
    const dex = { creatures: {}, trophies: days.map(day), battles: { wins: 0 }, friends: [] };
    return achievements.evaluate(dex, 'now');
  };
  assert.ok(!ids([1, 2, 4, 5]).includes('streak-3'));
  assert.ok(ids([1, 2, 3]).includes('streak-3'));
  assert.ok(!ids([1, 2, 3, 4, 5, 6]).includes('streak-7'));
  assert.ok(ids([1, 2, 3, 4, 5, 6, 7]).includes('streak-7'));
});

test('big game, wins and friends are read from the dex', () => {
  const dex = { creatures: {}, trophies: [{ at: 'x', power: 100 }], battles: { wins: 1 }, friends: [{}] };
  const got = achievements.evaluate(dex, 'now');
  assert.deepEqual(got.sort(), ['big-game', 'first-win', 'friendly']);
  assert.deepEqual(achievements.evaluate(dex, 'later'), []);
  assert.equal(dex.achievements['big-game'], 'now', 'the unlock time is kept');
});

// --- what the player sees ----------------------------------------------------------------------

test('banners announce evolutions and achievements', () => {
  i18n.setLang('en');
  const entry = { ...bug(), name: 'Wobblebat' };
  const lines = render.extras({ evolved: [{ entry, stage: 1 }], achievements: ['persistent'] }).join('\n');
  assert.match(lines, /EVOLVED/);
  assert.match(lines, /Evolved form! Power x1\.5/);
  assert.match(lines, /ACHIEVEMENT.*Old acquaintance/);
});

test('team and achievement commands reflect evolution and unlocks', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-evo-cli-'));
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: { 'T:1': { id: 'T:1', name: 'Wobblebat', type: 'TypeError', rarity: 'common', captures: 3, bond: 30, count: 4, escapes: 0, art: ['a', 'b', 'c'] } },
    pending: {}, runs: {}, battles: { wins: 0, losses: 0 }, friends: [], profile: { name: 'tester', lang: 'en' },
    trophies: [{ id: 'T:1', name: 'Wobblebat', type: 'TypeError', rarity: 'common', power: 100, factors: {}, project: 'p', at: '2026-01-01T00:00:00Z' }],
  }));
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

  const team = strip(spawnSync(process.execPath, [BIN, 'team'], { env, encoding: 'utf8' }).stdout);
  assert.match(team, /Wobblebat \*/);
  assert.match(team, /power\s+150/);
  assert.match(team, /Evolved, next form at 70 more affection/);

  const ach = strip(spawnSync(process.execPath, [BIN, 'achievements'], { env, encoding: 'utf8' }).stdout);
  assert.match(ach, /Achievements: \d+\/30/);
  assert.match(ach, /\[x\] First catch/);
  assert.match(ach, /\[x\] Old acquaintance/);
  assert.match(ach, /\[ \] Ascended/);
});
