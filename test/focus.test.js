'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const focus = require('../src/focus');

const dexOf = () => ({ stats: {}, creatures: {}, trophies: [] });
const at = (min) => new Date(2026, 2, 4, 12, 0, 0, 0 + min * 60000);

// Thirty minutes of steady work: a command or an edit every two minutes, three different commands.
function work(dex, { source = 'cli', from = 0, to = 30, edits = true } = {}) {
  let gift = null;
  const cmds = ['node a.js', 'npm test', 'node b.js'];
  for (let m = from; m <= to; m += 2) {
    const g = focus.touch(dex, { kind: 'cmd', cmd: cmds[(m / 2) % 3], source }, at(m));
    if (source === 'vscode' && edits) for (let i = 0; i < 4; i++) focus.touch(dex, { kind: 'edit', source }, at(m + 0.1 * i));
    gift = gift || g;
  }
  return gift;
}

test('thirty active clean minutes of varied commands earn a companion', () => {
  const dex = dexOf();
  const gift = work(dex);
  assert.ok(gift && gift.companion, 'a companion arrives');
  assert.equal(dex.trophies.length, 1);
  assert.equal(dex.stats.giftTotal, 1);
});

test('walking away does not count: a long idle gap adds nothing', () => {
  const dex = dexOf();
  work(dex, { from: 0, to: 10 }); // 10 minutes
  const gift = work(dex, { from: 100, to: 110 }); // after a long break, another 10
  assert.equal(gift, null);
  assert.ok(focus.minutes(dex) <= 22, `idle time stayed out (${focus.minutes(dex)} min)`);
});

test('one command repeated in a loop is not work', () => {
  const dex = dexOf();
  let gift = null;
  for (let m = 0; m <= 40; m += 1) gift = gift || focus.touch(dex, { kind: 'cmd', cmd: 'node a.js' }, at(m));
  assert.equal(gift, null);
});

test('in VS Code the window also needs real edits', () => {
  const idle = dexOf();
  assert.equal(work(idle, { source: 'vscode', edits: false }), null, 'commands alone are not enough');
  const busy = dexOf();
  assert.ok(work(busy, { source: 'vscode', edits: true }), 'commands plus edits are');
});

test('an error resets the clean window', () => {
  const dex = dexOf();
  work(dex, { from: 0, to: 20 });
  focus.touch(dex, { kind: 'cmd', failed: true, cmd: 'node a.js' }, at(21));
  assert.equal(focus.minutes(dex), 0);
});

test('at most two a day', () => {
  const dex = dexOf();
  const gifts = [];
  for (let round = 0; round < 4; round++) {
    const base = round * 40;
    const g = work(dex, { from: base, to: base + 30 });
    if (g) gifts.push(g);
  }
  assert.equal(gifts.length, focus.DAILY_CAP);
});
