'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolve } = require('./capture');
const { computePower, MIN_RUNS_FOR_RATE, stageOf } = require('./power');
const achievements = require('./achievements');
const quests = require('./quests');

const MAX_TROPHIES = 200;
const FAIL_COUNT_INTERVAL_MS = 60 * 1000;
const SHINY_MS = 10 * 60 * 1000;

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
    dex.achievements = dex.achievements || {};
    dex.team = Array.isArray(dex.team) ? dex.team : []; // ids of the monsters the player picked to fight
    dex.stats = dex.stats || { clean: 0 };
    dex.quests = dex.quests || { total: 0, perfect: 0 };
    return dex;
  } catch {
    return {
      creatures: {}, pending: {}, runs: {}, trophies: [], battles: { wins: 0, losses: 0 }, friends: [], achievements: {}, team: [], stats: { clean: 0 }, quests: { total: 0, perfect: 0 },
    };
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
  // A command's failures count at most once a minute, so hammering a failing command to inflate
  // its error rate does nothing. Healthy runs always count.
  let run = dex.runs[key];
  if (run || failed) {
    run = run || { runs: 0, fails: 0 };
    const sinceLastFail = run.lastFailAt ? now - new Date(run.lastFailAt) : Infinity;
    const burst = failed && sinceLastFail < FAIL_COUNT_INTERVAL_MS;
    if (!burst) {
      run.runs += 1;
      if (failed) {
        run.fails += 1;
        run.lastFailAt = stamp;
      }
    }
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
  const evolved = [];
  for (const e of captured) {
    const before = stageOf(e.captures);
    e.captures += 1;
    const after = stageOf(e.captures);
    if (after > before) evolved.push({ entry: e, stage: after });
    e.lastCaptured = stamp;
    const p = prevInfo[e.id] || fresh[e.id] || computePower({ rarity: e.rarity });
    // Fixed within ten minutes of the bug appearing: a shiny catch. Only a badge; it never changes power.
    const shiny = Boolean(prev && prev.since && now - new Date(prev.since) <= SHINY_MS);
    if (shiny) e.shinies = (e.shinies || 0) + 1;
    trophies.push({
      id: e.id, name: e.name, type: e.type, rarity: e.rarity, art: e.art,
      power: p.power, factors: p.factors,
      project: (ctx && ctx.project) || path.basename(process.cwd()), at: stamp, ...(shiny ? { shiny: true } : {}),
    });
  }
  for (const e of escaped) e.escapes += 1;
  if (trophies.length > 0) dex.trophies = dex.trophies.concat(trophies).slice(-MAX_TROPHIES);

  if (result.pending.length > 0) {
    const info = {};
    for (const id of result.pending) info[id] = fresh[id] || prevInfo[id];
    // cwd lets editors tell which project a waiting bug belongs to.
    const cwd = (ctx && ctx.cwd) || (prev && prev.cwd);
    dex.pending[key] = { ids: result.pending, since: prev ? prev.since : stamp, info, ...(cwd ? { cwd } : {}) };
  } else {
    delete dex.pending[key];
  }

  // Daily quests. A clean run only counts for a command that failed before (those are the runs we record at all).
  const questsDone = [];
  if (captured.length > 0) questsDone.push(...quests.note(dex, 'catch', captured.length, now));
  const fresh1 = encounters.filter((x) => x.isNew).length;
  if (fresh1 > 0) questsDone.push(...quests.note(dex, 'seen', fresh1, now));
  if (!failed && run) {
    dex.stats.clean += 1;
    questsDone.push(...quests.note(dex, 'clean', 1, now));
  }

  const unlocked = achievements.evaluate(dex, stamp);

  if (failed || prev || run) save(dex);

  return {
    outcome: result.outcome, encounters, captured, escaped, trophies,
    pending: pick(result.pending), powers: fresh, evolved, achievements: unlocked, quests: questsDone,
  };
}

module.exports = { load, save, applyRun, dexPath };
