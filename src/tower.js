'use strict';

const { hash } = require('./parse');
const { makeCreature } = require('./creature');
const { ORDER } = require('./element');

/**
 * The Tower: a solo climb. Twelve floors, each with a fixed enemy team (one monster at first, three from floor 6) that is the same for every player, so the
 * only way up is a better lineup. A fight is deterministic, so a lost floor needs a different team, not another try.
 */
const FLOORS = 12;
const SIZE = 3;
/** The first floors have fewer enemies, so a player with one or two catches can start climbing. */
const sizeOf = (floor) => (floor <= 2 ? 1 : floor <= 5 ? 2 : SIZE);
const TYPE_OF = { syntax: 'SyntaxError', logic: 'TypeError', env: 'ENOENT', net: 'ECONNREFUSED', crash: 'SIGSEGV' };
const SHARE = [1, 0.8, 0.65]; // the second and third monster are weaker than the lead

/** Power of the lead monster on a floor: gentle at the bottom so a first catch can win floor 1. */
const leadPower = (floor) => 14 + 9 * (floor - 1);

/** The enemy team of one floor: { floor, name, team: [{ name, type, rarity, power, stage, element }] }. */
function foeFor(floor) {
  const n = Math.min(Math.max(Math.trunc(floor), 1), FLOORS);
  const team = [];
  for (let i = 0; i < sizeOf(n); i += 1) {
    const element = ORDER[parseInt(hash(`tower:${n}:${i}`).slice(0, 4), 16) % ORDER.length];
    const type = TYPE_OF[element];
    let c = makeCreature(type, `tower-${n}-${i}`);
    for (let k = 1; team.some((m) => m.name === c.name) && k < 20; k += 1) c = makeCreature(type, `tower-${n}-${i}-${k}`); // two enemies never share a name
    team.push({
      name: c.name, type, rarity: n >= 10 ? 'rare' : n >= 5 ? 'uncommon' : 'common',
      power: Math.max(6, Math.round(leadPower(n) * SHARE[i])), stage: 0, element,
    });
  }
  return { floor: n, name: `Floor ${n}`, team };
}

module.exports = { FLOORS, foeFor, leadPower, sizeOf };
