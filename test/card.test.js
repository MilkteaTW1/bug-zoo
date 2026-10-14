'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const i18n = require('../src/i18n');
const { battleCard } = require('../src/render');
const { artFor } = require('../src/creature');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');
const m = (name, type, rarity, power) => ({ name, type, rarity, power });

test('a battle card shows both sides, the winner and the power totals', () => {
  i18n.setLang('en');
  const svg = battleCard({
    me: { name: 'alice', team: [m('Wobblebat', 'TypeError', 'common', 17), m('Nibtoad', 'RangeError', 'uncommon', 40)] },
    foe: { name: 'bob', team: [m('Heisenbug', 'FlakyTestError', 'legendary', 120)] },
    winner: 'bob', hits: 7,
  });
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  for (const s of ['alice', 'bob', 'Wobblebat', 'Heisenbug', 'bob wins!', '7 hits', 'power 57', 'power 120', 'VS']) {
    assert.ok(svg.includes(s), `missing ${s}`);
  }
});

test('the card is localised', () => {
  i18n.setLang('zh-TW');
  const svg = battleCard({
    me: { name: 'a', team: [m('X', 'T', 'common', 10)] }, foe: { name: 'b', team: [m('Y', 'T', 'rare', 50)] },
    winner: 'a', hits: 3,
  });
  assert.ok(svg.includes('a 獲勝！') && svg.includes('3 回合') && svg.includes('Bug Zoo 對戰'));
  i18n.setLang('en');
});

test('names cannot inject markup into the card', () => {
  i18n.setLang('en');
  const svg = battleCard({
    me: { name: 'a<script>', team: [m('<b>', '"&"', 'common', 1)] }, foe: { name: 'b', team: [m('Y', 'T', 'rare', 5)] },
    winner: 'b', hits: 1,
  });
  assert.ok(!svg.includes('<script>') && !svg.includes('<b>'));
  assert.ok(svg.includes('a&lt;script&gt;'));
});

test('artFor is stable, so a shared monster keeps its face', () => {
  assert.deepEqual(artFor('Heisenbug:FlakyTestError'), artFor('Heisenbug:FlakyTestError'));
  assert.equal(artFor('x').length, 3);
});

test('`bugzoo battle --pick N --card file` writes the card for that exact fight', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-card-'));
  const home = path.join(root, 'home');
  const lb = path.join(root, 'lb', 'scores');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(lb, { recursive: true });
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: {}, pending: {}, runs: {}, battles: { wins: 0, losses: 0 }, friends: [],
    profile: { name: 'tester', lang: 'en' },
    trophies: [{ id: 't:1', name: 'Bigbug', type: 'StackOverflow', rarity: 'legendary', power: 500, art: ['AA', 'BB', 'CC'], factors: {}, project: 'x', at: 'now' }],
  }));
  fs.writeFileSync(path.join(lb, 'rival.json'), JSON.stringify({
    v: 2, name: 'rival', caught: { common: 1 }, team: [m('Weakling', 'TypeError', 'common', 10)],
  }));
  const card = path.join(root, 'result.svg');
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LADDER_DIR: path.join(root, 'lb'), BUGZOO_LANG: 'en' };

  const r = spawnSync(process.execPath, [BIN, 'battle', '--pick', '1', '--card', card], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Saved .*result\.svg/);

  const svg = fs.readFileSync(card, 'utf8');
  assert.ok(svg.includes('tester wins!'));
  assert.ok(svg.includes('Bigbug') && svg.includes('Weakling') && svg.includes('rival'));
  assert.ok(svg.includes('>AA<'), "the player's own monster keeps its real art");
});

test('no card and no terminal: nothing is written and nothing is asked', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-nocard-'));
  const home = path.join(root, 'home');
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, 'dex.json'), JSON.stringify({
    creatures: {}, pending: {}, runs: {}, battles: { wins: 0, losses: 0 }, friends: [], profile: { name: 'tester', lang: 'en' },
    trophies: [{ id: 't:1', name: 'Bigbug', type: 'E', rarity: 'legendary', power: 500, factors: {}, project: 'x', at: 'now' }],
  }));
  const env = { ...process.env, BUGZOO_HOME: home, BUGZOO_LADDER_DIR: path.join(root, 'none'), BUGZOO_LANG: 'en' };
  const r = spawnSync(process.execPath, [BIN, 'battle', '--pick', '1'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes('shareable card'));
  assert.ok(!fs.existsSync(path.join(root, 'bugzoo-battle.svg')));
});
