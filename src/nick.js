'use strict';

/** Nicknames for caught monsters, shared by the CLI and the editor. */
const MAX_LEN = 16;

/** Printable characters only, and nothing that could break a terminal, a table or the SVG card. */
const clean = (s) => Array.from(String(s || ''))
  .filter((ch) => ch >= ' ' && ch.charCodeAt(0) !== 127 && !'<>&"'.includes(ch))
  .join('').trim().slice(0, MAX_LEN);

/** Give the creature `id` a nickname (empty clears it). Mutates the dex; returns the creature or null. */
function set(dex, id, nick) {
  const c = dex.creatures[id];
  if (!c || !(c.captures > 0)) return null;
  const n = clean(nick);
  if (n) c.nick = n;
  else delete c.nick;
  for (const tr of dex.trophies) if (tr.id === id) { if (n) tr.nick = n; else delete tr.nick; }
  return c;
}

module.exports = { clean, set, MAX_LEN };
