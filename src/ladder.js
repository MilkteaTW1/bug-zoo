'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateEntry } = require('./score');
const { validateTeam, duel } = require('./battle');

/** A challenger may only take on someone up to this many ranks above them. */
const REACH = 3;

const lower = (s) => String(s).toLowerCase();

function jsonFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

/** Battle-ready players from a scores folder: Map(lowercase name -> { name, score, team }). */
function loadPlayers(scoresDir) {
  const players = new Map();
  const skipped = [];
  for (const f of jsonFiles(scoresDir)) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(scoresDir, f), 'utf8'));
      const v = validateEntry(raw);
      if (!v.ok) {
        skipped.push({ file: f, reason: v.reason });
        continue;
      }
      const team = validateTeam(raw.team);
      if (!team) {
        skipped.push({ file: f, reason: 'no valid team (run `bugzoo share` after catching a bug)' });
        continue;
      }
      const key = lower(v.entry.name);
      const prev = players.get(key);
      if (!prev || prev.score < v.entry.score) players.set(key, { name: v.entry.name, score: v.entry.score, team });
    } catch {
      skipped.push({ file: f, reason: 'invalid JSON' });
    }
  }
  return { players, skipped };
}

/** Drop players that left, append newcomers at the bottom (best score first). */
function sync(order, players) {
  const seen = new Set();
  const kept = [];
  for (const n of order || []) {
    const p = players.get(lower(n));
    if (p && !seen.has(lower(n))) {
      seen.add(lower(n));
      kept.push(p.name);
    }
  }
  const fresh = [...players.values()]
    .filter((p) => !seen.has(lower(p.name)))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return [...kept, ...fresh.map((p) => p.name)];
}

const indexOf = (order, name) => order.findIndex((n) => lower(n) === lower(name));

function checkChallenge(order, challenger, defender, reach = REACH) {
  const ci = indexOf(order, challenger);
  const di = indexOf(order, defender);
  // `code` + `params` let the CLI translate the reason; `reason` stays English for CI logs and tests.
  if (ci < 0) return { ok: false, code: 'notOnLadder', params: { name: challenger }, reason: `${challenger} is not on the ladder (share a team first)` };
  if (di < 0) return { ok: false, code: 'notOnLadder', params: { name: defender }, reason: `${defender} is not on the ladder` };
  if (ci === di) return { ok: false, code: 'self', params: {}, reason: 'you cannot challenge yourself' };
  if (di > ci) return { ok: false, code: 'below', params: { name: order[di] }, reason: `${order[di]} is ranked below you` };
  if (ci - di > reach) return { ok: false, code: 'reach', params: { reach }, reason: `you can only challenge up to ${reach} ranks above you` };
  return { ok: true, ci, di };
}

/** The challenger takes the defender's spot; everyone in between slides down one. */
function promote(order, ci, di) {
  const next = [...order];
  const [me] = next.splice(ci, 1);
  next.splice(di, 0, me);
  return next;
}

function fight(players, challenger, defender) {
  const a = players.get(lower(challenger));
  const b = players.get(lower(defender));
  const r = duel({ name: a.name, team: a.team }, { name: b.name, team: b.team });
  return { won: r.winner === a.name, winner: r.winner, loser: r.loser, log: r.log };
}

function loadChallenges(dir) {
  return jsonFiles(dir).map((file) => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (raw && typeof raw.challenger === 'string' && typeof raw.defender === 'string') {
        return { file, challenger: raw.challenger, defender: raw.defender };
      }
    } catch { /* fall through */ }
    return { file, invalid: true };
  });
}

/**
 * Apply every challenge not yet processed, in file-name order.
 * Results are recomputed from the teams on disk; a record only names two players.
 */
function processChallenges(state, players, challenges) {
  let order = sync((state && state.order) || [], players);
  const done = new Set((state && state.processed) || []);
  const results = [];
  for (const c of challenges) {
    if (done.has(c.file)) continue;
    done.add(c.file);
    if (c.invalid) {
      results.push({ file: c.file, outcome: 'rejected', reason: 'invalid challenge record' });
      continue;
    }
    const chk = checkChallenge(order, c.challenger, c.defender);
    if (!chk.ok) {
      results.push({ file: c.file, outcome: 'rejected', reason: chk.reason });
      continue;
    }
    const f = fight(players, c.challenger, c.defender);
    const info = { file: c.file, challenger: order[chk.ci], defender: order[chk.di], from: chk.ci + 1, to: chk.di + 1 };
    if (f.won) {
      order = promote(order, chk.ci, chk.di);
      results.push({ ...info, outcome: 'promoted' });
    } else {
      results.push({ ...info, outcome: 'lost' });
    }
  }
  return { state: { v: 1, order, processed: [...done].sort() }, results };
}

const teamPower = (p) => p.team.reduce((s, m) => s + m.power, 0);

function toText(order, players, { me, reach = REACH, tags: words = {} } = {}) {
  const myIdx = me ? indexOf(order, me) : -1;
  const lines = [];
  order.forEach((name, i) => {
    const p = players.get(lower(name));
    const tags = [];
    if (i === myIdx) tags.push(words.you || 'you');
    else if (myIdx > -1 && i < myIdx && myIdx - i <= reach) tags.push(words.challengeable || 'challengeable');
    lines.push(`${String(i + 1).padStart(3)}. ${name.padEnd(18)} power ${String(teamPower(p)).padStart(4)}  ` +
      `${p.team.map((m) => m.name).join(', ')}${tags.length ? `  <${tags.join(', ')}>` : ''}`);
  });
  return lines.join('\n');
}

function toMarkdown(order, players) {
  const lines = ['# Bug Zoo Ladder', '', '| # | Player | Team power | Team |', '|--:|--------|-----------:|------|'];
  order.forEach((name, i) => {
    const p = players.get(lower(name));
    lines.push(`| ${i + 1} | ${p.name} | ${teamPower(p)} | ${p.team.map((m) => `${m.name} (${m.power})`).join(', ')} |`);
  });
  if (order.length === 0) lines.push('| - | nobody yet | | |');
  lines.push('', `_Challenge up to ${REACH} ranks above you; win to take their spot. Results are replayed from the shared teams._`, '');
  return lines.join('\n');
}

module.exports = {
  REACH, loadPlayers, sync, indexOf, checkChallenge, promote, fight,
  loadChallenges, processChallenges, toText, toMarkdown,
};
