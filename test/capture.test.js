'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('../src/capture');
const { parseErrors, parseError } = require('../src/parse');

test('nothing pending: current bugs become targets', () => {
  const r = resolve([], ['A']);
  assert.equal(r.outcome, 'wild');
  assert.deepEqual(r.pending, ['A']);
});

test('clean run catches everything pending', () => {
  const r = resolve(['A', 'B'], []);
  assert.equal(r.outcome, 'captured');
  assert.deepEqual(r.captured.sort(), ['A', 'B']);
  assert.deepEqual(r.pending, []);
});

test('same bug is still there', () => {
  const r = resolve(['A'], ['A']);
  assert.equal(r.outcome, 'still');
  assert.deepEqual(r.captured, []);
});

test('a different bug means failure and the old one escapes', () => {
  const r = resolve(['A'], ['B']);
  assert.equal(r.outcome, 'failed');
  assert.deepEqual(r.escaped, ['A']);
  assert.deepEqual(r.pending, ['B']);
});

test('more bugs than before is a failure even if the old one remains', () => {
  const r = resolve(['A'], ['A', 'B']);
  assert.equal(r.outcome, 'failed');
  assert.deepEqual(r.captured, []);
  assert.deepEqual(r.pending.sort(), ['A', 'B']);
});

test('fixing only some bugs catches those and keeps the rest', () => {
  const r = resolve(['A', 'B'], ['B']);
  assert.equal(r.outcome, 'partial');
  assert.deepEqual(r.captured, ['A']);
  assert.deepEqual(r.pending, ['B']);
});

test('fixing one while introducing another is a failure', () => {
  const r = resolve(['A', 'B'], ['B', 'C']);
  assert.equal(r.outcome, 'failed');
  assert.deepEqual(r.captured, []);
});

test('parseError reads the last error of a python traceback', () => {
  const tb = 'Traceback (most recent call last):\n  File "x.py", line 1\nKeyError: \'name\'\n';
  assert.deepEqual(parseError(tb, 1), { type: 'KeyError', message: "'name'" });
});

test('parseErrors returns distinct errors and dedupes repeats', () => {
  const text = 'TypeError: a is not a function\nRangeError: bad\nTypeError: a is not a function\n';
  const errs = parseErrors(text, 1);
  assert.deepEqual(errs.map((e) => e.type).sort(), ['RangeError', 'TypeError']);
});

test('parseErrors falls back to a single mystery error', () => {
  const errs = parseErrors('', 3);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].type, 'MysteryError');
});
