'use strict';

const { makeCreature, COMMON, UNCOMMON } = require('./creature');
const { computePower } = require('./power');
const { dayOf } = require('./quests');
const { hash } = require('./parse');

// Five commands in a row without an error earns a random companion. A day gives at most three, so
// the only way to farm them is to actually work cleanly.
const EVERY = 5;
const DAILY_CAP = 3;
const RARE_KINDS = ['SegmentationFault', 'DeadlockError', 'RaceCondition', 'HeisenBug', 'MemoryLeak'];

/** A command ended: extend the streak (or reset it) and hand out a companion when one is due. */
function note(dex, failed, now = new Date()) {
  const stats = dex.stats;
  if (failed) {
    stats.streak = 0;
    return null;
  }
  stats.streak = (stats.streak || 0) + 1;
  if (stats.streak % EVERY !== 0) return null;
  const day = dayOf(now);
  const gifts = stats.gifts && stats.gifts.day === day ? stats.gifts : { day, n: 0 };
  stats.gifts = gifts;
  if (gifts.n >= DAILY_CAP) return null;
  gifts.n += 1;
  stats.giftTotal = (stats.giftTotal || 0) + 1;
  return grant(dex, `${day}:${stats.giftTotal}`, now);
}

/** Pick the companion deterministically from the seed: mostly common, sometimes uncommon, rarely rare. */
function grant(dex, seed, now) {
  const roll = parseInt(hash(`gift:${seed}`).slice(0, 4), 16) % 100;
  const pool = roll < 60 ? COMMON : roll < 90 ? UNCOMMON : RARE_KINDS;
  const type = pool[parseInt(hash(`kind:${seed}`).slice(0, 4), 16) % pool.length];
  const c = makeCreature(type, `companion ${seed}`);
  const stamp = now.toISOString();
  const entry = dex.creatures[c.id] || { ...c, firstSeen: stamp, count: 0, captures: 0, escapes: 0, sample: '' };
  entry.companion = true;
  entry.captures = (entry.captures || 0) + 1;
  entry.lastSeen = entry.lastCaptured = stamp;
  dex.creatures[c.id] = entry;
  const p = computePower({ rarity: entry.rarity });
  dex.trophies.push({
    id: entry.id, name: entry.name, type: entry.type, rarity: entry.rarity, art: entry.art,
    power: p.power, factors: p.factors, project: 'companion', at: stamp, companion: true,
  });
  return entry;
}

module.exports = { note, EVERY, DAILY_CAP };
