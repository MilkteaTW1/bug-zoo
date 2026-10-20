'use strict';

const { store, power } = require('./engine');

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
  const pack = (c) => ({
    id: c.id, name: c.name, type: c.type, rarity: c.rarity, art: c.art, hue: c.hue,
    count: c.count, captures: c.captures, stage: power.stageOf(c.captures || 0),
    power: pendingInfo[c.id] ? pendingInfo[c.id].power : undefined,
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

module.exports = { buildState, diffStates };
