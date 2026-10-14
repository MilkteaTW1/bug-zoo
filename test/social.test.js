'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const friends = require('../src/friends');
const remote = require('../src/remote');
const opponents = require('../src/opponents');
const acceptor = require('../src/accept');
const ladder = require('../src/ladder');
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
  assert.deepEqual(friends.decodeCode(code), { name: 'alice', team: t.map((x) => ({ ...x, stage: 0 })) });
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

test('parseFriend recognises codes, files, links and ladder names', async () => {
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

  const lookupLadder = async (n) => (n === 'eve' ? { name: 'eve', team: team(70) } : null);
  assert.equal((await friends.parseFriend('eve', { lookupLadder })).kind, 'ladder');
  assert.equal(await friends.parseFriend('nobody', { lookupLadder }), null);
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

// --- the ladder from GitHub --------------------------------------------------------------------

function fakeGithub(files, orderJson) {
  return async (url) => {
    const ok = (body) => ({ ok: true, json: async () => body });
    if (url.includes('api.github.com') && url.includes('/contents/leaderboard/scores')) {
      return ok(Object.keys(files).map((n) => ({ type: 'file', name: n, download_url: `https://raw.test/${n}` })));
    }
    if (url.endsWith('/leaderboard/ladder.json')) {
      if (!orderJson) return { ok: false, status: 404, json: async () => ({}) };
      return ok(orderJson);
    }
    const name = url.split('/').pop();
    return files[name] ? ok(files[name]) : { ok: false, status: 404, json: async () => ({}) };
  };
}

const score = (name, power) => ({ v: 2, name, caught: { legendary: 1 }, team: team(power) });

test('loadRemote reads players and order from the repo, skipping invalid files', async () => {
  const fetchImpl = fakeGithub(
    { 'a.json': score('alice', 100), 'b.json': score('bob', 50), 'bad.json': { name: 'x' } },
    { order: ['bob', 'alice'] });
  const r = await remote.loadRemote({ fetchImpl, repo: 'o/r' });
  assert.deepEqual([...r.players.values()].map((p) => p.name).sort(), ['alice', 'bob']);
  assert.deepEqual(r.order, ['bob', 'alice']);
});

test('loadLadder falls back to the saved copy when GitHub is unreachable', async () => {
  const home = tmp('bz-home-');
  const env = { ...process.env };
  delete env.BUGZOO_LADDER_DIR;
  const saved = process.env.BUGZOO_HOME;
  process.env.BUGZOO_HOME = home;
  try {
    const good = fakeGithub({ 'a.json': score('alice', 100) }, { order: ['alice'] });
    const first = await remote.loadLadder({ fetchImpl: good, env, cwd: home });
    assert.equal(first.source, 'remote');

    const down = async () => { throw new Error('offline'); };
    const second = await remote.loadLadder({ fetchImpl: down, env, cwd: home });
    assert.equal(second.source, 'cache');
    assert.equal(second.note.code, 'cached');
    assert.ok(second.players.has('alice'));
  } finally {
    if (saved === undefined) delete process.env.BUGZOO_HOME;
    else process.env.BUGZOO_HOME = saved;
  }
});

// --- the list ----------------------------------------------------------------------------------

test('battle list: ladder, then friends, then practice; own row unnumbered; reach marked', () => {
  const players = ladder.playersFromRaw(
    ['p1', 'p2', 'p3', 'p4', 'p5'].map((n, i) => ({ file: n, data: score(n, 100 - i) }))).players;
  const source = { players, order: ['p1', 'p2', 'p3', 'p4', 'p5'] };
  const me = { name: 'me', team: team(10), score: 10 };
  const list = opponents.buildList({
    me, source, friends: [{ name: 'fred', kind: 'code', team: team(33) }, { name: 'me', kind: 'code', team: team(1) }],
  });

  const rows = list.rows;
  assert.deepEqual(rows.map((r) => r.section).filter((s, i, a) => a.indexOf(s) === i), ['ladder', 'friend', 'practice']);
  const mine = rows.find((r) => r.isMe);
  assert.equal(mine.n, null);
  assert.equal(list.myRank, 6);
  // reach is 3: ranks 3, 4, 5 count; 1 and 2 are out of reach
  assert.deepEqual(rows.filter((r) => r.ranked).map((r) => r.rank), [3, 4, 5]);
  // yourself is never offered as a friend
  assert.equal(rows.filter((r) => r.section === 'friend').length, 1);
  assert.deepEqual(rows.filter((r) => r.n !== null).map((r) => r.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(opponents.pick(list, 6).name, 'fred');
  assert.equal(opponents.pick(list, 7).section, 'practice');
});

// --- accepting a challenge issue ---------------------------------------------------------------

function submission(challenger, defender, power) {
  const payload = { v: 2, name: challenger, caught: { legendary: 1 }, repeats: 0, seen: 1, score: 200, team: team(power) };
  return acceptor.issueBody(challenger, defender, payload);
}

test('a valid challenge writes the score file, claims the name and promotes on replay', () => {
  const dir = tmp('bz-accept-');
  fs.mkdirSync(path.join(dir, 'scores'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'scores', 'weak.json'), JSON.stringify(score('weak', 10)));
  fs.writeFileSync(path.join(dir, 'ladder.json'), JSON.stringify({ v: 1, order: ['weak'], processed: [] }));

  const r = acceptor.accept({ body: submission('hero', 'weak', 600), actor: 'hero-gh', dir });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'owners.json'), 'utf8')), { hero: 'hero-gh' });

  const { players } = ladder.loadPlayers(path.join(dir, 'scores'));
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'ladder.json'), 'utf8'));
  const out = ladder.processChallenges(state, players, ladder.loadChallenges(path.join(dir, 'challenges')));
  assert.equal(out.results[0].outcome, 'promoted');
  assert.deepEqual(out.state.order, ['hero', 'weak']);
});

test('nobody can submit as a name another GitHub user already owns', () => {
  const dir = tmp('bz-owner-');
  assert.equal(acceptor.accept({ body: submission('hero', 'x', 50), actor: 'real-hero', dir }).ok, true);
  const r = acceptor.accept({ body: submission('hero', 'x', 50), actor: 'impostor', dir });
  assert.equal(r.ok, false);
  assert.match(r.message, /belongs to another/);
});

test('malformed submissions are rejected', () => {
  const dir = tmp('bz-bad-');
  const ok = (body) => acceptor.accept({ body, actor: 'a', dir });
  assert.equal(ok('no json here').ok, false);
  assert.equal(ok('```json\n{"challenger":"a","defender":"a","player":{}}\n```').ok, false);
  // team belongs to somebody else
  const body = acceptor.issueBody('alice', 'bob', { v: 2, name: 'mallory', caught: { common: 1 }, team: team(10) });
  assert.match(ok(body).message, /belong to the challenger/);
});

test('the issue link carries title, label and a body that survives URL encoding', () => {
  const url = acceptor.issueUrl({ repo: 'o/r', challenger: 'a', defender: 'b', payload: { v: 2, name: 'a', caught: {}, team: team(5) } });
  const q = new URL(url);
  assert.equal(q.origin + q.pathname, 'https://github.com/o/r/issues/new');
  assert.equal(q.searchParams.get('title'), 'Challenge: a vs b');
  assert.equal(q.searchParams.get('labels'), 'challenge');
  assert.equal(acceptor.extractJson(q.searchParams.get('body')).challenger, 'a');
});

// --- the CLI, end to end -----------------------------------------------------------------------

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

test('`bugzoo battle` shows the ladder and fights the chosen number; a win in reach yields a submit link', () => {
  const root = tmp('bz-cli-');
  const home = path.join(root, 'home');
  const lb = path.join(root, 'lb');
  seedPlayer(home, 600);
  fs.mkdirSync(path.join(lb, 'scores'), { recursive: true });
  for (const [n, p] of [['top', 30], ['mid', 20]]) {
    fs.writeFileSync(path.join(lb, 'scores', `${n}.json`), JSON.stringify(score(n, p)));
  }
  fs.writeFileSync(path.join(lb, 'ladder.json'), JSON.stringify({ v: 1, order: ['top', 'mid'], processed: [] }));

  const r = cli(['battle'], { BUGZOO_HOME: home, BUGZOO_LADDER_DIR: lb }, '1\n');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Ladder/);
  assert.match(r.stdout, /Practice/);
  assert.match(r.stdout, /Fight whom\?/);
  assert.match(r.stdout, /You win!/);
  assert.match(r.stdout, /github\.com\/MilkteaTW1\/bug-zoo\/issues\/new\?title=Challenge%3A%20tester%20vs%20top/);
});

test('beating a practice opponent or a friend never offers a ladder submission', () => {
  const root = tmp('bz-cli2-');
  const home = path.join(root, 'home');
  seedPlayer(home, 600);
  const env = { BUGZOO_HOME: home, BUGZOO_LADDER_DIR: path.join(root, 'empty-lb') };

  const add = cli(['friend', 'add', friends.encodeCode('pal', team(20))], env);
  assert.match(add.stdout, /Added pal/);

  const list = cli(['friend'], env);
  assert.match(list.stdout, /pal/);

  // list = [friend pal, practice]; pick the friend
  const fight = cli(['battle', '--pick', '1'], env);
  assert.match(fight.stdout, /pal: /);
  assert.match(fight.stdout, /does not change the ladder/);
  assert.ok(!/issues\/new/.test(fight.stdout));

  const gone = cli(['friend', 'remove', 'pal'], env);
  assert.match(gone.stdout, /Removed pal/);
});

test('`friend code` needs a name and team, and the code can be added back', () => {
  const root = tmp('bz-cli3-');
  const home = path.join(root, 'home');
  seedPlayer(home, 80);
  const env = { BUGZOO_HOME: home, BUGZOO_LADDER_DIR: path.join(root, 'none') };
  const out = cli(['friend', 'code'], env).stdout;
  const code = out.split(/\r?\n/).find((l) => l.startsWith('BZ1.'));
  assert.ok(code);
  assert.equal(friends.decodeCode(code).name, 'tester');
});
