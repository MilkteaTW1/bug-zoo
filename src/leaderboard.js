'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateEntry } = require('./score');

/** Read score files from a mix of files and directories. Returns { entries, skipped }. */
function collect(paths) {
  const files = [];
  for (const p of paths) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(p)) if (f.endsWith('.json')) files.push(path.join(p, f));
    } else {
      files.push(p);
    }
  }
  const entries = [];
  const skipped = [];
  for (const f of files) {
    try {
      const v = validateEntry(JSON.parse(fs.readFileSync(f, 'utf8')));
      if (v.ok) entries.push(v.entry);
      else skipped.push({ file: f, reason: v.reason });
    } catch (err) {
      skipped.push({ file: f, reason: 'invalid JSON' });
    }
  }
  return { entries, skipped };
}

const total = (e) => Object.values(e.caught).reduce((a, b) => a + b, 0);

/** One row per name (case-insensitive): the highest score wins. Sorted best first. */
function rank(entries) {
  const best = new Map();
  for (const e of entries) {
    const k = e.name.toLowerCase();
    if (!best.has(k) || best.get(k).score < e.score) best.set(k, e);
  }
  return [...best.values()].sort((a, b) =>
    b.score - a.score || total(b) - total(a) || a.name.localeCompare(b.name));
}

function toMarkdown(ranked) {
  const lines = [
    '# Bug Zoo Leaderboard',
    '',
    '| # | Player | Title | Score | Caught | Legendary |',
    '|--:|--------|-------|------:|-------:|----------:|',
  ];
  ranked.forEach((e, i) => {
    lines.push(`| ${i + 1} | ${e.name} | ${e.title} | ${e.score} | ${total(e)} | ${e.caught.legendary} |`);
  });
  if (ranked.length === 0) lines.push('| - | nobody yet | | | | |');
  lines.push('', '_Scores are recomputed from the submitted counts; they are self-reported._', '');
  return lines.join('\n');
}

module.exports = { collect, rank, toMarkdown };
