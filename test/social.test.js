'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const friends = require('../src/friends');
const opponents = require('../src/opponents');
const { maxEvolvedPower } = require('../src/power');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const member = (name, rarity, power) => ({ name, type: 'TypeError', rarity, power });
const team = (power, rarity = 'legendary') => [member(`m${power}`, rarity, power)];

// --- friend codes ------------------------------------------------------------------------------

test('a friend code round-trips name and team', () => {
  const t = [member('Wobblebat', 'common', 17), member('Nibtoad', 'uncommon', 40)];
  const code = friends.encodeCode('alice', t);
  assert.ok(code.startsWith('BZ1.'));
  assert.ok(code.length < 400, `code is chat-sized (${code.length})`);
  assert.deepEqual(friends.decodeCode(code), { name: 'alice', team: t.map((x) => ({ ...x, stage: 0, element: 'logic' })) });
});

test('garbage and tampered codes are rejected', () => {
  assert.equal(friends.decodeCode('hello'), null);
  assert.equal(friends.decodeCode('BZ1.!!!!'), null);
  assert.equal(friends.decodeCode(`BZ1.${zlib.deflateRawSync('not json').toString('base64url')}`), null);
  const evil = zlib.deflateRawSync(JSON.stringify({ n: 'x', t: [['a', 'T', 'mythic', 5]] })).toString('base64url');
  assert.equal(friends.decodeCode(`BZ1.${evil}`), null);
});

test('a code cannot claim more power than the rarity allows', () => {
  const big = zlib.deflateRawSync(JSON.stringify({ n: 'cheat', t: [['a', 'T', 'common', 99999]] })).toString('base64url');
  const f = friends.decodeCode(`BZ1.${big}`);
  assert.equal(f.team[0].power, maxEvolvedPower('common'));
});

test('names are cleaned so they cannot break tables', () => {
  const code = friends.encodeCode('a|b`<x>', team(10));
  assert.equal(friends.decodeCode(code).name, 'abx');
});

// --- friends: add / refresh --------------------------------------------------------------------

test('parseFriend recognises codes, files and links', async () => {
  const dir = tmp('bz-friend-');
  const file = path.join(dir, 'bob.json');
  fs.writeFileSync(file, JSON.stringify({ name: 'bob', team: team(50) }));

  const fromCode = await friends.parseFriend(friends.encodeCode('cat', team(20)));
  assert.equal(fromCode.kind, 'code');

  const fromFile = await friends.parseFriend(file);
  assert.deepEqual([fromFile.kind, fromFile.name], ['file', 'bob']);

  const fakeFetch = async () => ({ ok: true, json: async () => ({ name: 'dan', team: team(30) }) });
  const fromUrl = await friends.parseFriend('https://example.test/dan.json', { fetchImpl: fakeFetch });
  assert.deepEqual([fromUrl.kind, fromUrl.name], ['url', 'dan']);

  assert.equal(await friends.parseFriend('nobody'), null);
});

test('refreshFriend keeps the saved team when a link is unreachable', async () => {
  const f = { name: 'dan', kind: 'url', source: 'https://example.test/x.json', team: team(30) };
  const down = async () => { throw new Error('offline'); };
  const r = await friends.refreshFriend(f, { fetchImpl: down });
  assert.equal(r.ok, false);
  assert.deepEqual(r.friend.team, f.team);

  const up = async () => ({ ok: true, json: async () => ({ name: 'dan', team: team(90) }) });
  const r2 = await friends.refreshFriend(f, { fetchImpl: up });
  assert.equal(r2.ok, true);
  assert.equal(r2.friend.team[0].power, 90);
});

test('upsert replaces by name (case-insensitive) and remove works', () => {
  let list = friends.upsert([], { name: 'Dan', team: team(10) }).friends;
  const r = friends.upsert(list, { name: 'dan', team: team(20) });
  assert.equal(r.updated, true);
  assert.equal(r.friends.length, 1);
  assert.equal(friends.remove(r.friends, 'DAN').removed, true);
  assert.equal(friends.remove([], 'x').removed, false);
});


function cli(args, env, input) {
  return spawnSync(process.execPath, [BIN, ...args], {
    env: { ...process.env, BUGZOO_LANG: 'en', ...env }, encoding: 'utf8', input,
  });
}

function seedPlayer(home, trophyPower) {
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: {}, pending: {}, runs: {}, battles: { wins: 0, losses: 0 }, friends: [],
    profile: { name: 'tester', lang: 'en' },
    trophies: [{ id: 't:1', name: 'Bigbug', type: 'StackOverflow', rarity: 'legendary', power: trophyPower, factors: {}, project: 'x', at: 'now' }],
  }));
}

test('beating a practice opponent or a friend is a friendly fight with no submission', () => {
  const root = tmp('bz-cli2-');
  const home = path.join(root, 'home');
  seedPlayer(home, 600);
  const env = { BUGZOO_HOME: home };

  const add = cli(['friend', 'add', friends.encodeCode('pal', team(20))], env);
  assert.match(add.stdout, /Added pal/);

  const list = cli(['friend'], env);
  assert.match(list.stdout, /pal/);

  // list = [friend pal, practice]; pick the friend
  const fight = cli(['battle', '--pick', '1'], env);
  assert.match(fight.stdout, /pal: /);
  assert.ok(!/issues\/new/.test(fight.stdout));
  assert.match(fight.stdout, /(You win!|You lose)/);

  const gone = cli(['friend', 'remove', 'pal'], env);
  assert.match(gone.stdout, /Removed pal/);
});

test('`friend code` needs a name and team, and the code can be added back', () => {
  const root = tmp('bz-cli3-');
  const home = path.join(root, 'home');
  seedPlayer(home, 80);
  const env = { BUGZOO_HOME: home };
  const out = cli(['friend', 'code'], env).stdout;
  const code = out.split(/\r?\n/).find((l) => l.startsWith('BZ1.'));
  assert.ok(code);
  assert.equal(friends.decodeCode(code).name, 'tester');
});

