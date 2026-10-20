'use strict';

const {
  store, remote, ladder, battle, friends, opponents, accept, achievements, score, creature, i18n,
} = require('./engine');

const { cleanName } = score;
const lower = (s) => String(s).toLowerCase();

let lastList = null; // what the player currently sees: the rows a fight is picked from
let lastSource = null;
let pendingSubmit = null; // { defender } after a win that moves (or joins) the ladder

function setLang(dex) {
  i18n.setLang((dex.profile && dex.profile.lang) || i18n.detectLang());
}

/** A team for the screen: monsters plus the face to draw (own faces come from the trophies). */
function wireTeam(team, dex) {
  const art = new Map(dex.trophies.map((tr) => [tr.name, tr.art]));
  return team.map((m) => ({
    name: m.name, type: m.type, rarity: m.rarity, power: m.power, stage: m.stage || 0,
    art: art.get(m.name) || creature.artFor(`${m.name}:${m.type || ''}`),
  }));
}

function myself(dex) {
  const team = battle.topTeam(dex.trophies, dex.creatures);
  const name = cleanName((dex.profile && dex.profile.name) || '');
  return { name: name || 'You', team, score: score.summarize(dex).score, named: !!name };
}

const ladderLookup = (source) => async (name) => {
  const p = source.players.get(lower(name));
  return p ? { name: p.name, team: p.team } : null;
};

/**
 * Everything the bottom panel shows: the ladder (with who you can challenge), your friends, the practice
 * dummy. Offline gives the saved copy.
 */
async function loadArena() {
  const dex = store.load();
  setLang(dex);
  const me = myself(dex);
  const source = await remote.loadLadder();
  lastSource = source;

  // Keep live friends current (links, files, ladder names); a code stays a fixed snapshot.
  const lookup = ladderLookup(source);
  const refreshed = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f, { lookupLadder: lookup })));
  if (JSON.stringify(refreshed.map((r) => r.friend)) !== JSON.stringify(dex.friends)) {
    const fresh = store.load();
    fresh.friends = refreshed.map((r) => r.friend);
    store.save(fresh);
    dex.friends = fresh.friends;
  }

  const offline = source.source === 'cache' || source.source === 'none';
  if (me.team.length === 0) {
    // No team yet: the ladder is read-only until the first catch.
    lastList = null;
    const order = source.order.length
      ? source.order
      : [...source.players.values()].sort((a, b) => b.score - a.score).map((p) => p.name);
    const rows = order
      .map((n, i) => ({ p: source.players.get(lower(n)), i }))
      .filter((r) => r.p)
      .map(({ p, i }) => ({
        section: 'ladder', rank: i + 1, name: p.name, power: friends.teamPower(p.team), team: wireTeam(p.team, dex),
      }));
    return { rows, me: { name: me.name, named: me.named, canFight: false }, offline };
  }

  lastList = opponents.buildList({ me, source, friends: dex.friends });
  const rows = lastList.rows.map((r) => ({
    section: r.section, rank: r.rank, name: r.name, power: r.power, team: wireTeam(r.team, dex),
    isMe: !!r.isMe, reach: !!r.ranked, kind: r.kind || null,
  }));
  return { rows, me: { name: me.name, named: me.named, canFight: true, rank: lastList.myRank || 0 }, offline };
}

function sharePayload(dex, name) {
  const s = score.summarize(dex);
  return {
    v: 2, name, caught: s.caught, repeats: s.repeats, seen: s.seen, score: s.score,
    team: battle.topTeam(dex.trophies, dex.creatures), updated: new Date().toISOString(),
  };
}

/** Run one fight against a row of the list the player sees. Returns the whole replay, or { error }. */
function fight(section, name) {
  if (!lastList) return { error: 'noTeam' };
  const row = lastList.rows.find((r) => r.section === section && lower(r.name) === lower(name) && !r.isMe);
  if (!row) return { error: 'gone' };

  const dex = store.load();
  setLang(dex);
  const me = myself(dex);
  if (me.team.length === 0) return { error: 'noTeam' };
  const foe = { name: row.name, team: row.team };

  const result = battle.duel(me, foe);
  const won = result.winner === me.name && result.loser !== me.name;
  const practice = row.section === 'practice';

  let earned = [];
  if (!practice) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    earned = achievements.evaluate(dex);
    store.save(dex);
  }

  let outcome = practice ? 'practice' : 'friendly';
  pendingSubmit = null;
  if (row.section === 'ladder') {
    const joining = !lastSource.players.has(lower(me.name));
    const chk = ladder.checkChallenge(lastList.order, me.name, row.name);
    if ((won && chk.ok) || joining) {
      outcome = won && chk.ok ? 'promote' : 'join';
      pendingSubmit = { defender: row.name };
    } else if (won) {
      outcome = 'outOfReach';
    } else {
      outcome = 'lost';
    }
  }

  return {
    me: { name: me.name, team: wireTeam(me.team, dex) },
    foe: { name: foe.name, team: wireTeam(foe.team, dex) },
    log: result.log, winner: result.winner, won, outcome, rank: row.rank || null, reach: ladder.REACH,
    earned: earned.map((id) => ({ name: i18n.t(`ach.${id}.name`), desc: i18n.t(`ach.${id}.desc`) })),
    canSubmit: !!pendingSubmit,
  };
}

/** The pre-filled GitHub issue that asks the ladder to replay this win. Null when nothing is pending. */
function submissionUrl(name) {
  if (!pendingSubmit) return null;
  const dex = store.load();
  const challenger = cleanName(name || (dex.profile && dex.profile.name) || '');
  if (!challenger) return null;
  return accept.issueUrl({
    repo: remote.repoOf(), challenger, defender: pendingSubmit.defender, payload: sharePayload(dex, challenger),
  });
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
    found = await friends.parseFriend(input, { lookupLadder: remote.lookupPlayer });
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

module.exports = { loadArena, fight, submissionUrl, needsName, saveName, addFriend, removeFriend, myCode };
