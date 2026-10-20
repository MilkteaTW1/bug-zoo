'use strict';

const { store, power, remote } = require('./engine');

/**
 * Turn the dex file into what the zoo view draws.
 *   wild   - bugs still waiting to be caught (a failing command's pending list)
 *   caught - everything caught at least once, with its evolution stage
 */
function buildState() {
  const dex = store.load();
  const pendingInfo = {};
  const since = {};
  const wildIds = new Set();
  for (const p of Object.values(dex.pending)) {
    for (const id of p.ids) {
      wildIds.add(id);
      if (!since[id] || p.since < since[id]) since[id] = p.since;
      if (p.info && p.info[id]) pendingInfo[id] = p.info[id];
    }
  }
  // A caught monster fights at its best trophy's power, scaled by its evolution form (as in battles).
  const best = {};
  for (const t of dex.trophies) if (!best[t.id] || t.power > best[t.id]) best[t.id] = t.power;
  const caughtPower = (c) => (best[c.id] ? Math.round(best[c.id] * power.evolutionMult(power.stageOf(c.captures || 0))) : undefined);
  const pack = (c) => ({
    id: c.id, name: c.name, type: c.type, rarity: c.rarity, art: c.art, hue: c.hue,
    count: c.count, captures: c.captures, stage: power.stageOf(c.captures || 0),
    power: wildIds.has(c.id) ? (pendingInfo[c.id] ? pendingInfo[c.id].power : undefined) : caughtPower(c),
    since: since[c.id] || null,
    lastSeen: c.lastSeen || null,
    sample: c.sample ? String(c.sample).slice(0, 160) : '',
  });
  const all = Object.values(dex.creatures);
  const wild = all.filter((c) => wildIds.has(c.id)).map(pack);
  const caught = all.filter((c) => (c.captures || 0) > 0 && !wildIds.has(c.id)).map(pack);
  return {
    wild, caught,
    seen: all.length,
    caughtCount: all.filter((c) => (c.captures || 0) > 0).length,
    lang: (dex.profile && dex.profile.lang) || null,
  };
}

/** Which creatures appeared or were caught between two states, for celebration effects. */
function diffStates(prev, next) {
  const had = new Set((prev ? [...prev.wild, ...prev.caught] : []).map((c) => c.id));
  const wasWild = new Set((prev ? prev.wild : []).map((c) => c.id));
  return {
    spawned: next.wild.filter((c) => !wasWild.has(c.id)),
    caught: next.caught.filter((c) => wasWild.has(c.id)),
    brandNew: next.wild.filter((c) => !had.has(c.id)),
  };
}

/** The public ladder as plain rows for the zoo view. Never throws: offline gives the cached copy or nothing. */
async function loadLadderRows() {
  const dex = store.load();
  const me = (dex.profile && dex.profile.name) || '';
  const l = await remote.loadLadder();
  const order = l.order.length ? l.order : [...l.players.values()].sort((a, b) => b.score - a.score).map((p) => p.name);
  const rows = order
    .map((name, i) => ({ name, p: l.players.get(String(name).toLowerCase()), rank: i + 1 }))
    .filter((r) => r.p)
    .map(({ name, p, rank }) => ({
      rank, name: p.name || name,
      power: p.team.reduce((s, m) => s + m.power, 0),
      team: p.team.map((m) => m.name),
      me: !!me && String(p.name).toLowerCase() === me.toLowerCase(),
    }));
  return { rows, me, source: l.source, offline: l.source === 'cache' || l.source === 'none' };
}

module.exports = { buildState, diffStates, loadLadderRows };
