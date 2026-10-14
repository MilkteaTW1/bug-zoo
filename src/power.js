'use strict';

const BASE = { common: 10, uncommon: 25, rare: 60, legendary: 150 };
// 1 + depth(1.0) + blast(1.0) + size(0.5) + rate(1.0)
const MAX_MULT = 4.5;
const MIN_RUNS_FOR_RATE = 5;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Battle power of one bug, from how big it is in *this* project.
 *   frames   - project files in the stack trace
 *   blast    - how many project files import the failing file
 *   loc      - total lines of code in the project
 *   failRate - failures / max(runs, 5) for this command
 */
function computePower({ rarity, frames = 0, blast = 0, loc = 0, failRate = 0 }) {
  const factors = {
    depth: round2(0.1 * clamp(frames, 0, 10)),
    blast: round2(0.1 * clamp(blast, 0, 10)),
    size: round2(0.5 * clamp(Math.log10(loc + 1) / 5, 0, 1)),
    rate: round2(clamp(failRate, 0, 1)),
  };
  const mult = 1 + factors.depth + factors.blast + factors.size + factors.rate;
  return { power: Math.round((BASE[rarity] || BASE.common) * mult), factors };
}

function maxPower(rarity) {
  return Math.round((BASE[rarity] || BASE.common) * MAX_MULT);
}

/**
 * Evolution: how many times the same creature has been caught decides its form.
 * The multiplier applies when a team is formed; a trophy's recorded power never changes.
 */
const EVOLUTION = [
  { at: 0, mult: 1 },
  { at: 3, mult: 1.15 },
  { at: 10, mult: 1.35 },
];

function stageOf(captures) {
  let stage = 0;
  EVOLUTION.forEach((e, i) => {
    if (captures >= e.at) stage = i;
  });
  return stage;
}

const evolutionMult = (stage) => EVOLUTION[Math.min(Math.max(stage, 0), EVOLUTION.length - 1)].mult;

/** The most any shared monster can show: the rarity cap at the final form. */
function maxEvolvedPower(rarity) {
  return Math.round(maxPower(rarity) * EVOLUTION[EVOLUTION.length - 1].mult);
}

module.exports = {
  BASE, MAX_MULT, MIN_RUNS_FOR_RATE, EVOLUTION, computePower, maxPower, maxEvolvedPower, stageOf, evolutionMult,
};
