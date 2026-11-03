'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const battle = require('../src/battle');

const side = (name, powers, types = ['TypeError', 'KeyError', 'SIGSEGV']) => ({
  name, team: powers.map((p, i) => ({ name: `${name}${i}`, type: types[i % types.length], rarity: 'common', power: p, stage: 0 })),
});

test('the player decides who fights each round; the opponent shows its fighter first', () => {
  const m = battle.startMatch(side('me', [40, 30, 20]), side('foe', [35, 35, 25]));
  assert.ok(m.foeIdx >= 0, 'the opponent has already picked');
  const before = m.foe.team[m.foeIdx].name;
  const ev = battle.playRound(m, 2);
  assert.equal(m.picks[0], 2);
  assert.equal(ev.find((e) => e.side === 'me').att, 'me2', 'the monster the player picked attacked');
  assert.equal(ev.find((e) => e.side === 'me').def, before);
});

test('a different pick changes how the round goes', () => {
  const run = (pick) => {
    const m = battle.startMatch(side('me', [40, 30, 20]), side('foe', [35, 35, 25]));
    return battle.playRound(m, pick).map((e) => `${e.att}>${e.def}:${e.dmg}`).join(',');
  };
  assert.notEqual(run(0), run(2));
});

test('the same picks give the same match', () => {
  const play = () => {
    const m = battle.startMatch(side('me', [40, 30, 20]), side('foe', [35, 35, 25]));
    for (const p of [1, 0, 0, 2, 1, 0, 1, 2, 0, 1, 2]) {
      if (m.over) break;
      const living = m.me.team.map((x, i) => (x.hp > 0 ? i : -1)).filter((i) => i >= 0);
      battle.playRound(m, living.includes(p) ? p : living[0]);
    }
    return JSON.stringify(m.log);
  };
  assert.equal(play(), play());
});

test('a fainted monster cannot be picked again, and the match ends when one side is out', () => {
  const m = battle.startMatch(side('me', [200, 5]), side('foe', [5]));
  battle.playRound(m, 0);
  assert.equal(m.over, true);
  assert.equal(m.winner, 'me');
  const m2 = battle.startMatch(side('me', [5, 400]), side('foe', [300]));
  battle.playRound(m2, 0);
  assert.throws(() => battle.playRound(m2, 0), /cannot fight/);
});

test('autoMatch plays a full match by itself and is repeatable', () => {
  const a = battle.autoMatch(side('me', [40, 30, 20]), side('foe', [35, 35, 25]));
  const b = battle.autoMatch(side('me', [40, 30, 20]), side('foe', [35, 35, 25]));
  assert.equal(a.over, true);
  assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
});
