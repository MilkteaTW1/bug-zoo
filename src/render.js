'use strict';

const { RARITY_COLOR, RARITY_HEX, RARITY_ORDER } = require('./creature');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

function encounter(entry, isNew, power) {
  const color = RARITY_COLOR[entry.rarity];
  const lines = [];
  lines.push('');
  lines.push(`${BOLD}A wild ${entry.type} appeared!${RESET}${isNew ? `  ${YELLOW}* NEW *${RESET}` : ''}`);
  for (const l of entry.art) lines.push(`${color}   ${l}${RESET}`);
  lines.push(`   ${BOLD}${entry.name}${RESET}  ${color}[${entry.rarity}]${RESET}  ${DIM}seen x${entry.count}${RESET}`);
  lines.push(`   ${DIM}${entry.sample}${RESET}`);
  if (power) lines.push(`   ${YELLOW}bug size: power ${power.power}${RESET}`);
  return lines.join('\n');
}

function caughtNames(result) {
  const list = result.trophies && result.trophies.length ? result.trophies : result.captured;
  return list.map((e) => (e.power ? `${e.name} the ${e.type} (power ${e.power})` : `${e.name} the ${e.type}`)).join(', ');
}

function factorLine(f) {
  return `depth +${f.depth}  blast +${f.blast}  size +${f.size}  rate +${f.rate}`;
}

function teamList(trophies) {
  if (trophies.length === 0) return 'No trophies yet. Catch a bug first: fix it and re-run the same command.';
  const sorted = [...trophies].sort((a, b) => b.power - a.power).slice(0, 8);
  const out = [`${BOLD}Your strongest catches${RESET} (top 3 fight in battles)`, ''];
  sorted.forEach((t, i) => {
    const color = RARITY_COLOR[t.rarity];
    out.push(`${i < 3 ? '*' : ' '} ${color}${t.name.padEnd(14)}${RESET} ${t.type.padEnd(20)} power ${String(t.power).padStart(4)}  ${DIM}${t.project}${RESET}`);
    out.push(`    ${DIM}${factorLine(t.factors)}${RESET}`);
  });
  return out.join('\n');
}

/** Message shown after a re-run, depending on the capture outcome. */
function outcomeBanner(result) {
  const names = (list) => list.map((e) => `${e.name} the ${e.type}`).join(', ');
  switch (result.outcome) {
    case 'captured':
      return `${GREEN}${BOLD}[CAUGHT]${RESET}${GREEN} Clean run! You caught ${caughtNames(result)}.${RESET}`;
    case 'partial':
      return `${GREEN}${BOLD}[CAUGHT]${RESET}${GREEN} You caught ${caughtNames(result)}.${RESET}\n` +
        `${YELLOW}Still at large: ${names(result.pending)}. Keep fixing and run again.${RESET}`;
    case 'still':
      return `${YELLOW}It's still there: ${names(result.pending)}. Fix it and run again.${RESET}`;
    case 'failed':
      return `${RED}${BOLD}[ESCAPED]${RESET}${RED} ${names(result.escaped)} slipped away - your fix introduced something new.${RESET}\n` +
        `${YELLOW}New target(s): ${names(result.pending)}. Fix and run again to catch.${RESET}`;
    case 'wild':
      return `${DIM}Fix the bug and run the same command again to catch it.${RESET}`;
    default:
      return '';
  }
}

function status(e) {
  if (e.captures > 0) return `${GREEN}caught x${e.captures}${RESET}`;
  return `${DIM}wild${RESET}`;
}

function dexList(dex) {
  const entries = Object.values(dex.creatures);
  if (entries.length === 0) return 'Your bestiary is empty. Run `bugzoo run <command>` and let something break.';
  entries.sort((a, b) => (b.captures > 0) - (a.captures > 0) ||
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.count - a.count);
  const caught = entries.filter((e) => e.captures > 0).length;
  const out = [`${BOLD}Bug Zoo${RESET} - ${caught} caught / ${entries.length} seen`, ''];
  for (const e of entries) {
    const color = RARITY_COLOR[e.rarity];
    out.push(`${color}${e.name.padEnd(14)}${RESET} ${e.type.padEnd(20)} ${color}${e.rarity.padEnd(10)}${RESET} ${status(e)}`);
  }
  const pending = Object.values(dex.pending || {}).reduce((n, p) => n + p.ids.length, 0);
  if (pending > 0) out.push('', `${YELLOW}${pending} bug(s) waiting to be caught.${RESET}`);
  return out.join('\n');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Self-contained SVG card grid, suitable for a GitHub profile README. */
function exportSvg(dex) {
  const entries = Object.values(dex.creatures)
    .sort((a, b) => (b.captures > 0) - (a.captures > 0) ||
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.count - a.count);
  const caught = entries.filter((e) => e.captures > 0).length;
  const cols = 3;
  const w = 220;
  const h = 150;
  const rows = Math.max(1, Math.ceil(entries.length / cols));
  const width = cols * w + 20;
  const height = rows * h + 60;
  const cards = entries.map((e, i) => {
    const x = 10 + (i % cols) * w;
    const y = 50 + Math.floor(i / cols) * h;
    const stroke = RARITY_HEX[e.rarity];
    const isCaught = e.captures > 0;
    const art = e.art.map((l, j) =>
      `<text x="${x + 20}" y="${y + 50 + j * 18}" fill="${stroke}" xml:space="preserve">${esc(l)}</text>`).join('');
    const label = isCaught ? `caught x${e.captures}` : 'wild';
    return `<g opacity="${isCaught ? 1 : 0.45}"><rect x="${x}" y="${y}" width="${w - 10}" height="${h - 10}" rx="10" fill="#161b22" stroke="${stroke}"/>` +
      `<text x="${x + 14}" y="${y + 24}" fill="#e6edf3" font-weight="bold">${esc(e.name)}</text>${art}` +
      `<text x="${x + 14}" y="${y + 118}" fill="#8b949e" font-size="11">${esc(e.type)} · ${e.rarity} · ${label}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace,Consolas,monospace" font-size="14">` +
    `<rect width="100%" height="100%" fill="#0d1117"/>` +
    `<text x="14" y="32" fill="#e6edf3" font-size="18" font-weight="bold">Bug Zoo · ${caught} caught / ${entries.length} seen</text>${cards}</svg>\n`;
}

module.exports = { encounter, outcomeBanner, dexList, exportSvg, teamList, factorLine };
