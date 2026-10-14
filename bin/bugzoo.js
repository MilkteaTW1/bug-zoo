#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { parseErrors, hash } = require('../src/parse');
const { makeCreature } = require('../src/creature');
const { normalizeArgv } = require('../src/key');
const { summarize, cleanName, POINTS } = require('../src/score');
const { analyze, scanProject } = require('../src/scan');
const battle = require('../src/battle');
const hook = require('../src/hook');
const ladder = require('../src/ladder');
const readline = require('node:readline');
const leaderboard = require('../src/leaderboard');
const store = require('../src/store');
const render = require('../src/render');

const HELP = `bugzoo - turn your errors into collectible monsters

Usage:
  bugzoo run <command...>     Run a command. If it fails, a bug appears.
                              Fix it and run the same command again to catch it.
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
`;

const MAX_CAPTURE = 256 * 1024;

function commandKey(argv) {
  return hash([process.cwd(), ...normalizeArgv(argv)].join('\0'));
}

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

function run(argv) {
  if (argv.length === 0) {
    console.error('Usage: bugzoo run <command...>');
    return 2;
  }
  const stdio = ['inherit', 'inherit', 'pipe'];
  // On Windows, npm-style .cmd shims need a shell; pass one pre-quoted string to avoid arg-concat warnings.
  const child = process.platform === 'win32'
    ? spawn(argv.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' '), { stdio, shell: true })
    : spawn(argv[0], argv.slice(1), { stdio });
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
    let creatures = [];
    let ctx = null;
    if (exit !== 0) {
      creatures = parseErrors(captured || signal || '', signal || exit)
        .map((e) => ({ ...makeCreature(e.type, e.message), sample: e.message }));
      try {
        ctx = { ...analyze(process.cwd(), captured), project: path.basename(process.cwd()) };
      } catch {
        ctx = null; // scanning is best-effort; never break the user's command
      }
    }

    const result = store.applyRun(commandKey(argv), creatures, ctx);

    const out = [];
    for (const { entry, isNew } of result.encounters) {
      out.push(render.encounter(entry, isNew, result.powers[entry.id]));
    }
    const banner = render.outcomeBanner(result);
    if (banner) out.push('', banner);
    if (out.length > 0) process.stderr.write(out.join('\n') + '\n\n');
    process.exit(exit);
  });
  return null;
}

function cmdRank() {
  const dex = store.load();
  const s = summarize(dex);
  const c = s.caught;
  console.log(`Title: ${s.title}`);
  console.log(`Score: ${s.score}`);
  console.log(`Caught: ${c.common} common, ${c.uncommon} uncommon, ${c.rare} rare, ${c.legendary} legendary` +
    `  (+${s.repeats} repeat catches, ${s.seen} seen)`);
  console.log(`Battles: ${dex.battles.wins} won, ${dex.battles.losses} lost`);
  console.log(`Points: common ${POINTS.common}, uncommon ${POINTS.uncommon}, rare ${POINTS.rare}, legendary ${POINTS.legendary}; repeats +2`);
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
    console.error('Pick a public player name first: bugzoo share --name <name>');
    return 2;
  }
  dex.profile = { name };
  store.save(dex);
  const payload = sharePayload(dex, name);
  const file = typeof flags.out === 'string' ? flags.out : 'bugzoo-score.json';
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${file} (${name}, score ${payload.score}, team of ${payload.team.length}).`);
  return 0;
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
    console.log(`Ladder updated: ${next.order.length} player(s), ${results.length} challenge(s) processed.`);
    return 0;
  }

  const order = ladder.sync(state.order, players);
  if (order.length === 0) {
    console.log(`No battle-ready players in ${p.scores}. Players need a shared team (bugzoo share).`);
    return 0;
  }
  const dex = store.load();
  console.log(ladder.toText(order, players, { me: dex.profile && dex.profile.name }));
  for (const s of skipped) console.error(`skipped ${s.file}: ${s.reason}`);
  return 0;
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

async function cmdChallenge(args) {
  const { flags, positional } = parseFlags(args);
  const dir = positional[0] || 'leaderboard';
  const p = ladderPaths(dir);
  const dex = store.load();
  const name = cleanName((dex.profile && dex.profile.name) || '');
  if (!name) {
    console.error('Pick a public player name first: bugzoo share --name <name>');
    return 2;
  }
  if (battle.topTeam(dex.trophies).length === 0) {
    console.error('You have no trophies yet. Catch a bug first: fix it, then re-run the same command.');
    return 2;
  }

  // Refresh your own entry so the ladder fights with your current team.
  fs.mkdirSync(p.scores, { recursive: true });
  const mine = path.join(p.scores, `${name}.json`);
  fs.writeFileSync(mine, JSON.stringify(sharePayload(dex, name), null, 2) + '\n');

  const { players } = ladder.loadPlayers(p.scores);
  const order = ladder.sync(loadLadderState(p.state).order, players);
  console.log(ladder.toText(order, players, { me: name }));
  console.log('');

  let target = typeof flags.name === 'string' ? flags.name : null;
  if (!target) {
    let pick = typeof flags.rank === 'string' ? flags.rank : null;
    if (pick === null) pick = await ask(`Challenge which rank? (number, or q to quit) `);
    if (!pick || /^q/i.test(pick)) return 0;
    const n = Number.parseInt(pick, 10);
    if (!Number.isInteger(n) || n < 1 || n > order.length) {
      console.error(`Pick a rank between 1 and ${order.length}.`);
      return 2;
    }
    target = order[n - 1];
  }

  const chk = ladder.checkChallenge(order, name, target);
  if (!chk.ok) {
    console.error(`Cannot challenge: ${chk.reason}.`);
    return 2;
  }

  const me = players.get(name.toLowerCase());
  const foe = players.get(ladder.sync([order[chk.di]], players)[0].toLowerCase());
  const show = (s) => s.team.map((m) => `${m.name} (${m.power})`).join(', ');
  console.log(`\n#${chk.ci + 1} ${me.name}: ${show(me)}`);
  console.log(`#${chk.di + 1} ${foe.name}: ${show(foe)}\n`);

  const result = ladder.fight(players, me.name, foe.name);
  for (const line of result.log) console.log(`  ${line}`);

  if (!result.won) {
    console.log(`\nYou lose. ${foe.name} holds #${chk.di + 1}. The fight is deterministic, so this only changes if a team does - catch stronger bugs and try again.`);
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
  console.log(`\nYou win! You take #${chk.di + 1} from ${foe.name} (you were #${chk.ci + 1}).`);
  console.log(`Wrote ${file}.`);
  console.log(`Commit it with ${mine} and open a pull request; the ladder promotes you when it is merged.`);
  return 0;
}

function cmdLeaderboard(args) {
  const { flags, positional } = parseFlags(args);
  if (positional.length === 0) {
    console.error('Usage: bugzoo leaderboard <dir|file...> [--out file.md]');
    return 2;
  }
  const { entries, skipped } = leaderboard.collect(positional);
  const md = leaderboard.toMarkdown(leaderboard.rank(entries));
  if (typeof flags.out === 'string') {
    fs.writeFileSync(flags.out, md);
    console.log(`Wrote ${flags.out} (${entries.length} valid, ${skipped.length} skipped)`);
  } else {
    console.log(md);
  }
  for (const s of skipped) console.error(`skipped ${s.file}: ${s.reason}`);
  return 0;
}

function cmdBattle(args) {
  const { flags, positional } = parseFlags(args);
  const dex = store.load();
  const mine = battle.topTeam(dex.trophies);
  if (mine.length === 0) {
    console.error('You have no trophies yet. Catch a bug first: fix it, then re-run the same command.');
    return 2;
  }
  const me = { name: (dex.profile && dex.profile.name) || 'You', team: mine };

  let foe;
  if (flags.bot) {
    foe = battle.BOT;
  } else if (positional[0]) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(positional[0], 'utf8'));
    } catch {
      console.error(`Could not read ${positional[0]} as JSON.`);
      return 2;
    }
    const team = battle.validateTeam(raw && raw.team);
    const name = cleanName((raw && raw.name) || '');
    if (!team || !name) {
      console.error('That file has no valid team. The opponent needs to run `bugzoo share` after catching a bug.');
      return 2;
    }
    if (name.toLowerCase() === me.name.toLowerCase()) {
      console.error(`That file is your own team (${name}). Battle someone else, or use --bot.`);
      return 2;
    }
    foe = { name, team };
  } else {
    console.error('Usage: bugzoo battle <opponent.json> | --bot');
    return 2;
  }

  const show = (s) => s.team.map((m) => `${m.name} (${m.power})`).join(', ');
  console.log(`${me.name}: ${show(me)}`);
  console.log(`${foe.name}: ${show(foe)}\n`);
  const result = battle.duel(me, foe);
  for (const line of result.log) console.log(`  ${line}`);

  const won = result.winner === me.name && result.loser !== me.name;
  console.log(`\n${won ? 'You win!' : 'You lose.'} ${result.winner} defeated ${result.loser}.`);
  if (!flags.bot) {
    dex.battles[won ? 'wins' : 'losses'] += 1;
    store.save(dex);
  }
  return 0;
}

function cmdScan() {
  const s = scanProject(process.cwd());
  console.log(`Project: ${path.basename(process.cwd())}`);
  console.log(`Files: ${s.fileCount}${s.truncated ? '+' : ''}   Lines: ${s.loc}`);
  const top = Object.entries(s.importedBy).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length > 0) {
    console.log('Most depended-on modules (a bug here hits harder):');
    for (const [k, n] of top) console.log(`  ${k.padEnd(20)} imported by ${n} file(s)`);
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'run': {
      const rc = run(rest);
      if (rc !== null) process.exit(rc);
      break;
    }
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
      cmdChallenge(rest).then((rc) => process.exit(rc));
      break;
    case 'hook': {
      const snip = hook.snippet(rest[0]);
      if (!snip) {
        console.error('Usage: bugzoo hook <bash|zsh|fish|powershell>');
        process.exit(2);
      }
      console.log(snip);
      break;
    }
    case 'export': {
      const out = rest[0] || 'bugzoo.svg';
      fs.writeFileSync(out, render.exportSvg(store.load()));
      console.log(`Wrote ${out}`);
      break;
    }
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.error(HELP);
      process.exit(2);
  }
}

main();
