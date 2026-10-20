'use strict';

// Builds the data behind the README GIFs with the real engine: a throwaway player, a made-up demo ladder,
// and every state/replay the recorder shows. Nothing touches your real ~/.bugzoo.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-demo-'));
const ladderDir = path.join(home, 'ladder');
process.env.BUGZOO_HOME = path.join(home, 'data');
process.env.BUGZOO_LADDER_DIR = ladderDir;

const { store, creature, power } = require('../lib/engine');
const { recordCommand } = require('../lib/capture');
const { buildState, diffStates } = require('../lib/state');
const fight = require('../lib/fight');

const PROJECT = '/my-app';
const NOW = new Date('2026-10-20T09:30:00Z');

const FAKE_PLAYERS = [
  { name: 'NightOwl', rank: 1, team: [['Glitchimp', 'SIGSEGV', 'legendary', 410], ['Hexmoth', 'ENOSPC', 'legendary', 380], ['Murkgnaw', 'RangeError', 'uncommon', 150]] },
  { name: 'ByteBaker', rank: 2, team: [['Zapsprite', 'ECONNREFUSED', 'uncommon', 190], ['Pipwisp', 'AssertionError', 'uncommon', 170], ['Nibtoad', 'KeyError', 'common', 80]] },
  { name: 'RustyRaccoon', rank: 3, team: [['Snarkling', 'TypeError', 'common', 120], ['Crumbbat', 'ValueError', 'common', 100], ['Gloomwisp', 'IndexError', 'common', 90]] },
  { name: 'NullPointerNinja', rank: 4, team: [['Wobblemite', 'NameError', 'common', 70], ['Glitchsnail', 'SyntaxError', 'common', 60]] },
  { name: 'SegfaultSam', rank: 5, team: [['Pipimp', 'ImportError', 'common', 55], ['Fluffbat', 'EACCES', 'uncommon', 50]] },
];

function writeLadder() {
  fs.mkdirSync(path.join(ladderDir, 'scores'), { recursive: true });
  for (const p of FAKE_PLAYERS) {
    fs.writeFileSync(path.join(ladderDir, 'scores', `${p.name}.json`), JSON.stringify({
      v: 2, name: p.name, caught: { common: 8, uncommon: 4, rare: 1, legendary: 0 }, repeats: 6, seen: 13,
      team: p.team.map(([name, type, rarity, pw]) => ({ name, type, rarity, power: pw, stage: 0 })),
      updated: NOW.toISOString(),
    }));
  }
  fs.writeFileSync(path.join(ladderDir, 'ladder.json'), JSON.stringify({
    v: 1, order: FAKE_PLAYERS.slice().sort((a, b) => a.rank - b.rank).map((p) => p.name), processed: [],
  }));
}

function seedPlayer() {
  const dex = store.load();
  dex.profile = { name: 'devfan', lang: 'en' };
  const seeds = [
    ['KeyError', "'user_id'", 4, { frames: 6, blast: 6, loc: 9000, failRate: 0.6 }],
    ['ENOENT', "no such file 'config.json'", 11, { frames: 4, blast: 5, loc: 9000, failRate: 0.5 }],
    ['ValueError', 'invalid literal for int()', 3, { frames: 5, blast: 3, loc: 9000, failRate: 0.4 }],
    ['RangeError', 'Invalid array length', 1, { frames: 7, blast: 4, loc: 9000, failRate: 0.5 }],
    ['SIGSEGV', 'segmentation fault', 1, { frames: 3, blast: 2, loc: 9000, failRate: 0.3 }],
  ];
  for (const [type, msg, captures, ctx] of seeds) {
    const c = creature.makeCreature(type, msg);
    dex.creatures[c.id] = { ...c, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(), count: captures + 1, captures, escapes: 0, sample: msg };
    const p = power.computePower({ rarity: c.rarity, ...ctx });
    for (let i = 0; i < 1; i++) {
      dex.trophies.push({
        id: c.id, name: c.name, type, rarity: c.rarity, art: c.art, power: p.power, factors: p.factors,
        project: 'my-app', at: NOW.toISOString(),
      });
    }
  }
  store.save(dex);
}

const CRASH = [
  `${PROJECT}/app.js:3`,
  '  console.log("Hello, " + user.profile.name);',
  '                                  ^',
  '',
  "TypeError: Cannot read properties of undefined (reading 'name')",
  `    at greet (${PROJECT}/app.js:3:35)`,
  `    at Object.<anonymous> (${PROJECT}/app.js:6:1)`,
].join('\n');

async function build() {
  writeLadder();
  seedPlayer();
  const folders = [PROJECT];
  const run = (exitCode, output) => recordCommand({ commandLine: 'node app.js', exitCode, cwd: PROJECT, output });

  const S0 = buildState(folders);
  run(1, CRASH);
  const S1 = buildState(folders);
  run(0, '');
  const S2 = buildState(folders);

  const arenaA = await fight.loadArena();
  const target = 'RustyRaccoon';
  const battleLadder = fight.fight('ladder', target);
  const added = await fight.addFriend('ByteBaker');
  if (!added.ok) throw new Error('demo friend could not be added');
  const arenaB = await fight.loadArena();
  const battleFriend = fight.fight('friend', 'ByteBaker');
  const battlePractice = fight.fight('practice', 'Legacy Codebase');

  return {
    crash: CRASH,
    states: { S0, S1, S2 },
    events: { spawn: diffStates(S0, S1), caught: diffStates(S1, S2) },
    arenaA, arenaB, battleLadder, battleFriend, battlePractice,
    target,
  };
}

module.exports = { build, home };
