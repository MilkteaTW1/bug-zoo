#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { summarize, cleanName, POINTS } = require('../src/score');
const { scanProject } = require('../src/scan');
const battle = require('../src/battle');
const hook = require('../src/hook');
const ladder = require('../src/ladder');
const leaderboard = require('../src/leaderboard');
const store = require('../src/store');
const render = require('../src/render');
const session = require('../src/session');
const autostart = require('../src/autostart');
const i18n = require('../src/i18n');

const { t } = i18n;

const HELP = {
  en: `bugzoo - turn your errors into collectible monsters

Usage:
  bugzoo setup [--lang zh-TW|en] [--name N] [--auto on|off]
                              Language, player name and automatic capture
  bugzoo run <command...>     Run a command. If it fails, a bug appears.
                              (Not needed once automatic capture is on.)
  bugzoo dex                  Your collection and bugs waiting to be caught
  bugzoo team                 Your strongest catches (power per catch)
  bugzoo battle <file.json>   Fight another player's shared team
  bugzoo battle --bot         Practice against the Legacy Codebase
  bugzoo scan                 Scan this project: size and most-depended-on modules
  bugzoo rank                 Show your score and title
  bugzoo share [--name N] [--out file]
                              Write a shareable score + team file (no error text)
  bugzoo leaderboard <dir|file...> [--out file.md]
                              Build a leaderboard from shared score files
  bugzoo ladder [dir]         Show the challenge ladder (default dir: leaderboard)
  bugzoo challenge [dir] [--rank N | --name X]
                              Pick someone above you and fight; a win is recorded as
                              a challenge file, and the ladder promotes you when merged
  bugzoo ladder process [dir] [--out LADDER.md]
                              Apply pending challenges (what CI runs)
  bugzoo hook <bash|zsh|fish|powershell>
                              Print a snippet that wraps common dev commands
  bugzoo export [file]        Export the bestiary as an SVG (default: bugzoo.svg)
  bugzoo help                 Show this help

Capture rules (re-running the same command in the same folder;
flags and numeric arguments are ignored when matching):
  clean run            caught
  same bug             still there
  some bugs gone       those are caught
  a new bug appears    escaped - the new bug becomes your target

Power grows with stack depth, how many files depend on the broken file,
project size and how often the command fails.
`,
  'zh-TW': `bugzoo - 把你的錯誤變成可收集的怪物

用法：
  bugzoo setup [--lang zh-TW|en] [--name 名稱] [--auto on|off]
                              語言、玩家名稱、自動捕捉
  bugzoo run <指令...>        執行指令，失敗時會出現 bug
                              （開啟自動捕捉後就不用打這個）
  bugzoo dex                  你的圖鑑與等著被捕捉的 bug
  bugzoo team                 你最強的捕獲（每隻的戰鬥力）
  bugzoo battle <檔案.json>   挑戰別人分享的隊伍
  bugzoo battle --bot         和 Legacy Codebase 練習
  bugzoo scan                 掃描這個專案：規模與最多檔案依賴的模組
  bugzoo rank                 查看你的分數與稱號
  bugzoo share [--name 名稱] [--out 檔案]
                              輸出可分享的分數與隊伍檔（不含錯誤內容）
  bugzoo leaderboard <資料夾|檔案...> [--out file.md]
                              用分享檔產生排行榜
  bugzoo ladder [資料夾]      查看挑戰天梯（預設資料夾：leaderboard）
  bugzoo challenge [資料夾] [--rank N | --name X]
                              選一個排名在你上面的人對戰；贏了會產生挑戰檔，
                              合併後天梯就會讓你晉升
  bugzoo ladder process [資料夾] [--out LADDER.md]
                              套用待處理的挑戰（CI 會執行）
  bugzoo hook <bash|zsh|fish|powershell>
                              輸出會把常見開發指令包起來的設定片段
  bugzoo export [檔案]        把圖鑑匯出成 SVG（預設 bugzoo.svg）
  bugzoo help                 顯示說明

捕捉規則（在同一個資料夾重跑同一條指令；比對時會忽略旗標與純數字參數）：
  乾淨通過         捕捉成功
  同一個 bug       還在
  部分 bug 消失    消失的那些捕捉成功
  出現新的 bug     逃走了，新的 bug 變成你的目標

戰鬥力取決於堆疊深度、有多少檔案依賴出錯的檔案、專案規模，以及指令失敗的頻率。
`,
};

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

const normalizeLang = (v) => (/^zh/i.test(v) ? 'zh-TW' : /^en/i.test(v) ? 'en' : null);
const yes = (a) => !/^n/i.test(a);

// --- setup: language, player name, automatic capture ------------------------------------------

async function runSetup({ flags = {}, ask: prompt }) {
  const dex = store.load();
  dex.profile = dex.profile || {};

  let lang = typeof flags.lang === 'string' ? normalizeLang(flags.lang) : null;
  let name = typeof flags.name === 'string' ? cleanName(flags.name) : null;
  let auto = flags.auto === 'on' ? true : flags.auto === 'off' ? false : null;

  if (prompt) {
    if (!lang) {
      const a = await ask(t('setup.lang'));
      lang = a === '2' || /^en/i.test(a) ? 'en' : 'zh-TW';
      i18n.setLang(lang);
    }
    if (name === null) name = cleanName(await ask(t('setup.name')));
    if (auto === null) auto = yes(await ask(t('setup.auto')));
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
  }

  const shownLang = i18n.LANG_LABEL[dex.profile.lang || i18n.getLang()];
  console.log(t('setup.status', {
    lang: shownLang,
    name: dex.profile.name || t('setup.noName'),
    auto: t(autostart.status().enabled ? 'common.on' : 'common.off'),
  }));
  return 0;
}

async function cmdSetup(args) {
  const { flags } = parseFlags(args);
  const given = ['lang', 'name', 'auto'].some((k) => flags[k] !== undefined);
  return runSetup({ flags, ask: !given && interactive() });
}

/** First run: pick the language from the environment, then ask the player (when a terminal is attached). */
async function ensureSetup(cmd) {
  const dex = store.load();
  if (dex.profile && dex.profile.lang) {
    i18n.setLang(dex.profile.lang);
    return;
  }
  i18n.setLang(i18n.detectLang());
  const skip = new Set(['setup', 'hook', 'help', '--help', '-h', undefined]);
  if (!skip.has(cmd) && interactive()) await runSetup({ flags: {}, ask: true });
}

// --- commands ----------------------------------------------------------------------------------

function run(argv) {
  if (argv.length === 0) {
    console.error(t('misc.runUsage'));
    return 2;
  }
  const stdio = ['inherit', 'inherit', 'pipe'];
  const env = { ...process.env, BUGZOO_ACTIVE: '1' }; // keeps the Node preload from counting this run twice
  // On Windows, npm-style .cmd shims need a shell; pass one pre-quoted string to avoid arg-concat warnings.
  const child = process.platform === 'win32'
    ? spawn(argv.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' '), { stdio, shell: true, env })
    : spawn(argv[0], argv.slice(1), { stdio, env });
  let captured = '';
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    if (captured.length < MAX_CAPTURE) captured += chunk.toString('utf8');
  });
  child.on('error', (err) => {
    captured += `${err.code || 'Error'}: ${err.message}\n`;
  });
  child.on('close', (code, signal) => {
    const exit = code === null ? (signal ? 128 : 1) : code;
    const text = session.settleRun({ argv, exit, signal, stderr: captured });
    if (text) process.stderr.write(text);
    process.exit(exit);
  });
  return null;
}

function cmdRank() {
  const dex = store.load();
  const s = summarize(dex);
  const c = s.caught;
  console.log(t('rank.title', { title: t(`title.${s.title}`) }));
  console.log(t('rank.score', { score: s.score }));
  console.log(t('rank.caught', { c: c.common, u: c.uncommon, r: c.rare, l: c.legendary, rep: s.repeats, seen: s.seen }));
  console.log(t('rank.battles', { w: dex.battles.wins, l: dex.battles.losses }));
  console.log(t('rank.points', { c: POINTS.common, u: POINTS.uncommon, r: POINTS.rare, l: POINTS.legendary }));
}

function sharePayload(dex, name) {
  const s = summarize(dex);
  return {
    v: 2, name, caught: s.caught, repeats: s.repeats, seen: s.seen, score: s.score,
    team: battle.topTeam(dex.trophies), updated: new Date().toISOString(),
  };
}

function cmdShare(args) {
  const { flags } = parseFlags(args);
  const dex = store.load();
  const name = cleanName(typeof flags.name === 'string' ? flags.name : ((dex.profile && dex.profile.name) || ''));
  if (!name) {
    console.error(t('share.needName'));
    return 2;
  }
  dex.profile = { ...(dex.profile || {}), name };
  store.save(dex);
  const payload = sharePayload(dex, name);
  const file = typeof flags.out === 'string' ? flags.out : 'bugzoo-score.json';
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
  console.log(t('share.wrote', { file, name, score: payload.score, n: payload.team.length }));
  return 0;
}

function cmdLeaderboard(args) {
  const { flags, positional } = parseFlags(args);
  if (positional.length === 0) {
    console.error(t('misc.leaderUsage'));
    return 2;
  }
  const { entries, skipped } = leaderboard.collect(positional);
  const md = leaderboard.toMarkdown(leaderboard.rank(entries));
  if (typeof flags.out === 'string') {
    fs.writeFileSync(flags.out, md);
    console.log(t('misc.leaderWrote', { file: flags.out, valid: entries.length, skipped: skipped.length }));
  } else {
    console.log(md);
  }
  for (const s of skipped) console.error(`skipped ${s.file}: ${s.reason}`);
  return 0;
}

/** English creature name -> what to show, for the player's own team. */
function ownLabeler(dex) {
  const names = new Map(dex.trophies.map((tr) => [tr.name, render.shownName(tr)]));
  return (n) => names.get(n) || n;
}

const showTeam = (s, labelOf) => s.team.map((m) => `${labelOf(m.name)} (${m.power})`).join(', ');

function cmdBattle(args) {
  const { flags, positional } = parseFlags(args);
  const dex = store.load();
  const mine = battle.topTeam(dex.trophies);
  if (mine.length === 0) {
    console.error(t('battle.noTrophy'));
    return 2;
  }
  const me = { name: (dex.profile && dex.profile.name) || t('battle.you'), team: mine };

  let foe;
  if (flags.bot) {
    foe = battle.BOT;
  } else if (positional[0]) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(positional[0], 'utf8'));
    } catch {
      console.error(t('battle.badFile', { file: positional[0] }));
      return 2;
    }
    const team = battle.validateTeam(raw && raw.team);
    const name = cleanName((raw && raw.name) || '');
    if (!team || !name) {
      console.error(t('battle.noTeam'));
      return 2;
    }
    if (name.toLowerCase() === me.name.toLowerCase()) {
      console.error(t('battle.own', { name }));
      return 2;
    }
    foe = { name, team };
  } else {
    console.error(t('battle.usage'));
    return 2;
  }

  const labelOf = ownLabeler(dex);
  console.log(`${me.name}: ${showTeam(me, labelOf)}`);
  console.log(`${foe.name}: ${showTeam(foe, (n) => n)}\n`);
  const result = battle.duel(me, foe);
  for (const ev of result.log) console.log(`  ${render.battleLine(ev, labelOf)}`);

  const won = result.winner === me.name && result.loser !== me.name;
  console.log(`\n${t(won ? 'battle.win' : 'battle.lose', { winner: result.winner, loser: result.loser })}`);
  if (!flags.bot) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    store.save(dex);
  }
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

function ladderPaths(dir) {
  return {
    scores: path.join(dir, 'scores'),
    state: path.join(dir, 'ladder.json'),
    challenges: path.join(dir, 'challenges'),
  };
}

function loadLadderState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { v: 1, order: [], processed: [] };
  }
}

const tagWords = () => ({ you: t('ladder.you'), challengeable: t('ladder.challengeable') });

function cmdLadder(args) {
  const { flags, positional } = parseFlags(args);
  const processing = positional[0] === 'process';
  const dir = (processing ? positional[1] : positional[0]) || 'leaderboard';
  const p = ladderPaths(dir);
  const { players, skipped } = ladder.loadPlayers(p.scores);
  const state = loadLadderState(p.state);

  if (processing) {
    const { state: next, results } = ladder.processChallenges(state, players, ladder.loadChallenges(p.challenges));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p.state, JSON.stringify(next, null, 2) + '\n');
    if (typeof flags.out === 'string') fs.writeFileSync(flags.out, ladder.toMarkdown(next.order, players));
    for (const r of results) {
      const detail = r.outcome === 'rejected' ? r.reason : `${r.challenger} vs ${r.defender} (#${r.from} -> #${r.to})`;
      console.log(`${r.outcome.padEnd(9)} ${r.file}: ${detail}`);
    }
    console.log(t('ladder.processed', { players: next.order.length, n: results.length }));
    return 0;
  }

  const order = ladder.sync(state.order, players);
  if (order.length === 0) {
    console.log(t('ladder.none', { dir: p.scores }));
    return 0;
  }
  const dex = store.load();
  console.log(ladder.toText(order, players, { me: dex.profile && dex.profile.name, tags: tagWords() }));
  for (const s of skipped) console.error(`skipped ${s.file}: ${s.reason}`);
  return 0;
}

async function cmdChallenge(args) {
  const { flags, positional } = parseFlags(args);
  const dir = positional[0] || 'leaderboard';
  const p = ladderPaths(dir);
  const dex = store.load();
  const name = cleanName((dex.profile && dex.profile.name) || '');
  if (!name) {
    console.error(t('share.needName'));
    return 2;
  }
  if (battle.topTeam(dex.trophies).length === 0) {
    console.error(t('battle.noTrophy'));
    return 2;
  }

  // Refresh your own entry so the ladder fights with your current team.
  fs.mkdirSync(p.scores, { recursive: true });
  const mine = path.join(p.scores, `${name}.json`);
  fs.writeFileSync(mine, JSON.stringify(sharePayload(dex, name), null, 2) + '\n');

  const { players } = ladder.loadPlayers(p.scores);
  const order = ladder.sync(loadLadderState(p.state).order, players);
  console.log(ladder.toText(order, players, { me: name, tags: tagWords() }));
  console.log('');

  let target = typeof flags.name === 'string' ? flags.name : null;
  if (!target) {
    let pick = typeof flags.rank === 'string' ? flags.rank : null;
    if (pick === null) pick = await ask(t('ladder.ask'));
    if (!pick || /^q/i.test(pick)) return 0;
    const n = Number.parseInt(pick, 10);
    if (!Number.isInteger(n) || n < 1 || n > order.length) {
      console.error(t('ladder.badRank', { max: order.length }));
      return 2;
    }
    target = order[n - 1];
  }

  const chk = ladder.checkChallenge(order, name, target);
  if (!chk.ok) {
    console.error(t('ladder.cannot', { reason: t(`ladder.err.${chk.code}`, chk.params) }));
    return 2;
  }

  const me = players.get(name.toLowerCase());
  const foe = players.get(order[chk.di].toLowerCase());
  const labelOf = ownLabeler(dex);
  console.log(`\n#${chk.ci + 1} ${me.name}: ${showTeam(me, labelOf)}`);
  console.log(`#${chk.di + 1} ${foe.name}: ${showTeam(foe, (n) => n)}\n`);

  const result = ladder.fight(players, me.name, foe.name);
  for (const ev of result.log) console.log(`  ${render.battleLine(ev, labelOf)}`);

  if (!result.won) {
    console.log(`\n${t('ladder.lose', { name: foe.name, rank: chk.di + 1 })}`);
    dex.battles.losses += 1;
    store.save(dex);
    return 0;
  }

  dex.battles.wins += 1;
  store.save(dex);
  fs.mkdirSync(p.challenges, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  const file = path.join(p.challenges, `${stamp}-${me.name}-vs-${foe.name}.json`);
  fs.writeFileSync(file, JSON.stringify({ v: 1, challenger: me.name, defender: foe.name, at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`\n${t('ladder.win', { name: foe.name, to: chk.di + 1, from: chk.ci + 1 })}`);
  console.log(t('ladder.wrote', { file }));
  console.log(t('ladder.commit', { mine }));
  return 0;
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
    case 'dex':
      console.log(render.dexList(store.load()));
      break;
    case 'team':
      console.log(render.teamList(store.load().trophies));
      break;
    case 'battle':
      process.exit(cmdBattle(rest));
      break;
    case 'scan':
      cmdScan();
      break;
    case 'rank':
      cmdRank();
      break;
    case 'share':
      process.exit(cmdShare(rest));
      break;
    case 'leaderboard':
      process.exit(cmdLeaderboard(rest));
      break;
    case 'ladder':
      process.exit(cmdLadder(rest));
      break;
    case 'challenge':
      process.exit(await cmdChallenge(rest));
      break;
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
      console.log(HELP[i18n.getLang()] || HELP.en);
      break;
    default:
      console.error(`${t('misc.unknown', { cmd })}\n`);
      console.error(HELP[i18n.getLang()] || HELP.en);
      process.exit(2);
  }
}

main();
