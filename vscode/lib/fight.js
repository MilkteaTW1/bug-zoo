'use strict';

const {
  store, battle, friends, opponents, achievements, score, creature, i18n, quests, tower, shop, power,
} = require('./engine');

const { cleanName } = score;
const lower = (s) => String(s).toLowerCase();

let lastList = null; // what the player currently sees: the rows a fight is picked from
let current = null; // the match being steered: { match, row, me, foe }

function setLang(dex) {
  i18n.setLang((dex.profile && dex.profile.lang) || i18n.detectLang());
}

/** A team for the screen: monsters plus the face to draw (own faces come from the trophies). */
function wireTeam(team, dex) {
  const art = new Map(dex.trophies.map((tr) => [tr.name, tr.art]));
  return team.map((m) => ({
    name: m.name, type: m.type, rarity: m.rarity, power: m.power, stage: m.stage || 0, element: m.element,
    art: art.get(m.name) || creature.artFor(`${m.name}:${m.type || ''}`),
  }));
}

function myself(dex) {
  const team = battle.topTeam(dex.trophies, dex.creatures, battle.TEAM_SIZE, dex.team);
  const name = cleanName((dex.profile && dex.profile.name) || '');
  return { name: name || 'You', team, score: score.summarize(dex).score, named: !!name };
}

/** Everything the bottom panel shows: your friends and the practice dummy. */
async function loadArena() {
  const dex = store.load();
  setLang(dex);
  const me = myself(dex);

  // Keep live friends current (links and files); a code stays a fixed snapshot.
  const refreshed = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f)));
  if (JSON.stringify(refreshed.map((r) => r.friend)) !== JSON.stringify(dex.friends)) {
    const fresh = store.load();
    fresh.friends = refreshed.map((r) => r.friend);
    store.save(fresh);
    dex.friends = fresh.friends;
  }

  if (me.team.length === 0) {
    lastList = null;
    return { rows: [], me: { name: me.name, named: me.named, canFight: false }, offline: false };
  }
  lastList = opponents.buildList({ me, friends: dex.friends });
  const rows = lastList.rows.map((r) => ({
    section: r.section, name: r.name, power: r.power, team: wireTeam(r.team, dex), kind: r.kind || null,
  }));
  return { rows, me: { name: me.name, named: me.named, canFight: true }, offline: false };
}

const earnedOf = (ids) => ids.map((id) => ({ name: i18n.t(`ach.${id}.name`), desc: i18n.t(`ach.${id}.desc`) }));

/**
 * Start a fight against a row of the list the player sees. The player then picks who answers each round
 * (see pick()); the foe's first fighter is already chosen. Returns the opening state, or { error }.
 */
function fight(section, name) {
  if (!lastList) return { error: 'noTeam' };
  const row = lastList.rows.find((r) => r.section === section && lower(r.name) === lower(name));
  if (!row) return { error: 'gone' };

  const dex = store.load();
  setLang(dex);
  const me = myself(dex);
  if (me.team.length === 0) return { error: 'noTeam' };
  const foe = { name: row.name, team: row.team };
  const match = battle.startMatch(me, foe);
  current = { match, row, me };
  return {
    interactive: true,
    me: { name: me.name, team: wireTeam(me.team, dex) },
    foe: { name: foe.name, team: wireTeam(foe.team, dex) },
    foeIdx: match.foeIdx, round: 0, outcome: row.section === 'practice' ? 'practice' : 'friendly',
  };
}

/** One round of the fight in progress, with the monster the player picked. Returns the events and what is next. */
function pick(index) {
  if (!current || current.match.over) return { error: 'gone' };
  const { match, row, me } = current;
  let events;
  try {
    events = battle.playRound(match, Number(index));
  } catch {
    return { error: 'badPick' };
  }
  if (!match.over) return { events, foeIdx: match.foeIdx, round: match.round, over: false };

  const dex = store.load();
  setLang(dex);
  const won = match.winner === me.name && match.loser !== me.name;
  const practice = row.section === 'practice';
  let earned = [];
  let questsDone = [];
  let coins = 0;
  if (!practice) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    questsDone = [...quests.note(dex, 'fights'), ...(won ? quests.note(dex, 'wins') : [])];
    coins = shop.rewardFight(dex, won, questsDone);
    earned = achievements.evaluate(dex);
    store.save(dex);
  }
  current = null;
  return {
    events, over: true,
    result: { won, outcome: practice ? 'practice' : 'friendly', earned: earnedOf(earned), quests: questsDone.map(questName), coins },
  };
}

const questName = (id) => {
  const q = quests.POOL.find((x) => x.id === id);
  return q ? i18n.t(`quest.${q.metric}`, { n: q.goal }) : id;
};

/** Take on the next tower floor with the current lineup. Returns the same replay shape as fight(). */
function towerFight() {
  const dex = store.load();
  setLang(dex);
  if (dex.tower.cleared >= tower.FLOORS) return { error: 'towerDone' };
  const me = myself(dex);
  if (me.team.length === 0) return { error: 'noTeam' };
  const floor = dex.tower.cleared + 1;
  const foe = tower.foeFor(floor);
  const result = battle.autoMatch({ name: me.name, team: me.team }, foe);
  const won = result.winner === me.name && result.loser !== me.name;
  const questsDone = [...quests.note(dex, 'fights'), ...(won ? quests.note(dex, 'wins') : [])];
  if (won) dex.tower.cleared = floor;
  const coins = shop.rewardTower(dex, floor, won, questsDone);
  const earned = achievements.evaluate(dex);
  store.save(dex);
  return {
    me: { name: me.name, team: wireTeam(me.team, dex) },
    foe: { name: foe.name, team: wireTeam(foe.team, dex) },
    log: result.log, winner: result.winner, won, outcome: won ? 'towerWin' : 'towerLose', floor,
    earned: earnedOf(earned),
    quests: questsDone.map(questName), coins,
  };
}

/** Buy a food or a piece of furniture. Returns { ok, reason?, name, price }. */
function buy(id, count = 1) {
  const dex = store.load();
  setLang(dex);
  const r = shop.buyMany(dex, id, shop.parseCount(count));
  const name = r.item ? i18n.t(`shop.item.${r.item.id}`) : id;
  if (r.ok) {
    achievements.evaluate(dex);
    store.save(dex);
  }
  return { ok: r.ok, reason: r.reason, name, count: r.count || 0, price: r.ok ? r.spent : (r.item ? r.item.price : 0), coins: dex.coins };
}

/** The caught monsters a treat can be given to, fondest first, for the picker. */
function feedTargets() {
  const dex = store.load();
  setLang(dex);
  return Object.values(dex.creatures).filter((c) => c.captures > 0)
    .sort((a, b) => (b.bond || 0) - (a.bond || 0))
    .map((c) => ({ id: c.id, name: c.nick || creature.localName(c.id, i18n.getLang()) || c.name, bond: c.bond || 0, max: shop.BOND_MAX }));
}

/** Give a food from the bag to a monster. Returns the outcome for a toast. */
function feed(creatureId, foodId, count = 1) {
  const dex = store.load();
  setLang(dex);
  const r = shop.feedMany(dex, creatureId, foodId, shop.parseCount(count));
  const c = dex.creatures[creatureId];
  const name = c ? (c.nick || creature.localName(c.id, i18n.getLang()) || c.name) : '';
  if (!r.ok) return { ok: false, reason: r.reason, name, food: i18n.t(`shop.item.${foodId}`) };
  achievements.evaluate(dex);
  store.save(dex);
  return {
    ok: true, name, food: i18n.t(`shop.item.${foodId}`), count: r.count, gain: r.gain, bond: r.bond, max: shop.BOND_MAX,
    favorite: r.favorite, evolved: r.evolved, mult: r.evolved ? power.evolutionMult(r.evolved) : 0,
    stage: r.evolved ? i18n.t(`evo.stage${r.evolved}`) : '',
  };
}

/** The monsters the player picked to fight, in order (empty goes back to the strongest). */
function setTeam(ids) {
  const dex = store.load();
  const known = new Set(battle.roster(dex.trophies, dex.creatures).map((r) => r.id));
  dex.team = (Array.isArray(ids) ? ids : []).filter((id, i, a) => known.has(id) && a.indexOf(id) === i).slice(0, battle.TEAM_SIZE);
  store.save(dex);
}

function needsName() {
  const dex = store.load();
  return !cleanName((dex.profile && dex.profile.name) || '');
}

function saveName(name) {
  const clean = cleanName(name);
  if (!clean) return false;
  const dex = store.load();
  dex.profile = { ...(dex.profile || {}), name: clean };
  store.save(dex);
  return true;
}

async function addFriend(input) {
  const dex = store.load();
  let found = null;
  try {
    found = await friends.parseFriend(input);
  } catch { /* unreachable link */ }
  if (!found) return { ok: false, reason: 'bad' };
  const mine = cleanName((dex.profile && dex.profile.name) || '');
  if (mine && lower(found.name) === lower(mine)) return { ok: false, reason: 'self' };
  const r = friends.upsert(dex.friends, found);
  dex.friends = r.friends;
  achievements.evaluate(dex);
  store.save(dex);
  return { ok: true, name: found.name, updated: r.updated };
}

function removeFriend(name) {
  const dex = store.load();
  const r = friends.remove(dex.friends, name);
  dex.friends = r.friends;
  store.save(dex);
  return r.removed;
}

/** A BZ1 code others can paste into `friend add`; null until there is a name and a team. */
function myCode() {
  const dex = store.load();
  const me = myself(dex);
  if (!me.named || me.team.length === 0) return null;
  return friends.encodeCode(me.name, me.team);
}

function brag(kind) {
  const dex = store.load();
  setLang(dex);
  return require('./engine').brag.text(dex, kind);
}

module.exports = { brag, loadArena, fight, towerFight, setTeam, questName, buy, feed, feedTargets, pick, needsName, saveName, addFriend, removeFriend, myCode };
