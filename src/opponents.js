'use strict';

const ladder = require('./ladder');
const { BOT } = require('./battle');
const { teamPower } = require('./friends');

const lower = (s) => String(s).toLowerCase();

/**
 * The numbered list shown by `bugzoo battle`.
 *   me      - { name, team, score }
 *   source  - { players: Map, order: [] } from the ladder
 *   friends - saved friends [{ name, team, kind }]
 * Returns { me, order, rows } where rows are
 *   { n, section: 'ladder'|'friend'|'practice', name, team, power, rank?, ranked?, kind?, isMe? }.
 * Numbers are continuous; the player's own ladder row has no number.
 */
function buildList({ me, source, friends = [] }) {
  const players = new Map(source.players);
  const key = lower(me.name);
  const existing = players.get(key);
  // The player's own current team is what fights, so use it for their ladder row too.
  players.set(key, { name: existing ? existing.name : me.name, score: me.score || 0, team: me.team });

  const order = ladder.sync(source.order, players);
  const myIdx = ladder.indexOf(order, me.name);

  const rows = [];
  let n = 0;
  order.forEach((name, i) => {
    const p = players.get(lower(name));
    const isMe = i === myIdx;
    const reach = myIdx > -1 && i < myIdx && myIdx - i <= ladder.REACH;
    rows.push({
      section: 'ladder', rank: i + 1, name: p.name, team: p.team, power: teamPower(p.team),
      isMe, ranked: reach, n: isMe ? null : ++n,
    });
  });

  const taken = new Set(order.map(lower));
  for (const f of friends) {
    if (lower(f.name) === key) continue;
    rows.push({
      section: 'friend', name: f.name, team: f.team, power: teamPower(f.team), kind: f.kind,
      inLadder: taken.has(lower(f.name)), n: ++n,
    });
  }

  rows.push({ section: 'practice', name: BOT.name, team: BOT.team, power: teamPower(BOT.team), n: ++n });
  return { me, order, myRank: myIdx + 1, rows };
}

/** Plain-text list; `words` carries the translated labels. */
function render(list, words) {
  const out = [];
  let section = null;
  const head = { ladder: words.ladder, friend: words.friends, practice: words.practice };
  for (const r of list.rows) {
    if (r.section !== section) {
      section = r.section;
      if (out.length) out.push('');
      out.push(head[section]);
    }
    const num = r.n === null ? '  ' : String(r.n).padStart(2);
    const rank = r.section === 'ladder' ? `#${String(r.rank).padEnd(3)}` : '    ';
    const tags = [];
    if (r.isMe) tags.push(words.you);
    else if (r.ranked) tags.push(words.ranked);
    if (r.kind) tags.push(words.kind(r.kind));
    out.push(`${num}. ${rank} ${words.pad(r.name, 18)} ${words.power(r.power)}${tags.length ? `  <${tags.join(', ')}>` : ''}`);
  }
  return out.join('\n');
}

const pick = (list, n) => list.rows.find((r) => r.n === n) || null;

module.exports = { buildList, render, pick };
