# Bug Zoo

把你的錯誤訊息變成可收集的怪物。

程式一壞，錯誤就會被抓成一隻怪物，收進你電腦上的圖鑑。同樣的錯誤是同一隻怪物，越少見的錯誤越稀有。

```
野生的 TypeError 出現了！  * 新發現 *
    /\_/\
   ( x x )
    > ^ <
   搖晃蝙蝠  [普通]  遭遇 1 次
   Cannot read properties of undefined (reading 'rows')
   錯誤大小：戰鬥力 17
```

![Bug Zoo 示範](docs/demo.zh-TW.gif)

*bug 出現、你修好它、捕捉成功、隊伍對戰。內容是真實輸出，僅省略了 Node 內部的堆疊行。*

[English README](README.md)

## 安裝與設定

```bash
npm install -g bug-zoo
bugzoo setup
```

第一次執行任何 `bugzoo` 指令時，會詢問三件事：

1. **語言**：繁體中文或 English
2. **玩家名稱**：會顯示在排行榜與天梯上（可以按 Enter 略過）
3. **自動捕捉**：開啟後不用再打 `bugzoo run`

> npm 的安裝腳本沒辦法互動提問，所以問答放在第一次執行，之後隨時可以用 `bugzoo setup` 修改。

## 自動捕捉（不用打 bugzoo run）

開啟後，平常怎麼執行就怎麼執行：

```bash
node app.js
```

程式壞了就會出現怪物，修好再跑一次同一條指令就算捕捉成功。

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

## 戰鬥力與對戰

每隻 bug 都有戰鬥力，在牠還活著時記錄下來，捕捉成功時變成戰利品。同一種 `TypeError` 在兩個專案裡抓到，戰鬥力會不一樣。

`戰鬥力 = 稀有度基礎值 × (1 + 堆疊深度 + 影響範圍 + 專案規模 + 錯誤率)`

| 因子 | 怎麼量 | 上限 |
|---|---|---|
| 堆疊深度 | 錯誤堆疊裡有幾個專案內的檔案 | +1.0 |
| 影響範圍 | 出錯的檔案被專案內多少檔案引用（會掃描整個專案） | +1.0 |
| 專案規模 | 專案總行數（取對數） | +0.5 |
| 錯誤率 | 這條指令的失敗次數 ÷ max(執行次數, 5)，一直踩同一個 bug 會越來越強 | +1.0 |

基礎值：普通 10、罕見 25、稀有 60、傳說 150。

```bash
bugzoo team                 # 你最強的捕獲與因子明細
bugzoo battle --bot         # 和 Legacy Codebase 練習
bugzoo battle friend.json   # 挑戰朋友分享的隊伍
```

前三強戰利品組成隊伍，依序單挑，存活者保留剩餘血量。戰鬥用雙方隊伍當亂數種子，所以雙方各自算出的結果一致，不需要伺服器。

## 排行榜與天梯（不用資料庫）

```bash
bugzoo share --name alice --out leaderboard/scores/alice.json
bugzoo ladder               # 看天梯，可挑戰的人會標出來
bugzoo challenge            # 互動式選名次，直接開打
```

- 排行榜依**分數**排名：首次捕捉依稀有度給分（10 / 25 / 60 / 200），重複捕捉每次 +2。
- 天梯依**勝負**排名：可以挑戰排名在你上面、最多 3 名內的人；贏了就搶走對方的名次。
- 分享檔只含數量與隊伍，不含錯誤訊息、路徑或指令。
- 挑戰檔只寫兩個名字，GitHub Action 會用 repo 裡雙方的隊伍**重新播放**戰鬥，不採信檔案自報的結果。
- 戰鬥是確定性的，不能重複洗運氣；輸了只有在隊伍改變後才可能翻盤。

## 練習場

沒有專案也能玩：`playground/` 裡有三支故意壞掉的程式，說明見 [playground/GUIDE.md](playground/GUIDE.md)。

```bash
cd playground
node ../bin/bugzoo.js run node app.js
```

## 授權

MIT
