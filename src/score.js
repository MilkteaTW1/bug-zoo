'use strict';

const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
const POINTS = { common: 10, uncommon: 25, rare: 60, legendary: 200 };
const REPEAT_POINTS = 2;
const MAX_COUNT = 1_000_000;

const TITLES = [
  [2500, 'Bug Whisperer'],
  [1000, 'Zookeeper'],
  [400, 'Exterminator'],
  [150, 'Bug Catcher'],
  [50, 'Bug Spotter'],
  [0, 'Bystander'],
];

/** First capture of each creature earns its rarity points; each repeat capture earns a little more. */
function computeScore({ caught, repeats }) {
  const base = RARITIES.reduce((sum, r) => sum + (caught[r] || 0) * POINTS[r], 0);
  return base + (repeats || 0) * REPEAT_POINTS;
}

function titleFor(score) {
  return TITLES.find(([min]) => score >= min)[1];
}

/** Aggregate stats for sharing: counts only, no error messages or paths. */
function summarize(dex) {
  const caught = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  let repeats = 0;
  const all = Object.values(dex.creatures || {});
  for (const c of all) {
    if (c.captures > 0) {
      caught[c.rarity] += 1;
      repeats += c.captures - 1;
    }
  }
  const stats = { caught, repeats, seen: all.length };
  return { ...stats, score: computeScore(stats), title: titleFor(computeScore(stats)) };
}

function cleanName(name) {
  return String(name).replace(/[\x00-\x1f|`<>[\]]/g, '').trim().slice(0, 32);
}

/** Validate an untrusted shared score file. The score is always recomputed, never trusted. */
function validateEntry(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'not an object' };
  const name = typeof obj.name === 'string' ? cleanName(obj.name) : '';
  if (!name) return { ok: false, reason: 'missing name' };
  const count = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_COUNT;
  const src = obj.caught || {};
  const caught = {};
  for (const r of RARITIES) {
    if (!count(src[r] === undefined ? 0 : src[r])) return { ok: false, reason: `bad caught.${r}` };
    caught[r] = src[r] || 0;
  }
  const repeats = obj.repeats === undefined ? 0 : obj.repeats;
  if (!count(repeats)) return { ok: false, reason: 'bad repeats' };
  const score = computeScore({ caught, repeats });
  return { ok: true, entry: { name, caught, repeats, score, title: titleFor(score) } };
}

module.exports = { RARITIES, POINTS, REPEAT_POINTS, computeScore, titleFor, summarize, validateEntry, cleanName };
