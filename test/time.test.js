'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** Run the achievement logic in a child process whose clock is set to `tz`, since a time zone is fixed per process. */
function inZone(tz, trophies, now = '2026-11-03T09:00:00.000Z') {
  const script = `
    const a = require(${JSON.stringify(path.resolve(__dirname, '..', 'src', 'achievements'))});
    const dex = { creatures: { a: { id: 'a', type: 'TypeError', rarity: 'common', captures: 1 } }, trophies: ${JSON.stringify(trophies)}, achievements: {} };
    const ctx = a.context(dex);
    a.evaluate(dex, ${JSON.stringify(now)});
    console.log(JSON.stringify({ streak: ctx.longestStreak, owl: ctx.nightOwl, friday: ctx.fridayDeploy, got: dex.achievements }));`;
  const r = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const tr = (at) => ({ id: at, name: 'x', type: 'TypeError', rarity: 'common', power: 10, at });

test('night owl is judged on the player\'s own clock: 16:30 UTC is half past midnight in Taipei, not in Los Angeles', () => {
  const t = [tr('2026-10-22T16:30:43.862Z')];
  assert.equal(inZone('Asia/Taipei', t).owl, true);
  assert.equal(inZone('America/Los_Angeles', t).owl, false);
  assert.equal(inZone('Pacific/Auckland', t).owl, false); // 05:30 there
  assert.equal(inZone('UTC', t).owl, false);
});

test('an achievement earned before it existed is dated by the catch, not by the day it was noticed', () => {
  const got = inZone('Asia/Taipei', [tr('2026-10-22T16:30:43.862Z')]).got;
  assert.equal(got['night-owl'], '2026-10-22T16:30:43.862Z');
  assert.equal(got['first-catch'], '2026-11-03T09:00:00.000Z'); // plain achievements still use the moment they are noticed
});

test('a streak counts the player\'s calendar days, so two catches on one local day are one day', () => {
  // 04:00 and 10:00 on 23 Oct in Taipei, but 22 Oct and 23 Oct in UTC
  const t = [tr('2026-10-22T20:00:00.000Z'), tr('2026-10-23T02:00:00.000Z'), tr('2026-10-24T02:00:00.000Z')];
  assert.equal(inZone('Asia/Taipei', t).streak, 2);
  assert.equal(inZone('UTC', t).streak, 3);
});

test('Friday evening means after 4 pm on the player\'s Friday', () => {
  const t = [tr('2026-10-23T09:00:00.000Z')]; // Friday 17:00 in Taipei, Friday 02:00 in Los Angeles
  assert.equal(inZone('Asia/Taipei', t).friday, true);
  assert.equal(inZone('America/Los_Angeles', t).friday, false);
});
