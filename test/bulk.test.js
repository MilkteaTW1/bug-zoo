'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const shop = require('../src/shop');
const brag = require('../src/brag');
const i18n = require('../src/i18n');

const dexOf = (coins) => ({
  coins, inventory: {}, furniture: [], stats: {}, tower: { cleared: 3 }, team: [], trophies: [],
  creatures: { a: { id: 'a', name: 'Wobblebat', type: 'TypeError', captures: 2, bond: 0, shinies: 1 } },
});

test('parseCount reads numbers, x-prefixed numbers and max', () => {
  assert.equal(shop.parseCount(undefined), 1);
  assert.equal(shop.parseCount('5'), 5);
  assert.equal(shop.parseCount('x3'), 3);
  assert.equal(shop.parseCount('max'), Infinity);
  assert.equal(shop.parseCount('0'), 1);
});

test('buyMany stops when the coins run out and charges only what it bought', () => {
  const dex = dexOf(60);
  const price = shop.food('pizza').price;
  const r = shop.buyMany(dex, 'pizza', Infinity);
  assert.equal(r.count, Math.floor(60 / price));
  assert.equal(r.spent, r.count * price);
  assert.equal(dex.inventory.pizza, r.count);
  assert.equal(dex.coins, 60 - r.spent);
});

test('buyMany with too few coins fails like a single buy', () => {
  const r = shop.buyMany(dexOf(1), 'pizza', 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'poor');
});

test('furniture is still bought once even when a count is given', () => {
  const dex = dexOf(10000);
  assert.equal(shop.buyMany(dex, 'plant', 5).count, 1);
  assert.equal(shop.buyMany(dex, 'plant', 5).reason, 'owned');
});

test('feedMany feeds the whole count, adds the affection up and stops at the cap', () => {
  const dex = dexOf(0);
  dex.inventory.pizza = 3;
  const one = shop.feedMany(dexOf(0), 'a', 'pizza', 1);
  assert.equal(one.reason, 'noFood');
  const r = shop.feedMany(dex, 'a', 'pizza', 'max' === 'x' ? 1 : Infinity);
  assert.equal(r.count, 3);
  assert.equal(dex.creatures.a.bond, r.gain);
  assert.equal(dex.inventory.pizza, undefined);
  assert.equal(dex.stats.fed, 3);
});

test('brag texts exist in every language and carry the numbers', () => {
  for (const code of i18n.LANGS) {
    i18n.setLang(code);
    for (const kind of brag.KINDS) {
      const text = brag.text(dexOf(0), kind);
      assert.ok(text.includes('npm i -g bug-zoo'), `${code} ${kind} footer`);
      assert.ok(!/\{\w+\}/.test(text), `${code} ${kind} has no unfilled placeholder: ${text}`);
    }
  }
  i18n.setLang('en');
  assert.match(brag.text(dexOf(0), 'tower'), /3 of 12/);
});
