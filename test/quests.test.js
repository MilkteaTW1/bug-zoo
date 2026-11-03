'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const quests = require('../src/quests');
const { makeCreature } = require('../src/creature');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-quest-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}
const bug = (type = 'TypeError', msg = 'x is undefined') => ({ ...makeCreature(type, msg), sample: msg });
const MIN = 60 * 1000;
const day1 = (ms) => new Date(2026, 5, 10, 9, 0, 0, 0 + ms); // local time, so quests and the day agree

test('the day decides the quests: same day same three, one per kind, and they change from day to day', () => {
  const a = quests.pickFor('2026-06-10');
  assert.equal(a.length, quests.PER_DAY);
  assert.deepEqual(a, quests.pickFor('2026-06-10'));
  assert.equal(new Set(a.map((id) => quests.POOL.find((q) => q.id === id).metric)).size, a.length);
  const days = new Set(Array.from({ length: 14 }, (_, i) => quests.pickFor(`2026-06-${String(i + 10).padStart(2, '0')}`).join()));
  assert.ok(days.size > 3, 'not the same quests every day');
});

test('progress counts up, a finished quest is announced once, and a new day starts fresh', () => {
  const dex = {};
  quests.roll(dex, day1(0));
  const [first] = dex.daily.quests;
  const q = quests.POOL.find((x) => x.id === first);
  let finished = [];
  for (let i = 0; i < q.goal; i += 1) finished = quests.note(dex, q.metric, 1, day1(i));
  assert.deepEqual(finished, [first]);
  assert.deepEqual(quests.note(dex, q.metric, 5, day1(100)), []); // already done: nothing new
  assert.equal(dex.quests.total, 1);
  const status = quests.status(dex, day1(200));
  assert.equal(status.find((x) => x.id === first).done, true);
  assert.equal(status.find((x) => x.id === first).have, q.goal);

  const next = new Date(2026, 5, 11, 9, 0, 0, 0);
  assert.equal(quests.roll(dex, next), true);
  assert.deepEqual(dex.daily.done, []);
  assert.equal(dex.quests.total, 1); // the total survives
});

test('finishing all three in a day makes a perfect day, once', () => {
  const dex = {};
  quests.roll(dex, day1(0));
  for (const id of [...dex.daily.quests]) {
    const q = quests.POOL.find((x) => x.id === id);
    quests.note(dex, q.metric, q.goal, day1(1));
  }
  assert.equal(dex.quests.total, 3);
  assert.equal(dex.quests.perfect, 1);
  quests.note(dex, 'catch', 9, day1(2));
  assert.equal(dex.quests.perfect, 1);
});

test('a catch counts for quests; a fix within ten minutes is shiny, a slow one is not', () => {
  const store = freshStore();
  store.applyRun('a', [bug()], null, day1(0));
  const quick = store.applyRun('a', [], null, day1(5 * MIN));
  assert.equal(quick.trophies[0].shiny, true);
  assert.equal(store.load().creatures[bug().id].shinies, 1);
  assert.ok(quick.achievements.includes('quick-fix'));
  assert.equal(store.load().daily.counts.catch, 1);

  store.applyRun('b', [bug('KeyError', 'k')], null, day1(10 * MIN));
  const slow = store.applyRun('b', [], null, day1(40 * MIN));
  assert.equal(slow.trophies[0].shiny, undefined);
});

test('clean runs only count for a command that failed before, so healthy commands cost nothing', () => {
  const store = freshStore();
  const quiet = store.applyRun('healthy', [], null, day1(0));
  assert.deepEqual(quiet.quests, []);
  assert.equal(store.load().stats.clean, 0);
  assert.ok(!fs.existsSync(store.dexPath().file), 'no file written for a healthy command with no history');

  store.applyRun('broken', [bug()], null, day1(MIN));
  store.applyRun('broken', [], null, day1(2 * MIN)); // the catch
  store.applyRun('broken', [], null, day1(3 * MIN)); // a clean run of a command we know
  assert.equal(store.load().stats.clean, 2);
});

test('bugzoo quests shows today and saves the day', () => {
  const { spawnSync } = require('node:child_process');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-q-cli-'));
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({ profile: { lang: 'en', name: 't' }, creatures: {}, trophies: [] }));
  const r = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'bin', 'bugzoo.js'), 'quests'], { env: { ...process.env, BUGZOO_HOME: home }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Quests for today/);
  assert.equal((r.stdout.match(/\[ \]/g) || []).length, quests.PER_DAY);
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'dex.json'), 'utf8')).daily.quests.length, quests.PER_DAY);
});
