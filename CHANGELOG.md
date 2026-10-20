# Changelog / 更新紀錄

## 0.3.3

- **Languages are one file each** in `src/locales/`. `npm run lang -- <code> <name>` creates a new one and `npm run lang:check` shows what is still untranslated; the `bugzoo setup` picker, `--help` and locale detection pick it up automatically.
  The VS Code extension now uses the same files (`vs.*` keys) for the zoo view, ladder panel and notifications, so zh-CN and every future language work there too; command names come from `vscode/package.nls.*.json`.
  每個語言一個檔案（`src/locales/`）。`npm run lang -- <代碼> <名稱>` 建立新語言，`npm run lang:check` 檢查尚未翻譯的部分；語言選單、`--help` 與系統語系偵測會自動套用。VS Code 擴充套件的畫面與通知也改用同一份檔案（`vs.*`），簡體與之後新增的語言都會生效；指令名稱來自 `vscode/package.nls.*.json`。

- **Simplified Chinese (zh-CN)**, thanks to @cjy851096 (#5). Hong Kong and Macau locales (zh-HK, zh-MO) stay Traditional.
  新增简体中文，感谢 @cjy851096（#5）。zh-HK、zh-MO 仍使用繁體。

## 0.3.2

- **Join the ladder even if you lose.** A player who is not on the ladder yet is offered the submission after any ladder fight; they join at the bottom, and only a win within reach moves them up.
  還不在天梯上的玩家，打任何一場天梯戰鬥後都能送出並加入（從最底下開始）；只有打贏範圍內的人才會晉升。

## 0.3.1

- README: lists which other AI assistants (Cursor, Gemini CLI) are not supported yet, and why. No behaviour changes.
  README 補充尚未支援的其他 AI 助手（Cursor、Gemini CLI）與原因。程式行為沒有變動。

## 0.3.0

- **Monsters for your AI assistant's commands (Claude Code).** `bugzoo setup --ai on` adds `PostToolUse` and `PostToolUseFailure` hooks for the Bash tool. A failing command shows a monster, the fix catches it. The card is a `systemMessage`: shown to you, never sent to the model.
  AI 助手執行的指令也會出怪物（Claude Code）：`bugzoo setup --ai on` 加入 Bash 的 hook；指令失敗出現怪物、修好就捕捉。卡片以 `systemMessage` 送出，只給你看，不會送給模型。
- A command run by the assistant and the same command run by hand share one identity.
  助手與你手動執行的同一條指令視為同一個目標。

## 0.2.0

- **Battle result cards.** `bugzoo battle --card result.svg` (or answer yes when asked after a fight) saves an SVG with both teams, power, the winner and the number of blows. Fights are deterministic, so the same two teams always give the same card.
  戰鬥結果分享卡：`bugzoo battle --card result.svg`（或在對戰後回答 y）會存成 SVG，含雙方隊伍、戰鬥力、勝負與回合數。戰鬥是固定的，同樣兩支隊伍永遠產生同一張卡。
- Cards and exports are localised (English, 繁體中文). 卡片與匯出圖支援中英文。
- **Evolution.** Catching the same bug 3 times evolves it (power x1.15, `*`), 10 times ascends it (x1.35, `**`). The bonus applies when a team is formed; recorded trophies never change. `bugzoo team` shows the form and the next evolution.
  進化：同一隻 bug 捕捉 3 次進化（戰鬥力 ×1.15、`*`），10 次覺醒（×1.35、`**`）。加成在組隊時套用，已記錄的戰利品不會改變。
- **Achievements.** 13 achievements, announced when earned and listed with `bugzoo achievements`.
  成就：13 個成就，達成時通知，並可用 `bugzoo achievements` 查看。

## 0.1.3

- **Fix**: a healthy command with no history no longer prints "Fix the bug and run the same command again" after every run. This affected `bugzoo run` and every wrapped command.
  修正：從沒失敗過、正常通過的指令，不會再在每次執行後多印「修好這個 bug…」的提示。
- **Fix**: Windows-style program paths such as `C:\Python\python.exe` are recognised on macOS and Linux.
  修正：在 macOS 與 Linux 上也能辨識 Windows 風格的程式路徑。
- Tests run in CI on Windows, macOS and Linux (Node 18, 20, 22), including the bash wrappers in a real shell.
  測試改在 Windows、macOS、Linux 的 CI 上執行，包含在真實 shell 裡跑 bash 包裝。

## 0.1.2

- README: a one-line pitch, three highlights and a sample `bugzoo export` image up front.
  README 最前面加入一句話口號、三個亮點，以及 `bugzoo export` 的範例圖。
- Added this changelog. 新增更新紀錄。
- No behaviour changes. 程式行為沒有變動。

## 0.1.1

- **Automatic capture is opt-in.** `bugzoo setup` asks with a default of no; `bugzoo run` works without it.
  自動捕捉改為選用，設定時預設不開。
- **Fairer power.** A command's failures count toward its error rate at most once a minute.
  戰鬥力更公平：同一條指令的失敗每分鐘最多算一次。
- README leads with a 30-second play and a plain fair-play note.
  README 先給 30 秒玩法，並新增公平性說明。

## 0.1.0

First release. 第一個版本。

- Catch bugs by fixing them: a failing run spawns a monster, a clean re-run of the same command catches it.
  修好 bug、重跑同一條指令就算捕捉。
- Automatic capture for Node plus wrapped commands (Python, Go, Cargo, Java, npm, ...).
  Node 與包裝指令的自動捕捉。
- Error parsing for Node, Python, pytest, Java, .NET, Go, Rust, TypeScript, gcc/clang, Gradle and npm.
  支援多種語言與工具的錯誤格式。
- Power from stack depth, blast radius, project size and failure rate.
  戰鬥力取決於堆疊深度、影響範圍、專案規模與失敗頻率。
- `bugzoo battle`: the ladder (read from GitHub), friends and a practice opponent.
  天梯、好友與練習對手。
- Friend codes, no server; ladder promotion through a GitHub issue replayed by an Action.
  不需要伺服器的好友代碼，透過 GitHub Issue 與 Action 晉升天梯。
- English and 繁體中文.
