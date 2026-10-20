# Contributing to Bug Zoo / 參與貢獻

Thanks for helping! Small fixes, new languages and new error parsers are all welcome.
歡迎修正、新增語言、新增錯誤解析器。

## Quick start

```bash
git clone https://github.com/<you>/bug-zoo   # your fork
cd bug-zoo
git checkout -b my-change
npm test                                     # Node 18+, no dependencies to install
```

Then open a pull request. Mention `Closes #<issue>` if it fixes one. For the language issue (#3) write `Refs #3` instead, so it stays open for the next language. Look for issues labelled
[good first issue](https://github.com/MilkteaTW1/bug-zoo/labels/good%20first%20issue); comment on one to say you are taking it.

## Guidelines

- Keep it dependency-free.
- Add or extend a test in `test/` for what you change. CI runs `npm test` on Linux, macOS and Windows.
- Adding a language: follow the `zh-TW` block in `src/i18n.js`, add it to the `bugzoo setup` language choice, and extend `test/i18n.test.js` so every key exists. Translate meaning, not characters.
- Please do not edit `leaderboard/`, `LADDER.md` or `LEADERBOARD.md` in a pull request: a bot maintains them.

## The ladder is separate

Issues titled `Challenge: ...` are ladder submissions made by the CLI and are handled automatically.
Normal issues and pull requests are never touched by that workflow.
標題以 `Challenge:` 開頭的 issue 是 CLI 自動送出的天梯結果，由機器人處理；一般 issue 與 PR 不受影響。
