'use strict';

const path = require('node:path');
const { store, power, remote, i18n, creature } = require('./engine');

/**
 * Turn the dex file into what the zoo view draws.
 *   wild   - bugs still waiting to be caught (a failing command's pending list)
 *   caught - everything caught at least once, with its evolution stage
 */
const norm = (p) => path.resolve(p).replace(/[\/]+$/, '').toLowerCase();
const isInside = (cwd, folder) => {
  const c = norm(cwd);
  const f = norm(folder);
  return c === f || c.startsWith(f + path.sep);
};

/** The player's language: their saved choice, else the editor's display language (see activate()). */
function setLang(dex) {
  i18n.setLang((dex.profile && dex.profile.lang) || i18n.detectLang());
}

/** A message for the editor's own notifications and prompts (the views get theirs through the state). */
function say(key, vars) {
  setLang(store.load());
  return i18n.t(`vs.${key}`, vars);
}

/** "Wibblebat the TypeError" in the current language. */
const creatureName = (c) => i18n.t('fmt.creature', { name: c.name, type: c.type });

/**
 * folders - open project folders: only bugs waiting in those projects count as wild (the rest stay saved
 * but hidden). Leave undefined to show everything.
 */
function buildState(folders) {
  const dex = store.load();
  setLang(dex);
  const pendingInfo = {};
  const since = {};
  const wildIds = new Set();
  for (const p of Object.values(dex.pending)) {
    if (folders && !(p.cwd && folders.some((f) => isInside(p.cwd, f)))) continue;
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
    id: c.id, name: creature.localName(c.id, i18n.getLang()) || c.name, type: c.type, rarity: c.rarity, art: c.art, hue: c.hue,
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
    lang: i18n.getLang(),
    // Every on-screen text of the zoo and ladder views, in the player's language (rarity words keep their `rarity.` prefix).
    text: {
      ...i18n.bundle('vs.'),
      ...Object.fromEntries(Object.entries(i18n.bundle('rarity.')).map(([k, v]) => [`rarity.${k}`, v])),
    },
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

module.exports = { buildState, diffStates, loadLadderRows, say, creatureName };
