# Bug Zoo

Turn your error messages into collectible monsters.

## Get it in 2 minutes

You do not need to know how to code to try it. Pick the line that fits you:

| You have | Do this |
|---|---|
| **VS Code** | Press Ctrl+Shift+X, search **Bug Zoo**, click **Install**. Done. |
| **Nothing installed** | Download one file, no Node.js needed. Steps right below. |
| **Node.js** | Try it: `npx bug-zoo run node app.js`. Keep it: `npm install -g bug-zoo` |

**Download one file, step by step**

1. Open the [latest release](https://github.com/MilkteaTW1/bug-zoo/releases/latest) and download the file for your computer: **Windows** `bugzoo-win-x64.exe` · **Mac (Apple chip)** `bugzoo-macos-arm64` · **Linux** `bugzoo-linux-x64`.
2. Open a terminal in the folder where you saved it. **Windows:** open the folder, click its address bar, type `cmd`, press Enter. **Mac / Linux:** open Terminal and type `cd ~/Downloads`.
3. Run it on any program that crashes. **Windows:** `.\bugzoo-win-x64.exe run python app.py` · **Mac / Linux:** run `chmod +x bugzoo-macos-arm64` once, then `./bugzoo-macos-arm64 run python app.py`.

A monster appears when the program fails. Fix your code, run the same command again, and it is caught. (`python app.py` can be any command: `node app.js`, `npm test`, `go run .` ...)

**If Windows or macOS shows a warning, that is expected.** The file is not code-signed (that costs money), so Windows says *Windows protected your PC*: click **More info**, then **Run anyway**. On a Mac, open *System Settings > Privacy & Security* and click **Open Anyway**. The `.sha256` file next to each download lets you check that the file is untouched.

[![Tests](https://github.com/MilkteaTW1/bug-zoo/actions/workflows/test.yml/badge.svg)](https://github.com/MilkteaTW1/bug-zoo/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/bug-zoo)](https://www.npmjs.com/package/bug-zoo) [![license](https://img.shields.io/npm/l/bug-zoo)](LICENSE)

**Catch bugs, build a team, battle your friends.**

- **Fix to catch**: a crash spawns a monster; fix the code and re-run the command to catch it.
- **Power from your real project**: stack depth, blast radius, size and failure rate decide how strong it is.
- **Battle friends, no server**: climb a ladder or fight a friend's code; no accounts, no database.

*For developers who stare at stack traces all day (their own, or their AI assistant's) and would like it to feel a bit more like a game.*

**English** | [繁體中文](#zh-TW)

Website: [inkacuity.com/projects/bug-zoo](https://inkacuity.com/projects/bug-zoo) · 專案介紹頁

![Bug Zoo demo](docs/demo.en.gif)

*A bug appears, you fix it, it is caught, your team fights. Real output; Node-internal stack frames trimmed.*

## Install

Pick the easiest one for you:

- **In VS Code (one click):** search for **Bug Zoo** in the Extensions view. Nothing else to install.
- **Try it without installing** (needs Node.js 18+): `npx bug-zoo run node app.js`. Works with any command, e.g. `npx bug-zoo run python main.py`.
- **No Node.js? Download one file** from the [latest release](https://github.com/MilkteaTW1/bug-zoo/releases/latest): `bugzoo-win-x64.exe`, `bugzoo-macos-arm64` or `bugzoo-linux-x64`, then run it in a terminal (`./bugzoo-linux-x64 run python main.py`). It is not code-signed, so Windows SmartScreen or macOS may warn once. Everything works except `setup --auto` and `setup --ai`, which hook into Node and need the npm install. Verify it with the `.sha256` file next to it.
- **Install for good:**

```bash
npm install -g bug-zoo
bugzoo setup
```

Setup is optional: the first run asks the same questions by itself.

Requires Node.js 18+. No dependencies. `bugzoo setup` asks for your language (繁體中文 / 简体中文 / English) and a player name for the leaderboards. It changes nothing on your machine except Bug Zoo's own data file.

Change the language any time with one line: `bugzoo lang zh-CN` (`bugzoo lang` lists them). In VS Code use the globe button in the Bug Zoo view header.

## Play in 30 seconds

```bash
bugzoo run node app.js    # 1. your program crashes: a bug appears
# 2. fix the bug in your code
bugzoo run node app.js    # 3. same command, clean run: caught!
```

Works with any command (`bugzoo run python main.py`, `bugzoo run npm test`, ...). No project to try it on? `playground/` has three broken programs; see [playground/GUIDE.md](playground/GUIDE.md).

## VS Code extension

Prefer to watch your bugs roam around the editor? The [VS Code extension](vscode/) turns failing terminal commands into monsters in the side bar, with the ladder, friends and animated fights built in. It shares the same data file as the CLI.

**Install:** search for **Bug Zoo** in the VS Code Extensions view, or [get it from the Marketplace](https://marketplace.visualstudio.com/items?itemName=MilkteaTW1.bug-zoo-vscode).

[![Watch the 56-second promo video](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/promo-poster.en.jpg)](https://github.com/MilkteaTW1/bug-zoo/blob/main/vscode/docs/bug-zoo-promo.en.mp4)

*Click to watch the 56-second promo video: the catch loop, then what's new in v0.5 (50 species, the shop, evolution, teams and the Tower), in VS Code and in the terminal.*

**A crash spawns a monster. Fix it, and it is caught.**

![A failing command spawns a wild monster; the fix catches it](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/catch.gif)

**Climb the ladder with a turn-by-turn battle replay.**

![Fighting a ladder player and submitting the win](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/fight.gif)

**Add friends, fight them any time, share your team with a code.**

![Adding a friend, fighting them and copying your friend code](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/friends.gif)

**Earn coins, shop for food and furniture, and feed your monsters until they evolve.**

![Shop: buying a pizza and a cushion, then feeding a monster that evolves](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/shop.gif)

**Build a team of three, climb the Tower, and track quests and achievements.**

![Team picker, the Tower, quests and achievements](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/solo.gif)

## Commands

| Command | What it does |
|---|---|
| `bugzoo run <command…>` | Run a command; if it fails a bug appears; fix it and re-run to catch it |
| `bugzoo dex` | Your collection and the bugs waiting to be caught |
| `bugzoo team` | Your monsters, numbered, with element, power, form and who fights. `team set 3 1 2` picks your fighters, `team auto` goes back to the strongest |
| `bugzoo quests` | Today's three quests and your progress |
| `bugzoo tower` | The solo Tower: the next floor and its enemies. `tower fight` takes it on with your lineup |
| `bugzoo nick <monster> [name]` | Give a caught monster a nickname |
| `bugzoo shop` / `buy <item>` / `feed <monster> <food>` | Spend coins on food and furniture; affection makes monsters evolve |
| `bugzoo achievements` | Your 30 achievements |
| `bugzoo battle` | Shows the ladder, your friends and a practice opponent; type a number to fight. `--card f.svg` saves a shareable result card |
| `bugzoo battle <code\|url\|file\|name>` | Fight one friend code, link, file or ladder player directly |
| `bugzoo friend` | List friends. Also `code`, `add <code\|url\|file\|name>`, `remove <name>`, `refresh` |
| `bugzoo ladder` | Show the ladder |
| `bugzoo ladder join` | Join the ladder in one step: prints (and offers to open) the pre-filled GitHub issue for your entry fight |
| `bugzoo rank` | Your score and title |
| `bugzoo lang [code]` | Show the languages, or switch in one line: `bugzoo lang zh-CN` (changes nothing else) |
| `bugzoo setup` | Language, player name, optional automatic capture and the AI-assistant hook (`--lang`, `--name`, `--auto on\|off`, `--ai on\|off`) |
| `bugzoo share` | Write a shareable score + team file (counts only, no error text) |
| `bugzoo leaderboard <dir>` | Build a score leaderboard from shared files |
| `bugzoo scan` | Scan this project: size and most-depended-on modules |
| `bugzoo hook <shell>` | Print a wrapper snippet for bash, zsh, fish or PowerShell |
| `bugzoo export` | Export the bestiary as an SVG for your profile |

## Share your zoo

Everything you earn can be pasted somewhere:

```bash
bugzoo export zoo.svg    # a card grid of your bestiary, ready for a profile README
bugzoo battle --card r.svg   # a result card for the fight you just had
bugzoo friend code       # your team as one pasteable code
bugzoo rank              # your score and title
```

![A bestiary exported with bugzoo export](docs/bestiary.en.svg)

*A sample `bugzoo export`: rarity colours the border, uncaught monsters are faded.*

![A battle result card](docs/battle.en.svg)

*A sample `bugzoo battle --card`. Fights are deterministic, so the same two teams always give the same card.*

## Elements and your lineup

Every monster has one of five elements, worked out from its error type (a `SyntaxError` is Syntax, a `TypeError` Logic, `ENOENT` Environment, `ECONNREFUSED` Network, `SIGSEGV` Crash; any other type gets one from its name). They form a ring: each beats the next two for x1.4 damage and takes x0.7 from the two before it.

| Element | Beats |
|---|---|
| Syntax | Logic, Environment |
| Logic | Environment, Network |
| Environment | Network, Crash |
| Network | Syntax, Crash |
| Crash | Syntax, Logic |

You choose who fights: `bugzoo team` lists your monsters with numbers, `bugzoo team set 3 1 2` sends those three, `bugzoo team auto` goes back to the three strongest. Battle lines show every opponent's elements, and a friend's or ladder player's monsters get theirs from their error type too, so nobody can claim a different one. Fights are still deterministic, but the same two teams now fight differently than in versions before this one.

## The Tower (solo)

No friends yet? Climb the Tower: twelve floors, the same enemies for everybody (one monster on floors 1-2, two on floors 3-5, three from floor 6). `bugzoo tower` shows the next floor, its enemies, their elements and power; `bugzoo tower fight` sends your current lineup. A fight is deterministic, so a floor you lost needs a *different* lineup, not another try: read the enemy elements, then pick counters with `bugzoo team set`. Clearing floors 3 and 12 unlocks achievements.

## Daily quests, shiny catches and clean runs

- **Quests:** every day brings three small goals (catch a bug, meet a new kind, get clean runs of commands you fixed, fight or win a battle). `bugzoo quests` shows them; finishing one is announced right after the run or fight that did it. Everyone gets the same three on the same date.
- **Shiny catch:** fix a bug within 10 minutes of it appearing and the catch is shiny. It is a badge only; it never changes power.
- **Clean runs:** a command you once fixed keeps counting every time it runs clean, which feeds the quests and the *Steady hands* achievement. Commands that never failed are not tracked, so healthy builds cost nothing.
- Quests, shiny catches and clean runs never change power or the ladder.

## Species, companions and nicknames

- **50 species.** Every new monster is one of 50 species (Slime, Moth, Owl, Dragon, Golem, Hedgehog...), each with its own face. The species shows next to the name, and `bugzoo dex` ends with how many you have caught (`Species: 12/50`). Catching 10, 25 and all 50 unlocks achievements. Monsters you already caught keep their old look.
- **Companions.** Run 5 commands in a row without an error and a random companion joins your zoo already caught, ready to fight. A day hands out at most 3, and any error resets the count, so it rewards clean work, not spam.
- **Nicknames.** `bugzoo nick <monster> <nickname>` renames a caught monster (no nickname clears it). In VS Code, double-click it.
- **Holidays.** Catch a bug on New Year's Day, Valentine's Day, Halloween or Christmas (your own calendar) for the Holiday bug achievement.

## Catching a bug

A failing run only *spawns* a bug. You catch it by fixing the code and re-running the same command in the same folder:

| Re-run result | Outcome |
|---|---|
| Clean run | Caught |
| Same bug | Still there |
| Some bugs gone, nothing new | Those are caught, the rest stay wild |
| A different or additional bug | Escaped - the new bug becomes your target |

"Same command" ignores flags and numeric arguments, so `node app.js` and `node ./app.js --debug --port 3000` are the same target.

## Automatic capture (optional)

If you would rather not type `bugzoo run`, turn this on:

```bash
bugzoo setup --auto on
```

It is **off unless you ask for it**, because it changes your environment: a `NODE_OPTIONS` user environment variable and small blocks in your terminal profiles. `bugzoo setup` lists exactly what it will change and asks first. Undo everything any time with `bugzoo setup --auto off`.

With it on, whatever you run **by hand** in a terminal is captured, in any project, in any folder:

| Layer | Covers | How |
|---|---|---|
| Node preload | any `node` program started from a terminal | `NODE_OPTIONS` loads `src/register.js`, which records the run on exit |
| Command wrappers | `python`, `py`, `pytest`, `go`, `cargo`, `java`, `mvn`, `gradle`, `dotnet`, `ruby`, `php`, `deno`, `bun`, `make`, `npm`, `npx`, `pnpm`, `yarn` | cmd `doskey` macros via `AutoRun`, a PowerShell profile block, or a bash/zsh profile block |

- **Only actively started runs count.** The Node preload requires a terminal (TTY); wrappers only apply to lines you type. Editors, bundlers and background tools are ignored, and `node_modules` and npm itself are never tracked.
- A healthy program with no pending bug writes nothing and prints nothing.
- Open a new terminal after turning it on. Pause it with `BUGZOO_DISABLE=1`.
- **Limits**: a language not in the list above needs `bugzoo run <command>`. Runs started by an IDE's Run button (no terminal) are not captured. Wrapped commands have their stderr and stdout piped through bugzoo, so a few tools may drop colours.
- **Commands that ask questions** (`npm publish`, `npm login`, `npm init`, `npx`, ...) are passed straight through untouched and not recorded, because capturing their output would stop them prompting. `BUGZOO_DISABLE=1` does the same for any command, which is also the fix for programs with a full-screen terminal UI.
- **What is tested**: the whole test suite runs in CI on Windows, macOS and Linux (Node 18, 20, 22), and the bash wrappers run in a real bash there. The cmd and PowerShell wrappers were checked by hand on Windows; zsh and fish are covered as generated text only.
- Windows PowerShell ignores profiles when its execution policy is `Restricted`; `bugzoo setup` tells you if so.

## When your AI assistant runs the code (Claude Code)

An AI assistant runs commands without a terminal, so automatic capture stays quiet for them. A hook fills that gap:

```bash
bugzoo setup --ai on     # adds Bash hooks to ~/.claude/settings.json; --ai off removes them
```

Restart Claude Code, then work as usual:

1. The assistant runs your code and it fails: **a monster appears** in your conversation.
2. The assistant fixes it and re-runs the same command: **caught**, with power, evolution and achievements like any other run.

- The card is shown **to you only**. It is sent as the hook's `systemMessage`, never as context for the model, so it costs no tokens and cannot confuse the assistant.
- Same identity as by hand: `node app.js` run by the assistant and by you is the same target, so it can fail in one place and be caught in the other. `cd proj && node app.js 2>&1 | tail` counts as `node app.js`.
- Limits: Claude Code only, and only its Bash tool. A command that also changes files (`printf ... > f.js && node f.js`) is a different command from `node f.js`, so it will not match a later clean run. Checked on Windows with Claude Code desktop; the hook format follows Claude Code's documentation.
- Bug Zoo only edits the hooks it added, refuses to touch a settings file that is not plain JSON, and `--ai off` removes exactly those entries.

**Other assistants** (checked against their documentation on 2026-10-14, not tried live):

| Assistant | Post-command hook | Why it is not supported yet |
|---|---|---|
| Cursor | `afterShellExecution` | The event carries the command and its output but **no exit code**, and there is no documented way to show a message only to the person, so a monster would have nowhere to appear. |
| Gemini CLI | `AfterTool` (shell tool) | It has a `systemMessage` shown to the user, but the shell tool's `tool_response` fields (exit code, `llmContent`, `returnDisplay`) are not documented well enough to detect a failure reliably. |

If you use one of these, [open an issue](https://github.com/MilkteaTW1/bug-zoo/issues) with a sample hook payload and it can be added.

## Power and fair play

Every bug has a power, snapshotted while it is alive and banked as a trophy when you catch it. Catching the same `TypeError` in two projects gives two trophies with different power.

`power = base(rarity) x (1 + depth + blast + size + rate)`

| Factor | Measured by | Max |
|---|---|---|
| depth | project files in the stack trace | +1.0 |
| blast | project files that import the failing file (the whole project is scanned) | +1.0 |
| size | total lines of code in the project (log scale) | +0.5 |
| rate | failures / max(runs, 5) of that command; a bug you keep hitting grows | +1.0 |

Base: common 10, uncommon 25, rare 60, legendary 150. Your top 3 trophies form your team.

**This is a game, not a skill test.** Power rewards bugs that keep failing, so it can be gamed by breaking things on purpose. Failures of one command count at most once a minute, which only slows that down. Scores and teams are self-reported: the ladder replays fights from the teams you submit but cannot verify how you earned them. Treat rankings as fun between friends, not as proof of how well you debug.

## Evolution and achievements

Every monster has three forms, and **affection** decides which one. You earn coins by playing, spend them in the shop on food and furniture, and feed your monsters. Each form is 1.5 times as strong as the one before.

| Affection | Form | Power |
|---|---|---|
| 0-29 | base | x1.00 |
| 30 | Evolved `*` | x1.50 |
| 100 | Ascended `**` | x2.25 |

The bonus is applied when a team is formed (`battle`, `friend code`, `share`); a trophy's recorded power never changes. `bugzoo team` shows each monster's form and how much affection is left until the next one. Monsters you had before this system keep the form their catches had earned.

## The shop (coins, food, furniture)

- **Coins:** a catch pays by its power (at least 3), a shiny catch +5, a finished quest +15, a companion +10, a won fight +10 (3 for a loss, nothing for the practice dummy), and a cleared tower floor 10 + 5 per floor.
- **Food:** `bugzoo shop` lists it, `bugzoo buy <item>` puts it in your bag, `bugzoo feed <monster> <food>` gives it to a monster you caught. A Bug Snack is +4 affection, a Cookie +10, a Pizza +24, a Coffee +40 and a Golden Cake +100. Every monster **loves** one food, and that one counts double (`bugzoo shop` shows which).
- **Furniture:** six pieces, bought once, shown in your zoo in VS Code. Each one makes every treat 10% sweeter.
- **VS Code:** the Shop tab buys and feeds (Feed asks which monster gets the treat), hearts show next to each monster, and you can drag caught monsters around the zoo with the mouse.

`bugzoo achievements` lists 30 achievements, from your first catch to a 7-day streak, a legendary, or your first win. They are unlocked as you play and announced right after the run that earned them.

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
- **New here? Run `bugzoo ladder join`.** It needs a player name and one catch, fights last place for you and prints the pre-filled issue link. You land on the ladder win or lose, then climb. (`bugzoo battle` does the same through a fight you pick.)
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

The file contains only counts and your team: no error messages, paths or commands. A GitHub Action runs `bugzoo leaderboard leaderboard/scores --out LEADERBOARD.md` and commits the table.

Running your own ladder? Fork the repo and set `BUGZOO_LADDER_REPO=owner/repo` (or `BUGZOO_LADDER_DIR` for a local folder).

## How it works

- **Parsing**: recognises the error formats of Node, Python, pytest, Java, .NET, Go, Rust, TypeScript, gcc/clang, Gradle and npm, falling back to error codes (`ENOENT`, `SIGSEGV`) and signals. stdout is the backup source for tools that report failures there.
- **Identity**: the monster is derived from a hash of the error type plus the message with numbers, quoted names and paths stripped, so `Cannot read 'a'` and `Cannot read 'b'` are the same creature.
- **Rarity**: common (`TypeError`, `KeyError`...), uncommon (`ENOENT`, `RangeError`...), rare (anything else), legendary (`SIGSEGV`, `ENOSPC`, `StackOverflow`...).
- **Storage**: `~/.bugzoo/dex.json` (override with `BUGZOO_HOME`). Nothing leaves your machine unless you share or submit it.
- **Demo GIFs** are rendered from real output by `python tools/make-gif.py` (needs Pillow and Windows fonts). `node demo/demo.js` plays a similar session live.

## Roadmap

- Evolution when you meet the same monster many times
- More languages' error formats

## Add your language

Each language is one file in [`src/locales/`](src/locales). To add yours:

```bash
npm run lang -- ja 日本語     # creates src/locales/ja.js from the English text
# translate "help", "messages" and "names" (monster names) in that file
npm run lang:check            # shows what is still English
npm test
```

Nothing else needs editing: the language shows up in `bugzoo setup`, is picked from the system locale automatically, and also translates the [VS Code extension](vscode/) (its texts are the `vs.*` keys in the same file). Optionally add `vscode/package.nls.<locale>.json` for the extension's command names. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributors

Thanks to everyone who helped:

- [@cjy851096](https://github.com/cjy851096): Simplified Chinese (zh-CN) ([#5](https://github.com/MilkteaTW1/bug-zoo/pull/5))

Want to be on this list? Pick a [good first issue](https://github.com/MilkteaTW1/bug-zoo/labels/good%20first%20issue) and read [CONTRIBUTING.md](CONTRIBUTING.md). Adding a language is one file.

## Need something custom?

Custom features, integrations or setup help are available. See [墨鋒 Inkacuity](https://inkacuity.com/projects/bug-zoo) or email [ink@inkacuity.com](mailto:ink@inkacuity.com).

## License

MIT

---

<a id="zh-TW"></a>

# Bug Zoo（繁體中文）

把你的錯誤訊息變成可收集的怪物。

## 兩分鐘拿到它

不用會寫程式也能試玩。挑一個符合你的:

| 你有 | 這樣做 |
|---|---|
| **VS Code** | 按 Ctrl+Shift+X,搜尋 **Bug Zoo**,按**安裝**。完成。 |
| **什麼都沒裝** | 下載一個檔案,不需要 Node.js。步驟在下面。 |
| **Node.js** | 先試玩:`npx bug-zoo run node app.js`。長期使用:`npm install -g bug-zoo` |

**下載一個檔案,一步一步來**

1. 打開[最新版本](https://github.com/MilkteaTW1/bug-zoo/releases/latest),下載你電腦對應的檔案:**Windows** `bugzoo-win-x64.exe` · **Mac(蘋果晶片)** `bugzoo-macos-arm64` · **Linux** `bugzoo-linux-x64`。
2. 在存放檔案的資料夾打開終端機。**Windows:**打開資料夾,點網址列,輸入 `cmd` 後按 Enter。**Mac / Linux:**打開「終端機」,輸入 `cd ~/Downloads`。
3. 拿一個會當機的程式來跑。**Windows:**`.\bugzoo-win-x64.exe run python app.py` · **Mac / Linux:**先執行一次 `chmod +x bugzoo-macos-arm64`,再執行 `./bugzoo-macos-arm64 run python app.py`。

程式失敗時就會出現怪物。修好程式、重跑同一條指令,牠就被抓到了。(`python app.py` 可以換成任何指令:`node app.js`、`npm test`、`go run .` ...)

**Windows 或 macOS 跳出警告是正常的。**檔案沒有程式碼簽章(簽章要花錢),所以 Windows 會顯示「Windows 已保護您的電腦」:按**其他資訊**,再按**仍要執行**。Mac 請到「系統設定 > 隱私權與安全性」,按**強制打開**。每個下載旁邊的 `.sha256` 檔可以用來確認檔案沒被改過。

[![Tests](https://github.com/MilkteaTW1/bug-zoo/actions/workflows/test.yml/badge.svg)](https://github.com/MilkteaTW1/bug-zoo/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/bug-zoo)](https://www.npmjs.com/package/bug-zoo) [![license](https://img.shields.io/npm/l/bug-zoo)](LICENSE)

**抓 bug、組隊、和朋友對戰。**

- **修好才抓得到**：程式一壞就出現怪物，修好程式、重跑同一條指令就能捕捉。
- **戰鬥力來自你的真實專案**：堆疊深度、影響範圍、專案規模與失敗頻率，決定牠有多強。
- **和朋友對戰，不需要伺服器**：爬天梯，或直接挑戰朋友的代碼；沒有帳號、沒有資料庫。

*給每天盯著錯誤堆疊的開發者（不管是自己寫的，還是 AI 寫的），讓它多一點遊戲的感覺。*

[English](#bug-zoo) | **繁體中文**

![Bug Zoo 示範](docs/demo.zh-TW.gif)

*bug 出現、你修好它、捕捉成功、隊伍對戰。內容是真實輸出，僅省略了 Node 內部的堆疊行。*

## 安裝

挑最簡單的一種:

- **在 VS Code 裡(一鍵):**在擴充功能搜尋 **Bug Zoo**,不用再裝別的東西。
- **先試玩、不安裝**(需要 Node.js 18 以上):`npx bug-zoo run node app.js`。任何指令都能用,例如 `npx bug-zoo run python main.py`。
- **沒有 Node.js?下載一個檔案就好**:到[最新版本](https://github.com/MilkteaTW1/bug-zoo/releases/latest)下載 `bugzoo-win-x64.exe`、`bugzoo-macos-arm64` 或 `bugzoo-linux-x64`,在終端機執行(`./bugzoo-linux-x64 run python main.py`)。沒有程式碼簽章,Windows SmartScreen 或 macOS 可能警告一次。除了 `setup --auto` 和 `setup --ai`(需要掛進 Node,請用 npm 安裝)之外功能都能用。旁邊的 `.sha256` 檔可以驗證檔案。
- **正式安裝:**

```bash
npm install -g bug-zoo
bugzoo setup
```

`setup` 可以不做:第一次執行時會自己問同樣的問題。

需要 Node.js 18 以上，沒有任何相依套件。`bugzoo setup` 會詢問語言（繁體中文／简体中文／English）和排行榜用的玩家名稱，除了 Bug Zoo 自己的資料檔，不會改動你電腦上的任何東西。

之後想換語言，一行就好：`bugzoo lang zh-CN`（`bugzoo lang` 會列出所有語言）。在 VS Code 裡則按 Bug Zoo 面板標題列的地球按鈕。

## 30 秒玩一次

```bash
bugzoo run node app.js    # 1. 你的程式壞了：出現一隻 bug
# 2. 去把程式裡的 bug 修好
bugzoo run node app.js    # 3. 同一條指令，乾淨通過：捕捉成功！
```

任何指令都行（`bugzoo run python main.py`、`bugzoo run npm test`…）。沒有專案可以試？`playground/` 裡有三支故意壞掉的程式，說明見 [playground/GUIDE.md](playground/GUIDE.md)。

## VS Code 擴充套件

想看 bug 在編輯器裡跑來跑去？[VS Code 擴充套件](vscode/)會把終端機裡失敗的指令變成側邊欄的怪物，內建天梯、好友和動畫對戰，和 CLI 共用同一份資料檔。

**安裝:**在 VS Code 擴充套件面板搜尋 **Bug Zoo**,或[到 Marketplace 安裝](https://marketplace.visualstudio.com/items?itemName=MilkteaTW1.bug-zoo-vscode)。

[![觀看 56 秒宣傳影片](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/promo-poster.zh.jpg)](https://github.com/MilkteaTW1/bug-zoo/blob/main/vscode/docs/bug-zoo-promo.zh.mp4)

*點圖觀看 56 秒宣傳影片：先看抓怪流程，再看 v0.5 的新內容（50 種怪物、商店、進化、組隊與高塔），VS Code 和終端機都有拍到。*

**當機就生出怪物，修好它就能捕獲。**

![指令失敗出現野生怪物，修好後捕獲](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/catch.zh.gif)

**爬天梯，還有逐回合的戰鬥重播。**

![挑戰天梯玩家並提交勝利](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/fight.zh.gif)

**加好友、隨時開戰、用代碼分享你的隊伍。**

![加好友、對戰、複製好友代碼](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/friends.zh.gif)

**打怪賺金幣，買食物和家具，餵到怪物進化。**

![商店：買披薩和靠墊，餵食後怪物進化](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/shop.zh.gif)

**組三隻的隊伍、爬高塔，看任務與成就。**

![隊伍、高塔、任務與成就](https://raw.githubusercontent.com/MilkteaTW1/bug-zoo/main/vscode/docs/solo.zh.gif)

## 指令表

| 指令 | 功能 |
|---|---|
| `bugzoo run <指令…>` | 執行指令，失敗時出現 bug；修好後重跑就能捕捉 |
| `bugzoo dex` | 你的圖鑑與等著被捕捉的 bug |
| `bugzoo team` | 你的怪物清單(有編號)：屬性、戰鬥力、型態與誰會出戰。`team set 3 1 2` 自選出戰成員,`team auto` 改回自動挑最強 |
| `bugzoo quests` | 今天的三個任務與進度 |
| `bugzoo tower` | 單人高塔:下一層與敵人的資料。`tower fight` 用你的出戰名單挑戰 |
| `bugzoo nick <怪物> [暱稱]` | 幫已捕捉的怪物取暱稱 |
| `bugzoo shop` / `buy <物品>` / `feed <怪物> <食物>` | 用金幣買食物和家具；好感度讓怪物進化 |
| `bugzoo achievements` | 你的 30 個成就 |
| `bugzoo battle` | 列出天梯、好友與練習對手，輸入編號就開打；`--card f.svg` 會存成可分享的戰鬥結果卡 |
| `bugzoo battle <代碼\|網址\|檔案\|名稱>` | 直接和某個好友代碼、連結、檔案或天梯玩家對戰 |
| `bugzoo friend` | 列出好友。也可用 `code`、`add <代碼\|網址\|檔案\|名稱>`、`remove <名稱>`、`refresh` |
| `bugzoo ladder` | 查看天梯 |
| `bugzoo ladder join` | 一行加入天梯：產生（並可直接開啟）入場賽的 GitHub issue 連結 |
| `bugzoo rank` | 你的分數與稱號 |
| `bugzoo lang [代碼]` | 查看語言清單，或一行切換：`bugzoo lang zh-CN`（不會動到其他設定） |
| `bugzoo setup` | 語言、玩家名稱、選用的自動捕捉與 AI 助手 hook（`--lang`、`--name`、`--auto on\|off`、`--ai on\|off`） |
| `bugzoo share` | 輸出可分享的分數與隊伍檔（只有數量，不含錯誤內容） |
| `bugzoo leaderboard <資料夾>` | 用分享檔產生分數排行榜 |
| `bugzoo scan` | 掃描這個專案：規模與最多檔案依賴的模組 |
| `bugzoo hook <shell>` | 輸出 bash、zsh、fish、PowerShell 的包裝設定片段 |
| `bugzoo export` | 把圖鑑匯出成 SVG，放到你的個人頁 |

## 分享你的動物園

你賺到的一切，都可以貼到別的地方：

```bash
bugzoo export zoo.svg    # 圖鑑的卡片圖，可直接放進個人頁 README
bugzoo battle --card r.svg   # 剛打完那場的戰鬥結果卡
bugzoo friend code       # 把你的隊伍變成一段可貼上的代碼
bugzoo rank              # 你的分數與稱號
```

![用 bugzoo export 匯出的圖鑑](docs/bestiary.zh-TW.svg)

*`bugzoo export` 的範例：稀有度決定邊框顏色，還沒捕捉到的怪物會變淡。*

![戰鬥結果卡](docs/battle.zh-TW.svg)

*`bugzoo battle --card` 的範例。戰鬥是固定的，所以同樣兩支隊伍永遠產生同一張卡。*

## 屬性與出戰名單

每隻怪物都有五種屬性之一,由它的錯誤類型決定(`SyntaxError` 是語法、`TypeError` 是邏輯、`ENOENT` 是環境、`ECONNREFUSED` 是網路、`SIGSEGV` 是崩潰;沒列在表裡的類型會依名稱分到其中一種)。五種屬性連成一圈:每種剋制後面兩種,打出 x1.4 傷害,被前面兩種打則只有 x0.7。

| 屬性 | 剋制 |
|---|---|
| 語法 | 邏輯、環境 |
| 邏輯 | 環境、網路 |
| 環境 | 網路、崩潰 |
| 網路 | 語法、崩潰 |
| 崩潰 | 語法、邏輯 |

誰出戰由你決定:`bugzoo team` 列出帶編號的怪物,`bugzoo team set 3 1 2` 派這三隻,`bugzoo team auto` 改回最強的三隻。對戰時會顯示對手的屬性;朋友或天梯玩家送來的新怪物,也會依錯誤類型自動帶上屬性,沒有人能自己宣稱不同的屬性。對戰結果仍然是確定性的,但同樣兩支隊伍在這個版本之後的打法,會跟舊版不同。

## 高塔(單人)

還沒有朋友?去爬高塔:十二層,每個人遇到的敵人都一樣(第 1-2 層一隻、第 3-5 層兩隻、第 6 層起三隻)。`bugzoo tower` 會顯示下一層、敵人、屬性與戰鬥力;`bugzoo tower fight` 用你目前的出戰名單挑戰。對戰是確定性的,輸掉的樓層不能重打同一組,要換一組:看敵人的屬性,再用 `bugzoo team set` 選出能剋制牠們的怪物。攻下第 3 層和第 12 層會解鎖成就。

## 每日任務、閃光捕捉與乾淨執行

- **任務:**每天有三個小目標(抓一隻 bug、遇見新種類、讓修好過的指令乾淨執行、打或贏一場對戰)。`bugzoo quests` 可以查看;完成時會在那次執行或對戰結束後立刻通知。同一天所有人拿到的任務相同。
- **閃光捕捉:**bug 出現後 10 分鐘內修好,這次捕捉就是閃光。只是徽章,不影響戰鬥力。
- **乾淨執行:**修好過的指令之後每次乾淨執行都會計數,算進任務和「穩穩的」成就。從沒失敗過的指令不會被追蹤,所以健康的建置不會有任何負擔。
- 任務、閃光與乾淨執行都不會改變戰鬥力和天梯。

## 物種、夥伴與暱稱

- **50 種物種。**每隻新怪物都是 50 個物種之一(史萊姆、飛蛾、貓頭鷹、龍、石像、刺蝟……),各有自己的長相。物種會顯示在名字旁,`bugzoo dex` 最後會列出你抓到幾種(`物種:12/50`)。抓到 10 種、25 種和全部 50 種都有成就。已經抓到的怪物外觀不變。
- **夥伴。**連續執行 5 個指令都沒出錯,就會有一隻隨機夥伴直接加入動物園(已經是捕捉狀態,能上場)。每天最多 3 隻,任何一次出錯都會讓計數歸零,獎勵的是乾淨工作,不是洗次數。
- **暱稱。**`bugzoo nick <怪物> <暱稱>` 幫已捕捉的怪物改名(不填暱稱就是清除)。在 VS Code 裡雙擊怪物即可。
- **節日。**在元旦、情人節、萬聖節或聖誕節(依你自己的日曆)抓到 bug,可解鎖「節日 bug」成就。

## 捕捉規則

失敗的執行只會讓 bug **出現**。你要修好程式，再於同一個資料夾執行同一條指令，才算捕捉：

| 重跑結果 | 判定 |
|---|---|
| 乾淨通過 | 捕捉成功 |
| 還是同一個 bug | 牠還在 |
| 部分 bug 消失，沒有新的 | 消失的那些捕捉成功，其餘仍在 |
| 出現不同或更多的 bug | 逃走了，新的 bug 變成目標 |

「同一條指令」會忽略旗標與純數字參數，所以 `node app.js` 和 `node ./app.js --debug --port 3000` 視為相同。

## 自動捕捉（選用）

不想每次都打 `bugzoo run` 的話，可以開啟：

```bash
bugzoo setup --auto on
```

**預設是關的，要你主動開才會啟用**，因為它會改動你的環境：使用者環境變數 `NODE_OPTIONS`，以及終端機設定檔裡的小區塊。`bugzoo setup` 會先列出會改什麼並詢問你。想全部還原隨時可以用 `bugzoo setup --auto off`。

開啟後，你在終端機**手動執行**的程式，不管哪個專案、哪個資料夾都會被捕捉：

| 機制 | 涵蓋 | 做法 |
|---|---|---|
| Node 預載 | 從終端機啟動的任何 `node` 程式 | `NODE_OPTIONS` 載入 `src/register.js`，程式結束時記錄 |
| 指令包裝 | `python`、`py`、`pytest`、`go`、`cargo`、`java`、`mvn`、`gradle`、`dotnet`、`ruby`、`php`、`deno`、`bun`、`make`、`npm`、`npx`、`pnpm`、`yarn` | cmd 的 `doskey`（透過 `AutoRun`）、PowerShell 設定檔區塊、bash/zsh 設定檔區塊 |

- **只算主動執行的**：Node 預載需要有終端機（TTY），指令包裝只對你打的那一行生效。編輯器、打包工具等背景程式不會被算進去，`node_modules` 與 npm 本身也不會被追蹤。
- 正常通過且沒有未解決 bug 的程式，不會寫入、也不會輸出任何東西。
- 開啟後需要**重新開啟終端機**才會生效。暫時停用：`BUGZOO_DISABLE=1`。
- **限制**：上表以外的語言要用 `bugzoo run <指令>`；從 IDE 的執行按鈕啟動（沒有終端機）不會被捕捉；被包裝的指令，其 stderr 與 stdout 會經過 bugzoo，少數工具可能會失去顏色。
- **會問問題的指令**（`npm publish`、`npm login`、`npm init`、`npx` 等）會原封不動直通、也不記錄，因為擷取輸出會讓它們不再詢問。`BUGZOO_DISABLE=1` 可對任何指令達到同樣效果，遇到有全螢幕終端介面的程式也用這個。
- **測試範圍**：完整測試在 CI 上於 Windows、macOS、Linux（Node 18、20、22）執行，bash 包裝也在那裡的真實 bash 中執行。cmd 與 PowerShell 的包裝是在 Windows 上人工驗證；zsh 與 fish 只有產生出來的文字有測試。
- Windows PowerShell 的執行原則是 `Restricted` 時會忽略設定檔，`bugzoo setup` 會提醒你。

## 當 AI 助手幫你跑程式（Claude Code）

AI 助手執行指令時沒有終端機，所以自動捕捉對它們不會有反應。這個 hook 補上這個缺口：

```bash
bugzoo setup --ai on     # 把 Bash hook 加進 ~/.claude/settings.json；--ai off 會移除
```

重新啟動 Claude Code，然後照平常的方式工作：

1. AI 助手跑你的程式、失敗了：對話裡會**出現一隻怪物**。
2. AI 助手修好、重跑同一條指令：**捕捉成功**，戰鬥力、進化與成就都和其他執行一樣。

- 卡片**只給你看**：它是以 hook 的 `systemMessage` 送出，不會成為模型的上下文，所以不花 token，也不會讓助手困惑。
- 和手動執行是同一個身分：助手與你各自執行的 `node app.js` 是同一個目標，可以在一邊失敗、在另一邊捕捉。`cd proj && node app.js 2>&1 | tail` 會當成 `node app.js`。
- 限制：只支援 Claude Code 的 Bash 工具。同時會改檔案的指令（`printf ... > f.js && node f.js`）和單獨的 `node f.js` 是不同的指令，所以不會和之後的乾淨執行配對。已在 Windows 的 Claude Code 桌面版驗證；hook 格式依 Claude Code 官方文件。
- Bug Zoo 只會動它自己加的 hook；設定檔不是純 JSON 時絕不覆寫；`--ai off` 只會移除它自己加的項目。

**其他 AI 助手**（依官方文件於 2026-10-14 查證，沒有實際操作過）：

| 助手 | 指令後的 hook | 為什麼還沒支援 |
|---|---|---|
| Cursor | `afterShellExecution` | 事件有指令與輸出，但**沒有結束碼**，也沒有文件記載的「只給使用者看」的訊息管道，怪物沒有地方可以出現。 |
| Gemini CLI | `AfterTool`（shell 工具） | 有顯示給使用者的 `systemMessage`，但 shell 工具的 `tool_response` 欄位（結束碼、`llmContent`、`returnDisplay`）文件寫得不夠清楚，無法可靠判斷失敗。 |

如果你用的是其中一個，歡迎[開 issue](https://github.com/MilkteaTW1/bug-zoo/issues) 並附上 hook 收到的範例資料，就能補上。

## 戰鬥力與公平性

每隻 bug 都有戰鬥力，在牠還活著時記錄下來，捕捉成功時變成戰利品。同一種 `TypeError` 在兩個專案裡抓到，戰鬥力會不一樣。

`戰鬥力 = 稀有度基礎值 × (1 + 堆疊深度 + 影響範圍 + 專案規模 + 錯誤率)`

| 因子 | 怎麼量 | 上限 |
|---|---|---|
| 堆疊深度 | 錯誤堆疊裡有幾個專案內的檔案 | +1.0 |
| 影響範圍 | 出錯的檔案被專案內多少檔案引用（會掃描整個專案） | +1.0 |
| 專案規模 | 專案總行數（取對數） | +0.5 |
| 錯誤率 | 這條指令的失敗次數 ÷ max(執行次數, 5)，一直踩同一個 bug 會越來越強 | +1.0 |

基礎值：普通 10、罕見 25、稀有 60、傳說 150。前三強戰利品組成你的隊伍。

**這是遊戲，不是能力測驗。** 戰鬥力獎勵「一直失敗的 bug」，所以可以靠故意弄壞程式來灌水。同一條指令的失敗每分鐘最多只算一次，這只能讓灌水變慢。分數與隊伍都是自行回報：天梯會用你送出的隊伍重播戰鬥，但無法驗證你是怎麼得到的。排名請當作朋友之間的樂趣，不要當成除錯能力的證明。

## 進化與成就

每隻怪物有三個型態，由**好感度**決定。你玩遊戲賺金幣，在商店買食物和家具，再餵給怪物。每進化一階，戰鬥力是前一階的 1.5 倍。

| 好感度 | 型態 | 戰鬥力 |
|---|---|---|
| 0–29 | 一般 | ×1.00 |
| 30 | 第二型態 `*` | ×1.50 |
| 100 | 覺醒型態 `**` | ×2.25 |

加成在組隊時才套用（`battle`、`friend code`、`share`），戰利品當初記錄的戰鬥力不會改變。`bugzoo team` 會顯示每隻怪物的型態，以及離下一次進化還差多少好感度。在這個系統之前就有的怪物，會保留原本捕捉次數換來的型態。

## 商店（金幣、食物、家具）

- **金幣：**抓到怪物依戰鬥力給金幣（至少 3），閃光捕捉 +5，完成任務 +15，夥伴 +10，贏一場對戰 +10（輸 3，練習假人不給），通過一層高塔 10 + 每層 5。
- **食物：**`bugzoo shop` 列出商品，`bugzoo buy <物品>` 放進背包，`bugzoo feed <怪物> <食物>` 餵給已捕捉的怪物。蟲蟲點心 +4 好感、餅乾 +10、披薩 +24、咖啡 +40、黃金蛋糕 +100。每隻怪物都有一種**最愛**的食物，吃到加倍（`bugzoo shop` 會顯示）。
- **家具：**共六件，每件只能買一次，會擺在 VS Code 的動物園裡。每件讓所有食物的效果多 10%。
- **VS Code：**商店分頁可以購買與餵食（按餵食會問你要給哪一隻），好感度愛心顯示在怪物旁，已捕捉的怪物還可以用滑鼠拖著在動物園裡移動。

`bugzoo achievements` 列出 30 個成就，從第一隻捕捉、連續 7 天、傳說級，到第一場勝利。成就在你玩的過程中解鎖，並在達成的那次執行後立刻通知你。

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
- **新玩家？執行 `bugzoo ladder join`。** 需要玩家名稱和一隻捕獲，它會替你和最後一名打一場並印出預填好的 issue 連結，不論輸贏都會上榜，之後再往上爬。
- **天梯直接從這個 GitHub repo 讀取**（`leaderboard/`），不用 clone、也沒有我們自己的伺服器。連不上 GitHub 時會用上次儲存的副本。
- **新玩家第一次打天梯，不論輸贏都會加入天梯。** 從最底下開始往上爬。
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

分享檔只含數量與隊伍，不含錯誤訊息、路徑或指令。GitHub Action 會執行 `bugzoo leaderboard leaderboard/scores --out LEADERBOARD.md` 並提交表格。

想自己架一個天梯？Fork 這個 repo，並設定 `BUGZOO_LADDER_REPO=owner/repo`（或用 `BUGZOO_LADDER_DIR` 指向本機資料夾）。

## 運作原理

- **解析**：辨識 Node、Python、pytest、Java、.NET、Go、Rust、TypeScript、gcc/clang、Gradle 與 npm 的錯誤格式，其次是錯誤代碼（`ENOENT`、`SIGSEGV`）與訊號。把錯誤印在 stdout 的工具，會用 stdout 當備援。
- **身分**：怪物由錯誤類型加上「去掉數字、引號內名稱與路徑的訊息」的雜湊決定，所以 `Cannot read 'a'` 與 `Cannot read 'b'` 是同一隻。
- **稀有度**：普通（`TypeError`、`KeyError`…）、罕見（`ENOENT`、`RangeError`…）、稀有（其他）、傳說（`SIGSEGV`、`ENOSPC`、`StackOverflow`…）。
- **儲存位置**：`~/.bugzoo/dex.json`（可用 `BUGZOO_HOME` 覆寫）。除非你主動分享或送出，不會有任何資料離開你的電腦。
- **示範 GIF** 由 `python tools/make-gif.py` 依真實輸出渲染（需要 Pillow 與 Windows 字型）；`node demo/demo.js` 會在終端機即時播放類似的流程。

## 之後想做的

- 同一隻怪物遇見很多次後會進化
- 支援更多語言的錯誤格式

## 新增你的語言

每個語言就是 [`src/locales/`](src/locales) 裡的一個檔案。新增方式：

```bash
npm run lang -- ja 日本語     # 以英文內容建立 src/locales/ja.js
# 翻譯該檔案裡的 "help"、"messages" 與 "names"（怪物名稱）
npm run lang:check            # 檢查還有哪些是英文
npm test
```

不用改其他檔案：新語言會自動出現在 `bugzoo setup`、依系統語系自動選用，也會同時翻譯 [VS Code 擴充套件](vscode/)（它的文字就是同一個檔案裡的 `vs.*`）。可另外新增 `vscode/package.nls.<locale>.json` 翻譯擴充套件的指令名稱。詳見 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 貢獻者

感謝所有幫忙的人：

- [@cjy851096](https://github.com/cjy851096)：簡體中文（zh-CN）（[#5](https://github.com/MilkteaTW1/bug-zoo/pull/5)）

想上榜嗎？挑一個 [good first issue](https://github.com/MilkteaTW1/bug-zoo/labels/good%20first%20issue)，並看看 [CONTRIBUTING.md](CONTRIBUTING.md)。新增一個語言只要一個檔案。

## 需要客製？

想要專屬功能、整合或部署協助？歡迎找我，詳情請見 [墨鋒 Inkacuity](https://inkacuity.com/projects/bug-zoo)，或寄信到 [ink@inkacuity.com](mailto:ink@inkacuity.com)。

## 授權

MIT
