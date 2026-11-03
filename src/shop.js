'use strict';

const { hash } = require('./parse');
const { stageOf } = require('./power');

/**
 * The shop. Coins come from playing (catches, fights, quests); food and furniture turn them into affection,
 * and affection is what makes a monster evolve (see EVOLUTION in power.js). Nothing here touches the ladder:
 * a monster's form is its affection, so it still takes real play to get a strong team.
 */
const BOND_MAX = 200;

const FOODS = [
  { id: 'snack', price: 5, bond: 4 },
  { id: 'cookie', price: 12, bond: 10 },
  { id: 'pizza', price: 25, bond: 24 },
  { id: 'coffee', price: 40, bond: 40 },
  { id: 'cake', price: 90, bond: 100 },
];

const FURNITURE = [
  { id: 'cushion', price: 40, icon: '🧸' },
  { id: 'lamp', price: 60, icon: '💡' },
  { id: 'plant', price: 80, icon: '🪴' },
  { id: 'books', price: 120, icon: '📚' },
  { id: 'aquarium', price: 200, icon: '🐠' },
  { id: 'arcade', price: 300, icon: '🕹️' },
];

// How much coin each thing is worth.
const COINS = { win: 10, loss: 3, quest: 15, shiny: 5, gift: 10, towerBase: 10, towerPerFloor: 5 };
const forCatch = (power) => Math.max(3, Math.round((power || 0) / 5));

const food = (id) => FOODS.find((f) => f.id === id) || null;
const furniture = (id) => FURNITURE.find((f) => f.id === id) || null;
const item = (id) => food(id) || furniture(id);

function ensure(dex) {
  dex.coins = Number.isFinite(dex.coins) ? dex.coins : 0;
  dex.inventory = dex.inventory || {};
  dex.furniture = Array.isArray(dex.furniture) ? dex.furniture : [];
  dex.stats = dex.stats || {};
  return dex;
}

function earn(dex, amount) {
  const n = Math.max(0, Math.round(amount) || 0);
  ensure(dex);
  dex.coins += n;
  dex.stats.coinsEarned = (dex.stats.coinsEarned || 0) + n;
  return n;
}

/** Every food is liked, but each monster has one it loves (twice the affection). Stable per monster. */
const favoriteOf = (id) => FOODS[parseInt(hash(`fav:${id}`).slice(0, 4), 16) % FOODS.length].id;

/** Each piece of furniture makes every treat 10% sweeter. */
const comfort = (dex) => 1 + 0.1 * ensure(dex).furniture.length;

/** Buy one food (kept in the bag until fed) or one piece of furniture (once). */
function buy(dex, id) {
  ensure(dex);
  const it = item(id);
  if (!it) return { ok: false, reason: 'unknown' };
  const isFurniture = !!furniture(id);
  if (isFurniture && dex.furniture.includes(id)) return { ok: false, reason: 'owned', item: it };
  if (dex.coins < it.price) return { ok: false, reason: 'poor', item: it };
  dex.coins -= it.price;
  dex.stats.spent = (dex.stats.spent || 0) + it.price;
  if (isFurniture) dex.furniture.push(id);
  else dex.inventory[id] = (dex.inventory[id] || 0) + 1;
  return { ok: true, item: it };
}

/** Feed one food from the bag to a caught monster. Returns the gain and whether it grew into a new form. */
function feed(dex, creatureId, foodId) {
  ensure(dex);
  const c = dex.creatures[creatureId];
  const f = food(foodId);
  if (!f) return { ok: false, reason: 'unknown' };
  if (!c || !(c.captures > 0)) return { ok: false, reason: 'notCaught' };
  if (!(dex.inventory[foodId] > 0)) return { ok: false, reason: 'noFood' };
  const from = c.bond || 0;
  if (from >= BOND_MAX) return { ok: false, reason: 'max' };
  const favorite = favoriteOf(c.id) === foodId;
  const gain = Math.round(f.bond * comfort(dex) * (favorite ? 2 : 1));
  c.bond = Math.min(BOND_MAX, from + gain);
  dex.inventory[foodId] -= 1;
  if (dex.inventory[foodId] === 0) delete dex.inventory[foodId];
  dex.stats.fed = (dex.stats.fed || 0) + 1;
  const before = stageOf(from);
  const after = stageOf(c.bond);
  return { ok: true, creature: c, gain: c.bond - from, from, bond: c.bond, favorite, evolved: after > before ? after : 0 };
}

/** Coins for one fight (a practice dummy pays nothing: the caller just does not call this). */
const rewardFight = (dex, won, questsDone = []) =>
  earn(dex, (won ? COINS.win : COINS.loss) + questsDone.length * COINS.quest);

/** Coins for one tower attempt: a cleared floor pays more the higher it is. */
const rewardTower = (dex, floor, won, questsDone = []) =>
  earn(dex, (won ? COINS.towerBase + floor * COINS.towerPerFloor : COINS.loss) + questsDone.length * COINS.quest);

/** Hearts shown next to a monster: one per 20 affection, up to ten. */
const hearts = (bond) => Math.min(10, Math.floor((bond || 0) / 20));

module.exports = {
  BOND_MAX, FOODS, FURNITURE, COINS, forCatch, food, furniture, item, ensure, earn, favoriteOf, comfort, buy, feed, hearts, rewardFight, rewardTower,
};
