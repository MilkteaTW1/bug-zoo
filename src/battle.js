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
 * Trophies with evolution applied. `creatures` is the dex's creature table: a creature's `bond` (affection)
 * decides the form. Without it every monster stays in its base form.
 */
function boostTrophies(trophies, creatures = null) {
  return trophies.map((tr) => {
    const c = creatures && creatures[tr.id];
    const bond = c ? c.bond || 0 : 0;
    const captures = c ? c.captures || 0 : 0;
    const stage = stageOf(bond);
    return { ...tr, power: Math.round(tr.power * evolutionMult(stage)), stage, bond, captures };
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

/**
 * A match the player steers. Each round the opponent shows who it sends out, the player picks which of their
 * living monsters answers, and both hit (the stronger one first). The opponent's choice never reacts to the
 * player's pick, so the pick is a real decision. Deterministic for a given sequence of picks.
 *   const m = startMatch(me, foe); while (!m.over) playRound(m, pickIndex);
 */
function startMatch(me, foe) {
  const mk = (s) => s.team.map((x) => ({ ...x, hp: Math.max(40, x.power * 4), maxHp: Math.max(40, x.power * 4) }));
  const m = {
    me: { name: me.name, team: mk(me) }, foe: { name: foe.name, team: mk(foe) },
    round: 0, over: false, winner: null, loser: null, log: [], picks: [], foeIdx: 0,
  };
  m.foeIdx = foePick(m);
  return m;
}

const alive = (team) => team.map((x, i) => (x.hp > 0 ? i : -1)).filter((i) => i >= 0);

/** Who the opponent sends: the living monster that does best against what the player last used (else the first). */
function foePick(m) {
  const mine = alive(m.me.team);
  const last = m.picks.length ? m.me.team[m.picks[m.picks.length - 1]] : m.me.team[mine[0]];
  const target = last && last.hp > 0 ? last : m.me.team[mine[0]];
  let best = -1;
  let bestScore = -Infinity;
  for (const i of alive(m.foe.team)) {
    const f = m.foe.team[i];
    const score = multiplier(elementOf(f.type), elementOf(target.type)) * 1000 + f.power;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

/** The pick a hands-off player would make: the living monster best matched against the one coming out. */
function autoPick(m) {
  const f = m.foe.team[m.foeIdx];
  let best = -1;
  let bestScore = -Infinity;
  for (const i of alive(m.me.team)) {
    const x = m.me.team[i];
    const score = (multiplier(elementOf(x.type), elementOf(f.type)) - multiplier(elementOf(f.type), elementOf(x.type)) * 0.5) * 1000 + x.power;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

/** Play one round with the player's pick (an index into their team). Returns the events of this round. */
function playRound(m, pickIndex) {
  if (m.over) return [];
  const me = m.me.team[pickIndex];
  if (!me || me.hp <= 0) throw new Error('that monster cannot fight');
  const fi = m.foeIdx;
  const foe = m.foe.team[fi];
  const rand = rng(`${m.me.name}|${m.foe.name}|${m.round}|${m.picks.join('')}${pickIndex}|${fi}|${me.name}${me.power}|${foe.name}${foe.power}`);
  const first = me.power >= foe.power ? 'me' : 'foe';
  const events = [];
  const hit = (side) => {
    const att = side === 'me' ? me : foe;
    const def = side === 'me' ? foe : me;
    const ai = side === 'me' ? pickIndex : fi;
    const di = side === 'me' ? fi : pickIndex;
    if (att.hp <= 0 || def.hp <= 0) return;
    const crit = rand() < 0.1;
    const mult = multiplier(elementOf(att.type), elementOf(def.type));
    const dmg = Math.max(1, Math.round(att.power * (0.75 + rand() * 0.5) * (crit ? 1.5 : 1) * mult));
    def.hp -= dmg;
    events.push({ side, ai, di, att: att.name, def: def.name, dmg, crit, mult, faint: def.hp <= 0, hp: Math.max(0, def.hp), round: m.round });
  };
  hit(first);
  hit(first === 'me' ? 'foe' : 'me');
  m.log.push(...events);
  m.picks.push(pickIndex);
  m.round += 1;
  if (alive(m.foe.team).length === 0 || alive(m.me.team).length === 0) {
    m.over = true;
    const won = alive(m.foe.team).length === 0;
    m.winner = won ? m.me.name : m.foe.name;
    m.loser = won ? m.foe.name : m.me.name;
  } else {
    m.foeIdx = foePick(m);
  }
  return events;
}

/** The whole match with the automatic pick, for callers with nobody at the controls. */
function autoMatch(me, foe) {
  const m = startMatch(me, foe);
  let guard = 0;
  while (!m.over && guard++ < 200) playRound(m, autoPick(m));
  return m;
}

module.exports = { startMatch, playRound, autoPick, autoMatch, TEAM_SIZE, BOT, boostTrophies, roster, lineup, topTeam, validateTeam, duel, rng };
