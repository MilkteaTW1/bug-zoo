'use strict';

const { RARITY_COLOR, RARITY_HEX, RARITY_ORDER, zhName } = require('./creature');
const { t, getLang, pad } = require('./i18n');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

/** Name to show for one of the player's own creatures (Chinese names are derived from the id). */
function shownName(e) {
  return getLang() === 'zh-TW' && e.id ? zhName(e.id) : e.name;
}

const rarityText = (r) => t(`rarity.${r}`);
const label = (e) => t('fmt.creature', { name: shownName(e), type: e.type });
const labelWithPower = (e) => (e.power ? t('fmt.power', { label: label(e), power: e.power }) : label(e));

function encounter(entry, isNew, power) {
  const color = RARITY_COLOR[entry.rarity];
  const lines = [''];
  lines.push(`${BOLD}${t('enc.appeared', { type: entry.type })}${RESET}` +
    `${isNew ? `  ${YELLOW}${t('enc.new')}${RESET}` : ''}`);
  for (const l of entry.art) lines.push(`${color}   ${l}${RESET}`);
  lines.push(`   ${BOLD}${shownName(entry)}${RESET}  ${color}[${rarityText(entry.rarity)}]${RESET}  ` +
    `${DIM}${t('enc.seen', { n: entry.count })}${RESET}`);
  lines.push(`   ${DIM}${entry.sample}${RESET}`);
  if (power) lines.push(`   ${YELLOW}${t('enc.power', { power: power.power })}${RESET}`);
  return lines.join('\n');
}

/** Message shown after a re-run, depending on the capture outcome. */
function outcomeBanner(result) {
  const names = (list) => list.map(label).join(', ');
  const caught = () => {
    const list = result.trophies && result.trophies.length ? result.trophies : result.captured;
    return list.map(labelWithPower).join(', ');
  };
  const tagCaught = `${GREEN}${BOLD}${t('out.caughtTag')}${RESET}${GREEN}`;
  switch (result.outcome) {
    case 'captured':
      return `${tagCaught} ${t('out.captured', { names: caught() })}${RESET}`;
    case 'partial':
      return `${tagCaught} ${t('out.partial', { names: caught() })}${RESET}\n` +
        `${YELLOW}${t('out.partial2', { names: names(result.pending) })}${RESET}`;
    case 'still':
      return `${YELLOW}${t('out.still', { names: names(result.pending) })}${RESET}`;
    case 'failed':
      return `${RED}${BOLD}${t('out.escapedTag')}${RESET}${RED} ${t('out.failed', { names: names(result.escaped) })}${RESET}\n` +
        `${YELLOW}${t('out.failed2', { names: names(result.pending) })}${RESET}`;
    case 'wild':
      return `${DIM}${t('out.wild')}${RESET}`;
    default:
      return '';
  }
}

function factorLine(f = {}) {
  const v = (k) => (f[k] === undefined ? 0 : f[k]);
  return ['depth', 'blast', 'size', 'rate'].map((k) => `${t(`factor.${k}`)} +${v(k)}`).join('  ');
}

function teamList(trophies) {
  if (trophies.length === 0) return t('team.empty');
  const sorted = [...trophies].sort((a, b) => b.power - a.power).slice(0, 8);
  const out = [`${BOLD}${t('team.title')}${RESET}`, ''];
  sorted.forEach((tr, i) => {
    const color = RARITY_COLOR[tr.rarity];
    out.push(`${i < 3 ? '*' : ' '} ${color}${pad(shownName(tr), 14)}${RESET} ${pad(tr.type, 20)} ` +
      `${t('team.power')} ${String(tr.power).padStart(4)}  ${DIM}${tr.project}${RESET}`);
    out.push(`    ${DIM}${factorLine(tr.factors)}${RESET}`);
  });
  return out.join('\n');
}

const sortEntries = (entries) => entries.sort((a, b) => (b.captures > 0) - (a.captures > 0) ||
  RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.count - a.count);

function status(e) {
  return e.captures > 0 ? `${GREEN}${t('dex.caught', { n: e.captures })}${RESET}` : `${DIM}${t('dex.wild')}${RESET}`;
}

function dexList(dex) {
  const entries = Object.values(dex.creatures);
  if (entries.length === 0) return t('dex.empty');
  sortEntries(entries);
  const caught = entries.filter((e) => e.captures > 0).length;
  const out = [`${BOLD}${t('dex.title', { caught, seen: entries.length })}${RESET}`, ''];
  for (const e of entries) {
    const color = RARITY_COLOR[e.rarity];
    out.push(`${color}${pad(shownName(e), 14)}${RESET} ${pad(e.type, 20)} ${color}${pad(rarityText(e.rarity), 10)}${RESET} ${status(e)}`);
  }
  const pending = Object.values(dex.pending || {}).reduce((n, p) => n + p.ids.length, 0);
  if (pending > 0) out.push('', `${YELLOW}${t('dex.pending', { n: pending })}${RESET}`);
  return out.join('\n');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** One battle-log event as a sentence. `labelOf` maps an English name to what the player should see. */
function battleLine(ev, labelOf = (n) => n) {
  let s = t('battle.hit', { att: labelOf(ev.att), def: labelOf(ev.def), dmg: ev.dmg });
  if (ev.crit) s += t('battle.crit');
  s += ev.faint ? t('battle.faint', { def: labelOf(ev.def) }) : t('battle.left', { hp: ev.hp });
  return s;
}

/** Self-contained SVG card grid, suitable for a GitHub profile README. */
function exportSvg(dex) {
  const entries = sortEntries(Object.values(dex.creatures));
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
    const stateText = isCaught ? t('dex.caught', { n: e.captures }) : t('dex.wild');
    return `<g opacity="${isCaught ? 1 : 0.45}"><rect x="${x}" y="${y}" width="${w - 10}" height="${h - 10}" rx="10" fill="#161b22" stroke="${stroke}"/>` +
      `<text x="${x + 14}" y="${y + 24}" fill="#e6edf3" font-weight="bold">${esc(shownName(e))}</text>${art}` +
      `<text x="${x + 14}" y="${y + 118}" fill="#8b949e" font-size="11">${esc(e.type)} · ${esc(rarityText(e.rarity))} · ${esc(stateText)}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace,Consolas,'Microsoft JhengHei',monospace" font-size="14">` +
    `<rect width="100%" height="100%" fill="#0d1117"/>` +
    `<text x="14" y="32" fill="#e6edf3" font-size="18" font-weight="bold">${esc(t('svg.title', { caught, seen: entries.length }))}</text>${cards}</svg>\n`;
}

module.exports = { encounter, outcomeBanner, dexList, exportSvg, teamList, factorLine, battleLine, shownName, label };
