'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeCreature } = require('../src/creature');
const shop = require('../src/shop');
const i18n = require('../src/i18n');

const BIN = path.resolve(__dirname, '..', 'bin', 'bugzoo.js');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-shop-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}
const bug = (msg = 'x is undefined') => ({ ...makeCreature('TypeError', msg), sample: msg });
const at = (ms) => new Date(new Date(2026, 2, 4, 12, 0, 0).getTime() + ms);

test('every shop item has a name in every language', () => {
  for (const code of i18n.LANGS) {
    const msgs = i18n.LOCALES[code].messages;
    for (const it of [...shop.FOODS, ...shop.FURNITURE]) assert.ok(msgs[`shop.item.${it.id}`], `${code} ${it.id}`);
  }
});

test('catching and fighting pay coins, a fresh dex starts at zero', () => {
  const store = freshStore();
  assert.equal(store.load().coins, 0);
  store.applyRun('c', [bug()], null, at(0));
  const r = store.applyRun('c', [], null, at(1000));
  assert.ok(r.coins >= 3, 'a catch pays at least 3 coins');
  const dex = store.load();
  assert.ok(dex.coins >= r.coins);
  const before = dex.coins;
  assert.equal(shop.rewardFight(dex, true, ['q']), shop.COINS.win + shop.COINS.quest);
  assert.equal(shop.rewardFight(dex, false), shop.COINS.loss);
  assert.equal(shop.rewardTower(dex, 4, true), shop.COINS.towerBase + 4 * shop.COINS.towerPerFloor);
  assert.ok(dex.coins > before);
});

test('buying needs coins, food goes to the bag, furniture can only be owned once', () => {
  const dex = shop.ensure({ creatures: {}, stats: {} });
  assert.equal(shop.buy(dex, 'nothing').reason, 'unknown');
  assert.equal(shop.buy(dex, 'snack').reason, 'poor');
  dex.coins = 100;
  assert.ok(shop.buy(dex, 'snack').ok);
  assert.ok(shop.buy(dex, 'snack').ok);
  assert.equal(dex.inventory.snack, 2);
  assert.equal(dex.coins, 90);
  assert.ok(shop.buy(dex, 'cushion').ok);
  assert.equal(shop.buy(dex, 'cushion').reason, 'owned');
  assert.equal(dex.coins, 50);
  assert.equal(dex.stats.spent, 50);
});

test('feeding raises affection: loved food doubles it, furniture adds 10% each, caught monsters only', () => {
  const dex = shop.ensure({ creatures: { m: { id: 'm', captures: 1 }, w: { id: 'w', captures: 0 } }, stats: {} });
  dex.inventory = { snack: 5, cake: 5, cookie: 5, pizza: 5, coffee: 5 };
  assert.equal(shop.feed(dex, 'w', 'snack').reason, 'notCaught');
  assert.equal(shop.feed(dex, 'm', 'bogus').reason, 'unknown');
  const fav = shop.favoriteOf('m');
  const plain = shop.FOODS.find((f) => f.id !== fav);
  const r = shop.feed(dex, 'm', plain.id);
  assert.equal(r.gain, plain.bond);
  assert.equal(r.favorite, false);
  const loved = shop.feed(dex, 'm', fav);
  assert.equal(loved.favorite, true);
  assert.equal(loved.gain, Math.min(shop.food(fav).bond * 2, shop.BOND_MAX - plain.bond));
  const dex2 = shop.ensure({ creatures: { m: { id: 'm', captures: 1 } }, stats: {}, furniture: ['cushion', 'lamp'] });
  dex2.inventory = { [plain.id]: 1 };
  assert.equal(shop.feed(dex2, 'm', plain.id).gain, Math.round(plain.bond * 1.2));
  assert.equal(shop.feed(dex2, 'm', plain.id).reason, 'noFood');
});

test('monsters from before affection keep the form their catches earned', () => {
  const store = freshStore();
  fs.writeFileSync(store.dexPath().file, JSON.stringify({
    creatures: { a: { id: 'a', captures: 1 }, b: { id: 'b', captures: 3 }, c: { id: 'c', captures: 12 }, d: { id: 'd', captures: 5, bond: 7 } },
  }));
  const c = store.load().creatures;
  assert.deepEqual([c.a.bond, c.b.bond, c.c.bond, c.d.bond], [0, 30, 100, 7]);
});

test('bugzoo shop, buy and feed work end to end', () => {
  const store = freshStore();
  store.applyRun('c', [bug()], null, at(0));
  store.applyRun('c', [], null, at(1000));
  const dex = store.load();
  dex.coins = 100;
  store.save(dex);
  const name = Object.values(dex.creatures)[0].name;
  const env = { ...process.env, BUGZOO_HOME: process.env.BUGZOO_HOME, BUGZOO_LANG: 'en', NODE_OPTIONS: '' };
  const run = (...a) => spawnSync(process.execPath, [BIN, ...a], { env, encoding: 'utf8' });
  const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

  assert.match(strip(run('shop').stdout), /Shop - you have 100 coins/);
  assert.equal(run('buy', 'Golden', 'Cake').status, 0);
  assert.match(strip(run('shop').stdout), /in bag: 1/);
  assert.equal(run('buy', 'arcade').status, 1, 'not enough coins left');
  assert.equal(run('feed', name, 'cake').status, 0);
  const after = store.load();
  assert.ok(Object.values(after.creatures)[0].bond >= 100, 'a golden cake is worth 100 affection or more');
  assert.equal(run('feed', name, 'cake').status, 1, 'the bag is empty now');
  assert.ok(after.achievements.shopper && after.achievements.gourmet === undefined);
});
