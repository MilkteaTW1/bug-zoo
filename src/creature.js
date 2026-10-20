'use strict';

const { normalize, hash } = require('./parse');
const i18n = require('./i18n');

const COMMON = ['TypeError', 'ReferenceError', 'SyntaxError', 'KeyError', 'ValueError', 'NameError',
  'IndexError', 'AttributeError', 'ImportError', 'ModuleNotFoundError', 'IndentationError'];
const UNCOMMON = ['RangeError', 'ENOENT', 'EACCES', 'ECONNREFUSED', 'ZeroDivisionError', 'AssertionError',
  'RecursionError', 'Exception', 'FileNotFoundError', 'PermissionError', 'TimeoutError'];
const LEGENDARY = ['SIGSEGV', 'SIGABRT', 'ENOSPC', 'OutOfMemory', 'StackOverflow', 'Panic'];

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];
const RARITY_COLOR = { common: '\x1b[37m', uncommon: '\x1b[32m', rare: '\x1b[36m', legendary: '\x1b[35m' };
const RARITY_HEX = { common: '#9aa0a6', uncommon: '#34a853', rare: '#1a9bd7', legendary: '#b33fd1' };

// English names live in src/locales/en.js (`names`), every other language has its own list there.
const EN_NAMES = i18n.LOCALES.en.names;
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
  const name = EN_NAMES.prefix[n(0) % EN_NAMES.prefix.length] + EN_NAMES.suffix[n(1) % EN_NAMES.suffix.length];
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

/**
 * A creature's name in a language: same hash and indices as the English name, but picked from that
 * language's `names` lists (src/locales/<code>.js). Returns null for English (the saved name is used)
 * and for a language without lists.
 */
function localName(id, lang) {
  if (lang === 'en') return null;
  const loc = i18n.LOCALES[lang];
  const names = loc && loc.names;
  if (!names || !names.prefix.length || !names.suffix.length) return null;
  const h = hash(id);
  const n = (i) => parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return names.prefix[n(0) % names.prefix.length] + names.suffix[n(1) % names.suffix.length];
}

/** Traditional Chinese name (kept for older callers). */
const zhName = (id) => localName(id, 'zh-TW');

/** A stable face for any monster we only know by name (an opponent's team, a shared card). */
function artFor(seed) {
  const h = hash(String(seed));
  const n = (i) => parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return BODIES[n(3) % BODIES.length](EYES[n(2) % EYES.length]);
}

module.exports = { makeCreature, rarityOf, localName, zhName, artFor, RARITY_ORDER, RARITY_COLOR, RARITY_HEX };
