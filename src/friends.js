'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');
const { cleanName } = require('./score');
const { validateTeam } = require('./battle');

const PREFIX = 'BZ1.';
const MAX_CODE = 4000;

/**
 * A friend code is the player's name and team, deflated and base64url-encoded:
 * small enough to paste into a chat, and it needs no server to exchange.
 */
function encodeCode(name, team) {
  const compact = { n: cleanName(name), t: team.map((m) => [m.name, m.type, m.rarity, m.power]) };
  const raw = zlib.deflateRawSync(Buffer.from(JSON.stringify(compact), 'utf8'));
  return PREFIX + raw.toString('base64url');
}

/** Returns { name, team } or null. Everything is validated; power is clamped per rarity. */
function decodeCode(code) {
  try {
    const s = String(code || '').trim();
    if (!s.startsWith(PREFIX) || s.length > MAX_CODE) return null;
    const json = zlib.inflateRawSync(Buffer.from(s.slice(PREFIX.length), 'base64url'), { maxOutputLength: 20000 });
    const o = JSON.parse(json.toString('utf8'));
    return normalizeFriend({
      name: o.n,
      team: (o.t || []).map(([name, type, rarity, power]) => ({ name, type, rarity, power })),
    });
  } catch {
    return null;
  }
}

/** Validate a name + team from any untrusted source (code, URL, file). */
function normalizeFriend(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanName(typeof raw.name === 'string' ? raw.name : '');
  const team = validateTeam(raw.team);
  if (!name || !team) return null;
  return { name, team };
}

const teamPower = (team) => team.reduce((s, m) => s + m.power, 0);

async function getJson(url, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (!fetchImpl) throw new Error('fetch is not available');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctl.signal, headers: { 'user-agent': 'bug-zoo' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turn what the player typed into a friend entry.
 *   BZ1.…            code    (snapshot)
 *   http(s)://…      url     (live; refreshed when fetched)
 *   path to a file   file    (re-read every time)
 *   anything else    ladder  (a player name; looked up in the ladder each time)
 * `lookupLadder(name)` returns { name, team } or null.
 */
async function parseFriend(input, { fetchImpl, lookupLadder } = {}) {
  const text = String(input || '').trim();
  if (!text) return null;
  const now = new Date().toISOString();

  if (text.startsWith(PREFIX)) {
    const f = decodeCode(text);
    return f && { ...f, kind: 'code', updated: now };
  }
  if (/^https?:\/\//i.test(text)) {
    const f = normalizeFriend(await getJson(text, { fetchImpl }));
    return f && { ...f, kind: 'url', source: text, updated: now };
  }
  try {
    if (fs.statSync(text).isFile()) {
      const f = normalizeFriend(JSON.parse(fs.readFileSync(text, 'utf8')));
      return f && { ...f, kind: 'file', source: text, updated: now };
    }
  } catch { /* not a file */ }

  const found = lookupLadder ? await lookupLadder(text) : null;
  return found && { name: found.name, team: found.team, kind: 'ladder', updated: now };
}

/**
 * Bring a friend's team up to date. Never throws: on failure the saved snapshot is kept.
 * Returns { friend, ok }.
 */
async function refreshFriend(friend, { fetchImpl, lookupLadder } = {}) {
  try {
    if (friend.kind === 'url') {
      const f = normalizeFriend(await getJson(friend.source, { fetchImpl }));
      if (f) return { friend: { ...friend, team: f.team, updated: new Date().toISOString() }, ok: true };
    } else if (friend.kind === 'file') {
      const f = normalizeFriend(JSON.parse(fs.readFileSync(friend.source, 'utf8')));
      if (f) return { friend: { ...friend, team: f.team, updated: new Date().toISOString() }, ok: true };
    } else if (friend.kind === 'ladder' && lookupLadder) {
      const f = await lookupLadder(friend.name);
      if (f) return { friend: { ...friend, team: f.team, updated: new Date().toISOString() }, ok: true };
    } else if (friend.kind === 'code') {
      return { friend, ok: true }; // a code is a fixed snapshot
    }
  } catch { /* keep the snapshot */ }
  return { friend, ok: false };
}

function upsert(friends, friend) {
  const i = friends.findIndex((f) => f.name.toLowerCase() === friend.name.toLowerCase());
  const next = [...friends];
  if (i >= 0) next[i] = friend;
  else next.push(friend);
  return { friends: next, updated: i >= 0 };
}

function remove(friends, name) {
  const next = friends.filter((f) => f.name.toLowerCase() !== String(name).toLowerCase());
  return { friends: next, removed: next.length !== friends.length };
}

module.exports = {
  PREFIX, encodeCode, decodeCode, normalizeFriend, parseFriend, refreshFriend, getJson, upsert, remove, teamPower,
};
