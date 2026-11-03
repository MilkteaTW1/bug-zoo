'use strict';

const { hash } = require('./parse');
const { RARITIES, cleanName } = require('./score');
const { maxEvolvedPower, stageOf, evolutionMult } = require('./power');
const { elementOf, multiplier } = require('./element');

const TEAM_SIZE = 3;

const BOT = {
  name: 'Legacy Codebase',
  team: [
    { name: 'Spaghettimite', type: 'NullPointerException', rarity: 'common', power: 25 },
    { name: 'Heisenbug', type: 'FlakyTestError', rarity: 'uncommon', power: 60 },
    { name: 'Monolithwisp', type: 'StackOverflow', rarity: 'legendary', power: 110 },
  ],
};

/**
 * Trophies with evolution applied. `creatures` is the dex's creature table: its `captures` count
 * decides the form. Without it every monster stays in its base form.
 */
function boostTrophies(trophies, creatures = null) {
  return trophies.map((tr) => {
    const captures = creatures && creatures[tr.id] ? creatures[tr.id].captures || 0 : 0;
    const stage = stageOf(captures);
    return { ...tr, power: Math.round(tr.power * evolutionMult(stage)), stage, captures };
  });
}

/** Your monsters, one row per kind (its best catch), strongest first. `bugzoo team set` numbers refer to this list. */
function roster(trophies, creatures = null) {
  const best = new Map();
  for (const tr of boostTrophies(trophies, creatures)) {
    if (!best.has(tr.id) || tr.power > best.get(tr.id).power) best.set(tr.id, tr);
  }
  return [...best.values()].sort((a, b) => b.power - a.power);
}

/**
 * Who fights: the monsters you picked (ids, in order) first, then the strongest of the rest. With nothing picked
 * this is simply the three strongest, as before. Returns the full rows (with ids) for display.
 */
function lineup(trophies, creatures = null, chosen = [], n = TEAM_SIZE) {
  const rows = roster(trophies, creatures);
  const picked = [];
  for (const id of chosen || []) {
    const row = rows.find((r) => r.id === id);
    if (row && !picked.includes(row) && picked.length < n) picked.push(row);
  }
  if (picked.length > 0) {
    for (const row of rows) if (picked.length < n && !picked.includes(row)) picked.push(row);
    return picked;
  }
  return boostTrophies(trophies, creatures).sort((a, b) => b.power - a.power).slice(0, n);
}

function topTeam(trophies, creatures = null, n = TEAM_SIZE, chosen = []) {
  return lineup(trophies, creatures, chosen, n)
    .map(({ name, type, rarity, power, stage }) => ({ name, type, rarity, power, stage, element: elementOf(type) }));
}

/** Untrusted team from a shared file: clean strings, clamp power to what the rarity can reach. */
function validateTeam(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || arr.length > TEAM_SIZE) return null;
  const team = [];
  for (const m of arr) {
    if (!m || typeof m !== 'object' || !RARITIES.includes(m.rarity)) return null;
    const name = cleanName(m.name || '');
    const type = cleanName(m.type || '');
    if (!name || !type || !Number.isInteger(m.power) || m.power < 1) return null;
    const stage = Number.isInteger(m.stage) ? Math.min(Math.max(m.stage, 0), 2) : 0;
    // The element is always worked out from the type here; one sent by someone else is ignored.
    team.push({ name, type, rarity: m.rarity, power: Math.min(m.power, maxEvolvedPower(m.rarity)), stage, element: elementOf(type) });
  }
  return team;
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seedStr) {
  let a = parseInt(hash(seedStr).slice(0, 8), 16) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sideKey = (s) => `${s.name}|${s.team.map((m) => `${m.name}:${m.power}`).join(',')}`;

/**
 * Sequential team duel. Deterministic: both players computing the same match
 * (in either order) get the same result.
 * Returns { winner: <side name>, loser, log: [{ att, def, dmg, crit, faint, hp }] }.
 */
function duel(s1, s2) {
  const [A, B] = sideKey(s1) <= sideKey(s2) ? [s1, s2] : [s2, s1];
  const rand = rng(`${sideKey(A)}#${sideKey(B)}`);
  const mk = (s) => s.team.map((m) => ({ ...m, hp: Math.max(40, m.power * 4) }));
  const ta = mk(A);
  const tb = mk(B);
  const log = [];
  let ia = 0;
  let ib = 0;
  let turnA = rand() < 0.5;
  let guard = 0;

  while (ia < ta.length && ib < tb.length && guard++ < 2000) {
    const att = turnA ? ta[ia] : tb[ib];
    const def = turnA ? tb[ib] : ta[ia];
    const crit = rand() < 0.1;
    const mult = multiplier(elementOf(att.type), elementOf(def.type));
    const dmg = Math.max(1, Math.round(att.power * (0.75 + rand() * 0.5) * (crit ? 1.5 : 1) * mult));
    def.hp -= dmg;
    log.push({ att: att.name, def: def.name, dmg, crit, mult, faint: def.hp <= 0, hp: Math.max(0, def.hp) });
    if (def.hp <= 0) {
      if (turnA) ib += 1;
      else ia += 1;
    }
    turnA = !turnA;
  }

  const aWins = ia < ta.length;
  const winner = aWins ? A : B;
  const loser = aWins ? B : A;
  return { winner: winner.name, loser: loser.name, log };
}

module.exports = { TEAM_SIZE, BOT, boostTrophies, roster, lineup, topTeam, validateTeam, duel, rng };
