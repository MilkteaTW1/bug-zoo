'use strict';

/**
 * Tool output is bytes. Most tools write UTF-8, but many Windows tools (java, cl, cmd built-ins)
 * write the console code page. Try UTF-8 strictly, then fall back to the legacy encoding that
 * matches the system locale, so messages stay readable instead of turning into U+FFFD.
 */
const LEGACY_BY_LOCALE = [
  [/^zh-(TW|HK|MO)/i, 'big5'],
  [/^zh/i, 'gbk'],
  [/^ja/i, 'shift_jis'],
  [/^ko/i, 'euc-kr'],
];

function legacyLabel(locale) {
  for (const [re, label] of LEGACY_BY_LOCALE) if (re.test(locale || '')) return label;
  return 'windows-1252';
}

function decodeOutput(buffers, { platform = process.platform, locale } = {}) {
  const buf = Buffer.isBuffer(buffers) ? buffers : Buffer.concat(buffers);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch { /* not valid UTF-8 */ }
  if (platform === 'win32') {
    let loc = locale;
    if (!loc) {
      try {
        loc = Intl.DateTimeFormat().resolvedOptions().locale;
      } catch {
        loc = '';
      }
    }
    try {
      return new TextDecoder(legacyLabel(loc)).decode(buf);
    } catch { /* label unsupported by this Node build */ }
  }
  return buf.toString('utf8');
}

module.exports = { decodeOutput, legacyLabel };
