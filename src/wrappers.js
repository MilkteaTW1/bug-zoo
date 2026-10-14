'use strict';

/**
 * Wrappers that route the player's hand-typed commands through `bugzoo run`.
 * Node is not listed: its preload (register.js) covers it without wrapping.
 */
const COMMANDS = ['python', 'python3', 'py', 'pytest', 'go', 'cargo', 'java', 'mvn', 'gradle', 'dotnet',
  'ruby', 'php', 'deno', 'bun', 'make', 'npm', 'npx', 'pnpm', 'yarn'];

const START = '# >>> bugzoo wrappers >>>';
const END = '# <<< bugzoo wrappers <<<';
const q = (s) => `"${s}"`;

/** cmd.exe: doskey macros apply only to lines typed interactively, which is exactly "actively run". */
function cmdScript(exe, bin) {
  return ['@echo off', ...COMMANDS.map((c) => `doskey ${c}=${q(exe)} ${q(bin)} run ${c} $*`), ''].join('\r\n');
}

function psBlock(exe, bin) {
  const fn = (c) => `function global:${c} { if ($args.Count -eq 0) { ` +
    `$r = Get-Command ${c} -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1; ` +
    `if ($r) { & $r.Source } } else { & ${q(exe)} ${q(bin)} run ${c} @args } }`;
  return [START, ...COMMANDS.map(fn), END].join('\n');
}

function shFunctions(exe, bin) {
  return COMMANDS
    .map((c) => `${c}() { if [ $# -eq 0 ]; then command ${c}; else command ${q(exe)} ${q(bin)} run ${c} "$@"; fi; }`)
    .join('\n');
}

function shBlock(exe, bin) {
  return [START, shFunctions(exe, bin), END].join('\n');
}

/** Replace a marked block (or append one) in a profile's text. */
function upsertBlock(text, block) {
  return `${stripBlock(text).replace(/\s*$/, '')}\n\n${block}\n`;
}

function stripBlock(text) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e < s) return text;
  return (text.slice(0, s) + text.slice(e + END.length)).replace(/\n{3,}/g, '\n\n');
}

/** cmd AutoRun is a single string; keep whatever the player already had. */
function stripAutorun(existing, file) {
  const ours = q(file);
  const v = String(existing || '').trim();
  if (v === ours) return '';
  return v.split(` & ${ours}`).join('').split(`${ours} & `).join('').trim();
}

function mergeAutorun(existing, file) {
  const base = stripAutorun(existing, file);
  return base ? `${base} & ${q(file)}` : q(file);
}

module.exports = {
  COMMANDS, START, END, cmdScript, psBlock, shFunctions, shBlock, upsertBlock, stripBlock, stripAutorun, mergeAutorun,
};
