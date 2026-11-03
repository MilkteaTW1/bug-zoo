'use strict';

const { stageOf } = require('./power');

/**
 * Everything an achievement can look at, derived from the dex so achievements never need
 * their own counters. `id`s are stable: they key both the saved unlocks and the translations.
 */
const pad2 = (n) => String(n).padStart(2, '0');
/** The player's own calendar day of a timestamp (not the UTC one): a 00:30 catch belongs to that morning's date. */
const localDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const earliest = (list) => list.map((t) => t.at).sort()[0] || null;

const localHour = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 99 : d.getHours();
};
const isFridayEvening = (iso) => {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getDay() === 5 && d.getHours() >= 16;
};

// New Year, Valentine's day, Halloween and Christmas, on the player's own calendar.
const HOLIDAYS = ['01-01', '02-14', '10-31', '12-25'];
const isHoliday = (iso) => {
  const d = localDay(iso);
  return d !== null && HOLIDAYS.includes(d.slice(5));
};

function context(dex) {
  const creatures = Object.values(dex.creatures || {});
  const caught = creatures.filter((c) => c.captures > 0);
  const trophies = dex.trophies || [];

  const days = [...new Set(trophies.map((t) => localDay(t.at)).filter(Boolean))].sort();
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
    nightOwlAt: earliest(trophies.filter((t) => localHour(t.at) < 5)),
    fridayDeploy: trophies.some((t) => isFridayEvening(t.at)),
    fridayDeployAt: earliest(trophies.filter((t) => isFridayEvening(t.at))),
    shinyAt: earliest(trophies.filter((t) => t.shiny)),
    clean: (dex.stats && dex.stats.clean) || 0,
    questsDone: (dex.quests && dex.quests.total) || 0,
    perfectDays: (dex.quests && dex.quests.perfect) || 0,
    tower: (dex.tower && dex.tower.cleared) || 0,
    gifts: (dex.stats && dex.stats.giftTotal) || 0,
    species: new Set(caught.filter((c) => typeof c.species === 'number').map((c) => c.species)).size,
    holiday: trophies.some((t) => isHoliday(t.at)),
    holidayAt: earliest(trophies.filter((t) => isHoliday(t.at))),
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
  { id: 'quick-fix', test: (c) => c.shinies >= 1, at: (c) => c.shinyAt },
  { id: 'night-owl', test: (c) => c.nightOwl, at: (c) => c.nightOwlAt },
  { id: 'friday-deploy', test: (c) => c.fridayDeploy, at: (c) => c.fridayDeployAt },
  { id: 'steady', test: (c) => c.clean >= 25 },
  { id: 'quester', test: (c) => c.questsDone >= 10 },
  { id: 'perfect-day', test: (c) => c.perfectDays >= 1 },
  { id: 'tower-3', test: (c) => c.tower >= 3 },
  { id: 'tower-12', test: (c) => c.tower >= 12 },
  { id: 'companion', test: (c) => c.gifts >= 1 },
  { id: 'companions-10', test: (c) => c.gifts >= 10 },
  { id: 'species-10', test: (c) => c.species >= 10 },
  { id: 'species-25', test: (c) => c.species >= 25 },
  { id: 'species-50', test: (c) => c.species >= 50 },
  { id: 'holiday', test: (c) => c.holiday, at: (c) => c.holidayAt },
];

const IDS = DEFS.map((d) => d.id);

/** Unlock whatever is newly earned. Mutates dex.achievements; returns the ids unlocked just now. */
function evaluate(dex, now = new Date().toISOString()) {
  dex.achievements = dex.achievements || {};
  const ctx = context(dex);
  const fresh = [];
  for (const d of DEFS) {
    if (!dex.achievements[d.id] && d.test(ctx)) {
      // Earned long ago but only noticed now (it did not exist yet)? Date it by the catch that earned it.
      dex.achievements[d.id] = (d.at && d.at(ctx)) || now;
      fresh.push(d.id);
    }
  }
  return fresh;
}

module.exports = { DEFS, IDS, context, evaluate };
