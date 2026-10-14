# Bug Zoo

Turn your error messages into collectible monsters.

Run your program through `bugzoo`. When it crashes, the error is caught as a creature and added to a bestiary on your machine. Same error, same monster; rarer errors make rarer creatures.

```
A wild TypeError appeared!  * NEW *
    .-"-.
   / > < \
   \_^_/
   Wobblegnaw  [common]  seen x1
   Cannot read properties of null (reading 'x')
```

## Install

```bash
npm install -g bug-zoo
```

Requires Node.js 18+. No dependencies.

## Usage

```bash
bugzoo run node app.js      # run anything; failures spawn a bug
bugzoo run python main.py
bugzoo dex                  # your collection and bugs waiting to be caught
bugzoo rank                 # your score and title
bugzoo export bugzoo.svg    # SVG card grid for your GitHub profile
```

`bugzoo run` passes stdout/stderr through untouched and returns the original exit code, so it is safe to use in scripts.

## Catching a bug

A failing run only *spawns* a bug. You catch it by fixing the code and re-running the same command in the same folder:

| Re-run result | Outcome |
|---|---|
| Clean run | Caught |
| Same bug | Still there |
| Some bugs gone, nothing new | Those are caught, the rest stay wild |
| A different or additional bug | Escaped - the new bug becomes your target |

"Same command" ignores flags and numeric arguments, so `node app.js` and `node ./app.js --debug --port 3000` are the same target.

## Power and battles

Every bug has a power, snapshotted while it is alive and banked as a trophy when you catch it. Catching the same `TypeError` in two projects gives two trophies with different power.

`power = base(rarity) x (1 + depth + blast + size + rate)`

| Factor | Measured by | Max |
|---|---|---|
| depth | project files in the stack trace | +1.0 |
| blast | project files that import the failing file (the whole project is scanned) | +1.0 |
| size | total lines of code in the project (log scale) | +0.5 |
| rate | failures / max(runs, 5) of that command; a bug you keep hitting grows | +1.0 |

Base: common 10, uncommon 25, rare 60, legendary 150.

```bash
bugzoo team                  # your strongest catches, with the factor breakdown
bugzoo battle --bot          # practice against the Legacy Codebase
bugzoo battle friend.json    # fight a friend's shared team (their `bugzoo share` file)
```

Your top 3 trophies form your team and fight one at a time; the survivor keeps its remaining HP. The fight is seeded from both teams, so both players get the same result with no server involved. Shared team power is clamped to what each rarity can reach.

## Catch everything automatically

```bash
eval "$(bugzoo hook bash)"            # bash / zsh: add to ~/.bashrc or ~/.zshrc
bugzoo hook powershell | Out-String | Invoke-Expression   # PowerShell: add to $PROFILE
```

Common dev commands (`node`, `npm`, `python`, `cargo`, `go`, ...) are then routed through `bugzoo run` when called with arguments; with no arguments (REPLs) the real command runs untouched.

## Demo

`node demo/demo.js` plays a scripted session (bug appears, bad fix escapes, real fix catches, team, battle) that you can screen-record into a GIF.

## Leaderboard (no database)

Scores are first catches by rarity (common 10, uncommon 25, rare 60, legendary 200) plus 2 per repeat catch.

```bash
bugzoo share --name alice --out leaderboard/scores/alice.json
```

The file contains only counts - no error messages, paths or commands. Players submit it by pull request; the included GitHub Action runs `bugzoo leaderboard leaderboard/scores --out LEADERBOARD.md` and commits the table. Scores are recomputed from the counts and are self-reported, so treat the board as friendly, not tamper-proof.

## Challenge ladder

The leaderboard ranks by score; the **ladder** ranks by who beat whom.

```bash
bugzoo ladder                 # show the ladder; players you can challenge are marked
bugzoo challenge              # pick a rank interactively and fight
bugzoo challenge --rank 2     # or pick directly (also: --name bob)
```

- You can challenge someone up to **3 ranks above** you.
- Win and you take their rank; everyone in between slides down one.
- A win writes a tiny `leaderboard/challenges/<time>-you-vs-them.json` (just two names). Commit it with your refreshed score file and open a pull request.
- CI runs `bugzoo ladder process`, which **replays the fight from the teams in the repo** and never trusts the file's claim, then commits `leaderboard/ladder.json` and `LADDER.md`.
- Fights are deterministic, so you cannot re-roll luck: a loss only changes when a team changes.
- Newcomers start at the bottom, ordered by score.

No database: the repo is the state. `ladder.json` holds the order and which challenge files were already applied.

## How it works

- **Parsing**: finds the last `SomethingError: message` in stderr (works for Node and Python tracebacks), falling back to error codes (`ENOENT`, `SIGSEGV`), then signals.
- **Identity**: the monster is derived from a hash of the error type plus the message with numbers, quoted names and paths stripped, so `Cannot read 'a'` and `Cannot read 'b'` are the same creature.
- **Rarity**: common (`TypeError`, `KeyError`...), uncommon (`ENOENT`, `RangeError`...), rare (anything else), legendary (`SIGSEGV`, `ENOSPC`, `StackOverflow`...).
- **Storage**: `~/.bugzoo/dex.json` (override with `BUGZOO_HOME`). Nothing leaves your machine.

## Roadmap

- Verify that a PR's challenger name matches the PR author
- Evolution when you meet the same monster many times
- More languages' error formats (Go, Rust, Java)

## License

MIT
