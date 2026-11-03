'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-solo-'));
process.env.BUGZOO_LANG = 'en';

const { recordCommand } = require('../lib/capture');
const fight = require('../lib/fight');
const { buildState, diffStates } = require('../lib/state');
const { store, nick } = require('../lib/engine');

const TYPES = { alpha: 'RangeError', beta: 'ReferenceError', gamma: 'SyntaxError' };
const crash = (word) => [
  '/work/app.js:3', '  x', '', `${TYPES[word] || 'TypeError'}: Cannot read properties of undefined (reading '${word}')`,
  '    at Object.<anonymous> (/work/app.js:3:13)',
].join('\n');
const home = process.env.BUGZOO_HOME;
const run = (word, exitCode) => recordCommand({ commandLine: `node ${word}.js`, exitCode, cwd: home, output: exitCode ? crash(word) : '' });

test('the state carries quests, the tower, the team, species and the streak', () => {
  for (const w of ['alpha', 'beta', 'gamma']) { run(w, 1); run(w, 0); }
  const s = buildState();
  assert.strictEqual(s.quests.list.length, 3);
  assert.strictEqual(s.tower.floor, 1);
  assert.ok(s.tower.foe.length >= 1 && s.tower.foe[0].element);
  assert.ok(s.team.rows.length >= 3 && s.team.rows.some((r) => r.fighting));
  assert.strictEqual(s.kindsTotal, 50);
  assert.ok(s.kinds >= 1);
  assert.ok(s.caught.every((c) => typeof c.species === 'string' && c.element));
  assert.ok(s.text['element.logic'] && s.text.team && s.text.towerFloor);
});

test('the team the player picks is the one that fights', () => {
  const rows = buildState().team.rows;
  const pick = rows[rows.length - 1].id; // the weakest one first
  fight.setTeam([pick, 'not-a-monster', pick]);
  const dex = store.load();
  assert.deepStrictEqual(dex.team, [pick]);
  const s = buildState();
  assert.strictEqual(s.team.rows.find((r) => r.id === pick).pick, 1);
  assert.ok(s.team.rows.find((r) => r.id === pick).fighting);
  fight.setTeam([]);
  assert.deepStrictEqual(store.load().team, []);
});

test('a tower fight is a full replay, counts for quests and clears the floor when won', () => {
  const r = fight.towerFight();
  assert.ok(r.log.length > 0 && r.me.team.every((m) => m.element));
  assert.ok(['towerWin', 'towerLose'].includes(r.outcome));
  const dex = store.load();
  assert.strictEqual(dex.tower.cleared, r.won ? 1 : 0);
  assert.ok((dex.daily.counts.fights || 0) >= 1);
});

test('a nickname shows up in the zoo, and a companion arrives as an event', () => {
  const id = Object.keys(store.load().creatures)[0];
  const dex = store.load();
  nick.set(dex, id, 'Biscuit');
  store.save(dex);
  assert.ok(buildState().caught.some((c) => c.name === 'Biscuit' && c.nick === 'Biscuit'));

  const before = buildState();
  for (let i = 0; i < 5; i += 1) run('healthy', 0);
  const after = buildState();
  const events = diffStates(before, after);
  assert.strictEqual(events.gifts.length, 1);
  assert.ok(events.gifts[0].companion);
  assert.strictEqual(diffStates(null, after).gifts.length, 0, 'the first state never announces anything');
});

test('the shop: coins from fights, buying, feeding and evolving, all through the extension backend', () => {
  const dex = store.load();
  dex.coins = 400;
  store.save(dex);
  assert.strictEqual(buildState().shop.coins, 400);
  assert.strictEqual(fight.buy('nothing').ok, false);
  assert.strictEqual(fight.buy('cake').ok, true);
  assert.strictEqual(fight.buy('cushion').ok, true);
  assert.strictEqual(fight.buy('cushion').reason, 'owned');
  const s = buildState();
  assert.strictEqual(s.shop.foods.find((f) => f.id === 'cake').have, 1);
  assert.ok(s.shop.furniture.find((f) => f.id === 'cushion').owned);
  assert.strictEqual(s.shop.comfort, 10);
  assert.ok(s.text['shop.title'] && s.text.shopTab);

  const target = fight.feedTargets()[0];
  const r = fight.feed(target.id, 'cake');
  assert.ok(r.ok && r.evolved >= 1, 'a golden cake is enough to evolve a base-form monster');
  const c = buildState().caught.find((x) => x.id === target.id);
  assert.ok(c.bond >= 100 && c.stage === 2 && c.hearts >= 5);
  assert.strictEqual(fight.feed(target.id, 'cake').reason, 'noFood');
});
