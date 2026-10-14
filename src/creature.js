'use strict';

const { normalize, hash } = require('./parse');

const COMMON = ['TypeError', 'ReferenceError', 'SyntaxError', 'KeyError', 'ValueError', 'NameError',
  'IndexError', 'AttributeError', 'ImportError', 'ModuleNotFoundError', 'IndentationError'];
const UNCOMMON = ['RangeError', 'ENOENT', 'EACCES', 'ECONNREFUSED', 'ZeroDivisionError', 'AssertionError',
  'RecursionError', 'Exception', 'FileNotFoundError', 'PermissionError', 'TimeoutError'];
const LEGENDARY = ['SIGSEGV', 'SIGABRT', 'ENOSPC', 'OutOfMemory', 'StackOverflow', 'Panic'];

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];
const RARITY_COLOR = { common: '\x1b[37m', uncommon: '\x1b[32m', rare: '\x1b[36m', legendary: '\x1b[35m' };
const RARITY_HEX = { common: '#9aa0a6', uncommon: '#34a853', rare: '#1a9bd7', legendary: '#b33fd1' };

const PREFIX = ['Grim', 'Fluff', 'Snark', 'Wobble', 'Gloom', 'Zap', 'Murk', 'Pip', 'Crumb', 'Hex', 'Glitch', 'Nib'];
const SUFFIX = ['ling', 'bat', 'gnaw', 'moth', 'toad', 'wisp', 'beetle', 'imp', 'crawler', 'snail', 'sprite', 'mite'];
const EYES = ['o o', '^ ^', '> <', '@ @', '. .', '* *', 'x x', '0 0'];
const BODIES = [
  (e) => [` /\\_/\\`, `( ${e} )`, ` > ^ <`],
  (e) => [`  ___`, ` (${e})`, `  \\_/`],
  (e) => [` .-"-.`, `/ ${e} \\`, `\\_^_/`],
  (e) => [` \\\\|//`, ` (${e})`, `  /_\\`],
];

function rarityOf(type) {
  if (LEGENDARY.includes(type)) return 'legendary';
  if (UNCOMMON.includes(type)) return 'uncommon';
  if (COMMON.includes(type)) return 'common';
  return 'rare';
}

/** Deterministic creature: same type + same normalized message => same individual. */
function makeCreature(type, message) {
  const variant = hash(normalize(message)).slice(0, 8);
  const h = hash(`${type}:${variant}`);
  const n = (i) => parseInt(h.slice(i * 2, i * 2 + 2), 16);
  const name = PREFIX[n(0) % PREFIX.length] + SUFFIX[n(1) % SUFFIX.length];
  const eyes = EYES[n(2) % EYES.length];
  const body = BODIES[n(3) % BODIES.length](eyes);
  return {
    id: `${type}:${variant}`,
    type,
    variant,
    name,
    rarity: rarityOf(type),
    art: body,
    hue: Math.round((n(4) / 255) * 360),
  };
}

module.exports = { makeCreature, rarityOf, RARITY_ORDER, RARITY_COLOR, RARITY_HEX };
