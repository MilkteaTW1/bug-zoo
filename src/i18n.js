'use strict';

const fs = require('node:fs');
const path = require('node:path');

// One file per language in src/locales/. Adding a language means adding a file there.
const LOCALES = {};
for (const f of fs.readdirSync(path.join(__dirname, 'locales')).filter((n) => n.endsWith('.js')).sort()) {
  const loc = require(`./locales/${f}`);
  if (loc && loc.code && loc.messages) LOCALES[loc.code] = loc;
}

const LANGS = Object.keys(LOCALES).sort((a, b) => (LOCALES[a].order || 100) - (LOCALES[b].order || 100) || a.localeCompare(b));
const LANG_LABEL = Object.fromEntries(LANGS.map((c) => [c, LOCALES[c].label || c]));
const M = Object.fromEntries(LANGS.map((c) => [c, LOCALES[c].messages]));

let current = 'en';

function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'en';
}

function getLang() {
  return current;
}

/** "zh_TW.UTF-8" -> "zh-tw.utf-8": the form `detect` prefixes are matched against. */
const normalizeTag = (raw) => String(raw || '').trim().toLowerCase().replace(/_/g, '-');

/** The language whose `detect` prefix matches the tag best (longest prefix), or null. */
function matchLocale(tag) {
  let best = null;
  let bestLen = -1;
  for (const code of LANGS) {
    for (const prefix of LOCALES[code].detect || []) {
      const p = normalizeTag(prefix);
      const hit = tag === p || (tag.startsWith(p) && !/[a-z0-9]/.test(tag[p.length]));
      if (hit && p.length > bestLen) {
        best = code;
        bestLen = p.length;
      }
    }
  }
  return best;
}

/** What a player typed for a language: a picker number, a language code, or a locale like zh_CN. */
function parseLang(value) {
  const s = normalizeTag(value);
  if (!s) return null;
  if (/^\d+$/.test(s)) return LANGS[Number(s) - 1] || null;
  const exact = LANGS.find((c) => c.toLowerCase() === s);
  return exact || matchLocale(s);
}

/** Best guess from the environment when the player has not chosen yet. */
function detectLang(env = process.env) {
  let raw = env.BUGZOO_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  if (!raw) {
    try {
      raw = Intl.DateTimeFormat().resolvedOptions().locale || '';
    } catch {
      raw = '';
    }
  }
  return matchLocale(normalizeTag(raw)) || 'en';
}

/** The language picker line, built from whatever languages exist. */
function langPrompt() {
  return `Language / 語言  ${LANGS.map((c, i) => `[${i + 1}] ${LANG_LABEL[c]}`).join('   ')}  (1): `;
}

/** The --help text in the current language (English when a language has none). */
function help(lang = current) {
  return (LOCALES[lang] && LOCALES[lang].help) || LOCALES.en.help;
}

/** Every message under a prefix, prefix stripped, in the current language (English where missing). */
function bundle(prefix) {
  const out = {};
  for (const table of [M.en, M[current]]) {
    for (const [k, v] of Object.entries(table || {})) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  }
  return out;
}

function t(key, vars = {}) {
  const table = M[current] || M.en;
  const s = table[key] !== undefined ? table[key] : (M.en[key] !== undefined ? M.en[key] : key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : String(vars[k])));
}

/** Terminal display width: CJK characters take two columns. */
function width(s) {
  let w = 0;
  for (const ch of String(s).replace(/\x1b\[[0-9;]*m/g, '')) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6))) ? 2 : 1;
  }
  return w;
}

function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - width(s)));
}

module.exports = { LOCALES, LANGS, LANG_LABEL, setLang, getLang, parseLang, detectLang, langPrompt, help, bundle, t, width, pad };
