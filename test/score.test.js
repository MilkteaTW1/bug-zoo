'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeArgv } = require('../src/key');
const { computeScore, titleFor, summarize, validateEntry } = require('../src/score');
const { rank, toMarkdown } = require('../src/leaderboard');

test('flags, numbers and ./ prefixes are ignored when matching commands', () => {
  const base = normalizeArgv(['node', 'app.js']);
  assert.deepEqual(normalizeArgv(['node', './app.js', '--debug', '--port', '3000']), base);
  assert.deepEqual(normalizeArgv(['node', 'app.js', '--x=1', '-v']), base);
  assert.notDeepEqual(normalizeArgv(['node', 'other.js']), base);
  assert.notDeepEqual(normalizeArgv(['npm', 'run', 'build']), normalizeArgv(['npm', 'run', 'test']));
});

test('score counts first catches by rarity plus small repeat bonus', () => {
  assert.equal(computeScore({ caught: { common: 2, uncommon: 1, rare: 0, legendary: 1 }, repeats: 3 }), 20 + 25 + 200 + 6);
});

test('titles follow score thresholds', () => {
  assert.equal(titleFor(0), 'Bystander');
  assert.equal(titleFor(150), 'Bug Catcher');
  assert.equal(titleFor(99999), 'Bug Whisperer');
});

test('summarize ignores creatures that were never caught', () => {
  const dex = { creatures: {
    a: { rarity: 'common', captures: 3 },
    b: { rarity: 'legendary', captures: 0 },
    c: { rarity: 'rare', captures: 1 },
  } };
  const s = summarize(dex);
  assert.deepEqual(s.caught, { common: 1, uncommon: 0, rare: 1, legendary: 0 });
  assert.equal(s.repeats, 2);
  assert.equal(s.seen, 3);
  assert.equal(s.score, 10 + 60 + 4);
});

test('shared scores are recomputed, not trusted', () => {
  const v = validateEntry({ name: 'cheater', score: 999999, caught: { common: 1 } });
  assert.equal(v.ok, true);
  assert.equal(v.entry.score, 10);
});

test('invalid entries are rejected', () => {
  assert.equal(validateEntry({ caught: {} }).ok, false);
  assert.equal(validateEntry({ name: 'x', caught: { common: -1 } }).ok, false);
  assert.equal(validateEntry({ name: 'x', caught: { common: 1.5 } }).ok, false);
  assert.equal(validateEntry({ name: 'x', caught: { common: 1e12 } }).ok, false);
  assert.equal(validateEntry(null).ok, false);
});

test('names cannot break the markdown table', () => {
  const v = validateEntry({ name: 'a|b`<script>\n', caught: {} });
  assert.equal(v.ok, true);
  assert.equal(v.entry.name, 'abscript');
});

test('leaderboard keeps the best entry per name and sorts by score', () => {
  const mk = (name, common) => validateEntry({ name, caught: { common } }).entry;
  const ranked = rank([mk('Ann', 1), mk('ann', 5), mk('Bob', 3)]);
  assert.deepEqual(ranked.map((e) => `${e.name}:${e.score}`), ['ann:50', 'Bob:30']);
  assert.match(toMarkdown(ranked), /\| 1 \| ann \|/);
});
