'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-fight-'));
process.env.BUGZOO_HOME = home;

const { recordCommand } = require('../lib/capture');
const fight = require('../lib/fight');
const { store } = require('../lib/engine');

const crash = (word) => [
  '/work/app.js:3', '  x', '', `TypeError: Cannot read properties of undefined (reading '${word}')`,
  '    at Object.<anonymous> (/work/app.js:3:13)',
].join('\n');

function catchOne(word) {
  recordCommand({ commandLine: `node ${word}.js`, exitCode: 1, cwd: home, output: crash(word) });
  recordCommand({ commandLine: `node ${word}.js`, exitCode: 0, cwd: home, output: '' });
}

test('without a team nobody can be fought', async () => {
  const arena = await fight.loadArena();
  assert.strictEqual(arena.me.canFight, false);
  assert.deepStrictEqual(fight.fight('practice', 'Legacy Codebase'), { error: 'noTeam' });
});

test('with a team the list has the practice dummy', async () => {
  catchOne('alpha');
  catchOne('beta');
  const arena = await fight.loadArena();
  assert.strictEqual(arena.me.canFight, true);
  assert.ok(arena.rows.some((r) => r.section === 'practice'));
  assert.ok(arena.rows.every((r) => r.team.every((m) => Array.isArray(m.art) && m.art.length > 0)));
});

// Play a fight to the end, always picking the first monster still standing.
function playOut(start, earlier = []) {
  const alive = start.me.team.map(() => true);
  for (const ev of earlier) if (ev.faint && ev.side === 'foe') alive[ev.di] = false;
  let r = null;
  let guard = 0;
  while ((!r || !r.over) && guard++ < 100) {
    const i = alive.indexOf(true);
    r = fight.pick(i);
    assert.ok(!r.error, `pick ${i}: ${r.error}`);
    for (const ev of r.events) if (ev.faint && ev.side === 'foe') alive[ev.di] = false; // a foe hit on my side fainted
  }
  return r;
}

test('a practice fight is steered round by round and does not count', async () => {
  await fight.loadArena();
  const before = store.load().battles;
  const start = fight.fight('practice', 'Legacy Codebase');
  assert.strictEqual(start.interactive, true);
  assert.ok(start.foeIdx >= 0);
  const first = fight.pick(0);
  assert.ok(first.events.length > 0);
  assert.ok(first.events.some((e) => (e.side === 'me' && e.ai === 0) || (e.side === 'foe' && e.di === 0)), 'the monster picked is the one in the round');
  const end = first.over ? first : playOut(start, first.events);
  assert.strictEqual(end.result.outcome, 'practice');
  assert.deepStrictEqual(store.load().battles, before);
});

test('an unusable pick is refused and costs nothing', async () => {
  await fight.loadArena();
  fight.fight('practice', 'Legacy Codebase');
  assert.deepStrictEqual(fight.pick(99), { error: 'badPick' });
  assert.ok(fight.pick(0).events.length > 0, 'the fight carries on');
});

test('friends: add by code, fight them (it counts), remove them', async () => {
  const mine = require('../lib/engine').friends.encodeCode('pal', require('../lib/engine').battle.topTeam(store.load().trophies, store.load().creatures));
  const added = await fight.addFriend(mine);
  assert.strictEqual(added.ok, true);
  const after = await fight.loadArena();
  const friend = after.rows.find((r) => r.section === 'friend');
  assert.ok(friend);
  const before = store.load().battles;
  const start = fight.fight('friend', friend.name);
  assert.strictEqual(start.outcome, 'friendly');
  const end = playOut(start);
  assert.strictEqual(end.result.outcome, 'friendly');
  const now = store.load().battles;
  assert.strictEqual(now.wins + now.losses, before.wins + before.losses + 1);
  assert.strictEqual(fight.removeFriend(friend.name), true);
  assert.strictEqual((await fight.addFriend('definitely-not-a-player-zzz')).ok, false);
});

test('my friend code decodes back to my team', async () => {
  assert.ok(fight.saveName('tester'));
  const code = fight.myCode();
  assert.match(code, /^BZ1\./);
  const added = await fight.addFriend(code);
  assert.strictEqual(added.ok, false);
  assert.strictEqual(added.reason, 'self');
});
