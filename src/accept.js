'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { validateEntry, cleanName } = require('./score');
const { validateTeam } = require('./battle');

/**
 * Challenge submissions travel as a GitHub issue: the CLI pre-fills a "new issue" page with the
 * challenge and the player's shared team, and a workflow validates it and replays the fight.
 */

function issueTitle(challenger, defender) {
  return `Challenge: ${challenger} vs ${defender}`;
}

const CODE_PREFIX = 'BZC1.';

/** The submission as a short pasteable code: deflated JSON, base64url. */
function encodeSubmission(sub) {
  return CODE_PREFIX + zlib.deflateRawSync(Buffer.from(JSON.stringify(sub), 'utf8')).toString('base64url');
}

function issueBody(challenger, defender, payload) {
  return [
    'Submitted from the bugzoo CLI. Please do not edit the code.',
    '',
    '```',
    encodeSubmission({ v: 1, challenger, defender, player: payload }),
    '```',
    '',
  ].join('\n');
}

function issueUrl({ repo, challenger, defender, payload }) {
  const q = new URLSearchParams({
    title: issueTitle(challenger, defender),
    body: issueBody(challenger, defender, payload),
    labels: 'challenge',
  });
  return `https://github.com/${repo}/issues/new?${q.toString().replace(/\+/g, '%20')}`;
}

/** The submission from an issue body: a BZC1 code, or (older/handwritten) a ```json block. */
function extractJson(body) {
  const text = String(body || '');
  try {
    const c = /BZC1\.([A-Za-z0-9_-]{1,8000})/.exec(text);
    if (c) {
      const raw = zlib.inflateRawSync(Buffer.from(c[1], 'base64url'), { maxOutputLength: 50000 });
      return JSON.parse(raw.toString('utf8'));
    }
    const m = /```json\s*([\s\S]*?)```/.exec(text);
    return m ? JSON.parse(m[1]) : null;
  } catch {
    return null;
  }
}

const lower = (s) => String(s).toLowerCase();

/**
 * Validate and record a challenge issue. `actor` is the GitHub login that opened the issue.
 * A name is claimed by the first login that uses it (owners.json) so nobody can submit as someone else.
 * Returns { ok, message } and, when ok, writes the player's score file and a challenge file under `dir`.
 */
function accept({ body, actor, dir, now = new Date() }) {
  const reject = (message) => ({ ok: false, message });
  const sub = extractJson(body);
  if (!sub || typeof sub !== 'object') return reject('No valid challenge code found in the issue.');

  const challenger = cleanName(sub.challenger || '');
  const defender = cleanName(sub.defender || '');
  if (!challenger || !defender) return reject('Challenger and defender are required.');
  if (lower(challenger) === lower(defender)) return reject('You cannot challenge yourself.');

  const v = validateEntry(sub.player);
  const team = v.ok ? validateTeam(sub.player.team) : null;
  if (!v.ok || !team) return reject('The submitted team is not valid.');
  if (lower(v.entry.name) !== lower(challenger)) return reject('The team must belong to the challenger.');
  if (!actor) return reject('No GitHub user to attribute this to.');

  const ownersFile = path.join(dir, 'owners.json');
  let owners = {};
  try {
    owners = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
  } catch { /* first submission */ }
  const owner = owners[lower(challenger)];
  if (owner && lower(owner) !== lower(actor)) {
    return reject(`The name "${challenger}" belongs to another GitHub user. Pick a different player name.`);
  }
  owners[lower(challenger)] = actor;

  const scores = path.join(dir, 'scores');
  const challenges = path.join(dir, 'challenges');
  fs.mkdirSync(scores, { recursive: true });
  fs.mkdirSync(challenges, { recursive: true });

  const payload = {
    v: 2, name: v.entry.name, caught: v.entry.caught, repeats: v.entry.repeats,
    seen: Number.isInteger(sub.player.seen) ? sub.player.seen : 0, score: v.entry.score, team,
    updated: now.toISOString(),
  };
  fs.writeFileSync(path.join(scores, `${v.entry.name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(ownersFile, `${JSON.stringify(owners, null, 2)}\n`);

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  const file = `${stamp}-${v.entry.name}-vs-${defender}.json`;
  fs.writeFileSync(path.join(challenges, file),
    `${JSON.stringify({ v: 1, challenger: v.entry.name, defender, at: now.toISOString() }, null, 2)}\n`);

  return { ok: true, message: `Recorded ${v.entry.name} vs ${defender}.`, file };
}

module.exports = { issueTitle, issueBody, issueUrl, extractJson, accept };
