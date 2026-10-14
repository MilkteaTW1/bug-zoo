'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'venv', '.venv',
  '__pycache__', 'target', 'vendor', 'coverage', '.bugzoo']);
const EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java',
  '.rb', '.php', '.c', '.h', '.cpp', '.cs']);
const SOURCE_EXT_RE = /\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|rb|php|c|h|cpp|cs|json)$/;
const MAX_FILES = 3000;
const MAX_BYTES = 512 * 1024;

const IMPORT_RES = [
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /^\s*from\s+([\w.]+)\s+import/gm,
  /^\s*import\s+([\w.]+)/gm,
  /#include\s+"([^"]+)"/g,
];

/** "./utils/helper.js" -> "helper", "pkg.mod" -> "mod". */
function moduleKey(spec) {
  const seg = spec.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
  if (SOURCE_EXT_RE.test(seg)) return seg.replace(SOURCE_EXT_RE, '').toLowerCase();
  const dot = seg.lastIndexOf('.');
  return (dot > -1 ? seg.slice(dot + 1) : seg).toLowerCase();
}

function walk(dir, out) {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    if (out.length >= MAX_FILES) return;
    if (it.isDirectory()) {
      if (!SKIP_DIRS.has(it.name) && !it.name.startsWith('.')) walk(path.join(dir, it.name), out);
    } else if (it.isFile() && EXTS.has(path.extname(it.name))) {
      out.push(path.join(dir, it.name));
    }
  }
}

/** Scan a project: size and "how many files depend on each module". */
function scanProject(root) {
  const files = [];
  walk(root, files);
  const importedBy = Object.create(null);
  const locByFile = Object.create(null);
  let loc = 0;
  for (const f of files) {
    let text;
    try {
      if (fs.statSync(f).size > MAX_BYTES) continue;
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n').length;
    loc += lines;
    locByFile[path.relative(root, f).replace(/\\/g, '/')] = lines;
    const keys = new Set();
    for (const re of IMPORT_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) keys.add(moduleKey(m[1]));
    }
    keys.delete(moduleKey(path.basename(f)));
    for (const k of keys) if (k) importedBy[k] = (importedBy[k] || 0) + 1;
  }
  return { root, fileCount: files.length, loc, importedBy, locByFile, truncated: files.length >= MAX_FILES };
}

/** Project files named in a stack trace, in order, de-duplicated. */
function errorFrames(stderr, root) {
  const text = String(stderr || '');
  const absRoot = path.resolve(root);
  const found = [];
  const seen = new Set();
  const add = (p) => {
    const abs = path.resolve(absRoot, p);
    const rel = path.relative(absRoot, abs);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return;
    if (/(^|[\\/])node_modules[\\/]/.test(rel)) return;
    const norm = rel.replace(/\\/g, '/');
    if (seen.has(norm)) return;
    seen.add(norm);
    found.push(norm);
  };
  const res = [
    /File "([^"]+)", line \d+/g,
    /((?:[A-Za-z]:)?[^\s()"':]+\.\w+):\d+(?::\d+)?/g,
  ];
  const hits = [];
  for (const re of res) {
    let m;
    while ((m = re.exec(text)) !== null) hits.push({ at: m.index, file: m[1] });
  }
  hits.sort((a, b) => a.at - b.at).forEach((h) => add(h.file));
  return found;
}

/** Everything the power formula needs for one failing run. */
function analyze(root, stderr) {
  const scan = scanProject(root);
  const frames = errorFrames(stderr, root);
  const blast = frames.reduce((mx, f) => Math.max(mx, scan.importedBy[moduleKey(path.basename(f))] || 0), 0);
  return { frames: frames.length, blast, loc: scan.loc, fileCount: scan.fileCount, files: frames };
}

module.exports = { scanProject, errorFrames, analyze, moduleKey };
