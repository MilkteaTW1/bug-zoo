'use strict';

const { hash } = require('./parse');

/**
 * Elements. Every monster has one, worked out from its error type, so a monster that arrives from a friend code or a
 * ladder entry gets its element the same way and nobody can claim a different one.
 * The five form a ring: each beats the next two (syntax > logic, env; logic > env, net; env > net, crash;
 * net > crash, syntax; crash > syntax, logic) and loses to the two before it.
 */
const ORDER = ['syntax', 'logic', 'env', 'net', 'crash'];
const STRONG = 1.4;
const WEAK = 0.7;

const KNOWN = {
  syntax: ['SyntaxError', 'IndentationError', 'TabError', 'ParseError'],
  logic: ['TypeError', 'ValueError', 'AttributeError', 'KeyError', 'IndexError', 'NameError', 'ReferenceError',
    'RangeError', 'AssertionError', 'ZeroDivisionError', 'Exception'],
  env: ['ImportError', 'ModuleNotFoundError', 'ENOENT', 'EACCES', 'FileNotFoundError', 'PermissionError', 'ENOSPC'],
  net: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'TimeoutError'],
  crash: ['SIGSEGV', 'SIGABRT', 'OutOfMemory', 'StackOverflow', 'RecursionError', 'Panic'],
};
const BY_TYPE = new Map(ORDER.flatMap((el) => KNOWN[el].map((type) => [type, el])));

/** Error types we have not listed are spread over the five by their name, so rare monsters have an element too. */
function elementOf(type) {
  const t = String(type || '');
  return BY_TYPE.get(t) || ORDER[parseInt(hash(t).slice(0, 4), 16) % ORDER.length];
}

/** Does `a` beat `b`? */
function beats(a, b) {
  const d = (ORDER.indexOf(b) - ORDER.indexOf(a) + ORDER.length) % ORDER.length;
  return d === 1 || d === 2;
}

/** Damage multiplier for an attacker of element `a` hitting a defender of element `b`. */
function multiplier(a, b) {
  if (a === b) return 1;
  if (beats(a, b)) return STRONG;
  if (beats(b, a)) return WEAK;
  return 1;
}

/** The two elements `el` is strong against, for the chart. */
const strongAgainst = (el) => ORDER.filter((o) => o !== el && beats(el, o));

module.exports = { ORDER, STRONG, WEAK, elementOf, beats, multiplier, strongAgainst };
