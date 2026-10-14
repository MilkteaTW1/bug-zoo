# Bug Zoo

Turn your error messages into collectible monsters.

**English** | [繁體中文](#zh-TW)

![Bug Zoo demo](docs/demo.en.gif)

*A bug appears, you fix it, it is caught, your team fights. Real output; Node-internal stack frames trimmed.*

## Install

```bash
npm install -g bug-zoo
bugzoo setup
```

Requires Node.js 18+. No dependencies.

The first time you run any `bugzoo` command it asks for your **language** (繁體中文 / English), a **player name** for the leaderboards, and whether to turn on **automatic capture**. (npm install scripts cannot prompt, so the questions happen on first run.) Change them any time with `bugzoo setup`.

## Commands

| Command | What it does |
|---|---|
| `bugzoo setup` | Language, player name and automatic capture (`--lang`, `--name`, `--auto on\|off`) |
| `bugzoo run <command…>` | Run a command; if it fails a bug appears. Not needed once automatic capture is on |
| `bugzoo dex` | Your collection and the bugs waiting to be caught |
| `bugzoo team` | Your strongest catches, with the power breakdown |
| `bugzoo battle` | Shows the ladder, your friends and a practice opponent; type a number to fight |
| `bugzoo battle <code\|url\|file\|name>` | Fight one friend code, link, file or ladder player directly |
| `bugzoo friend` | List friends. Also `code`, `add <code\|url\|file\|name>`, `remove <name>`, `refresh` |
| `bugzoo ladder` | Show the ladder |
| `bugzoo rank` | Your score and title |
| `bugzoo share` | Write a shareable score + team file (counts only, no error text) |
| `bugzoo leaderboard <dir>` | Build a score leaderboard from shared files |
| `bugzoo scan` | Scan this project: size and most-depended-on modules |
| `bugzoo hook <shell>` | Print a wrapper snippet for bash, zsh, fish or PowerShell |
| `bugzoo export` | Export the bestiary as an SVG for your profile |

## Automatic capture (no `bugzoo run`)

With automatic capture on, just run your program as usual:

```bash
node app.js
```

Whatever you run **by hand** in a terminal is captured, in any project, in any folder. Two layers do this:

| Layer | Covers | How |
|---|---|---|
| Node preload | any `node` program started from a terminal | `NODE_OPTIONS` (user environment variable) loads `src/register.js`, which records the run on exit |
| Command wrappers | `python`, `py`, `pytest`, `go`, `cargo`, `java`, `mvn`, `gradle`, `dotnet`, `ruby`, `php`, `deno`, `bun`, `make`, `npm`, `npx`, `pnpm`, `yarn` | cmd `doskey` macros via `AutoRun`, a PowerShell profile block, or a bash/zsh profile block |

- **Only actively started runs count.** The Node preload requires a terminal (TTY); wrappers only apply to lines you type. Editors, bundlers and background tools are ignored, and `node_modules` and npm itself are never tracked.
- A healthy program with no pending bug writes nothing and prints nothing.
- `bugzoo setup` shows exactly what it changes and asks first. Undo everything with `bugzoo setup --auto off`; pause with `BUGZOO_DISABLE=1`.
- Open a new terminal after turning it on.
- **Limits**: a language not in the list above needs `bugzoo run <command>`. Runs started by an IDE's Run button (no terminal) are not captured. Wrapped commands have their stderr piped through bugzoo, so a few tools may drop colours on stderr.
- Windows PowerShell ignores profiles when its execution policy is `Restricted`; `bugzoo setup` tells you if so.

## Catching a bug

A failing run only *spawns* a bug. You catch it by fixing the code and re-running the same command in the same folder:

| Re-run result | Outcome |
|---|---|
| Clean run | Caught |
| Same bug | Still there |
| Some bugs gone, nothing new | Those are caught, the rest stay wild |
| A different or additional bug | Escaped - the new bug becomes your target |

"Same command" ignores flags and numeric arguments, so `node app.js` and `node ./app.js --debug --port 3000` are the same target.

## Power

Every bug has a power, snapshotted while it is alive and banked as a trophy when you catch it. Catching the same `TypeError` in two projects gives two trophies with different power.

`power = base(rarity) x (1 + depth + blast + size + rate)`

| Factor | Measured by | Max |
|---|---|---|
| depth | project files in the stack trace | +1.0 |
| blast | project files that import the failing file (the whole project is scanned) | +1.0 |
| size | total lines of code in the project (log scale) | +0.5 |
| rate | failures / max(runs, 5) of that command; a bug you keep hitting grows | +1.0 |

Base: common 10, uncommon 25, rare 60, legendary 150. Your top 3 trophies form your team.

## Battles and the ladder

```bash
bugzoo battle
```

lists the **ladder**, your **friends** and a **practice** opponent; type a number to fight.

```
Ladder
 1. #1   bugslayer          power  160  <counts for ranking>
 2. #2   dev-dana           power  110  <counts for ranking>
 3. #3   rookie             power   10  <counts for ranking>
  . #4   you                power   16  <you>

Friends
 4.      xiaoming           power   25  <code>

Practice
 5.      Legacy Codebase    power  195
Fight whom? (number, or q to quit)
```

- Teams fight one at a time; the survivor keeps its remaining HP. The fight is seeded from both teams, so both players get the same result and nobody can re-roll luck.
- **The ladder is read straight from this GitHub repo** (`leaderboard/`). No clone, no server of ours. If GitHub is unreachable the last saved copy is used.
- **Beat someone up to 3 ranks above you to take their spot.** The CLI prints a pre-filled GitHub issue link; press *Submit new issue* and a workflow replays the fight from your shared team, then updates the ladder within a minute or two.
- Fighting friends and the practice opponent is friendly: it never changes the ladder.
- A player name belongs to the first GitHub account that submits with it, so nobody can submit as someone else.

## Friends

No accounts and no server: a friend is a team you can reach.

```bash
bugzoo friend code                 # your friend code: send it in any chat
bugzoo friend add BZ1.xxxxxxxx     # add a friend from their code
bugzoo friend add alice            # add anyone on the ladder; their team stays current
bugzoo friend add https://…/bob.json   # a link to a shared score file, refreshed each time
bugzoo friend add ./carol.json     # a local file
bugzoo friend remove alice
```

A code is a snapshot of a team (name and up to 3 monsters). Ladder names, links and files are refreshed when you open `bugzoo battle`. Power in anything you import is clamped to what each rarity can reach.

## Score leaderboard (no database)

Scores are first catches by rarity (common 10, uncommon 25, rare 60, legendary 200) plus 2 per repeat catch.

```bash
bugzoo share --name alice --out leaderboard/scores/alice.json
```

The file contains only counts and your team: no error messages, paths or commands. A GitHub Action runs `bugzoo leaderboard leaderboard/scores --out LEADERBOARD.md` and commits the table. Scores are recomputed from the counts and are self-reported, so treat the board as friendly, not tamper-proof.

Running your own ladder? Fork the repo and set `BUGZOO_LADDER_REPO=owner/repo` (or `BUGZOO_LADDER_DIR` for a local folder).

## Playground

No project? `playground/` has three broken programs; see [playground/GUIDE.md](playground/GUIDE.md).

```bash
cd playground
node ../bin/bugzoo.js run node app.js
```

## How it works

- **Parsing**: finds the last `SomethingError: message` in stderr (works for Node and Python tracebacks), falling back to error codes (`ENOENT`, `SIGSEGV`), then signals.
- **Identity**: the monster is derived from a hash of the error type plus the message with numbers, quoted names and paths stripped, so `Cannot read 'a'` and `Cannot read 'b'` are the same creature.
- **Rarity**: common (`TypeError`, `KeyError`...), uncommon (`ENOENT`, `RangeError`...), rare (anything else), legendary (`SIGSEGV`, `ENOSPC`, `StackOverflow`...).
- **Storage**: `~/.bugzoo/dex.json` (override with `BUGZOO_HOME`). Nothing leaves your machine unless you share or submit it.
- **Demo GIFs** are rendered from real output by `python tools/make-gif.py` (needs Pillow and Windows fonts). `node demo/demo.js` plays a similar session live.

## Roadmap

- Evolution when you meet the same monster many times
- More languages' error formats (Go, Rust, Java)

## License

MIT

---

<a id="zh-TW"></a>

# Bug Zoo（繁體中文）

把你的錯誤訊息變成可收集的怪物。

[English](#bug-zoo) | **繁體中文**

![Bug Zoo 示範](docs/demo.zh-TW.gif)

*bug 出現、你修好它、捕捉成功、隊伍對戰。內容是真實輸出，僅省略了 Node 內部的堆疊行。*

## 安裝

```bash
npm install -g bug-zoo
bugzoo setup
```

需要 Node.js 18 以上，沒有任何相依套件。

第一次執行任何 `bugzoo` 指令時，會詢問三件事：

1. **語言**：繁體中文或 English
2. **玩家名稱**：會顯示在排行榜與天梯上（可以按 Enter 略過）
3. **自動捕捉**：開啟後不用再打 `bugzoo run`

> npm 的安裝腳本沒辦法互動提問，所以問答放在第一次執行，之後隨時可以用 `bugzoo setup` 修改。

## 指令表

| 指令 | 功能 |
|---|---|
| `bugzoo setup` | 語言、玩家名稱、自動捕捉（`--lang`、`--name`、`--auto on\|off`） |
| `bugzoo run <指令…>` | 執行指令，失敗時會出現 bug。開啟自動捕捉後就不用打 |
| `bugzoo dex` | 你的圖鑑與等著被捕捉的 bug |
| `bugzoo team` | 你最強的捕獲，含戰鬥力明細 |
| `bugzoo battle` | 列出天梯、好友與練習對手，輸入編號就開打 |
| `bugzoo battle <代碼\|網址\|檔案\|名稱>` | 直接和某個好友代碼、連結、檔案或天梯玩家對戰 |
| `bugzoo friend` | 列出好友。也可用 `code`、`add <代碼\|網址\|檔案\|名稱>`、`remove <名稱>`、`refresh` |
| `bugzoo ladder` | 查看天梯 |
| `bugzoo rank` | 你的分數與稱號 |
| `bugzoo share` | 輸出可分享的分數與隊伍檔（只有數量，不含錯誤內容） |
| `bugzoo leaderboard <資料夾>` | 用分享檔產生分數排行榜 |
| `bugzoo scan` | 掃描這個專案：規模與最多檔案依賴的模組 |
| `bugzoo hook <shell>` | 輸出 bash、zsh、fish、PowerShell 的包裝設定片段 |
| `bugzoo export` | 把圖鑑匯出成 SVG，放到你的個人頁 |

## 自動捕捉（不用打 bugzoo run）

開啟後，平常怎麼執行就怎麼執行：

```bash
node app.js
```

你在終端機**手動執行**的程式，不管哪個專案、哪個資料夾都會被捕捉。這由兩層機制完成：

| 機制 | 涵蓋 | 做法 |
|---|---|---|
| Node 預載 | 從終端機啟動的任何 `node` 程式 | 使用者環境變數 `NODE_OPTIONS` 載入 `src/register.js`，程式結束時記錄 |
| 指令包裝 | `python`、`py`、`pytest`、`go`、`cargo`、`java`、`mvn`、`gradle`、`dotnet`、`ruby`、`php`、`deno`、`bun`、`make`、`npm`、`npx`、`pnpm`、`yarn` | cmd 的 `doskey`（透過 `AutoRun`）、PowerShell 設定檔區塊、bash/zsh 設定檔區塊 |

- **只算主動執行的**：Node 預載需要有終端機（TTY），指令包裝只對你打的那一行生效。編輯器、打包工具等背景程式不會被算進去，`node_modules` 與 npm 本身也不會被追蹤。
- 正常通過且沒有未解決 bug 的程式，不會寫入、也不會輸出任何東西。
- `bugzoo setup` 會先列出會改動什麼並詢問你。想全部還原：`bugzoo setup --auto off`；暫時停用：`BUGZOO_DISABLE=1`。
- 開啟後需要**重新開啟終端機**才會生效。
- **限制**：上表以外的語言要用 `bugzoo run <指令>`；從 IDE 的執行按鈕啟動（沒有終端機）不會被捕捉；被包裝的指令，其 stderr 會經過 bugzoo，少數工具的 stderr 可能會失去顏色。
- Windows PowerShell 的執行原則是 `Restricted` 時會忽略設定檔，`bugzoo setup` 會提醒你。

## 捕捉規則

失敗的執行只會讓 bug **出現**。你要修好程式，再於同一個資料夾執行同一條指令，才算捕捉：

| 重跑結果 | 判定 |
|---|---|
| 乾淨通過 | 捕捉成功 |
| 還是同一個 bug | 牠還在 |
| 部分 bug 消失，沒有新的 | 消失的那些捕捉成功，其餘仍在 |
| 出現不同或更多的 bug | 逃走了，新的 bug 變成目標 |

「同一條指令」會忽略旗標與純數字參數，所以 `node app.js` 和 `node ./app.js --debug --port 3000` 視為相同。

## 戰鬥力

每隻 bug 都有戰鬥力，在牠還活著時記錄下來，捕捉成功時變成戰利品。同一種 `TypeError` 在兩個專案裡抓到，戰鬥力會不一樣。

`戰鬥力 = 稀有度基礎值 × (1 + 堆疊深度 + 影響範圍 + 專案規模 + 錯誤率)`

| 因子 | 怎麼量 | 上限 |
|---|---|---|
| 堆疊深度 | 錯誤堆疊裡有幾個專案內的檔案 | +1.0 |
| 影響範圍 | 出錯的檔案被專案內多少檔案引用（會掃描整個專案） | +1.0 |
| 專案規模 | 專案總行數（取對數） | +0.5 |
| 錯誤率 | 這條指令的失敗次數 ÷ max(執行次數, 5)，一直踩同一個 bug 會越來越強 | +1.0 |

基礎值：普通 10、罕見 25、稀有 60、傳說 150。前三強戰利品組成你的隊伍。

## 對戰與天梯

```bash
bugzoo battle
```

會列出**天梯**、你的**好友**和**練習**對手，輸入編號就開打。

```
天梯
 1. #1   bugslayer          戰鬥力  160  <計入排名>
 2. #2   dev-dana           戰鬥力  110  <計入排名>
 3. #3   rookie             戰鬥力   10  <計入排名>
  . #4   你                 戰鬥力   16  <你>

好友
 4.      小明               戰鬥力   25  <代碼>

練習
 5.      Legacy Codebase    戰鬥力  195
要跟誰對戰？（輸入編號，q 離開）
```

- 隊伍依序單挑，存活者保留剩餘血量。戰鬥用雙方隊伍當亂數種子，所以雙方算出的結果一致，也不能重複洗運氣。
- **天梯直接從這個 GitHub repo 讀取**（`leaderboard/`），不用 clone、也沒有我們自己的伺服器。連不上 GitHub 時會用上次儲存的副本。
- **打贏排名在你上面 3 名以內的人，就奪下他的名次。** CLI 會印出一個預先填好的 GitHub Issue 連結，按下 *Submit new issue*，工作流程會用你分享的隊伍重新播放戰鬥，一兩分鐘內更新天梯。
- 和好友、練習對手對戰只是切磋，不會影響天梯。
- 玩家名稱歸第一個用它送出的 GitHub 帳號所有，沒有人能冒用別人的名字。

## 好友

沒有帳號、沒有伺服器：好友就是一支你拿得到的隊伍。

```bash
bugzoo friend code                 # 你的好友代碼，貼到任何聊天室
bugzoo friend add BZ1.xxxxxxxx     # 用對方的代碼加好友
bugzoo friend add alice            # 加天梯上的任何人，隊伍會保持最新
bugzoo friend add https://…/bob.json   # 分享檔的連結，每次都會更新
bugzoo friend add ./carol.json     # 本機檔案
bugzoo friend remove alice
```

好友代碼是隊伍的快照（名稱加上最多 3 隻怪物）。天梯名稱、連結與檔案會在你開啟 `bugzoo battle` 時更新。匯入的內容，戰鬥力都會被限制在該稀有度能達到的上限內。

## 分數排行榜（不用資料庫）

首次捕捉依稀有度給分（普通 10、罕見 25、稀有 60、傳說 200），重複捕捉每次 +2。

```bash
bugzoo share --name alice --out leaderboard/scores/alice.json
```

分享檔只含數量與隊伍，不含錯誤訊息、路徑或指令。GitHub Action 會執行 `bugzoo leaderboard leaderboard/scores --out LEADERBOARD.md` 並提交表格。分數由數量重新計算，且為自行回報，所以這是「朋友之間玩」等級的排行榜，不是防篡改的。

想自己架一個天梯？Fork 這個 repo，並設定 `BUGZOO_LADDER_REPO=owner/repo`（或用 `BUGZOO_LADDER_DIR` 指向本機資料夾）。

## 練習場

沒有專案也能玩：`playground/` 裡有三支故意壞掉的程式，說明見 [playground/GUIDE.md](playground/GUIDE.md)。

```bash
cd playground
node ../bin/bugzoo.js run node app.js
```

## 運作原理

- **解析**：找出 stderr 裡最後一個 `SomethingError: message`（Node 與 Python 的堆疊都適用），其次是錯誤代碼（`ENOENT`、`SIGSEGV`），最後是訊號。
- **身分**：怪物由錯誤類型加上「去掉數字、引號內名稱與路徑的訊息」的雜湊決定，所以 `Cannot read 'a'` 與 `Cannot read 'b'` 是同一隻。
- **稀有度**：普通（`TypeError`、`KeyError`…）、罕見（`ENOENT`、`RangeError`…）、稀有（其他）、傳說（`SIGSEGV`、`ENOSPC`、`StackOverflow`…）。
- **儲存位置**：`~/.bugzoo/dex.json`（可用 `BUGZOO_HOME` 覆寫）。除非你主動分享或送出，不會有任何資料離開你的電腦。
- **示範 GIF** 由 `python tools/make-gif.py` 依真實輸出渲染（需要 Pillow 與 Windows 字型）；`node demo/demo.js` 會在終端機即時播放類似的流程。

## 之後想做的

- 同一隻怪物遇見很多次後會進化
- 支援更多語言的錯誤格式（Go、Rust、Java）

## 授權

MIT
