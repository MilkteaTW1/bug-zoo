'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolve } = require('./capture');
const { computePower, MIN_RUNS_FOR_RATE } = require('./power');

const MAX_TROPHIES = 200;

function dexPath() {
  const dir = process.env.BUGZOO_HOME || path.join(os.homedir(), '.bugzoo');
  return { dir, file: path.join(dir, 'dex.json') };
}

function load() {
  const { file } = dexPath();
  try {
    const dex = JSON.parse(fs.readFileSync(file, 'utf8'));
    dex.creatures = dex.creatures || {};
    dex.pending = dex.pending || {};
    dex.runs = dex.runs || {};
    dex.trophies = dex.trophies || [];
    dex.battles = dex.battles || { wins: 0, losses: 0 };
    dex.friends = dex.friends || [];
    return dex;
  } catch {
    return { creatures: {}, pending: {}, runs: {}, trophies: [], battles: { wins: 0, losses: 0 }, friends: [] };
  }
}

function save(dex) {
  const { dir, file } = dexPath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(dex, null, 2));
}

/**
 * Apply one run of a command.
 *   key       - identifies the command (cwd + normalized argv)
 *   creatures - creatures seen in this run; empty when the run succeeded
 *   ctx       - { frames, blast, loc, project } from a project scan (failing runs only)
 * Returns { outcome, encounters, captured, escaped, pending, trophies, powers }.
 */
function applyRun(key, creatures, ctx = null, now = new Date()) {
  const dex = load();
  const stamp = now.toISOString();
  const failed = creatures.length > 0;

  // Error rate only tracks commands that have failed before, so clean runs of healthy commands cost nothing.
  let run = dex.runs[key];
  if (run || failed) {
    run = run || { runs: 0, fails: 0 };
    run.runs += 1;
    if (failed) run.fails += 1;
    dex.runs[key] = run;
  }
  const failRate = run ? run.fails / Math.max(run.runs, MIN_RUNS_FOR_RATE) : 0;

  const fresh = {};
  for (const c of creatures) {
    fresh[c.id] = computePower({
      rarity: c.rarity,
      frames: ctx ? ctx.frames : 0,
      blast: ctx ? ctx.blast : 0,
      loc: ctx ? ctx.loc : 0,
      failRate,
    });
  }

  const encounters = creatures.map((c) => {
    const isNew = !dex.creatures[c.id];
    const entry = dex.creatures[c.id] || { ...c, firstSeen: stamp, count: 0, captures: 0, escapes: 0, sample: c.sample };
    entry.count += 1;
    entry.lastSeen = stamp;
    dex.creatures[c.id] = entry;
    return { entry, isNew };
  });

  const prev = dex.pending[key];
  const prevIds = prev ? prev.ids : [];
  const prevInfo = prev && prev.info ? prev.info : {};
  const result = resolve(prevIds, creatures.map((c) => c.id));

  const pick = (ids) => ids.map((id) => dex.creatures[id]).filter(Boolean);
  const captured = pick(result.captured);
  const escaped = pick(result.escaped);

  const trophies = [];
  for (const e of captured) {
    e.captures += 1;
    e.lastCaptured = stamp;
    const p = prevInfo[e.id] || fresh[e.id] || computePower({ rarity: e.rarity });
    trophies.push({
      id: e.id, name: e.name, type: e.type, rarity: e.rarity, art: e.art,
      power: p.power, factors: p.factors,
      project: (ctx && ctx.project) || path.basename(process.cwd()), at: stamp,
    });
  }
  for (const e of escaped) e.escapes += 1;
  if (trophies.length > 0) dex.trophies = dex.trophies.concat(trophies).slice(-MAX_TROPHIES);

  if (result.pending.length > 0) {
    const info = {};
    for (const id of result.pending) info[id] = fresh[id] || prevInfo[id];
    dex.pending[key] = { ids: result.pending, since: prev ? prev.since : stamp, info };
  } else {
    delete dex.pending[key];
  }

  if (failed || prev || run) save(dex);

  return {
    outcome: result.outcome, encounters, captured, escaped, trophies,
    pending: pick(result.pending), powers: fresh,
  };
}

module.exports = { load, save, applyRun, dexPath };
