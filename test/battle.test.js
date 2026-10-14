'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { computePower, maxPower, maxEvolvedPower } = require('../src/power');
const { scanProject, errorFrames, analyze, moduleKey } = require('../src/scan');
const { duel, topTeam, validateTeam } = require('../src/battle');
const { snippet } = require('../src/hook');

function tmpProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

test('bigger bugs hit harder: same rarity, more depth/blast/rate => more power', () => {
  const small = computePower({ rarity: 'common', frames: 1, blast: 0, loc: 100, failRate: 0.2 });
  const big = computePower({ rarity: 'common', frames: 6, blast: 8, loc: 50000, failRate: 1 });
  assert.ok(big.power > small.power * 2);
});

test('power never exceeds the rarity cap', () => {
  const top = computePower({ rarity: 'legendary', frames: 99, blast: 99, loc: 1e9, failRate: 5 });
  assert.equal(top.power, maxPower('legendary'));
});

test('moduleKey normalizes js paths and python dotted modules', () => {
  assert.equal(moduleKey('./utils/Helper.js'), 'helper');
  assert.equal(moduleKey('pkg.sub.mod'), 'mod');
  assert.equal(moduleKey('..\\lib\\db'), 'db');
});

test('scan counts importers and ignores node_modules', () => {
  const dir = tmpProject({
    'a.js': "const db = require('./db');\n",
    'b.js': "import { q } from './db.js';\n",
    'db.js': 'module.exports = {};\n',
    'node_modules/x/index.js': "require('./db')\n",
  });
  const s = scanProject(dir);
  assert.equal(s.importedBy.db, 2);
  assert.equal(s.fileCount, 3);
});

test('errorFrames keeps project files only, in order', () => {
  const dir = tmpProject({ 'src/a.js': 'x\n', 'src/b.js': 'y\n' });
  const a = path.join(dir, 'src', 'a.js');
  const b = path.join(dir, 'src', 'b.js');
  const stderr = `TypeError: x\n    at f (${a}:3:9)\n    at g (${b}:10:2)\n    at h (${path.join(dir, 'node_modules', 'lib', 'i.js')}:1:1)\n    at node:internal/main:5:1\n`;
  assert.deepEqual(errorFrames(stderr, dir), ['src/a.js', 'src/b.js']);
});

test('analyze: a widely-imported culprit has a larger blast radius', () => {
  const dir = tmpProject({
    'core.js': 'x\n', 'a.js': "require('./core')\n", 'b.js': "require('./core')\n", 'c.js': "require('./core')\n",
    'leaf.js': 'y\n',
  });
  const hitCore = analyze(dir, `Error: e\n    at z (${path.join(dir, 'core.js')}:1:1)\n`);
  const hitLeaf = analyze(dir, `Error: e\n    at z (${path.join(dir, 'leaf.js')}:1:1)\n`);
  assert.equal(hitCore.blast, 3);
  assert.equal(hitLeaf.blast, 0);
});

test('duel is deterministic and independent of argument order', () => {
  const x = { name: 'Ann', team: [{ name: 'A1', type: 'T', rarity: 'common', power: 40 }] };
  const y = { name: 'Bob', team: [{ name: 'B1', type: 'T', rarity: 'common', power: 40 }] };
  const r1 = duel(x, y);
  const r2 = duel(y, x);
  assert.equal(r1.winner, r2.winner);
  assert.deepEqual(r1.log, r2.log);
});

test('a much stronger team wins', () => {
  const weak = { name: 'W', team: [{ name: 'w', type: 'T', rarity: 'common', power: 10 }] };
  const strong = { name: 'S', team: [{ name: 's', type: 'T', rarity: 'legendary', power: 400 }] };
  assert.equal(duel(weak, strong).winner, 'S');
});

test('topTeam picks the three strongest trophies', () => {
  const t = [10, 50, 30, 40].map((p, i) => ({ name: `n${i}`, type: 'T', rarity: 'common', power: p }));
  assert.deepEqual(topTeam(t).map((m) => m.power), [50, 40, 30]);
});

test('shared teams are clamped and bad ones rejected', () => {
  const ok = validateTeam([{ name: 'x', type: 'T', rarity: 'common', power: 99999 }]);
  assert.equal(ok[0].power, maxEvolvedPower('common'));
  assert.equal(validateTeam([]), null);
  assert.equal(validateTeam([{ name: 'x', type: 'T', rarity: 'mythic', power: 5 }]), null);
  assert.equal(validateTeam([{ name: 'x', type: 'T', rarity: 'common', power: 'big' }]), null);
});

test('hook snippets exist for the supported shells', () => {
  for (const sh of ['bash', 'zsh', 'fish', 'powershell']) assert.match(snippet(sh), /bugzoo run node/);
  assert.equal(snippet('tcsh'), null);
});
