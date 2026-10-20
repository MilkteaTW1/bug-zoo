'use strict';

// Language file. To add a language, run `npm run lang -- <code> <label>` and translate `messages` and `help`.
module.exports = {
  code: 'en',
  label: 'English',
  // Locale prefixes that select this language (the longest match wins), e.g. LANG=zh_TW.UTF-8 -> 'zh-tw'.
  order: 3, // position in the language picker (omit to go after the built-in ones)
  detect: ['en'],
  // Monster names are prefix + suffix, picked from the error's hash. The two lists may have any length.
  names: {
    prefix: ['Grim', 'Fluff', 'Snark', 'Wobble', 'Gloom', 'Zap', 'Murk', 'Pip', 'Crumb', 'Hex', 'Glitch', 'Nib'],
    suffix: ['ling', 'bat', 'gnaw', 'moth', 'toad', 'wisp', 'beetle', 'imp', 'crawler', 'snail', 'sprite', 'mite'],
  },
  help: `bugzoo - turn your errors into collectible monsters

Usage:
  bugzoo setup [--lang <code>] [--name N] [--auto on|off] [--ai on|off]
                              Language, player name, automatic capture, and
                              monsters for commands your AI assistant runs
                              (Claude Code)
  bugzoo lang [code]          Show the languages or switch: bugzoo lang zh-CN
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
  messages: {
    'fmt.creature': '{name} the {type}',
    'fmt.power': '{label} (power {power})',
    'rarity.common': 'common',
    'rarity.uncommon': 'uncommon',
    'rarity.rare': 'rare',
    'rarity.legendary': 'legendary',

    'enc.appeared': 'A wild {type} appeared!',
    'enc.new': '* NEW *',
    'enc.seen': 'seen x{n}',
    'enc.power': 'bug size: power {power}',

    'out.caughtTag': '[CAUGHT]',
    'out.escapedTag': '[ESCAPED]',
    'out.captured': 'Clean run! You caught {names}.',
    'out.partial': 'You caught {names}.',
    'out.partial2': 'Still at large: {names}. Keep fixing and run again.',
    'out.still': "It's still there: {names}. Fix it and run again.",
    'out.failed': '{names} slipped away - your fix introduced something new.',
    'out.failed2': 'New target(s): {names}. Fix and run again to catch.',
    'out.wild': 'Fix the bug and run the same command again to catch it.',

    'dex.empty': 'Your bestiary is empty. Run `bugzoo run <command>` and let something break.',
    'dex.title': 'Bug Zoo - {caught} caught / {seen} seen',
    'dex.caught': 'caught x{n}',
    'dex.wild': 'wild',
    'dex.pending': '{n} bug(s) waiting to be caught.',

    'team.empty': 'No trophies yet. Catch a bug first: fix it and re-run the same command.',
    'team.title': 'Your strongest catches (top 3 fight in battles)',
    'team.power': 'power',
    'factor.depth': 'depth',
    'factor.blast': 'blast',
    'factor.size': 'size',
    'factor.rate': 'rate',

    'battle.hit': '{att} hits {def} for {dmg}',
    'battle.crit': ' (critical!)',
    'battle.faint': ' - {def} faints!',
    'battle.left': ' ({hp} hp left)',
    'battle.you': 'You',
    'battle.win': 'You win! {winner} defeated {loser}.',
    'battle.lose': 'You lose. {winner} defeated {loser}.',
    'battle.noTrophy': 'You have no trophies yet. Catch a bug first: fix it, then re-run the same command.',

    'share.needName': 'Pick a public player name first: bugzoo share --name <name>',
    'share.wrote': 'Wrote {file} ({name}, score {score}, team of {n}).',

    'rank.title': 'Title: {title}',
    'rank.score': 'Score: {score}',
    'rank.caught': 'Caught: {c} common, {u} uncommon, {r} rare, {l} legendary  (+{rep} repeat catches, {seen} seen)',
    'rank.battles': 'Battles: {w} won, {l} lost',

    'scan.project': 'Project: {name}',
    'scan.files': 'Files: {files}   Lines: {loc}',
    'scan.top': 'Most depended-on modules (a bug here hits harder):',
    'scan.row': '{name} imported by {n} file(s)',

    'ladder.none': 'No battle-ready players in {dir}. Players need a shared team (bugzoo share).',
    'ladder.you': 'you',
    'ladder.challengeable': 'challengeable',
    'ladder.ask': 'Challenge which rank? (number, or q to quit) ',
    'ladder.badRank': 'Pick a rank between 1 and {max}.',
    'ladder.cannot': 'Cannot challenge: {reason}.',
    'ladder.err.notOnLadder': '{name} is not on the ladder (share a team first)',
    'ladder.err.self': 'you cannot challenge yourself',
    'ladder.err.below': '{name} is ranked below you',
    'ladder.err.reach': 'you can only challenge up to {reach} ranks above you',
    'ladder.lose': 'You lose. {name} holds #{rank}. The fight is deterministic, so this only changes if a team does - catch stronger bugs and try again.',
    'ladder.win': 'You win! You take #{to} from {name} (you were #{from}).',
    'ladder.wrote': 'Wrote {file}.',
    'ladder.commit': 'Commit it with {mine} and open a pull request; the ladder promotes you when it is merged.',
    'ladder.processed': 'Ladder updated: {players} player(s), {n} challenge(s) processed.',

    'setup.name': 'Player name (shown on leaderboards, Enter to skip): ',
    'setup.done': 'All set! Language: {lang}, name: {name}. Change it any time with `bugzoo setup`.',
    'setup.noName': '(not set)',
    'setup.nameHint': 'No player name yet. Set one with `bugzoo setup --name <name>` before sharing.',

    'setup.auto': 'Also catch bugs automatically whenever you run a project by hand? Optional: `bugzoo run <command>` works without it.\n  Turning it on edits your user environment variable and terminal profiles; undo any time with `bugzoo setup --auto off`. [y/N]: ',
    'setup.autoOn': 'Auto-capture is ON. Open a new terminal; whatever you run by hand there is captured.',
    'setup.step.node': '  - Node programs: any project, started from a terminal (NODE_OPTIONS)',
    'setup.step.cmd': '  - Command Prompt: python, go, cargo, java, npm, ... (AutoRun)',
    'setup.step.ps': '  - PowerShell: python, go, cargo, java, npm, ... ({file})',
    'setup.step.sh': '  - Shell profile updated: {file}',
    'setup.warn.policy': 'PowerShell execution policy is {policy}, so PowerShell will ignore the profile. To allow your own profile, run once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned',
    'setup.autoOff': 'Auto-capture is OFF.',
    'setup.autoFail': 'Could not change auto-capture: {error}',
    'setup.status': 'Language: {lang} | Name: {name} | Auto-capture: {auto}',
    'evo.tag': '[EVOLVED]',
    'evo.line': '{name} evolved into its {stage} form! Power x{mult}.',
    'evo.stage0': 'base',
    'evo.stage1': 'Evolved',
    'evo.stage2': 'Ascended',
    'evo.next': 'next form after {n} more catch(es)',
    'evo.max': 'final form',
    'ach.tag': '[ACHIEVEMENT]',
    'ach.title': 'Achievements: {n}/{total}',
    'ach.on': 'unlocked {date}',
    'ach.off': 'locked',
    'ach.first-catch.name': 'First catch',
    'ach.first-catch.desc': 'Catch your first bug.',
    'ach.collector.name': 'Collector',
    'ach.collector.desc': 'Catch 10 different bugs.',
    'ach.many-types.name': 'Well travelled',
    'ach.many-types.desc': 'Catch 5 different error types.',
    'ach.rare-find.name': 'Rare find',
    'ach.rare-find.desc': 'Catch a rare bug.',
    'ach.legend.name': 'Legend hunter',
    'ach.legend.desc': 'Catch a legendary bug.',
    'ach.persistent.name': 'Old acquaintance',
    'ach.persistent.desc': 'Catch the same bug 3 times and watch it evolve.',
    'ach.ascended.name': 'Ascended',
    'ach.ascended.desc': 'Catch the same bug 10 times.',
    'ach.big-game.name': 'Big game',
    'ach.big-game.desc': 'Catch a bug with 100 or more power.',
    'ach.streak-3.name': 'Three days running',
    'ach.streak-3.desc': 'Catch a bug 3 days in a row.',
    'ach.streak-7.name': 'A week of bugs',
    'ach.streak-7.desc': 'Catch a bug 7 days in a row.',
    'ach.first-win.name': 'First blood',
    'ach.first-win.desc': 'Win your first battle.',
    'ach.friendly.name': 'Not alone',
    'ach.friendly.desc': 'Add a friend.',
    'ach.slippery.name': 'It got away',
    'ach.slippery.desc': 'Let a bug escape.',
    'card.title': 'Bug Zoo battle',
    'card.win': '{winner} wins!',
    'card.rounds': '{n} hits',
    'card.footer': 'npm install -g bug-zoo',
    'card.ask': 'Save a shareable card of this battle? [y/N]: ',
    'card.saved': 'Saved {file}. Same fight, same card: it is deterministic.',
    'title.Bystander': 'Bystander',
    'title.Bug Spotter': 'Bug Spotter',
    'title.Bug Catcher': 'Bug Catcher',
    'title.Exterminator': 'Exterminator',
    'title.Zookeeper': 'Zookeeper',
    'title.Bug Whisperer': 'Bug Whisperer',
    'rank.points': 'Points: common {c}, uncommon {u}, rare {r}, legendary {l}; each repeat catch +2',
    'setup.aiOn': 'AI sessions: hook added to {file}. Monsters now appear when commands your AI assistant runs fail or get fixed. Restart Claude Code to load it.',
    'setup.aiOff': 'AI sessions: hook removed from {file}.',
    'setup.aiFail': 'Could not change the AI hook: {error}',
    'setup.aiStatus': 'AI sessions (Claude Code): {state}',
    'common.on': 'on',
    'common.off': 'off',

    'battle.secLadder': 'Ladder',
    'battle.secFriends': 'Friends',
    'battle.secPractice': 'Practice',
    'battle.rowPower': 'power {p}',
    'battle.tagYou': 'you',
    'battle.tagRanked': 'counts for ranking',
    'battle.ask': 'Fight whom? (number, or q to quit) ',
    'battle.badPick': 'Pick a number from the list.',
    'battle.cachedLadder': 'Ladder unavailable ({reason}); using the copy saved on {when}.',
    'battle.noLadder': 'Ladder unavailable ({reason}). Friends and practice are still here.',
    'battle.friendly': 'Friendly fight: this does not change the ladder.',
    'battle.outOfReach': 'Friendly fight: you only climb by beating someone up to {reach} ranks above you.',
    'battle.promote': 'You beat #{rank} {name}! Submit it to take their spot:',
    'battle.join': 'You are not on the ladder yet. Submit this fight to join it at the bottom (win or lose):',
    'battle.needName': 'Set a player name first (bugzoo setup --name <name>) to submit ladder results.',
    'battle.openAsk': 'Open it in your browser now? [Y/n]: ',
    'battle.opened': 'Opened. Press "Submit new issue"; the ladder updates within a minute or two.',
    'battle.submitNote': 'The ladder replays this fight from your shared team, so results cannot be faked.',

    'friend.usage': 'Usage: bugzoo friend [list] | code | add <code|url|file|name> | remove <name> | refresh',
    'friend.empty': 'No friends yet. Ask a friend for their code (they run `bugzoo friend code`), then: bugzoo friend add <code>',
    'friend.title': 'Friends',
    'friend.row': '{name}  power {p}  ({kind})',
    'friend.code': 'Your friend code. Send it to a friend; they run `bugzoo friend add <code>`:',
    'friend.needTeam': 'Catch a bug first: your friend code carries your team.',
    'friend.needName': 'Set a player name first: bugzoo setup --name <name>',
    'friend.added': 'Added {name} (team power {p}).',
    'friend.updated': 'Updated {name} (team power {p}).',
    'friend.removed': 'Removed {name}.',
    'friend.notFound': 'No friend named {name}.',
    'friend.bad': 'Could not read a friend from that. Use a friend code (BZ1.…), a JSON URL or file, or a player name from the ladder.',
    'friend.self': 'That is you.',
    'friend.refreshed': 'Refreshed {n} friend(s); {failed} could not be reached.',
    'friend.kind.code': 'code',
    'friend.kind.url': 'link',
    'friend.kind.file': 'file',
    'friend.kind.ladder': 'ladder',

    'hook.usage': 'Usage: bugzoo hook <bash|zsh|fish|powershell>',
    'misc.unknown': 'Unknown command: {cmd}',
    'misc.runUsage': 'Usage: bugzoo run <command...>',
    'misc.leaderUsage': 'Usage: bugzoo leaderboard <dir|file...> [--out file.md]',
    'misc.wrote': 'Wrote {file}',
    'misc.leaderWrote': 'Wrote {file} ({valid} valid, {skipped} skipped)',
    'svg.title': 'Bug Zoo · {caught} caught / {seen} seen',

    // bugzoo lang
    'lang.title': 'Languages (current marked with *):',
    'lang.ask': 'Pick a number, or press Enter to keep it: ',
    'lang.set': 'Language set to {lang}.',
    'lang.bad': 'Unknown language "{value}". Available: {list}',

    // VS Code extension (vscode/): the zoo view, the ladder panel and the notifications.
    'vs.caught': 'caught',
    'vs.seen': 'seen',
    'vs.pen': 'caught',
    'vs.empty': 'The zoo is empty.<br>Run a command that fails in the terminal<br>and a monster will show up.',
    'vs.wild': 'wild',
    'vs.power': 'power',
    'vs.evo': 'form',
    'vs.since': 'since',
    'vs.ladder': 'Ladder',
    'vs.offline': 'offline copy',
    'vs.noladder': 'Ladder unavailable',
    'vs.friends': 'Friends',
    'vs.fight': 'Fight',
    'vs.you': 'you',
    'vs.challenge': 'You can challenge this player',
    'vs.practice': 'Practice',
    'vs.addFriend': '+ Add friend',
    'vs.copyCode': 'Copy my code',
    'vs.remove': 'Remove',
    'vs.noTeam': 'Catch a bug first: your team is made from your strongest catches.',
    'vs.win': 'You win!',
    'vs.lose': 'You lose',
    'vs.close': 'Close',
    'vs.submit': 'Submit to the ladder',
    'vs.replay': 'Replay',
    'vs.skip': 'Skip',
    'vs.promote': 'You beat {name}! Submit this win on GitHub to take their spot.',
    'vs.join': 'Submit your team on GitHub to join the ladder.',
    'vs.outOfReach': 'Nice win, but the ladder only moves for players up to {reach} ranks above you.',
    'vs.friendly': 'A friendly fight: it does not change the ladder.',
    'vs.lost': 'Fix a few more bugs, grow your team and try again.',
    'vs.practiceNote': 'Practice fight: it does not count.',
    'vs.hits': 'hits',
    'vs.crit': 'critical!',
    'vs.gone': 'That opponent is no longer on the list.',
    'vs.kind.code': 'code',
    'vs.kind.url': 'link',
    'vs.kind.file': 'file',
    'vs.kind.ladder': 'ladder',
    'vs.vs': 'vs',
    'vs.achievement': 'Achievement',
    'vs.nameTitle': 'Bug Zoo player name',
    'vs.namePrompt': 'Your name on the ladder (shown to other players)',
    'vs.namePick': 'Pick a name',
    'vs.addTitle': 'Add a friend',
    'vs.addPrompt': 'Paste a friend code (BZ1...), a link, a file path, or a player name from the ladder',
    'vs.friendAdded': 'Added {name}.',
    'vs.friendUpdated': 'Updated {name}.',
    'vs.friendSelf': 'That is you!',
    'vs.friendBad': 'Could not read that friend.',
    'vs.needCatch': 'Catch a bug first: your friend code is made from your strongest catches.',
    'vs.codeCopied': 'Friend code copied. Send it to a friend; they paste it into Add friend.',
    'vs.statusCaught': '$(check) Bug Zoo: caught {creature}!',
    'vs.notifyCaught': 'Caught {creature}! It joined your zoo.',
    'vs.statusSpawned': '$(bug) Bug Zoo: a wild {creature} appeared',
    'vs.notifySpawned': 'A wild {creature} appeared! Fix the bug and re-run the command to catch it.',
    'vs.openZoo': 'Open the zoo',
    'vs.captureOn': 'Bug Zoo terminal capture on.',
    'vs.captureOff': 'Bug Zoo terminal capture off.',
    'vs.langTitle': 'Bug Zoo language',
    'vs.langPlaceholder': 'Choose the language for Bug Zoo',
    'vs.langSet': 'Bug Zoo language: {lang}.',
    'vs.creature': '{name} the {type}',
  },
};
