'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-fight-'));
process.env.BUGZOO_HOME = home;
process.env.BUGZOO_LADDER_DIR = path.join(__dirname, '..', '..', 'leaderboard'); // the repo's own ladder, no network

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

test('without a team the ladder is shown but nobody can be fought', async () => {
  const arena = await fight.loadArena();
  assert.strictEqual(arena.me.canFight, false);
  assert.ok(arena.rows.length >= 1);
  assert.deepStrictEqual(fight.fight('ladder', arena.rows[0].name), { error: 'noTeam' });
});

test('with a team the list has ladder, practice and a numbered fight', async () => {
  catchOne('alpha');
  catchOne('beta');
  const arena = await fight.loadArena();
  assert.strictEqual(arena.me.canFight, true);
  assert.ok(arena.rows.some((r) => r.section === 'practice'));
  assert.ok(arena.rows.filter((r) => r.section === 'ladder').length >= 1);
  assert.ok(arena.rows.every((r) => r.team.every((m) => Array.isArray(m.art) && m.art.length > 0)));
});

test('a practice fight returns a full replay and does not count', async () => {
  await fight.loadArena();
  const before = store.load().battles;
  const b = fight.fight('practice', 'Legacy Codebase');
  assert.ok(b.log.length > 0);
  assert.ok(['practice'].includes(b.outcome));
  assert.strictEqual(b.canSubmit, false);
  assert.deepStrictEqual(store.load().battles, before);
});

test('a ladder fight counts, and joining the ladder offers a submission', async () => {
  const arena = await fight.loadArena();
  const foe = arena.rows.find((r) => r.section === 'ladder' && !r.isMe);
  const before = store.load().battles;
  const b = fight.fight('ladder', foe.name);
  const after = store.load().battles;
  assert.strictEqual(after.wins + after.losses, before.wins + before.losses + 1);
  // the test player is not on the ladder yet, so any ladder fight can be submitted to join it
  assert.strictEqual(b.canSubmit, true);
  assert.strictEqual(fight.needsName(), true);
  assert.strictEqual(fight.submissionUrl(), null, 'no name yet, no link');
  assert.ok(fight.saveName('tester'));
  assert.match(fight.submissionUrl(), /^https:\/\/github\.com\/.+\/issues\/new\?/);
});

test('friends: add by ladder name, fight them, remove them', async () => {
  const arena = await fight.loadArena();
  const player = arena.rows.find((r) => r.section === 'ladder' && !r.isMe);
  const added = await fight.addFriend(player.name);
  assert.strictEqual(added.ok, true);
  const after = await fight.loadArena();
  const friend = after.rows.find((r) => r.section === 'friend');
  assert.ok(friend);
  const b = fight.fight('friend', friend.name);
  assert.strictEqual(b.outcome, 'friendly');
  assert.strictEqual(fight.removeFriend(friend.name), true);
  assert.strictEqual((await fight.addFriend('definitely-not-a-player-zzz')).ok, false);
});

test('my friend code decodes back to my team', async () => {
  const code = fight.myCode();
  assert.match(code, /^BZ1\./);
  const added = await fight.addFriend(code);
  assert.strictEqual(added.ok, false);
  assert.strictEqual(added.reason, 'self');
});
