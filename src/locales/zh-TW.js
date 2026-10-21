'use strict';

// Language file. To add a language, run `npm run lang -- <code> <label>` and translate `messages` and `help`.
module.exports = {
  code: 'zh-TW',
  label: '繁體中文',
  // Locale prefixes that select this language (the longest match wins), e.g. LANG=zh_TW.UTF-8 -> 'zh-tw'.
  order: 1, // position in the language picker (omit to go after the built-in ones)
  detect: ['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant'],
  // Monster names are prefix + suffix, picked from the error's hash. The two lists may have any length.
  names: {
    prefix: ['陰森', '毛茸', '毒舌', '搖晃', '憂鬱', '電擊', '陰暗', '小不點', '碎屑', '詛咒', '故障', '小筆'],
    suffix: ['小怪', '蝙蝠', '啃咬蟲', '飛蛾', '蟾蜍', '鬼火', '甲蟲', '小鬼', '爬蟲', '蝸牛', '精靈', '蟎'],
  },
  help: `bugzoo - 把你的錯誤變成可收集的怪物

用法：
  bugzoo setup [--lang <code>] [--name 名稱] [--auto on|off] [--ai on|off]
                              語言、玩家名稱、自動捕捉，以及 AI 助手
                              （Claude Code）執行的指令也會出怪物
  bugzoo lang [代碼]          查看語言清單或切換語言：bugzoo lang zh-TW
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
  bugzoo ladder join          一步加入天梯（需要先有捕獲與玩家名稱）
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
  messages: {
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

    'setup.name': '玩家名稱（會顯示在排行榜上，直接按 Enter 可略過）：',
    'setup.done': '設定完成！語言：{lang}，名稱：{name}。之後可用 `bugzoo setup` 修改。',
    'setup.noName': '（未設定）',
    'setup.nameHint': '還沒有玩家名稱。分享前請先用 `bugzoo setup --name <名稱>` 設定。',

    'setup.auto': '要連「你手動執行的任何專案」都自動捕捉 bug 嗎？這是選用功能，不開也能用 `bugzoo run <指令>` 玩。\n  開啟會修改你的使用者環境變數與終端機設定檔，之後隨時可用 `bugzoo setup --auto off` 還原。[y/N]：',
    'setup.autoOn': '自動捕捉已開啟。請重新開啟終端機，之後你在裡面手動執行的程式都會被捕捉。',
    'setup.step.node': '  - Node 程式：任何專案，只要是從終端機啟動的（NODE_OPTIONS）',
    'setup.step.cmd': '  - 命令提示字元：python、go、cargo、java、npm…（AutoRun）',
    'setup.step.ps': '  - PowerShell：python、go、cargo、java、npm…（{file}）',
    'setup.step.sh': '  - 已更新 shell 設定檔：{file}',
    'setup.warn.policy': 'PowerShell 的執行原則是 {policy}，所以 PowerShell 會忽略設定檔。若要允許你自己的設定檔，請執行一次：Set-ExecutionPolicy -Scope CurrentUser RemoteSigned',
    'setup.autoOff': '自動捕捉已關閉。',
    'setup.autoFail': '無法變更自動捕捉設定：{error}',
    'setup.status': '語言：{lang}｜名稱：{name}｜自動捕捉：{auto}',
    'evo.tag': '[進化]',
    'evo.line': '{name} 進化了！現在是「{stage}」，戰鬥力 ×{mult}。',
    'evo.stage0': '一般',
    'evo.stage1': '第二型態',
    'evo.stage2': '覺醒型態',
    'evo.next': '再捕捉 {n} 次就會進化',
    'evo.max': '最終型態',
    'ach.tag': '[成就解鎖]',
    'ach.title': '成就：{n}/{total}',
    'ach.on': '於 {date} 解鎖',
    'ach.off': '未解鎖',
    'ach.first-catch.name': '初次捕捉',
    'ach.first-catch.desc': '捕捉你的第一隻 bug。',
    'ach.collector.name': '收藏家',
    'ach.collector.desc': '捕捉 10 種不同的 bug。',
    'ach.many-types.name': '見多識廣',
    'ach.many-types.desc': '捕捉 5 種不同的錯誤類型。',
    'ach.rare-find.name': '稀有發現',
    'ach.rare-find.desc': '捕捉一隻稀有 bug。',
    'ach.legend.name': '傳說獵人',
    'ach.legend.desc': '捕捉一隻傳說級 bug。',
    'ach.persistent.name': '老朋友',
    'ach.persistent.desc': '同一隻 bug 捕捉 3 次，看牠進化。',
    'ach.ascended.name': '覺醒',
    'ach.ascended.desc': '同一隻 bug 捕捉 10 次。',
    'ach.big-game.name': '大獵物',
    'ach.big-game.desc': '捕捉戰鬥力 100 以上的 bug。',
    'ach.streak-3.name': '連續三天',
    'ach.streak-3.desc': '連續 3 天都有捕捉。',
    'ach.streak-7.name': '一整週',
    'ach.streak-7.desc': '連續 7 天都有捕捉。',
    'ach.first-win.name': '初戰告捷',
    'ach.first-win.desc': '贏得第一場對戰。',
    'ach.friendly.name': '不孤單',
    'ach.friendly.desc': '加入一位好友。',
    'ach.slippery.name': '讓牠跑了',
    'ach.slippery.desc': '讓一隻 bug 逃走。',
    'card.title': 'Bug Zoo 對戰',
    'card.win': '{winner} 獲勝！',
    'card.rounds': '{n} 回合',
    'card.footer': 'npm install -g bug-zoo',
    'card.ask': '要把這場對戰存成可分享的卡片嗎？[y/N]：',
    'card.saved': '已存成 {file}。戰鬥是固定的，同一場永遠是同一張卡。',
    'title.Bystander': '路人',
    'title.Bug Spotter': '蟲蟲偵查員',
    'title.Bug Catcher': '捕蟲員',
    'title.Exterminator': '除蟲專家',
    'title.Zookeeper': '動物園長',
    'title.Bug Whisperer': '蟲語者',
    'rank.points': '計分：普通 {c}、罕見 {u}、稀有 {r}、傳說 {l}；每次重複捕捉 +2',
    'setup.aiOn': 'AI 協作：已把 hook 加進 {file}。AI 助手執行的指令失敗或修好時，你會看到怪物。請重新啟動 Claude Code 讓它生效。',
    'setup.aiOff': 'AI 協作：已從 {file} 移除 hook。',
    'setup.aiFail': '無法變更 AI hook：{error}',
    'setup.aiStatus': 'AI 協作（Claude Code）：{state}',
    'common.on': '開啟',
    'common.off': '關閉',

    'battle.secLadder': '天梯',
    'battle.secFriends': '好友',
    'battle.secPractice': '練習',
    'battle.rowPower': '戰鬥力 {p}',
    'battle.tagYou': '你',
    'battle.tagRanked': '計入排名',
    'battle.ask': '要跟誰對戰？（輸入編號，q 離開）',
    'battle.badPick': '請輸入清單裡的編號。',
    'battle.cachedLadder': '無法連上天梯（{reason}），使用 {when} 儲存的副本。',
    'battle.noLadder': '無法連上天梯（{reason}）。好友與練習對手仍可使用。',
    'battle.friendly': '切磋：這場不會影響天梯。',
    'battle.outOfReach': '切磋：只有打贏排名在你上面 {reach} 名以內的人才能晉升。',
    'battle.promote': '你擊敗了第 {rank} 名 {name}！送出即可奪下他的名次：',
    'battle.join': '你還不在天梯上。送出這場戰鬥即可加入天梯（不論輸贏，從最底下開始）：',
    'battle.needName': '要送出天梯結果，請先設定玩家名稱（bugzoo setup --name <名稱>）。',
    'battle.openAsk': '要現在用瀏覽器開啟嗎？[Y/n]：',
    'battle.opened': '已開啟。請按「Submit new issue」，天梯會在一兩分鐘內更新。',
    'battle.submitNote': '天梯會用你分享的隊伍重新播放這場戰鬥，所以結果無法造假。',

    'friend.usage': '用法：bugzoo friend [list] | code | add <代碼|網址|檔案|名稱> | remove <名稱> | refresh',
    'friend.empty': '還沒有好友。請朋友執行 `bugzoo friend code` 把代碼給你，然後：bugzoo friend add <代碼>',
    'friend.title': '好友',
    'friend.row': '{name}  戰鬥力 {p}  （{kind}）',
    'friend.code': '你的好友代碼。傳給朋友，他們執行 `bugzoo friend add <代碼>` 就能加你：',
    'friend.needTeam': '請先捕捉一隻 bug：好友代碼會帶著你的隊伍。',
    'friend.needName': '請先設定玩家名稱：bugzoo setup --name <名稱>',
    'friend.added': '已加入 {name}（隊伍戰鬥力 {p}）。',
    'friend.updated': '已更新 {name}（隊伍戰鬥力 {p}）。',
    'friend.removed': '已移除 {name}。',
    'friend.notFound': '沒有叫 {name} 的好友。',
    'friend.bad': '無法從這個內容讀出好友。請使用好友代碼（BZ1.…）、JSON 網址或檔案，或天梯上的玩家名稱。',
    'friend.self': '那是你自己。',
    'friend.refreshed': '已更新 {n} 位好友，{failed} 位連不上。',
    'friend.kind.code': '代碼',
    'friend.kind.url': '連結',
    'friend.kind.file': '檔案',
    'friend.kind.ladder': '天梯',

    'hook.usage': '用法：bugzoo hook <bash|zsh|fish|powershell>',
    'misc.unknown': '未知的指令：{cmd}',
    'misc.runUsage': '用法：bugzoo run <指令...>',
    'misc.leaderUsage': '用法：bugzoo leaderboard <資料夾|檔案...> [--out file.md]',
    'misc.wrote': '已寫入 {file}',
    'misc.leaderWrote': '已寫入 {file}（有效 {valid} 筆，略過 {skipped} 筆）',
    'svg.title': 'Bug Zoo · 已捕捉 {caught} / 遭遇 {seen}',

    // bugzoo lang
    'lang.title': '語言（目前使用的標有 *）：',
    'lang.ask': '輸入編號，直接按 Enter 維持不變：',
    'lang.set': '語言已切換為 {lang}。',
    'lang.bad': '找不到語言「{value}」。可用的語言：{list}',

    // bugzoo ladder join
    'ladder.join.intro': '加入天梯：你的隊伍會和 {defender}（最後一名）打一場入場賽。不論輸贏都會從最底下加入，贏了就取代他的名次。',
    'ladder.join.already': '你已經在天梯上了，第 {rank} 名。用 `bugzoo battle` 挑戰排在你上面的人往上爬。',
    'ladder.join.empty': '天梯上還沒有可以對戰的人，目前沒有東西可以加入，晚點再試。',
    'ladder.join.needCatch': '先捕獲一隻 bug：你的隊伍由捕獲的 bug 組成。跑一個會失敗的指令，修好後再跑一次。',
    'ladder.joinHint': '一行指令就能加入天梯：bugzoo ladder join',

    // VS Code extension (vscode/): the zoo view, the ladder panel and the notifications.
    'vs.caught': '已捕獲',
    'vs.seen': '已遇見',
    'vs.pen': '已捕獲',
    'vs.empty': '動物園還是空的。<br>在終端機跑一個會出錯的指令，<br>怪物就會出現。',
    'vs.wild': '野生',
    'vs.power': '戰力',
    'vs.evo': '型態',
    'vs.since': '出現於',
    'vs.ladder': '榜單',
    'vs.offline': '離線資料',
    'vs.noladder': '榜單暫時無法載入',
    'vs.friends': '好友',
    'vs.fight': '對戰',
    'vs.you': '你',
    'vs.challenge': '可以挑戰這位玩家',
    'vs.practice': '練習',
    'vs.addFriend': '+ 加好友',
    'vs.copyCode': '複製我的代碼',
    'vs.remove': '移除',
    'vs.noTeam': '先抓一隻 bug：你的隊伍由最強的幾隻組成。',
    'vs.win': '你贏了！',
    'vs.lose': '你輸了',
    'vs.close': '關閉',
    'vs.submit': '提交到榜單',
    'vs.replay': '重播',
    'vs.skip': '跳過',
    'vs.promote': '你打敗了 {name}！到 GitHub 提交這場勝利就能取代他的名次。',
    'vs.join': '到 GitHub 提交你的隊伍就能加入榜單。',
    'vs.outOfReach': '贏得漂亮，但榜單只在挑戰你上方 {reach} 名以內的玩家時才會變動。',
    'vs.friendly': '友誼賽：不會影響榜單。',
    'vs.lost': '多修幾個 bug、養強隊伍再來挑戰吧。',
    'vs.practiceNote': '練習對戰：不計入戰績。',
    'vs.hits': '攻擊',
    'vs.crit': '爆擊！',
    'vs.gone': '這位對手已不在名單上。',
    'vs.kind.code': '代碼',
    'vs.kind.url': '連結',
    'vs.kind.file': '檔案',
    'vs.kind.ladder': '榜單',
    'vs.vs': 'VS',
    'vs.achievement': '成就',
    'vs.nameTitle': 'Bug Zoo 玩家名稱',
    'vs.namePrompt': '你在榜單上的名稱（會顯示給其他玩家）',
    'vs.namePick': '請輸入名稱',
    'vs.addTitle': '加好友',
    'vs.addPrompt': '貼上好友代碼（BZ1...）、連結、檔案路徑，或榜單上的玩家名稱',
    'vs.friendAdded': '已加入 {name}。',
    'vs.friendUpdated': '已更新 {name}。',
    'vs.friendSelf': '那是你自己！',
    'vs.friendBad': '無法讀取這位好友。',
    'vs.needCatch': '先抓一隻 bug：你的好友代碼由最強的幾隻捕獲組成。',
    'vs.codeCopied': '已複製好友代碼。傳給朋友，他們貼到「加好友」就能對戰。',
    'vs.statusCaught': '$(check) Bug Zoo：捕獲 {creature}！',
    'vs.notifyCaught': '捕獲 {creature}！牠加入了你的動物園。',
    'vs.statusSpawned': '$(bug) Bug Zoo：野生的 {creature} 出現了',
    'vs.notifySpawned': '野生的 {creature} 出現了！修好 bug 後重跑指令就能捕獲牠。',
    'vs.openZoo': '打開動物園',
    'vs.captureOn': 'Bug Zoo 終端機捕捉已開啟。',
    'vs.captureOff': 'Bug Zoo 終端機捕捉已關閉。',
    'vs.langTitle': 'Bug Zoo 語言',
    'vs.langPlaceholder': '選擇 Bug Zoo 使用的語言',
    'vs.langSet': 'Bug Zoo 語言：{lang}。',
    'vs.creature': '{name}（{type}）',
  },
};
