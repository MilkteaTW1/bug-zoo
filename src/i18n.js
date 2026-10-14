'use strict';

const LANGS = ['zh-TW', 'en'];
const LANG_LABEL = { 'zh-TW': '繁體中文', en: 'English' };

const M = {
  en: {
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
    'battle.badFile': 'Could not read {file} as JSON.',
    'battle.noTeam': 'That file has no valid team. The opponent needs to run `bugzoo share` after catching a bug.',
    'battle.own': 'That file is your own team ({name}). Battle someone else, or use --bot.',
    'battle.usage': 'Usage: bugzoo battle <opponent.json> | --bot',

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

    'setup.lang': 'Language / 語言  [1] 繁體中文   [2] English  (default 1): ',
    'setup.name': 'Player name (shown on leaderboards, Enter to skip): ',
    'setup.done': 'All set! Language: {lang}, name: {name}. Change it any time with `bugzoo setup`.',
    'setup.noName': '(not set)',
    'setup.nameHint': 'No player name yet. Set one with `bugzoo setup --name <name>` before sharing.',

    'setup.auto': 'Catch bugs automatically whenever you run `node` (sets NODE_OPTIONS for your user account)? [Y/n]: ',
    'setup.autoOn': 'Auto-capture is ON. Open a new terminal, then just run `node app.js` as usual.',
    'setup.autoOff': 'Auto-capture is OFF.',
    'setup.autoFail': 'Could not change auto-capture: {error}',
    'setup.status': 'Language: {lang} | Name: {name} | Auto-capture: {auto}',
    'title.Bystander': 'Bystander',
    'title.Bug Spotter': 'Bug Spotter',
    'title.Bug Catcher': 'Bug Catcher',
    'title.Exterminator': 'Exterminator',
    'title.Zookeeper': 'Zookeeper',
    'title.Bug Whisperer': 'Bug Whisperer',
    'rank.points': 'Points: common {c}, uncommon {u}, rare {r}, legendary {l}; each repeat catch +2',
    'common.on': 'on',
    'common.off': 'off',

    'hook.usage': 'Usage: bugzoo hook <bash|zsh|fish|powershell>',
    'misc.unknown': 'Unknown command: {cmd}',
    'misc.runUsage': 'Usage: bugzoo run <command...>',
    'misc.leaderUsage': 'Usage: bugzoo leaderboard <dir|file...> [--out file.md]',
    'misc.wrote': 'Wrote {file}',
    'misc.leaderWrote': 'Wrote {file} ({valid} valid, {skipped} skipped)',
    'svg.title': 'Bug Zoo · {caught} caught / {seen} seen',
  },

  'zh-TW': {
    'fmt.creature': '{name}（{type}）',
    'fmt.power': '{label}（戰鬥力 {power}）',
    'rarity.common': '普通',
    'rarity.uncommon': '罕見',
    'rarity.rare': '稀有',
    'rarity.legendary': '傳說',

    'enc.appeared': '野生的 {type} 出現了！',
    'enc.new': '* 新發現 *',
    'enc.seen': '遭遇 {n} 次',
    'enc.power': '錯誤大小：戰鬥力 {power}',

    'out.caughtTag': '[捕捉成功]',
    'out.escapedTag': '[逃走了]',
    'out.captured': '乾淨通過！你捕捉到了 {names}。',
    'out.partial': '你捕捉到了 {names}。',
    'out.partial2': '還在逃：{names}。繼續修，再跑一次。',
    'out.still': '牠還在：{names}。修好後再跑一次。',
    'out.failed': '{names} 逃走了：你的修改引發了新的錯誤。',
    'out.failed2': '新的目標：{names}。修好後再跑一次來捕捉。',
    'out.wild': '修好這個 bug，再執行同一條指令就能捕捉牠。',

    'dex.empty': '圖鑑還是空的。執行 `bugzoo run <指令>`，讓程式壞一次吧。',
    'dex.title': 'Bug Zoo｜已捕捉 {caught} / 遭遇 {seen}',
    'dex.caught': '已捕捉 x{n}',
    'dex.wild': '野生',
    'dex.pending': '還有 {n} 隻 bug 等著你捕捉。',

    'team.empty': '還沒有戰利品。先捕捉一隻 bug：修好後重跑同一條指令。',
    'team.title': '你最強的捕獲（前三名會上場戰鬥）',
    'team.power': '戰鬥力',
    'factor.depth': '堆疊深度',
    'factor.blast': '影響範圍',
    'factor.size': '專案規模',
    'factor.rate': '錯誤率',

    'battle.hit': '{att} 攻擊 {def}，造成 {dmg} 點傷害',
    'battle.crit': '（暴擊！）',
    'battle.faint': '，{def} 倒下了！',
    'battle.left': '（剩餘 {hp} 血）',
    'battle.you': '你',
    'battle.win': '你贏了！{winner} 擊敗了 {loser}。',
    'battle.lose': '你輸了。{winner} 擊敗了 {loser}。',
    'battle.noTrophy': '你還沒有戰利品。先捕捉一隻 bug：修好後重跑同一條指令。',
    'battle.badFile': '無法把 {file} 當成 JSON 讀取。',
    'battle.noTeam': '這個檔案沒有有效的隊伍。對手需要在捕捉 bug 後執行 `bugzoo share`。',
    'battle.own': '這個檔案是你自己的隊伍（{name}）。請找別人對戰，或使用 --bot。',
    'battle.usage': '用法：bugzoo battle <對手.json> | --bot',

    'share.needName': '請先設定公開的玩家名稱：bugzoo share --name <名稱>',
    'share.wrote': '已寫入 {file}（{name}，分數 {score}，隊伍 {n} 隻）。',

    'rank.title': '稱號：{title}',
    'rank.score': '分數：{score}',
    'rank.caught': '已捕捉：普通 {c}、罕見 {u}、稀有 {r}、傳說 {l}（重複捕捉 +{rep}，遭遇過 {seen} 種）',
    'rank.battles': '戰績：{w} 勝 {l} 敗',

    'scan.project': '專案：{name}',
    'scan.files': '檔案：{files}   行數：{loc}',
    'scan.top': '最多檔案依賴的模組（這裡出 bug 威力更大）：',
    'scan.row': '{name} 被 {n} 個檔案引用',

    'ladder.none': '{dir} 裡沒有可對戰的玩家。玩家需要先分享隊伍（bugzoo share）。',
    'ladder.you': '你',
    'ladder.challengeable': '可挑戰',
    'ladder.ask': '要挑戰第幾名？（輸入數字，q 離開）',
    'ladder.badRank': '請輸入 1 到 {max} 之間的名次。',
    'ladder.cannot': '無法挑戰：{reason}。',
    'ladder.err.notOnLadder': '{name} 不在天梯上（需要先分享隊伍）',
    'ladder.err.self': '不能挑戰自己',
    'ladder.err.below': '{name} 的排名在你之下',
    'ladder.err.reach': '只能挑戰排名在你上面 {reach} 名以內的人',
    'ladder.lose': '你輸了。{name} 守住了第 {rank} 名。戰鬥結果是固定的，除非隊伍改變才會不同，去捕捉更強的 bug 再來吧。',
    'ladder.win': '你贏了！你從 {name} 手中奪下第 {to} 名（原本第 {from} 名）。',
    'ladder.wrote': '已寫入 {file}。',
    'ladder.commit': '把它和 {mine} 一起 commit 並開 Pull Request，合併後天梯就會讓你晉升。',
    'ladder.processed': '天梯已更新：{players} 位玩家，處理了 {n} 筆挑戰。',

    'setup.lang': 'Language / 語言  [1] 繁體中文   [2] English  （預設 1）：',
    'setup.name': '玩家名稱（會顯示在排行榜上，直接按 Enter 可略過）：',
    'setup.done': '設定完成！語言：{lang}，名稱：{name}。之後可用 `bugzoo setup` 修改。',
    'setup.noName': '（未設定）',
    'setup.nameHint': '還沒有玩家名稱。分享前請先用 `bugzoo setup --name <名稱>` 設定。',

    'setup.auto': '要在你執行 `node` 時自動捕捉 bug 嗎？（會替你的使用者帳號設定 NODE_OPTIONS）[Y/n]：',
    'setup.autoOn': '自動捕捉已開啟。請重新開啟終端機，之後照常執行 `node app.js` 就會自動捕捉。',
    'setup.autoOff': '自動捕捉已關閉。',
    'setup.autoFail': '無法變更自動捕捉設定：{error}',
    'setup.status': '語言：{lang}｜名稱：{name}｜自動捕捉：{auto}',
    'title.Bystander': '路人',
    'title.Bug Spotter': '蟲蟲偵查員',
    'title.Bug Catcher': '捕蟲員',
    'title.Exterminator': '除蟲專家',
    'title.Zookeeper': '動物園長',
    'title.Bug Whisperer': '蟲語者',
    'rank.points': '計分：普通 {c}、罕見 {u}、稀有 {r}、傳說 {l}；每次重複捕捉 +2',
    'common.on': '開啟',
    'common.off': '關閉',

    'hook.usage': '用法：bugzoo hook <bash|zsh|fish|powershell>',
    'misc.unknown': '未知的指令：{cmd}',
    'misc.runUsage': '用法：bugzoo run <指令...>',
    'misc.leaderUsage': '用法：bugzoo leaderboard <資料夾|檔案...> [--out file.md]',
    'misc.wrote': '已寫入 {file}',
    'misc.leaderWrote': '已寫入 {file}（有效 {valid} 筆，略過 {skipped} 筆）',
    'svg.title': 'Bug Zoo · 已捕捉 {caught} / 遭遇 {seen}',
  },
};

let current = 'en';

function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'en';
}

function getLang() {
  return current;
}

/** Best guess from the environment when the player has not chosen yet. */
function detectLang(env = process.env) {
  let raw = env.BUGZOO_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  if (!raw) {
    try {
      raw = Intl.DateTimeFormat().resolvedOptions().locale || '';
    } catch {
      raw = '';
    }
  }
  return /^zh/i.test(raw) ? 'zh-TW' : 'en';
}

function t(key, vars = {}) {
  const table = M[current] || M.en;
  const s = table[key] !== undefined ? table[key] : (M.en[key] !== undefined ? M.en[key] : key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : String(vars[k])));
}

/** Terminal display width: CJK characters take two columns. */
function width(s) {
  let w = 0;
  for (const ch of String(s).replace(/\x1b\[[0-9;]*m/g, '')) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6))) ? 2 : 1;
  }
  return w;
}

function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - width(s)));
}

module.exports = { LANGS, LANG_LABEL, setLang, getLang, detectLang, t, width, pad };
