'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeCreature } = require('../src/creature');

function freshStore() {
  process.env.BUGZOO_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-store-'));
  delete require.cache[require.resolve('../src/store')];
  return require('../src/store');
}

const bug = () => ({ ...makeCreature('TypeError', 'x is undefined'), sample: 'x is undefined' });
const at = (ms) => new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + ms);

test('hammering a failing command does not inflate its error rate', () => {
  const store = freshStore();
  for (let i = 0; i < 10; i++) store.applyRun('cmd', [bug()], null, at(i * 1000)); // ten failures in ten seconds
  const run = store.load().runs.cmd;
  assert.equal(run.fails, 1);
  assert.equal(run.runs, 1);
});

test('failures a minute or more apart each count', () => {
  const store = freshStore();
  for (let i = 0; i < 4; i++) store.applyRun('cmd', [bug()], null, at(i * 61_000));
  assert.equal(store.load().runs.cmd.fails, 4);
});

test('a clean run always counts, even right after a failure', () => {
  const store = freshStore();
  store.applyRun('cmd', [bug()], null, at(0));
  store.applyRun('cmd', [], null, at(1000));
  const run = store.load().runs.cmd;
  assert.deepEqual([run.runs, run.fails], [2, 1]);
});

test('power does not grow from rapid repeats but does from a persistent bug', () => {
  const quick = freshStore();
  let last;
  for (let i = 0; i < 6; i++) last = quick.applyRun('c', [bug()], { frames: 1, blast: 0, loc: 100 }, at(i * 1000));
  const persistent = freshStore();
  let slow;
  for (let i = 0; i < 6; i++) slow = persistent.applyRun('c', [bug()], { frames: 1, blast: 0, loc: 100 }, at(i * 3_600_000));
  const id = bug().id;
  assert.ok(slow.powers[id].power > last.powers[id].power);
});
