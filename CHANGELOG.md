# Changelog / 更新紀錄

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
