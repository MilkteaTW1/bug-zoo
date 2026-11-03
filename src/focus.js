'use strict';

const companion = require('./companion');
const { dayOf } = require('./quests');
const { hash } = require('./parse');

// Thirty active minutes without an error earn a companion. "Active" is the point: time only counts
// between two signs of real work (a command or an edit) that are less than IDLE_MS apart, so walking
// away, or a loop that keeps repeating one command, never adds up to a reward.
const GOAL_MS = 30 * 60 * 1000;
const IDLE_MS = 5 * 60 * 1000;
const MIN_DISTINCT = 3; // different commands in the window
const MIN_EDITS = 10; // edit bursts in the window (VS Code only; the terminal has no edits to see)
const DAILY_CAP = 2;

const fresh = (at) => ({ last: at, ms: 0, cmds: [], edits: 0 });

/**
 * One sign of work. `kind` is 'cmd' (a finished command, with its text) or 'edit' (a document change).
 * Returns the companion when the window is full and looked like real work, else null.
 */
function touch(dex, { kind, failed = false, cmd = '', source = 'cli' }, now = new Date()) {
  const stats = dex.stats;
  const at = now.getTime();
  if (failed) {
    stats.focus = fresh(at);
    return null;
  }
  let f = stats.focus;
  if (!f || !Number.isFinite(f.last)) f = fresh(at);
  const gap = at - f.last;
  if (gap > IDLE_MS) f = { ...f, last: at }; // idle: the pause counts for nothing
  else if (gap > 0) f.ms += gap;
  f.last = at;
  if (kind === 'edit') {
    f.edits += 1;
  } else if (cmd) {
    const h = hash(String(cmd).trim()).slice(0, 8);
    if (!f.cmds.includes(h) && f.cmds.length < 20) f.cmds.push(h);
  }
  stats.focus = f;

  if (f.ms < GOAL_MS) return null;
  const real = f.cmds.length >= MIN_DISTINCT && (source !== 'vscode' || f.edits >= MIN_EDITS);
  if (!real) {
    stats.focus = fresh(at); // a full window with no real work in it: start over rather than pay out
    return null;
  }
  stats.focus = fresh(at);
  const day = dayOf(now);
  const g = stats.focusGifts && stats.focusGifts.day === day ? stats.focusGifts : { day, n: 0 };
  stats.focusGifts = g;
  if (g.n >= DAILY_CAP) return null;
  g.n += 1;
  stats.focusTotal = (stats.focusTotal || 0) + 1;
  stats.giftTotal = (stats.giftTotal || 0) + 1;
  return companion.grant(dex, `focus:${day}:${stats.focusTotal}`, now);
}

/** Active minutes so far in the current clean window, for display. */
const minutes = (dex) => Math.floor(((dex.stats.focus && dex.stats.focus.ms) || 0) / 60000);

module.exports = { touch, minutes, GOAL_MS, IDLE_MS, DAILY_CAP, MIN_DISTINCT, MIN_EDITS };
