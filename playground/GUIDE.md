# Playground

Three broken programs to practice catching bugs. Run these from this folder.

```bash
node ../bin/bugzoo.js run node app.js
```

1. A bug appears. Fix the code.
2. Run the **same command** again. A clean run catches it.
3. If your fix creates a *different* error, the bug escapes and the new one becomes your target.

| File | Bug | Hint |
|---|---|---|
| `app.js` (+ `lib/`) | `TypeError` | `lib/db.js` never creates the `users` table. Because `db.js` is imported by other files, this bug hits harder. |
| `missing-file.js` | `ENOENT` | Create `settings.json` containing `{}`. |
| `recursion.js` | stack overflow | Add `if (n <= 0) return;` |

Then see what you caught:

```bash
node ../bin/bugzoo.js dex
node ../bin/bugzoo.js team
node ../bin/bugzoo.js battle --bot
```

Tip: to type `bugzoo` instead of `node ../bin/bugzoo.js`, run `npm link` once in the project root.
