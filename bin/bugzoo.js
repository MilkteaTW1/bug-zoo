#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { summarize, cleanName, POINTS } = require('../src/score');
const { scanProject } = require('../src/scan');
const battle = require('../src/battle');
const { elementOf } = require('../src/element');
const quests = require('../src/quests');
const tower = require('../src/tower');
const nickLib = require('../src/nick');
const shop = require('../src/shop');
const hook = require('../src/hook');
const store = require('../src/store');
const render = require('../src/render');
const session = require('../src/session');
const { decodeOutput } = require('../src/decode');
const passthrough = require('../src/passthrough');
const creatureArt = require('../src/creature');
const achievements = require('../src/achievements');
const aihook = require('../src/aihook');
const autostart = require('../src/autostart');
const friends = require('../src/friends');
const brag = require('../src/brag');
const opponents = require('../src/opponents');
const i18n = require('../src/i18n');

const { t } = i18n;

const MAX_CAPTURE = 256 * 1024;
const interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

/** Split `--name x --out y rest...` into { flags, positional }. Valueless flags end up as true. */
function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (args[i + 1] !== undefined && !args[i + 1].startsWith('--')) flags[a.slice(2)] = args[++i];
      else flags[a.slice(2)] = true;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const normalizeLang = i18n.parseLang;
const yes = (a) => !/^n/i.test(a);

function openUrl(url) {
  const [cmd, args] = process.platform === 'win32'
    ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* the URL is printed anyway */ }
}

// --- setup: language, player name, automatic capture ------------------------------------------

async function runSetup({ flags = {}, ask: prompt }) {
  const dex = store.load();
  dex.profile = dex.profile || {};

  let lang = typeof flags.lang === 'string' ? normalizeLang(flags.lang) : null;
  let name = typeof flags.name === 'string' ? cleanName(flags.name) : null;
  let auto = flags.auto === 'on' ? true : flags.auto === 'off' ? false : null;

  if (prompt) {
    if (!lang) {
      const a = await ask(i18n.langPrompt());
      lang = normalizeLang(a) || i18n.LANGS[0];
      i18n.setLang(lang);
    }
    if (name === null) name = cleanName(await ask(t('setup.name')));
    // Automatic capture edits the player's environment, so it is opt-in: only an explicit "y" turns it on.
    if (auto === null) auto = /^y/i.test(await ask(t('setup.auto')));
  }

  if (lang) {
    dex.profile.lang = lang;
    i18n.setLang(lang);
  }
  if (name) dex.profile.name = name;
  store.save(dex);

  if (auto !== null) {
    const r = auto ? autostart.enable() : autostart.disable();
    console.log(r.ok ? t(auto ? 'setup.autoOn' : 'setup.autoOff') : t('setup.autoFail', { error: r.error }));
    for (const s of r.steps) console.log(t(`setup.step.${s.code}`, s.params));
    for (const w of r.warnings) console.log(t(`setup.warn.${w.code}`, w.params));
  }

  // AI coding sessions (Claude Code hook). Off unless asked for; `--ai-file` points at another settings file.
  const aiFile = typeof flags['ai-file'] === 'string' ? flags['ai-file'] : undefined;
  if (flags.ai === 'on' || flags.ai === 'off') {
    const r = flags.ai === 'on' ? aihook.enable(aiFile) : aihook.disable(aiFile);
    console.log(r.ok ? t(flags.ai === 'on' ? 'setup.aiOn' : 'setup.aiOff', { file: r.file }) : t('setup.aiFail', { error: r.error }));
  }

  const shownLang = i18n.LANG_LABEL[dex.profile.lang || i18n.getLang()];
  console.log(t('setup.status', {
    lang: shownLang,
    name: dex.profile.name || t('setup.noName'),
    auto: t(autostart.status().enabled ? 'common.on' : 'common.off'),
  }));
  console.log(t('setup.aiStatus', { state: t(aihook.status(aiFile).enabled ? 'common.on' : 'common.off') }));
  return 0;
}

async function cmdSetup(args) {
  const { flags } = parseFlags(args);
  const given = ['lang', 'name', 'auto', 'ai'].some((k) => flags[k] !== undefined);
  return runSetup({ flags, ask: !given && interactive() });
}

/** `bugzoo lang` lists the languages; `bugzoo lang <code|number>` switches. Nothing else is touched. */
async function cmdLang(args) {
  const { positional } = parseFlags(args);
  const dex = store.load();
  dex.profile = dex.profile || {};
  const current = dex.profile.lang || i18n.getLang();
  let pick = positional[0];
  if (pick === undefined) {
    console.log(t('lang.title'));
    i18n.LANGS.forEach((code, i) => console.log(`  ${code === current ? '*' : ' '} ${i + 1}  ${i18n.pad(code, 8)}${i18n.LANG_LABEL[code]}`));
    if (!interactive()) return 0;
    pick = (await ask(t('lang.ask'))).trim();
    if (!pick) return 0;
  }
  const lang = i18n.parseLang(pick);
  if (!lang) {
    console.error(t('lang.bad', { value: pick, list: i18n.LANGS.join(', ') }));
    return 2;
  }
  dex.profile.lang = lang;
  store.save(dex);
  i18n.setLang(lang);
  console.log(t('lang.set', { lang: i18n.LANG_LABEL[lang] }));
  return 0;
}

/** First run: pick the language from the environment, then ask the player (when a terminal is attached). */
async function ensureSetup(cmd) {
  const dex = store.load();
  if (dex.profile && dex.profile.lang) {
    i18n.setLang(dex.profile.lang);
    return;
  }
  i18n.setLang(i18n.detectLang());
  const skip = new Set(['setup', 'lang', 'hook', 'ai-hook', 'help', '--help', '-h', undefined]);
  if (!skip.has(cmd) && interactive()) await runSetup({ flags: {}, ask: true });
}

// --- run ---------------------------------------------------------------------------------------

/** Windows: find an executable the way cmd would (PATH + PATHEXT), so real .exe files need no shell. */
function resolveWindowsExe(name) {
  if (/[\\/]/.test(name) && fs.existsSync(name)) return name;
  const exts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const names = path.extname(name) ? [name] : exts.map((e) => name + e);
  for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const n of names) {
      const f = path.join(dir, n);
      if (fs.existsSync(f)) return f;
    }
  }
  return null;
}

function launch(argv, stdio, env) {
  if (process.platform !== 'win32') return spawn(argv[0], argv.slice(1), { stdio, env });
  const file = resolveWindowsExe(argv[0]);
  if (file && /\.(exe|com)$/i.test(file)) return spawn(file, argv.slice(1), { stdio, env });
  // .cmd/.bat shims (npm, yarn...) need a shell; hand it one pre-quoted string.
  const quote = (a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  return spawn([file || argv[0], ...argv.slice(1)].map(quote).join(' '), { stdio, env, shell: true });
}

function run(argv) {
  if (argv.length === 0) {
    console.error(t('misc.runUsage'));
    return 2;
  }
  // Prompting commands (npm publish, npx, ...) and BUGZOO_DISABLE=1 run completely untouched:
  // capturing would make stdout a pipe and many tools stop asking questions when it is not a TTY.
  if (process.env.BUGZOO_DISABLE || passthrough.needsTerminal(argv)) {
    const raw = launch(argv, ['inherit', 'inherit', 'inherit'], process.env);
    raw.on('error', (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(127);
    });
    raw.on('close', (code, signal) => process.exit(code === null ? (signal ? 128 : 1) : code));
    return null;
  }

  // stdout is piped too: some tools (pytest, build tools) report failures there. Output is passed
  // straight through; the hints below keep colour and unbuffered output as if it were a terminal.
  const stdio = ['inherit', 'pipe', 'pipe'];
  const env = { ...process.env, BUGZOO_ACTIVE: '1' }; // keeps the Node preload from counting this run twice
  if (process.stdout.isTTY) {
    for (const [k, v] of [['FORCE_COLOR', '1'], ['CLICOLOR_FORCE', '1'], ['PY_COLORS', '1']]) {
      if (env[k] === undefined) env[k] = v;
    }
  }
  if (env.PYTHONUNBUFFERED === undefined) env.PYTHONUNBUFFERED = '1';
  const child = launch(argv, stdio, env);
  // Keep raw bytes and decode once at the end, so multi-byte characters split across chunks survive.
  const errBufs = [];
  const outBufs = [];
  let errSize = 0;
  let outSize = 0;
  let spawnError = '';
  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    if (outSize < MAX_CAPTURE) {
      outBufs.push(chunk);
      outSize += chunk.length;
    }
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    if (errSize < MAX_CAPTURE) {
      errBufs.push(chunk);
      errSize += chunk.length;
    }
  });
  child.on('error', (err) => {
    spawnError = `${err.code || 'Error'}: ${err.message}\n`;
  });
  child.on('close', (code, signal) => {
    const exit = code === null ? (signal ? 128 : 1) : code;
    const stderr = decodeOutput(errBufs) + spawnError;
    const text = session.settleRun({ argv, exit, signal, stderr, stdout: decodeOutput(outBufs) });
    if (text) process.stderr.write(text);
    process.exit(exit);
  });
  return null;
}

// --- profile, sharing, scores ------------------------------------------------------------------

function cmdRank() {
  const dex = store.load();
  const s = summarize(dex);
  const c = s.caught;
  console.log(t('rank.title', { title: t(`title.${s.title}`) }));
  console.log(t('rank.score', { score: s.score }));
  console.log(t('rank.caught', { c: c.common, u: c.uncommon, r: c.rare, l: c.legendary, rep: s.repeats, seen: s.seen }));
  console.log(t('rank.battles', { w: dex.battles.wins, l: dex.battles.losses }));
  console.log(t('ach.title', { n: Object.keys(dex.achievements || {}).length, total: achievements.IDS.length }));
  console.log(t('rank.points', { c: POINTS.common, u: POINTS.uncommon, r: POINTS.rare, l: POINTS.legendary }));
}

/** `bugzoo brag [catches|power|tower]`: a short text to paste somewhere when you want to show off. */
function cmdBrag(args) {
  const dex = store.load();
  const kind = args[0] || 'catches';
  if (!brag.KINDS.includes(kind)) {
    console.error(`bugzoo brag [${brag.KINDS.join('|')}]`);
    return 2;
  }
  console.log(brag.text(dex, kind));
  return 0;
}

function cmdScan() {
  const s = scanProject(process.cwd());
  console.log(t('scan.project', { name: path.basename(process.cwd()) }));
  console.log(t('scan.files', { files: `${s.fileCount}${s.truncated ? '+' : ''}`, loc: s.loc }));
  const top = Object.entries(s.importedBy).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length > 0) {
    console.log(t('scan.top'));
    for (const [k, n] of top) console.log(`  ${t('scan.row', { name: i18n.pad(k, 20), n })}`);
  }
}

// --- battle, friends -------------------------------------------------------------------

/** English creature name -> what to show, for the player's own team. */
function ownLabeler(dex) {
  const names = new Map(dex.trophies.map((tr) => [tr.name, render.shownName(tr)]));
  return (n) => names.get(n) || n;
}

const showTeam = (s, labelOf) => s.team.map((m) => `${labelOf(m.name)} [${t(`element.${elementOf(m.type)}`)}] (${m.power})`).join(', ');

/** The monsters that fight for the player: the ones they picked with `bugzoo team set`, else the strongest. */
const myTeam = (dex) => battle.topTeam(dex.trophies, dex.creatures, battle.TEAM_SIZE, dex.team);

function listWords() {
  return {
    friends: t('battle.secFriends'),
    practice: t('battle.secPractice'),
    you: t('battle.tagYou'),
    kind: (k) => t(`friend.kind.${k}`),
    pad: i18n.pad,
    power: (p) => t('battle.rowPower', { p: String(p).padStart(4) }),
  };
}

/** `bugzoo nick <monster> [nickname]` gives a caught monster a nickname (no nickname clears it). */
function cmdNick(args) {
  const dex = store.load();
  const [who, ...rest] = args;
  if (!who) {
    console.log(t('nick.usage'));
    return 1;
  }
  const want = who.toLowerCase();
  const mine = Object.values(dex.creatures).filter((c) => c.captures > 0);
  const hit = mine.find((c) => [c.nick, c.name, render.shownName(c)].some((n) => n && n.toLowerCase() === want));
  if (!hit) {
    console.log(t('nick.unknown', { name: who }));
    return 1;
  }
  const nick = nickLib.clean(rest.join(' '));
  nickLib.set(dex, hit.id, nick);
  store.save(dex);
  console.log(t(nick ? 'nick.set' : 'nick.cleared', { name: hit.name, nick }));
  return 0;
}

/** Find a shop item by id or by its name in the player's language. */
function findItem(word) {
  const w = String(word || '').toLowerCase();
  return [...shop.FOODS, ...shop.FURNITURE].find((i) => i.id === w || render.itemName(i.id).toLowerCase() === w) || null;
}

/** A trailing count (`3`, `x3`, `max`) on `buy` / `feed`; the rest is the name. */
function splitCount(words) {
  const last = words[words.length - 1];
  if (words.length > 1 && /^(x?\d+|max|all)$/i.test(last)) return { words: words.slice(0, -1), count: shop.parseCount(last) };
  return { words, count: 1 };
}

/** `bugzoo buy <item> [count|max]` spends coins on a food (kept in the bag) or a piece of furniture. */
function cmdBuy(args) {
  const dex = store.load();
  const { words, count } = splitCount(args);
  const it = findItem(words.join(' '));
  if (!it) {
    console.log(t('shop.unknown'));
    return 1;
  }
  const r = shop.buyMany(dex, it.id, count);
  if (!r.ok) {
    console.log(t(r.reason === 'poor' ? 'shop.poor' : 'shop.ownedAlready', { name: render.itemName(it.id), price: it.price, coins: dex.coins }));
    return 1;
  }
  const earned = achievements.evaluate(dex);
  store.save(dex);
  console.log(t(r.count > 1 ? 'shop.boughtMany' : 'shop.bought', { name: render.itemName(it.id), count: r.count, price: r.spent, coins: dex.coins }));
  for (const line of render.achievementLines(earned)) console.log(`\n${line}`);
  return 0;
}

/** `bugzoo feed <monster> <food> [count|max]` gives food from the bag to a caught monster; affection decides its form. */
function cmdFeed(args) {
  const dex = store.load();
  const [who, ...tail] = args;
  const { words: rest, count } = splitCount(tail);
  const it = findItem(rest.join(' '));
  if (!who || !it || !shop.food(it.id)) {
    console.log(t('feed.usage'));
    return 1;
  }
  const want = who.toLowerCase();
  const hit = Object.values(dex.creatures).find((c) => c.captures > 0 &&
    [c.nick, c.name, render.shownName(c)].some((n) => n && n.toLowerCase() === want));
  if (!hit) {
    console.log(t('nick.unknown', { name: who }));
    return 1;
  }
  const r = shop.feedMany(dex, hit.id, it.id, count);
  if (!r.ok) {
    console.log(t(`feed.${r.reason}`, { name: render.shownName(hit), food: render.itemName(it.id) }));
    return 1;
  }
  const earned = achievements.evaluate(dex);
  store.save(dex);
  console.log(t(r.count > 1 ? 'feed.many' : r.favorite ? 'feed.loved' : 'feed.ate', { name: render.shownName(hit), food: render.itemName(it.id), count: r.count, gain: r.gain, bond: r.bond, max: shop.BOND_MAX }));
  if (r.evolved) console.log(render.evolvedLine(hit, r.evolved));
  for (const line of render.achievementLines(earned)) console.log(`\n${line}`);
  return 0;
}

/** `bugzoo tower` shows the next floor and its enemies; `tower fight` takes it on with your current lineup. */
function cmdTower(args) {
  const dex = store.load();
  const total = tower.FLOORS;
  if (dex.tower.cleared >= total) {
    console.log(t('tower.done'));
    return 0;
  }
  const floor = dex.tower.cleared + 1;
  const foe = tower.foeFor(floor);
  const mine = myTeam(dex);
  const labelOf = ownLabeler(dex);
  const showFoe = (m) => t('tower.foe', { name: m.name, element: t(`element.${m.element}`), power: m.power });

  if (args[0] !== 'fight') {
    console.log(t('tower.title', { n: floor, total }));
    for (const m of foe.team) console.log(`  ${showFoe(m)}`);
    console.log(`
${t('tower.progress', { n: dex.tower.cleared, total })}`);
    console.log(t('tower.hint'));
    return 0;
  }
  if (mine.length === 0) {
    console.error(t('battle.noTrophy'));
    return 2;
  }
  const me = { name: t('battle.you'), team: mine };
  console.log(`\n${me.name}: ${showTeam(me, labelOf)}`);
  console.log(`${foe.name}: ${showTeam(foe, (n) => n)}\n`);
  const result = battle.duel(me, foe);
  for (const ev of result.log) console.log(`  ${render.battleLine(ev, labelOf)}`);
  const won = result.winner === me.name;
  console.log(`\n${t(won ? 'tower.win' : 'tower.lose', { n: floor })}`);
  const questsDone = [...quests.note(dex, 'fights'), ...(won ? quests.note(dex, 'wins') : [])];
  if (won) dex.tower.cleared = floor;
  const coins = shop.rewardTower(dex, floor, won, questsDone);
  const earned = achievements.evaluate(dex);
  store.save(dex);
  console.log(`\n${render.coinLine(coins)}`);
  for (const line of render.questLines(questsDone)) console.log(`\n${line}`);
  for (const line of render.achievementLines(earned)) console.log(`\n${line}`);
  return 0;
}

/** `bugzoo team` lists your monsters; `team set 1 4 2` picks who fights; `team auto` goes back to the strongest. */
function cmdTeam(args) {
  const dex = store.load();
  const [sub, ...nums] = args;
  if (sub === 'auto') {
    dex.team = [];
    store.save(dex);
    console.log(t('team.autoOk'));
    return 0;
  }
  if (sub === 'set') {
    const rows = battle.roster(dex.trophies, dex.creatures);
    const picks = nums.map((n) => Number.parseInt(n, 10));
    const ok = picks.length >= 1 && picks.length <= battle.TEAM_SIZE && new Set(picks).size === picks.length &&
      picks.every((n) => Number.isInteger(n) && n >= 1 && n <= rows.length);
    if (!ok) {
      console.error(t('team.setBad'));
      return 2;
    }
    dex.team = picks.map((n) => rows[n - 1].id);
    store.save(dex);
    const names = battle.topTeam(dex.trophies, dex.creatures, battle.TEAM_SIZE, dex.team).map((m) => `${m.name} [${t(`element.${m.element}`)}]`);
    console.log(t('team.setOk', { list: names.join(', ') }));
    return 0;
  }
  console.log(render.teamList(dex.trophies, dex.creatures, dex.team));
  return 0;
}

async function cmdBattle(args) {
  const { flags, positional } = parseFlags(args);
  const dex = store.load();
  const mine = myTeam(dex);
  if (mine.length === 0) {
    console.error(t('battle.noTrophy'));
    return 2;
  }
  const profileName = cleanName((dex.profile && dex.profile.name) || '');
  const me = { name: profileName || t('battle.you'), team: mine, score: summarize(dex).score };
  const labelOf = ownLabeler(dex);

  let foe = null; // { name, team }
  let row = null;

  if (positional[0]) {
    // `bugzoo battle <friend code | url | file | saved friend's name>`: fight directly, no list.
    let found = null;
    const saved = dex.friends.find((f) => f.name.toLowerCase() === positional.join(' ').toLowerCase());
    if (saved) found = { name: saved.name, team: saved.team };
    else found = await friends.parseFriend(positional.join(' ')).catch(() => null);
    if (!found) {
      console.error(t('friend.bad'));
      return 2;
    }
    foe = { name: found.name, team: found.team };
  } else {
    // Keep live friends current (links and files); a code is a fixed snapshot.
    const refreshed = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f)));
    dex.friends = refreshed.map((r) => r.friend);
    store.save(dex);

    const list = opponents.buildList({ me, friends: dex.friends });
    console.log(opponents.render(list, listWords()));
    console.log('');

    let pick = typeof flags.pick === 'string' ? flags.pick : null;
    if (flags.bot) pick = String(list.rows.find((r) => r.section === 'practice').n);
    if (pick === null) pick = await ask(t('battle.ask'));
    if (!pick || /^q/i.test(pick)) return 0;
    row = opponents.pick(list, Number.parseInt(pick, 10));
    if (!row) {
      console.error(t('battle.badPick'));
      return 2;
    }
    foe = { name: row.name, team: row.team };
  }

  console.log(`\n${me.name}: ${showTeam(me, labelOf)}`);
  console.log(`${foe.name}: ${showTeam(foe, (n) => n)}\n`);

  // Somebody at the terminal chooses who fights each round; otherwise (pipes, --auto) the best match-up is picked.
  const steer = interactive() && !flags.auto;
  const match = battle.startMatch(me, foe);
  const mineNames = match.me.team.map((m) => labelOf(m.name));
  while (!match.over) {
    const foeNow = match.foe.team[match.foeIdx];
    let idx;
    if (steer) {
      console.log(t('battle.round', { n: match.round + 1, foe: foeNow.name, element: t(`element.${elementOf(foeNow.type)}`), hp: foeNow.hp, max: foeNow.maxHp }));
      const living = match.me.team.map((m, i) => ({ m, i })).filter((x) => x.m.hp > 0);
      living.forEach(({ m, i }, k) => {
        console.log(`  ${k + 1}. ${mineNames[i]} [${t(`element.${elementOf(m.type)}`)}] ${t('battle.hp', { hp: m.hp, max: m.maxHp })} (${m.power})`);
      });
      const answer = await ask(t('battle.pickFighter'));
      const n = Number.parseInt(answer, 10);
      idx = living[(Number.isFinite(n) ? n : 0) - 1] ? living[n - 1].i : battle.autoPick(match);
    } else {
      idx = battle.autoPick(match);
    }
    for (const ev of battle.playRound(match, idx)) console.log(`  ${render.battleLine(ev, labelOf)}`);
    if (steer) console.log('');
  }
  const result = { winner: match.winner, loser: match.loser, log: match.log };

  const won = result.winner === me.name && result.loser !== me.name;
  console.log(`\n${t(won ? 'battle.win' : 'battle.lose', { winner: result.winner, loser: result.loser })}`);

  const practice = row && row.section === 'practice';
  if (!practice) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    const questsDone = [...quests.note(dex, 'fights'), ...(won ? quests.note(dex, 'wins') : [])];
    const coins = shop.rewardFight(dex, won, questsDone);
    const earned = achievements.evaluate(dex);
    store.save(dex);
    console.log(`\n${render.coinLine(coins)}`);
    for (const line of render.questLines(questsDone)) console.log(`\n${line}`);
    for (const line of render.achievementLines(earned)) console.log(`\n${line}`);
  }

  // A shareable card: --card [file], or offered after the fight when a person is at the terminal.
  let cardFile = typeof flags.card === 'string' ? flags.card : (flags.card ? 'bugzoo-battle.svg' : null);
  if (!cardFile && interactive() && /^y/i.test(await ask(`\n${t('card.ask')}`))) cardFile = 'bugzoo-battle.svg';
  if (cardFile) {
    const mineArt = new Map(dex.trophies.map((tr) => [tr.name, tr.art]));
    const artOf = (n) => mineArt.get(n) || creatureArt.artFor(`${n}:${(foe.team.find((m) => m.name === n) || {}).type || ''}`);
    fs.writeFileSync(cardFile, render.battleCard({
      me, foe, winner: result.winner, hits: result.log.length, labelOf, artOf,
    }));
    console.log(`\n${t('card.saved', { file: cardFile })}`);
  }
  return 0;
}

async function cmdFriend(args) {
  const { flags, positional } = parseFlags(args);
  const sub = positional[0] || 'list';
  const dex = store.load();
  const name = cleanName((dex.profile && dex.profile.name) || '');

  if (sub === 'list') {
    if (dex.friends.length === 0) {
      console.log(t('friend.empty'));
      return 0;
    }
    console.log(t('friend.title'));
    for (const f of dex.friends) {
      console.log(`  ${t('friend.row', { name: i18n.pad(f.name, 16), p: friends.teamPower(f.team), kind: t(`friend.kind.${f.kind}`) })}`);
    }
    return 0;
  }

  if (sub === 'code') {
    const team = myTeam(dex);
    if (team.length === 0) {
      console.error(t('friend.needTeam'));
      return 2;
    }
    if (!name) {
      console.error(t('friend.needName'));
      return 2;
    }
    console.log(t('friend.code'));
    console.log(friends.encodeCode(name, team));
    return 0;
  }

  if (sub === 'add') {
    const input = positional.slice(1).join(' ');
    let found = null;
    try {
      found = await friends.parseFriend(input);
    } catch { /* unreachable link etc. */ }
    if (!found) {
      console.error(t('friend.bad'));
      return 2;
    }
    if (typeof flags.name === 'string' && cleanName(flags.name)) found.name = cleanName(flags.name);
    if (name && found.name.toLowerCase() === name.toLowerCase()) {
      console.error(t('friend.self'));
      return 2;
    }
    const r = friends.upsert(dex.friends, found);
    dex.friends = r.friends;
    const earned = achievements.evaluate(dex);
    store.save(dex);
    console.log(t(r.updated ? 'friend.updated' : 'friend.added', { name: found.name, p: friends.teamPower(found.team) }));
    for (const line of render.achievementLines(earned)) console.log(line);
    return 0;
  }

  if (sub === 'remove') {
    const target = positional.slice(1).join(' ');
    const r = friends.remove(dex.friends, target);
    if (!r.removed) {
      console.error(t('friend.notFound', { name: target }));
      return 2;
    }
    dex.friends = r.friends;
    store.save(dex);
    console.log(t('friend.removed', { name: target }));
    return 0;
  }

  if (sub === 'refresh') {
    const results = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f)));
    dex.friends = results.map((r) => r.friend);
    store.save(dex);
    console.log(t('friend.refreshed', { n: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }));
    return 0;
  }

  console.error(t('friend.usage'));
  return 2;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  await ensureSetup(cmd);
  switch (cmd) {
    case 'run': {
      const rc = run(rest);
      if (rc !== null) process.exit(rc);
      break;
    }
    case 'setup':
      process.exit(await cmdSetup(rest));
      break;
    case 'lang':
      process.exit(await cmdLang(rest));
      break;
    case 'dex':
      console.log(render.dexList(store.load()));
      break;
    case 'team':
      process.exit(cmdTeam(rest));
      break;
    case 'shop':
      console.log(render.shopList(store.load()));
      break;
    case 'buy':
      process.exit(cmdBuy(rest));
      break;
    case 'feed':
      process.exit(cmdFeed(rest));
      break;
    case 'nick':
      process.exit(cmdNick(rest));
      break;
    case 'tower':
      process.exit(cmdTower(rest));
      break;
    case 'quests':
    case 'quest': {
      const dex = store.load();
      if (quests.roll(dex)) store.save(dex);
      console.log(render.questList(dex));
      break;
    }
    case 'achievements':
    case 'badges': {
      const dex = store.load();
      const earned = achievements.evaluate(dex); // catch up on anything earned before this feature existed
      if (earned.length > 0) store.save(dex);
      console.log(render.achievementList(dex.achievements));
      break;
    }
    case 'battle':
    case 'challenge': // the old name; the ladder is now part of `battle`
      process.exit(await cmdBattle(rest));
      break;
    case 'friend':
    case 'friends':
      process.exit(await cmdFriend(rest));
      break;
    case 'scan':
      cmdScan();
      break;
    case 'rank':
      cmdRank();
      break;
    case 'brag':
      process.exit(cmdBrag(rest));
      break;
    case 'ai-hook': {
      // Called by Claude Code after each Bash tool call. Reads the event on stdin, prints a systemMessage.
      // `--home DIR` and `--log FILE` exist so the hook can be tried out without touching your real zoo.
      const hookFlags = parseFlags(rest).flags;
      if (typeof hookFlags.home === 'string') process.env.BUGZOO_HOME = hookFlags.home;
      const logFile = typeof hookFlags.log === 'string' ? hookFlags.log : process.env.BUGZOO_AI_LOG;
      let payload = null;
      try {
        payload = JSON.parse(fs.readFileSync(0, 'utf8'));
      } catch { /* not a hook event */ }
      const { message } = aihook.handle(payload);
      const out = message ? { systemMessage: message } : {};
      if (logFile) {
        try {
          fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), payload, out })}\n`);
        } catch { /* logging is best-effort */ }
      }
      process.stdout.write(JSON.stringify(out));
      break;
    }
    case 'hook': {
      const snip = hook.snippet(rest[0]);
      if (!snip) {
        console.error(t('hook.usage'));
        process.exit(2);
      }
      console.log(snip);
      break;
    }
    case 'export': {
      const out = rest[0] || 'bugzoo.svg';
      fs.writeFileSync(out, render.exportSvg(store.load()));
      console.log(t('misc.wrote', { file: out }));
      break;
    }
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(i18n.help());
      break;
    default:
      console.error(`${t('misc.unknown', { cmd })}\n`);
      console.error(i18n.help());
      process.exit(2);
  }
}

main();
