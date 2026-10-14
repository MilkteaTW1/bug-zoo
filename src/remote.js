'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ladder = require('./ladder');
const { getJson } = require('./friends');

const DEFAULT_REPO = 'MilkteaTW1/bug-zoo';
const BRANCH = 'main';
const MAX_FILES = 200;

const repoOf = (env = process.env) => env.BUGZOO_LADDER_REPO || DEFAULT_REPO;

function cacheFile() {
  const dir = process.env.BUGZOO_HOME || path.join(os.homedir(), '.bugzoo');
  return path.join(dir, 'ladder-cache.json');
}

/** Local ladder folder (leaderboard/ with scores/ and ladder.json). */
function loadLocal(dir) {
  const { players } = ladder.loadPlayers(path.join(dir, 'scores'));
  let order = [];
  try {
    order = JSON.parse(fs.readFileSync(path.join(dir, 'ladder.json'), 'utf8')).order || [];
  } catch { /* no ladder.json yet */ }
  return { players, order, source: 'local', dir };
}

/** The public ladder in the GitHub repo: no clone, no server of ours. */
async function loadRemote({ fetchImpl, repo = repoOf() } = {}) {
  const api = `https://api.github.com/repos/${repo}/contents/leaderboard/scores?ref=${BRANCH}`;
  const listing = await getJson(api, { fetchImpl, timeoutMs: 7000 });
  const files = (Array.isArray(listing) ? listing : [])
    .filter((f) => f.type === 'file' && /\.json$/.test(f.name) && f.download_url)
    .slice(0, MAX_FILES);

  const data = await Promise.all(files.map(async (f) => {
    try {
      return { file: f.name, data: await getJson(f.download_url, { fetchImpl, timeoutMs: 7000 }) };
    } catch {
      return null;
    }
  }));
  const { players } = ladder.playersFromRaw(data.filter(Boolean));

  let order = [];
  try {
    const raw = `https://raw.githubusercontent.com/${repo}/${BRANCH}/leaderboard/ladder.json`;
    order = (await getJson(raw, { fetchImpl, timeoutMs: 7000 })).order || [];
  } catch { /* ladder.json not created yet: seed by score */ }

  return { players, order, source: 'remote', raw: data.filter(Boolean) };
}

function saveCache(result) {
  try {
    const file = cacheFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), order: result.order, raw: result.raw }));
  } catch { /* cache is best-effort */ }
}

function loadCache() {
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'));
    const { players } = ladder.playersFromRaw(c.raw || []);
    return { players, order: c.order || [], source: 'cache', at: c.at };
  } catch {
    return null;
  }
}

/**
 * Where the ladder comes from, in order: an explicit local dir, the GitHub repo,
 * the last saved copy, a ./leaderboard folder. Never throws.
 * Returns { players, order, source, note? } where note = { code, reason, when? } explains a fallback.
 */
async function loadLadder({ dir, fetchImpl, env = process.env, cwd = process.cwd() } = {}) {
  const explicit = dir || env.BUGZOO_LADDER_DIR;
  if (explicit) return loadLocal(explicit);

  let reason = '';
  try {
    const r = await loadRemote({ fetchImpl });
    saveCache(r);
    return r;
  } catch (err) {
    reason = (err && err.name === 'AbortError') ? 'timeout' : (err && err.message) || 'offline';
  }

  const cached = loadCache();
  if (cached) return { ...cached, note: { code: 'cached', reason, when: (cached.at || '').slice(0, 10) } };

  const here = path.join(cwd, 'leaderboard');
  if (fs.existsSync(path.join(here, 'scores'))) return { ...loadLocal(here), note: { code: 'none', reason } };

  return { players: new Map(), order: [], source: 'none', note: { code: 'none', reason } };
}

/** Find one player on the ladder by name, for `friend add <name>`. */
async function lookupPlayer(name, opts = {}) {
  const l = await loadLadder(opts);
  const p = l.players.get(String(name).toLowerCase());
  return p ? { name: p.name, team: p.team } : null;
}

module.exports = { DEFAULT_REPO, repoOf, loadLocal, loadRemote, loadLadder, lookupPlayer, cacheFile };
