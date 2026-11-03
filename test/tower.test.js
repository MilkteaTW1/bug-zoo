'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const tower = require('../src/tower');
const { ORDER } = require('../src/element');
const { duel } = require('../src/battle');

test('every floor has the same team for everybody, with distinct names and a valid element', () => {
  for (let f = 1; f <= tower.FLOORS; f += 1) {
    const a = tower.foeFor(f);
    assert.deepEqual(a, tower.foeFor(f));
    assert.equal(a.team.length, tower.sizeOf(f));
    assert.equal(new Set(a.team.map((m) => m.name)).size, a.team.length, `floor ${f} names`);
    assert.ok(a.team.every((m) => ORDER.includes(m.element) && m.power >= 6));
  }
});

test('the climb gets harder, and the five elements all show up somewhere', () => {
  const lead = (f) => tower.foeFor(f).team[0].power;
  for (let f = 2; f <= tower.FLOORS; f += 1) assert.ok(lead(f) > lead(f - 1));
  const seen = new Set(Array.from({ length: tower.FLOORS }, (_, i) => tower.foeFor(i + 1).team.map((m) => m.element)).flat());
  assert.equal(seen.size, ORDER.length);
  assert.equal(tower.foeFor(0).floor, 1);
  assert.equal(tower.foeFor(99).floor, tower.FLOORS);
});

test('a starter team can win floor 1 and the right element changes the result on a close floor', () => {
  const starter = { name: 'You', team: [{ name: 'S', type: 'TypeError', rarity: 'common', power: 20, stage: 0 }] };
  assert.equal(duel(starter, tower.foeFor(1)).winner, 'You');
  const floor = tower.foeFor(8);
  const elementFor = (m) => ORDER.find((el) => require('../src/element').beats(el, m.element));
  const type = { syntax: 'SyntaxError', logic: 'TypeError', env: 'ENOENT', net: 'ECONNREFUSED', crash: 'SIGSEGV' };
  const mk = (typeName) => ({ name: 'You', team: floor.team.map((m, i) => ({ name: `m${i}`, type: typeName, rarity: 'common', power: Math.round(m.power * 0.85), stage: 0 })) });
  const lead = elementFor(floor.team[0]);
  const good = duel(mk(type[lead]), floor);
  const bad = duel(mk(type[ORDER.find((el) => require('../src/element').beats(floor.team[0].element, el))]), floor);
  assert.ok(good.log.length > 0 && bad.log.length > 0);
  assert.notDeepEqual(good.log, bad.log);
});

test('bugzoo tower: a lost floor stays, a won floor moves the climb on, and a finished tower says so', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-tower-'));
  const file = path.join(home, 'dex.json');
  const tr = (id, power) => ({ id, name: id, type: 'TypeError', rarity: 'common', art: ['a', 'b', 'c'], power, factors: {}, project: 'p', at: 'x' });
  const write = (power, extra = {}) => fs.writeFileSync(file, JSON.stringify({
    profile: { lang: 'en', name: 't' }, creatures: { a: { id: 'a', name: 'a', type: 'TypeError', rarity: 'common', captures: 1 } },
    trophies: [tr('a', power)], ...extra,
  }));
  const run = (...a) => spawnSync(process.execPath, [path.resolve(__dirname, '..', 'bin', 'bugzoo.js'), 'tower', ...a],
    { env: { ...process.env, BUGZOO_HOME: home }, encoding: 'utf8' });
  const cleared = () => JSON.parse(fs.readFileSync(file, 'utf8')).tower.cleared;

  write(1);
  assert.match(run().stdout, /floor 1 of 12/);
  const lost = run('fight');
  assert.match(lost.stdout, /Floor 1 holds/);
  assert.equal(cleared(), 0);

  write(300);
  const won = run('fight');
  assert.match(won.stdout, /Floor 1 cleared/);
  assert.equal(cleared(), 1);
  assert.match(run().stdout, /floor 2 of 12/);

  write(300, { tower: { cleared: 12 } });
  assert.match(run().stdout, /cleared the whole tower/);
  assert.equal(run('fight').status, 0);
  write(300, { tower: { cleared: 2 } });
  run('fight');
  run('fight');
  assert.ok(JSON.parse(fs.readFileSync(file, 'utf8')).achievements['tower-3']);
});
