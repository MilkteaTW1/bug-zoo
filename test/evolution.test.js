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
const i18n = require('../src/i18n');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-evo-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}

const bug = (type = 'TypeError', msg = 'x is undefined') => ({ ...makeCreature(type, msg), sample: msg });
const at = (ms) => new Date(Date.UTC(2026, 0, 1) + ms);

// --- evolution ---------------------------------------------------------------------------------

test('forms change at 3 and 10 captures', () => {
  assert.deepEqual([0, 1, 2, 3, 9, 10, 50].map(stageOf), [0, 0, 0, 1, 1, 2, 2]);
  assert.deepEqual([0, 1, 2].map(evolutionMult), [1, 1.15, 1.35]);
});

test('a shared monster can never claim more than its final form allows', () => {
  assert.equal(maxEvolvedPower('common'), Math.round(maxPower('common') * 1.35));
  assert.ok(maxEvolvedPower('legendary') > maxPower('legendary'));
});

test('evolution boosts the team, not the recorded trophy', () => {
  const trophies = [
    { id: 'a', name: 'A', type: 'T', rarity: 'common', power: 100 },
    { id: 'b', name: 'B', type: 'T', rarity: 'common', power: 100 },
    { id: 'c', name: 'C', type: 'T', rarity: 'common', power: 100 },
  ];
  const creatures = { a: { captures: 1 }, b: { captures: 3 }, c: { captures: 10 } };
  const team = topTeam(trophies, creatures);
  assert.deepEqual(team.map((m) => [m.name, m.power, m.stage]), [['C', 135, 2], ['B', 115, 1], ['A', 100, 0]]);
  assert.equal(trophies[1].power, 100, 'the trophy itself is untouched');
  assert.deepEqual(topTeam(trophies).map((m) => m.power), [100, 100, 100], 'no creature table: base form');
  assert.equal(boostTrophies(trophies, creatures)[2].captures, 10);
});

test('the third capture of the same bug announces an evolution, once', () => {
  const store = freshStore();
  const evolutions = [];
  for (let i = 0; i < 4; i++) {
    store.applyRun('cmd', [bug()], null, at(i * 3_600_000));
    const r = store.applyRun('cmd', [], null, at(i * 3_600_000 + 1000));
    evolutions.push(r.evolved.map((e) => e.stage));
  }
  assert.deepEqual(evolutions, [[], [], [1], []]);
  const dex = store.load();
  assert.equal(Object.values(dex.creatures)[0].captures, 4);
});

// --- achievements ------------------------------------------------------------------------------

test('first catch, persistence and escapes unlock as they happen, each once', () => {
  const store = freshStore();
  store.applyRun('c', [bug()], null, at(0));
  const first = store.applyRun('c', [], null, at(1000));
  assert.deepEqual(first.achievements, ['first-catch']);

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
  assert.match(lines, /Evolved form! Power x1\.15/);
  assert.match(lines, /ACHIEVEMENT.*Old acquaintance/);
});

test('team and achievement commands reflect evolution and unlocks', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-evo-cli-'));
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: { 'T:1': { id: 'T:1', name: 'Wobblebat', type: 'TypeError', rarity: 'common', captures: 3, count: 4, escapes: 0, art: ['a', 'b', 'c'] } },
    pending: {}, runs: {}, battles: { wins: 0, losses: 0 }, friends: [], profile: { name: 'tester', lang: 'en' },
    trophies: [{ id: 'T:1', name: 'Wobblebat', type: 'TypeError', rarity: 'common', power: 100, factors: {}, project: 'p', at: '2026-01-01T00:00:00Z' }],
  }));
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

  const team = strip(spawnSync(process.execPath, [BIN, 'team'], { env, encoding: 'utf8' }).stdout);
  assert.match(team, /Wobblebat \*/);
  assert.match(team, /power\s+115/);
  assert.match(team, /Evolved, next form after 7 more catch/);

  const ach = strip(spawnSync(process.execPath, [BIN, 'achievements'], { env, encoding: 'utf8' }).stdout);
  assert.match(ach, /Achievements: \d+\/13/);
  assert.match(ach, /\[x\] First catch/);
  assert.match(ach, /\[x\] Old acquaintance/);
  assert.match(ach, /\[ \] Ascended/);
});
