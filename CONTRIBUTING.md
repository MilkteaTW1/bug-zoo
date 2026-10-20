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
- Adding a language: run `npm run lang -- <code> <name>` (e.g. `npm run lang -- ja 日本語`). It creates `src/locales/<code>.js` from the English text; translate `help`, `messages` and `names` (the monster names: prefix + suffix lists of any length), keep the `{placeholders}`, and check progress with `npm run lang:check`. It also covers the VS Code extension (the `vs.*` keys). Optionally add `vscode/package.nls.<locale>.json` for the extension's command names. Translate meaning, not characters. The maintainer releases the CLI (npm) and the VS Code extension (Marketplace) regularly; a merged language reaches players, in both, with the next release.
- Please do not edit `leaderboard/`, `LADDER.md` or `LEADERBOARD.md` in a pull request: a bot maintains them.

## The ladder is separate

Issues titled `Challenge: ...` are ladder submissions made by the CLI and are handled automatically.
Normal issues and pull requests are never touched by that workflow.
標題以 `Challenge:` 開頭的 issue 是 CLI 自動送出的天梯結果，由機器人處理；一般 issue 與 PR 不受影響。
