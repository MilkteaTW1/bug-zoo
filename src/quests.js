'use strict';

const { hash } = require('./parse');

/**
 * Daily quests: three small goals a day, picked from a pool by the date so everyone gets the same ones.
 * Progress is counted in dex.daily and lives for one local day; dex.quests keeps the totals.
 * Nothing here changes power or the ladder: quests are only there to give a reason to come back.
 */
const POOL = [
  { id: 'catch1', metric: 'catch', goal: 1 },
  { id: 'catch2', metric: 'catch', goal: 2 },
  { id: 'seen1', metric: 'seen', goal: 1 },
  { id: 'clean3', metric: 'clean', goal: 3 },
  { id: 'clean6', metric: 'clean', goal: 6 },
  { id: 'fights2', metric: 'fights', goal: 2 },
  { id: 'wins1', metric: 'wins', goal: 1 },
];
const PER_DAY = 3;

const pad2 = (n) => String(n).padStart(2, '0');
const dayOf = (now = new Date()) => `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

/** The day's quests: shuffled by the date, one per metric. */
function pickFor(day) {
  const chosen = [];
  const metrics = new Set();
  for (const q of [...POOL].sort((a, b) => hash(`${day}:${a.id}`).localeCompare(hash(`${day}:${b.id}`)))) {
    if (metrics.has(q.metric)) continue;
    metrics.add(q.metric);
    chosen.push(q.id);
    if (chosen.length === PER_DAY) break;
  }
  return chosen;
}

/** Start a new day if needed. Returns true when it changed anything. */
function roll(dex, now = new Date()) {
  dex.quests = dex.quests || { total: 0, perfect: 0 };
  const day = dayOf(now);
  if (dex.daily && dex.daily.date === day) return false;
  dex.daily = { date: day, counts: {}, quests: pickFor(day), done: [] };
  return true;
}

const byId = (id) => POOL.find((q) => q.id === id);

/** Count one thing that happened (a catch, a clean run...). Returns the ids of quests finished by it. */
function note(dex, metric, n = 1, now = new Date()) {
  roll(dex, now);
  const d = dex.daily;
  d.counts[metric] = (d.counts[metric] || 0) + n;
  const fresh = [];
  for (const id of d.quests) {
    const q = byId(id);
    if (q && !d.done.includes(id) && (d.counts[q.metric] || 0) >= q.goal) {
      d.done.push(id);
      dex.quests.total += 1;
      fresh.push(id);
    }
  }
  if (fresh.length > 0 && d.done.length === d.quests.length) dex.quests.perfect += 1;
  return fresh;
}

/** Today's quests with progress: [{ id, metric, goal, have, done }]. */
function status(dex, now = new Date()) {
  roll(dex, now);
  return dex.daily.quests.map((id) => {
    const q = byId(id);
    return { id, metric: q.metric, goal: q.goal, have: Math.min(q.goal, dex.daily.counts[q.metric] || 0), done: dex.daily.done.includes(id) };
  });
}

module.exports = { POOL, PER_DAY, dayOf, pickFor, roll, note, status };
