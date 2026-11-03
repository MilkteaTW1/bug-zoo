'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const el = require('../src/element');
const friends = require('../src/friends');
const { duel, lineup, roster, topTeam, validateTeam } = require('../src/battle');

const mon = (name, type, power = 40) => ({ name, type, rarity: 'common', power, stage: 0 });
const trophy = (id, type, power) => ({ id, name: id, type, rarity: 'common', power, factors: {}, project: 'p', at: 'x' });

test('the five elements form a ring: each beats two, loses to two, and nothing beats itself', () => {
  for (const a of el.ORDER) {
    assert.equal(el.strongAgainst(a).length, 2);
    assert.equal(el.beats(a, a), false);
    assert.equal(el.ORDER.filter((b) => el.beats(b, a)).length, 2);
    for (const b of el.ORDER) {
      if (a === b) continue;
      assert.ok(el.beats(a, b) !== el.beats(b, a), `${a}/${b} is one-way`);
      assert.equal(el.multiplier(a, b) * el.multiplier(b, a), el.STRONG * el.WEAK);
    }
  }
});

test('every error type has an element, and the same type always has the same one', () => {
  assert.equal(el.elementOf('SyntaxError'), 'syntax');
  assert.equal(el.elementOf('TypeError'), 'logic');
  assert.equal(el.elementOf('ENOENT'), 'env');
  assert.equal(el.elementOf('ECONNREFUSED'), 'net');
  assert.equal(el.elementOf('SIGSEGV'), 'crash');
  const odd = el.elementOf('SomeCustomDomainError');
  assert.ok(el.ORDER.includes(odd));
  assert.equal(el.elementOf('SomeCustomDomainError'), odd);
  assert.ok(el.ORDER.includes(el.elementOf('')));
});

test('a monster from a friend, a file or a ladder entry gets its element from its type, whatever it claims', () => {
  const sent = [{ ...mon('Sneaky', 'SyntaxError'), element: 'crash' }];
  assert.equal(validateTeam(sent)[0].element, 'syntax');
  // an older entry that never had an element still validates and gets one
  assert.equal(validateTeam([mon('Old', 'ECONNREFUSED')])[0].element, 'net');
  const code = friends.encodeCode('bob', [mon('Wobblebat', 'SIGSEGV')]);
  assert.equal(friends.decodeCode(code).team[0].element, 'crash');
});

test('the type advantage changes the fight, and both players still see the same result', () => {
  const strong = { name: 'A', team: [mon('S', 'SyntaxError', 30)] };
  const weak = { name: 'B', team: [mon('L', 'TypeError', 30)] }; // syntax beats logic
  const r = duel(strong, weak);
  assert.ok(r.log.some((e) => e.mult === el.STRONG) && r.log.some((e) => e.mult === el.WEAK));
  assert.deepEqual(duel(weak, strong).log, r.log);
  const same = duel({ name: 'A', team: [mon('S', 'TypeError', 30)] }, { name: 'B', team: [mon('L', 'ValueError', 30)] });
  assert.ok(same.log.every((e) => e.mult === 1));
});

test('a much weaker monster of the right element can beat a stronger one', () => {
  const win = duel({ name: 'A', team: [mon('S', 'SyntaxError', 30)] }, { name: 'B', team: [mon('L', 'TypeError', 36)] });
  const alone = el.multiplier('syntax', 'logic') * 30 > 36 * el.multiplier('logic', 'syntax');
  assert.ok(alone);
  assert.ok(win.log.length > 0);
});

test('your lineup: picked monsters come first, the strongest of the rest fill in, nothing picked means the top three', () => {
  const t = [trophy('a', 'TypeError', 90), trophy('b', 'SyntaxError', 50), trophy('c', 'ENOENT', 30), trophy('d', 'SIGSEGV', 70), trophy('a', 'TypeError', 60)];
  assert.deepEqual(roster(t).map((r) => r.id), ['a', 'd', 'b', 'c']); // one row per kind, best catch
  assert.deepEqual(lineup(t).map((r) => r.id), ['a', 'd', 'a']); // unchanged automatic behaviour
  assert.deepEqual(lineup(t, null, ['c', 'b']).map((r) => r.id), ['c', 'b', 'a']);
  assert.deepEqual(lineup(t, null, ['c', 'zzz', 'c']).map((r) => r.id), ['c', 'a', 'd']);
  const team = topTeam(t, null, 3, ['c']);
  assert.equal(team[0].element, 'env');
  assert.ok(team.every((m) => el.ORDER.includes(m.element)));
});

test('bugzoo team lists your monsters with elements, saves a picked lineup and can go back to automatic', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-team-'));
  const tr = (id, type, power) => ({ id, name: id, type, rarity: 'common', art: ['a', 'b', 'c'], power, factors: {}, project: 'p', at: 'x' });
  const creatures = Object.fromEntries(['a', 'b', 'c'].map((id) => [id, { id, name: id, type: 'TypeError', rarity: 'common', captures: 1 }]));
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    profile: { lang: 'en', name: 't' }, creatures, trophies: [tr('a', 'TypeError', 30), tr('b', 'SyntaxError', 20), tr('c', 'SIGSEGV', 10)],
  }));
  const run = (...args) => spawnSync(process.execPath, [path.resolve(__dirname, '..', 'bin', 'bugzoo.js'), 'team', ...args],
    { env: { ...process.env, BUGZOO_HOME: home }, encoding: 'utf8' });
  const stars = (out) => out.split('\n').filter((l) => l.startsWith('*')).length;

  const list = run();
  assert.match(list.stdout, /\[Syntax\]/);
  assert.match(list.stdout, /Who beats whom/);
  const set = run('set', '3', '2');
  assert.equal(set.status, 0);
  assert.match(set.stdout, /Lineup saved: c \[Crash\], b \[Syntax\], a \[Logic\]/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, 'dex.json'), 'utf8')).team, ['c', 'b']);
  assert.equal(stars(run().stdout), 3);
  assert.equal(run('set', '9').status, 2);
  assert.equal(run('set', '1', '1').status, 2);
  assert.equal(run('auto').status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, 'dex.json'), 'utf8')).team, []);
});
