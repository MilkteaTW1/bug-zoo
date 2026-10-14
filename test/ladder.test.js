'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const L = require('../src/ladder');

const member = (name, rarity, power) => ({ name: `${name}-m`, type: 'T', rarity, power });
const player = (name, power, rarity = 'legendary') => ({
  v: 2, name, caught: { common: 1 }, team: [member(name, rarity, power)],
});

function scoresDir(players) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-ladder-'));
  for (const p of players) fs.writeFileSync(path.join(dir, `${p.name}.json`), JSON.stringify(p));
  return dir;
}

test('players without a valid team are skipped', () => {
  const dir = scoresDir([player('ann', 100), { v: 1, name: 'old', caught: { common: 1 } }]);
  const { players, skipped } = L.loadPlayers(dir);
  assert.deepEqual([...players.values()].map((p) => p.name), ['ann']);
  assert.equal(skipped.length, 1);
});

test('sync keeps order, drops leavers and appends newcomers by score', () => {
  const dir = scoresDir([player('a', 50), player('b', 50), player('c', 50)]);
  const { players } = L.loadPlayers(dir);
  assert.deepEqual(L.sync(['b', 'ghost', 'a'], players), ['b', 'a', 'c']);
});

test('challenge rules: must be above you and within reach', () => {
  const order = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  assert.equal(L.checkChallenge(order, 'p4', 'p2').ok, true);
  assert.equal(L.checkChallenge(order, 'p6', 'p2').ok, false); // 4 ranks up, reach is 3
  assert.equal(L.checkChallenge(order, 'p2', 'p4').ok, false); // below you
  assert.equal(L.checkChallenge(order, 'p2', 'p2').ok, false);
  assert.equal(L.checkChallenge(order, 'p2', 'nobody').ok, false);
});

test('promote moves the challenger up and shifts the others down', () => {
  assert.deepEqual(L.promote(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
});

test('winning a challenge promotes; losing changes nothing', () => {
  const dir = scoresDir([player('top', 10, 'common'), player('mid', 20, 'common'), player('low', 600, 'legendary')]);
  const { players } = L.loadPlayers(dir);
  const state = { order: ['top', 'mid', 'low'], processed: [] };

  const win = L.processChallenges(state, players, [{ file: '1.json', challenger: 'low', defender: 'top' }]);
  assert.equal(win.results[0].outcome, 'promoted');
  assert.deepEqual(win.state.order, ['low', 'top', 'mid']);

  const lose = L.processChallenges(state, players, [{ file: '1.json', challenger: 'top', defender: 'low' }]);
  assert.equal(lose.results[0].outcome, 'rejected'); // low is below top
  const lose2 = L.processChallenges({ order: ['low', 'top', 'mid'], processed: [] }, players,
    [{ file: '2.json', challenger: 'mid', defender: 'low' }]);
  assert.equal(lose2.results[0].outcome, 'lost');
  assert.deepEqual(lose2.state.order, ['low', 'top', 'mid']);
});

test('a challenge file is only processed once', () => {
  const dir = scoresDir([player('a', 10, 'common'), player('b', 600, 'legendary')]);
  const { players } = L.loadPlayers(dir);
  const ch = [{ file: 'x.json', challenger: 'b', defender: 'a' }];
  const first = L.processChallenges({ order: ['a', 'b'], processed: [] }, players, ch);
  const second = L.processChallenges(first.state, players, ch);
  assert.equal(second.results.length, 0);
  assert.deepEqual(second.state.order, ['b', 'a']);
});

test('invalid records are rejected and consumed', () => {
  const dir = scoresDir([player('a', 10)]);
  const { players } = L.loadPlayers(dir);
  const r = L.processChallenges({}, players, [{ file: 'bad.json', invalid: true }]);
  assert.equal(r.results[0].outcome, 'rejected');
  assert.deepEqual(r.state.processed, ['bad.json']);
});

test('loadChallenges reads records and flags garbage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-ch-'));
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ challenger: 'x', defender: 'y' }));
  fs.writeFileSync(path.join(dir, 'b.json'), 'nope');
  const list = L.loadChallenges(dir);
  assert.equal(list[0].challenger, 'x');
  assert.equal(list[1].invalid, true);
});
