'use strict';

const { stageOf } = require('./power');

/**
 * Everything an achievement can look at, derived from the dex so achievements never need
 * their own counters. `id`s are stable: they key both the saved unlocks and the translations.
 */
const localHour = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 99 : d.getHours();
};
const isFridayEvening = (iso) => {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getDay() === 5 && d.getHours() >= 16;
};

function context(dex) {
  const creatures = Object.values(dex.creatures || {});
  const caught = creatures.filter((c) => c.captures > 0);
  const trophies = dex.trophies || [];

  const days = [...new Set(trophies.map((t) => String(t.at || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    prev = t;
    if (run > longest) longest = run;
  }

  return {
    distinct: caught.length,
    types: new Set(caught.map((c) => c.type)).size,
    rarities: new Set(caught.map((c) => c.rarity)),
    maxCaptures: caught.reduce((m, c) => Math.max(m, c.captures), 0),
    maxTrophyPower: trophies.reduce((m, t) => Math.max(m, t.power || 0), 0),
    longestStreak: longest,
    wins: (dex.battles && dex.battles.wins) || 0,
    friends: (dex.friends || []).length,
    escapes: creatures.reduce((n, c) => n + (c.escapes || 0), 0),
    shinies: creatures.reduce((n, c) => n + (c.shinies || 0), 0),
    nightOwl: trophies.some((t) => localHour(t.at) < 5),
    fridayDeploy: trophies.some((t) => isFridayEvening(t.at)),
    clean: (dex.stats && dex.stats.clean) || 0,
    questsDone: (dex.quests && dex.quests.total) || 0,
    perfectDays: (dex.quests && dex.quests.perfect) || 0,
    tower: (dex.tower && dex.tower.cleared) || 0,
  };
}

const DEFS = [
  { id: 'first-catch', test: (c) => c.distinct >= 1 },
  { id: 'collector', test: (c) => c.distinct >= 10 },
  { id: 'many-types', test: (c) => c.types >= 5 },
  { id: 'rare-find', test: (c) => c.rarities.has('rare') },
  { id: 'legend', test: (c) => c.rarities.has('legendary') },
  { id: 'persistent', test: (c) => stageOf(c.maxCaptures) >= 1 },
  { id: 'ascended', test: (c) => stageOf(c.maxCaptures) >= 2 },
  { id: 'big-game', test: (c) => c.maxTrophyPower >= 100 },
  { id: 'streak-3', test: (c) => c.longestStreak >= 3 },
  { id: 'streak-7', test: (c) => c.longestStreak >= 7 },
  { id: 'first-win', test: (c) => c.wins >= 1 },
  { id: 'friendly', test: (c) => c.friends >= 1 },
  { id: 'slippery', test: (c) => c.escapes >= 1 },
  { id: 'quick-fix', test: (c) => c.shinies >= 1 },
  { id: 'night-owl', test: (c) => c.nightOwl },
  { id: 'friday-deploy', test: (c) => c.fridayDeploy },
  { id: 'steady', test: (c) => c.clean >= 25 },
  { id: 'quester', test: (c) => c.questsDone >= 10 },
  { id: 'perfect-day', test: (c) => c.perfectDays >= 1 },
  { id: 'tower-3', test: (c) => c.tower >= 3 },
  { id: 'tower-12', test: (c) => c.tower >= 12 },
];

const IDS = DEFS.map((d) => d.id);

/** Unlock whatever is newly earned. Mutates dex.achievements; returns the ids unlocked just now. */
function evaluate(dex, now = new Date().toISOString()) {
  dex.achievements = dex.achievements || {};
  const ctx = context(dex);
  const fresh = [];
  for (const d of DEFS) {
    if (!dex.achievements[d.id] && d.test(ctx)) {
      dex.achievements[d.id] = now;
      fresh.push(d.id);
    }
  }
  return fresh;
}

module.exports = { DEFS, IDS, context, evaluate };
