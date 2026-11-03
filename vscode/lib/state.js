'use strict';

const path = require('node:path');
const {
  store, power, i18n, creature, achievements, quests, tower, battle, element, species, companion, shop,
} = require('./engine');

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

/** A message by its full key (the shop and feeding texts are shared with the CLI and are not under `vs.`). */
function sayKey(key, vars) {
  setLang(store.load());
  return i18n.t(key, vars);
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
  const caughtPower = (c) => (best[c.id] ? Math.round(best[c.id] * power.evolutionMult(power.stageOf(c.bond || 0))) : undefined);
  const pack = (c) => ({
    id: c.id, name: c.nick || creature.localName(c.id, i18n.getLang()) || c.name, nick: c.nick || '',
    species: creature.speciesName(c, i18n.getLang()), element: element.elementOf(c.type),
    shinies: c.shinies || 0, companion: !!c.companion, type: c.type, rarity: c.rarity, art: c.art, hue: c.hue,
    count: c.count, captures: c.captures, stage: power.stageOf(c.bond || 0), bond: c.bond || 0, hearts: shop.hearts(c.bond),
    power: wildIds.has(c.id) ? (pendingInfo[c.id] ? pendingInfo[c.id].power : undefined) : caughtPower(c),
    since: since[c.id] || null,
    lastSeen: c.lastSeen || null,
    sample: c.sample ? String(c.sample).slice(0, 160) : '',
  });
  const all = Object.values(dex.creatures);
  const wild = all.filter((c) => wildIds.has(c.id)).map(pack);
  const caught = all.filter((c) => (c.captures || 0) > 0 && !wildIds.has(c.id)).map(pack);
  const questList = quests.status(dex).map((q) => ({
    id: q.id, name: i18n.t(`quest.${q.metric}`, { n: q.goal }), have: q.have, goal: q.goal, done: q.done,
  }));
  const floor = dex.tower.cleared + 1;
  const foe = floor <= tower.FLOORS ? tower.foeFor(floor).team : [];
  const rows = battle.roster(dex.trophies, dex.creatures);
  const fighting = new Set(battle.lineup(dex.trophies, dex.creatures, dex.team).map((r) => r.id));
  return {
    wild, caught,
    kinds: new Set(all.filter((c) => c.captures > 0 && typeof c.species === 'number').map((c) => c.species)).size,
    kindsTotal: species.COUNT,
    shop: {
      coins: dex.coins,
      bondMax: shop.BOND_MAX,
      comfort: Math.round((shop.comfort(dex) - 1) * 100),
      foods: shop.FOODS.map((f) => ({ id: f.id, name: i18n.t(`shop.item.${f.id}`), price: f.price, bond: f.bond, have: dex.inventory[f.id] || 0 })),
      furniture: shop.FURNITURE.map((f) => ({ id: f.id, name: i18n.t(`shop.item.${f.id}`), price: f.price, icon: f.icon, owned: dex.furniture.includes(f.id) })),
    },
    streak: (dex.stats && dex.stats.streak) || 0,
    streakEvery: companion.EVERY,
    quests: { list: questList, date: dex.daily ? dex.daily.date : '', total: dex.quests.total, perfect: dex.quests.perfect },
    tower: {
      cleared: dex.tower.cleared, total: tower.FLOORS, floor: floor <= tower.FLOORS ? floor : 0,
      foe: foe.map((m) => ({ name: m.name, element: m.element, power: m.power })),
    },
    team: {
      auto: !(dex.team && dex.team.length),
      rows: rows.slice(0, 12).map((r) => ({
        id: r.id, name: r.nick || creature.localName(r.id, i18n.getLang()) || r.name, type: r.type, element: r.element || element.elementOf(r.type),
        power: r.power, stage: r.stage || 0, fighting: fighting.has(r.id), pick: (dex.team || []).indexOf(r.id) + 1,
      })),
    },
    seen: all.length,
    caughtCount: all.filter((c) => (c.captures || 0) > 0).length,
    lang: i18n.getLang(),
    achievements: achievements.DEFS.map((d) => ({
      id: d.id,
      name: i18n.t(`ach.${d.id}.name`),
      desc: i18n.t(`ach.${d.id}.desc`),
      at: (dex.achievements && dex.achievements[d.id]) || null,
    })),
    // Every on-screen text of the zoo and ladder views, in the player's language (rarity words keep their `rarity.` prefix).
    text: {
      ...i18n.bundle('vs.'),
      ...Object.fromEntries(Object.entries(i18n.bundle('rarity.')).map(([k, v]) => [`rarity.${k}`, v])),
      ...Object.fromEntries(Object.entries(i18n.bundle('element.')).map(([k, v]) => [`element.${k}`, v])),
      ...Object.fromEntries(Object.entries(i18n.bundle('shop.')).map(([k, v]) => [`shop.${k}`, v])),
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
    // A companion arrives already caught, so it shows up in `caught` without ever having been wild.
    gifts: prev ? next.caught.filter((c) => c.companion && !had.has(c.id)) : [],
  };
}

module.exports = { buildState, diffStates, say, sayKey, creatureName };
