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
const { decodeOutput } = require('../src/decode');
const passthrough = require('../src/passthrough');
const creatureArt = require('../src/creature');
const achievements = require('../src/achievements');
const aihook = require('../src/aihook');
const autostart = require('../src/autostart');
const friends = require('../src/friends');
const remote = require('../src/remote');
const opponents = require('../src/opponents');
const acceptor = require('../src/accept');
const i18n = require('../src/i18n');

const { t } = i18n;

const HELP = {
  en: `bugzoo - turn your errors into collectible monsters

Usage:
  bugzoo setup [--lang zh-TW|zh-CN|en] [--name N] [--auto on|off] [--ai on|off]
                              Language, player name, automatic capture, and
                              monsters for commands your AI assistant runs
                              (Claude Code)
  bugzoo run <command...>     Run a command. If it fails, a bug appears.
                              (Not needed once automatic capture is on.)
  bugzoo dex                  Your collection and bugs waiting to be caught
  bugzoo team                 Your strongest catches, with their evolution
  bugzoo achievements         Your achievements
  bugzoo battle [--card f.svg]
                              Show the ladder, your friends and a practice
                              opponent; type a number to fight. --card saves a
                              shareable result card
  bugzoo friend               List friends   (also: code | add <code|url|file|name>
                              | remove <name> | refresh)
  bugzoo ladder [dir]         Show the ladder
  bugzoo scan                 Scan this project: size and most-depended-on modules
  bugzoo rank                 Show your score and title
  bugzoo share [--name N] [--out file]
                              Write a shareable score + team file (no error text)
  bugzoo leaderboard <dir|file...> [--out file.md]
                              Build a score leaderboard from shared files
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

Beating someone up to 3 ranks above you on the ladder takes their spot.
`,
  'zh-TW': `bugzoo - 把你的錯誤變成可收集的怪物

用法：
  bugzoo setup [--lang zh-TW|zh-CN|en] [--name 名稱] [--auto on|off] [--ai on|off]
                              語言、玩家名稱、自動捕捉，以及 AI 助手
                              （Claude Code）執行的指令也會出怪物
  bugzoo run <指令...>        執行指令，失敗時會出現 bug
                              （開啟自動捕捉後就不用打這個）
  bugzoo dex                  你的圖鑑與等著被捕捉的 bug
  bugzoo team                 你最強的捕獲與牠們的進化狀況
  bugzoo achievements         你的成就
  bugzoo battle [--card f.svg]
                              列出天梯、好友與練習對手，輸入編號就開打；
                              --card 會存成可分享的戰鬥結果卡
  bugzoo friend               列出好友（也可用：code | add <代碼|網址|檔案|名稱>
                              | remove <名稱> | refresh）
  bugzoo ladder [資料夾]      查看天梯
  bugzoo scan                 掃描這個專案：規模與最多檔案依賴的模組
  bugzoo rank                 查看你的分數與稱號
  bugzoo share [--name 名稱] [--out 檔案]
                              輸出可分享的分數與隊伍檔（不含錯誤內容）
  bugzoo leaderboard <資料夾|檔案...> [--out file.md]
                              用分享檔產生分數排行榜
  bugzoo hook <bash|zsh|fish|powershell>
                              輸出會把常見開發指令包起來的設定片段
  bugzoo export [檔案]        把圖鑑匯出成 SVG（預設 bugzoo.svg）
  bugzoo help                 顯示說明

捕捉規則（在同一個資料夾重跑同一條指令；比對時會忽略旗標與純數字參數）：
  乾淨通過         捕捉成功
  同一個 bug       還在
  部分 bug 消失    消失的那些捕捉成功
  出現新的 bug     逃走了，新的 bug 變成你的目標

在天梯上打贏排名在你上面 3 名以內的人，就能奪下他的名次。
`,
  'zh-CN': `bugzoo - 把你的错误变成可收集的怪物

用法：
  bugzoo setup [--lang zh-TW|zh-CN|en] [--name 名字] [--auto on|off] [--ai on|off]
                              语言、玩家名、自动捕获，以及 AI 助手
                              （Claude Code）执行的命令也会出怪物
  bugzoo run <命令...>        执行命令，失败时会出现 bug
                              （开启自动捕获后就不用打这个）
  bugzoo dex                  你的图鉴与等着被捕获的 bug
  bugzoo team                 你最强的捕获与它们的进化状况
  bugzoo achievements         你的成就
  bugzoo battle [--card f.svg]
                              列出天梯、好友与练习对手，输入编号就开打；
                              --card 会存成可分享的战斗结果卡
  bugzoo friend               列出好友（也可用：code | add <代码|网址|文件|名字>
                              | remove <名字> | refresh）
  bugzoo ladder [文件夹]      查看天梯
  bugzoo scan                 扫描这个项目：规模与被最多文件依赖的模块
  bugzoo rank                 查看你的分数与称号
  bugzoo share [--name 名字] [--out 文件]
                              输出可分享的分数与队伍文件（不含错误内容）
  bugzoo leaderboard <文件夹|文件...> [--out file.md]
                              用分享文件生成分数排行榜
  bugzoo hook <bash|zsh|fish|powershell>
                              输出会把常见开发命令包起来的配置片段
  bugzoo export [文件]        把图鉴导出成 SVG（默认 bugzoo.svg）
  bugzoo help                 显示帮助

捕获规则（在同一个文件夹重跑同一条命令；比对时会忽略旗标与纯数字参数）：
  干净通过         捕获成功
  同一个 bug       还在
  部分 bug 消失    消失的那些捕获成功
  出现新的 bug     逃走了，新的 bug 变成你的目标

在天梯上打赢排名在你上面 3 名以内的人，就能夺下他的名次。
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

const normalizeLang = (v) => {
  const s = String(v || '').trim().toLowerCase().replace(/_/g, '-');
  if (!s) return null;
  // The picker offers the languages in LANGS order as 1..n.
  if (/^\d+$/.test(s)) return i18n.LANGS[Number(s) - 1] || null;
  if (i18n.LANGS.includes(s)) return s;
  if (/^zh-(?:tw|hant)\b/.test(s)) return 'zh-TW';
  if (/^zh\b/.test(s)) return 'zh-CN';
  if (/^en\b/.test(s)) return 'en';
  return null;
};
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
      const a = await ask(t('setup.lang'));
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

/** First run: pick the language from the environment, then ask the player (when a terminal is attached). */
async function ensureSetup(cmd) {
  const dex = store.load();
  if (dex.profile && dex.profile.lang) {
    i18n.setLang(dex.profile.lang);
    return;
  }
  i18n.setLang(i18n.detectLang());
  const skip = new Set(['setup', 'hook', 'ai-hook', 'help', '--help', '-h', undefined, 'ladder']);
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

function sharePayload(dex, name) {
  const s = summarize(dex);
  return {
    v: 2, name, caught: s.caught, repeats: s.repeats, seen: s.seen, score: s.score,
    team: battle.topTeam(dex.trophies, dex.creatures), updated: new Date().toISOString(),
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

// --- ladder, battle, friends -------------------------------------------------------------------

/** English creature name -> what to show, for the player's own team. */
function ownLabeler(dex) {
  const names = new Map(dex.trophies.map((tr) => [tr.name, render.shownName(tr)]));
  return (n) => names.get(n) || n;
}

const showTeam = (s, labelOf) => s.team.map((m) => `${labelOf(m.name)} (${m.power})`).join(', ');

function listWords() {
  return {
    ladder: t('battle.secLadder'),
    friends: t('battle.secFriends'),
    practice: t('battle.secPractice'),
    you: t('battle.tagYou'),
    ranked: t('battle.tagRanked'),
    kind: (k) => t(`friend.kind.${k}`),
    pad: i18n.pad,
    power: (p) => t('battle.rowPower', { p: String(p).padStart(4) }),
  };
}

function ladderNotice(source) {
  if (!source.note) return;
  const { code, reason, when } = source.note;
  if (code === 'cached') console.error(t('battle.cachedLadder', { reason, when }));
  else if (source.source === 'none') console.error(t('battle.noLadder', { reason }));
}

const ladderLookup = (source) => async (name) => {
  const p = source.players.get(String(name).toLowerCase());
  return p ? { name: p.name, team: p.team } : null;
};

function cmdLadder(args) {
  const { flags, positional } = parseFlags(args);
  const sub = positional[0];

  if (sub === 'process' || sub === 'accept') {
    const dir = (sub === 'process' ? positional[1] : positional[1]) || 'leaderboard';
    if (sub === 'accept') {
      const bodyFile = flags['body-file'];
      if (typeof bodyFile !== 'string') {
        console.error('Usage: bugzoo ladder accept [dir] --body-file <file> --actor <github-login>');
        return 2;
      }
      const r = acceptor.accept({
        body: fs.readFileSync(bodyFile, 'utf8'),
        actor: typeof flags.actor === 'string' ? flags.actor : '',
        dir,
      });
      console.log(r.message);
      return r.ok ? 0 : 1;
    }

    const p = { scores: path.join(dir, 'scores'), state: path.join(dir, 'ladder.json'), challenges: path.join(dir, 'challenges') };
    let state = { v: 1, order: [], processed: [] };
    try {
      state = JSON.parse(fs.readFileSync(p.state, 'utf8'));
    } catch { /* first run */ }
    const { players } = ladder.loadPlayers(p.scores);
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

  return null; // handled asynchronously by showLadder
}

async function showLadder(args) {
  const { positional } = parseFlags(args);
  const source = await remote.loadLadder({ dir: positional[0] });
  ladderNotice(source);
  const order = ladder.sync(source.order, source.players);
  if (order.length === 0) {
    console.log(t('ladder.none', { dir: positional[0] || remote.repoOf() }));
    return 0;
  }
  const dex = store.load();
  console.log(ladder.toText(order, source.players, { me: dex.profile && dex.profile.name, tags: { you: t('ladder.you'), challengeable: t('ladder.challengeable') } }));
  return 0;
}

async function cmdBattle(args) {
  const { flags, positional } = parseFlags(args);
  const dex = store.load();
  const mine = battle.topTeam(dex.trophies, dex.creatures);
  if (mine.length === 0) {
    console.error(t('battle.noTrophy'));
    return 2;
  }
  const profileName = cleanName((dex.profile && dex.profile.name) || '');
  const me = { name: profileName || t('battle.you'), team: mine, score: summarize(dex).score };
  const labelOf = ownLabeler(dex);

  let foe = null; // { name, team }
  let row = null;
  let list = null;
  let joining = false; // not on the ladder yet: any ladder fight submits and joins at the bottom

  if (positional[0]) {
    // `bugzoo battle <friend code | url | file | player name>`: fight directly, no list.
    const found = await friends.parseFriend(positional[0], { lookupLadder: remote.lookupPlayer }).catch(() => null);
    if (!found) {
      console.error(t('friend.bad'));
      return 2;
    }
    foe = { name: found.name, team: found.team };
  } else {
    const source = await remote.loadLadder({ dir: typeof flags.dir === 'string' ? flags.dir : undefined });
    ladderNotice(source);

    // Keep live friends current (links, files, ladder names); a code is a fixed snapshot.
    const lookup = ladderLookup(source);
    const refreshed = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f, { lookupLadder: lookup })));
    dex.friends = refreshed.map((r) => r.friend);
    store.save(dex);

    list = opponents.buildList({ me, source, friends: dex.friends });
    joining = !source.players.has(me.name.toLowerCase());
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
  const result = battle.duel(me, foe);
  for (const ev of result.log) console.log(`  ${render.battleLine(ev, labelOf)}`);

  const won = result.winner === me.name && result.loser !== me.name;
  console.log(`\n${t(won ? 'battle.win' : 'battle.lose', { winner: result.winner, loser: result.loser })}`);

  const practice = row && row.section === 'practice';
  if (!practice) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    const earned = achievements.evaluate(dex);
    store.save(dex);
    for (const line of render.achievementLines(earned)) console.log(`\n${line}`);
  }

  // Only a win over someone up to 3 ranks above you moves the ladder.
  if (row && row.section === 'ladder') {
    const chk = ladder.checkChallenge(list.order, me.name, row.name);
    if ((won && chk.ok) || joining) {
      console.log(`\n${won && chk.ok ? t('battle.promote', { rank: row.rank, name: row.name }) : t('battle.join')}`);
      if (!profileName) {
        console.log(t('battle.needName'));
      } else {
        const url = acceptor.issueUrl({
          repo: remote.repoOf(), challenger: profileName, defender: row.name, payload: sharePayload(dex, profileName),
        });
        console.log(url);
        console.log(t('battle.submitNote'));
        if (interactive() && yes(await ask(t('battle.openAsk')))) {
          openUrl(url);
          console.log(t('battle.opened'));
        }
      }
    } else if (won && !chk.ok) {
      console.log(`\n${t('battle.outOfReach', { reach: ladder.REACH })}`);
    }
  } else if (!practice) {
    console.log(`\n${t('battle.friendly')}`);
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
    const team = battle.topTeam(dex.trophies, dex.creatures);
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
      found = await friends.parseFriend(input, { lookupLadder: remote.lookupPlayer });
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
    const source = await remote.loadLadder({});
    const lookup = ladderLookup(source);
    const results = await Promise.all(dex.friends.map((f) => friends.refreshFriend(f, { lookupLadder: lookup })));
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
    case 'dex':
      console.log(render.dexList(store.load()));
      break;
    case 'team': {
      const dex = store.load();
      console.log(render.teamList(dex.trophies, dex.creatures));
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
    case 'share':
      process.exit(cmdShare(rest));
      break;
    case 'leaderboard':
      process.exit(cmdLeaderboard(rest));
      break;
    case 'ladder': {
      const rc = cmdLadder(rest);
      process.exit(rc === null ? await showLadder(rest) : rc);
      break;
    }
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
      console.log(HELP[i18n.getLang()] || HELP.en);
      break;
    default:
      console.error(`${t('misc.unknown', { cmd })}\n`);
      console.error(HELP[i18n.getLang()] || HELP.en);
      process.exit(2);
  }
}

main();
