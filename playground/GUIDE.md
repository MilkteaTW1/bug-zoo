# 練習場 / Playground

三支故意壞掉的程式，拿來練習捕捉 bug。請在這個資料夾裡執行。
Three broken programs to practice on. Run these from this folder.

## 玩法

```bash
node ../bin/bugzoo.js run node app.js
```

（如果你已用 `bugzoo setup` 開啟自動捕捉，直接 `node app.js` 就行。）

1. bug 出現後，去修改程式。
2. 再跑**同一條指令**，乾淨通過就算捕捉成功。
3. 如果修出了**不同**的錯誤，原本的怪物會逃走，新的變成目標。

| 檔案 | 錯誤 | 提示 |
|---|---|---|
| `app.js`（+ `lib/`） | `TypeError` | `lib/db.js` 從沒建立 `users` 資料表。`db.js` 被別的檔案引用，所以這隻威力比較大 |
| `missing-file.js` | `ENOENT` | 建立一個內容為 `{}` 的 `settings.json` |
| `recursion.js` | 無限遞迴 | 加上 `if (n <= 0) return;` |

## 看戰果

```bash
node ../bin/bugzoo.js dex
node ../bin/bugzoo.js team
node ../bin/bugzoo.js battle
```

想少打字：在專案根目錄執行一次 `npm link`，之後直接輸入 `bugzoo` 即可。
