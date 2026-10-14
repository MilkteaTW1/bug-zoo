'use strict';

const crypto = require('node:crypto');

const SIGNAL_NAMES = { 11: 'SIGSEGV', 6: 'SIGABRT', 9: 'SIGKILL', 15: 'SIGTERM', 139: 'SIGSEGV', 134: 'SIGABRT' };

/** Extract { type, message } from captured stderr text and the exit code. */
function parseError(stderr, exitCode) {
  const text = String(stderr || '');

  // Last "SomethingError: message" line wins (Python tracebacks end with it).
  const re = /^\s*(?:Uncaught\s+)?((?:[\w.]+\.)?[A-Z]\w*(?:Error|Exception))\s*:\s*(.*)$/gm;
  let m;
  let last = null;
  while ((m = re.exec(text)) !== null) last = m;
  if (last) {
    return { type: last[1].split('.').pop(), message: last[2].trim().slice(0, 160) };
  }

  const code = text.match(/\b(E[A-Z]{3,}|SIG[A-Z]+)\b/);
  if (code) return { type: code[1], message: firstLine(text) };

  if (/segmentation fault/i.test(text)) return { type: 'SIGSEGV', message: 'Segmentation fault' };
  if (/\bpanic\b/i.test(text)) return { type: 'Panic', message: firstLine(text) };
  if (/out of memory/i.test(text)) return { type: 'OutOfMemory', message: firstLine(text) };
  if (/stack overflow|maximum call stack/i.test(text)) return { type: 'StackOverflow', message: firstLine(text) };

  if (SIGNAL_NAMES[exitCode]) return { type: SIGNAL_NAMES[exitCode], message: `exited with code ${exitCode}` };
  return { type: 'MysteryError', message: firstLine(text) || `exited with code ${exitCode}` };
}

/** Every distinct error found in stderr (a run can surface more than one bug). */
function parseErrors(stderr, exitCode) {
  const text = String(stderr || '');
  const re = /^\s*(?:Uncaught\s+)?((?:[\w.]+\.)?[A-Z]\w*(?:Error|Exception))\s*:\s*(.*)$/gm;
  const seen = new Map();
  let m;
  while ((m = re.exec(text)) !== null) {
    const found = { type: m[1].split('.').pop(), message: m[2].trim().slice(0, 160) };
    seen.set(`${found.type}:${normalize(found.message)}`, found);
  }
  if (seen.size > 0) return [...seen.values()];
  return [parseError(text, exitCode)];
}

function firstLine(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
  return line.trim().slice(0, 160);
}

/** Strip volatile bits (numbers, quoted names, paths) so similar errors share a "variant". */
function normalize(message) {
  return message
    .replace(/(['"`]).*?\1/g, '$1_$1')
    .replace(/[A-Za-z]:\\[^\s]+|\/[^\s]+/g, '<path>')
    .replace(/\d+/g, '#')
    .toLowerCase();
}

function hash(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

module.exports = { parseError, parseErrors, normalize, hash };
