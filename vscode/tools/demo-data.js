'use strict';

// Builds the data behind the README GIFs with the real engine: a throwaway player, a made-up demo ladder,
// and every state/replay the recorder shows. Nothing touches your real ~/.bugzoo.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugzoo-demo-'));
process.env.BUGZOO_HOME = path.join(home, 'data');

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

function seedPlayer() {
  const dex = store.load();
  dex.profile = { name: 'devfan', lang: process.env.BZ_LANG === 'zh' ? 'zh-TW' : 'en' };
  const seeds = [
    ['KeyError', "'user_id'", 4, { frames: 6, blast: 6, loc: 9000, failRate: 0.6 }, 22],
    ['ENOENT', "no such file 'config.json'", 11, { frames: 4, blast: 5, loc: 9000, failRate: 0.5 }, 55],
    ['ValueError', 'invalid literal for int()', 3, { frames: 5, blast: 3, loc: 9000, failRate: 0.4 }, 8],
    ['RangeError', 'Invalid array length', 1, { frames: 7, blast: 4, loc: 9000, failRate: 0.5 }, 0],
    ['SIGSEGV', 'segmentation fault', 1, { frames: 3, blast: 2, loc: 9000, failRate: 0.3 }, 0],
  ];
  for (const [type, msg, captures, ctx, bond] of seeds) {
    const c = creature.makeCreature(type, msg);
    dex.creatures[c.id] = { ...c, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(), count: captures + 1, captures, bond, escapes: 0, sample: msg };
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

/**
 * A fight the player steers: the opening state, then one reply per round. The picks are the ones the recorder
 * clicks, so what is on screen is what the engine really played.
 */
function steerStory() {
  const start = fight.fight('friend', FAKE_PLAYERS[1].name);
  const rounds = [];
  const picks = [];
  const down = new Set();
  let guard = 0;
  let r = null;
  while ((!r || !r.over) && guard++ < 50) {
    // Hand-pick the lineup the recorder will click: the second monster first, then whoever is left.
    const order = start.me.team.map((_, i) => i).filter((i) => !down.has(i));
    const i = picks.length === 0 && order.length > 1 ? order[1] : order[0];
    r = fight.pick(i);
    picks.push(i);
    rounds.push(r);
    for (const ev of r.events || []) if (ev.faint && ev.side === 'foe') down.add(ev.di);
  }
  return { start, rounds, picks };
}

/** States for the shop GIF: before, after each purchase, and after feeding a monster that then evolves. */
function shopStory(folders) {
  const dex = store.load();
  dex.coins = 150;
  dex.inventory = {};
  dex.furniture = [];
  store.save(dex);
  const hungry = Object.values(dex.creatures).find((c) => c.type === 'KeyError');
  const P0 = buildState(folders);
  fight.buy('pizza');
  const P1 = buildState(folders);
  fight.buy('cushion');
  const P2 = buildState(folders);
  fight.buy('plant');
  const P3 = buildState(folders);
  const fed = fight.feed(hungry.id, 'pizza');
  const P4 = buildState(folders);
  return { P0, P1, P2, P3, P4, fed, hungry: fed.name };
}

/** The team picker and the tower for the tour GIF. */
function soloStory(folders) {
  const T0 = buildState(folders);
  const ids = T0.team.rows.map((r) => r.id);
  fight.setTeam([ids[1], ids[0]]);
  const T1 = buildState(folders);
  fight.setTeam([]);
  const tower = fight.towerFight();
  const T2 = buildState(folders);
  return { T0, T1, T2, tower };
}

async function build() {
  seedPlayer();
  const folders = [PROJECT];
  const run = (exitCode, output) => recordCommand({ commandLine: 'node app.js', exitCode, cwd: PROJECT, output });

  const S0 = buildState(folders);
  run(1, CRASH);
  const S1 = buildState(folders);
  run(0, '');
  const S2 = buildState(folders);

  // A friend to fight, added the way a player would: from a share code.
  const { friends: friendsLib } = require('../lib/engine');
  const code = friendsLib.encodeCode(FAKE_PLAYERS[1].name, FAKE_PLAYERS[1].team.map(([name, type, rarity, pw]) => ({ name, type, rarity, power: pw, stage: 0 })));
  const added = await fight.addFriend(code);
  if (!added.ok) throw new Error('demo friend could not be added');
  const arenaA = await fight.loadArena();
  const arenaB = arenaA;
  const steer = steerStory();

  // The shop and the solo tabs. Seeded coins, so the demo can afford a pizza and two pieces of furniture.
  const shopData = shopStory(folders);
  const soloData = soloStory(folders);

  return {
    shop: shopData, solo: soloData,
    crash: CRASH,
    states: { S0, S1, S2 },
    events: { spawn: diffStates(S0, S1), caught: diffStates(S1, S2) },
    arenaA, arenaB, steer,
  };
}

module.exports = { build, home };
