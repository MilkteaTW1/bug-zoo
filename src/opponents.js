'use strict';

const { BOT } = require('./battle');
const { teamPower } = require('./friends');

const lower = (s) => String(s).toLowerCase();

/**
 * The numbered list shown by `bugzoo battle`.
 *   me      - { name, team, score }
 *   friends - saved friends [{ name, team, kind }]
 * Returns { me, rows } where rows are { n, section: 'friend'|'practice', name, team, power, kind? }.
 */
function buildList({ me, friends = [] }) {
  const key = lower(me.name);
  const rows = [];
  let n = 0;
  for (const f of friends) {
    if (lower(f.name) === key) continue;
    rows.push({ section: 'friend', name: f.name, team: f.team, power: teamPower(f.team), kind: f.kind, n: ++n });
  }
  rows.push({ section: 'practice', name: BOT.name, team: BOT.team, power: teamPower(BOT.team), n: ++n });
  return { me, rows };
}

/** Plain-text list; `words` carries the translated labels. */
function render(list, words) {
  const out = [];
  let section = null;
  const head = { friend: words.friends, practice: words.practice };
  for (const r of list.rows) {
    if (r.section !== section) {
      section = r.section;
      if (out.length) out.push('');
      out.push(head[section]);
    }
    const tags = r.kind ? [words.kind(r.kind)] : [];
    out.push(`${String(r.n).padStart(2)}. ${words.pad(r.name, 18)} ${words.power(r.power)}${tags.length ? `  <${tags.join(', ')}>` : ''}`);
  }
  return out.join('\n');
}

const pick = (list, n) => list.rows.find((r) => r.n === n) || null;

module.exports = { buildList, render, pick };
