'use strict';

/**
 * Build the standalone program (no Node needed to run it): node tools/build-binary.js
 *
 * Bundles bin/bugzoo.js with esbuild, then injects it into a copy of the Node binary as a single executable
 * application. Output: dist/bugzoo-<os>-<arch>[.exe] and a .sha256 next to it. It builds for the machine it
 * runs on, so CI runs it once per platform.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const work = path.join(dist, 'sea');
const ESBUILD = '0.25.5';
const POSTJECT = '1.0.0-alpha.6';
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const win = process.platform === 'win32';
const mac = process.platform === 'darwin';
const osName = win ? 'win' : mac ? 'macos' : 'linux';
const out = path.join(dist, `bugzoo-${osName}-${process.arch}${win ? '.exe' : ''}`);

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', shell: win && /^np[mx]$/.test(cmd), ...opts }); // only npm/npx are .cmd shims

/** i18n.js lists src/locales at run time; inside one file there is no folder, so list it now instead. */
const staticLocales = {
  name: 'static-locales',
  setup(build) {
    build.onLoad({ filter: /src.i18n\.js$/ }, (args) => {
      let text = fs.readFileSync(args.path, 'utf8');
      const start = text.indexOf('for (const f of fs.readdirSync');
      const end = start < 0 ? -1 : text.indexOf('\n}', start);
      if (start < 0 || end < 0) throw new Error('src/i18n.js changed: update the static-locales step in tools/build-binary.js');
      const files = fs.readdirSync(path.join(path.dirname(args.path), 'locales')).filter((n) => n.endsWith('.js')).sort();
      const list = files.map((f) => `require('./locales/${f}')`).join(', ');
      text = `${text.slice(0, start)}for (const loc of [${list}]) {\n  if (loc && loc.code && loc.messages) LOCALES[loc.code] = loc;\n}${text.slice(end + 2)}`;
      return { contents: text, loader: 'js', resolveDir: path.dirname(args.path) };
    });
  },
};

async function main() {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  // esbuild is only needed here, so it lives in dist/ and never becomes a dependency of the package.
  const toolDir = path.join(dist, 'tools');
  if (!fs.existsSync(path.join(toolDir, 'node_modules', 'esbuild'))) {
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(toolDir, 'package.json'), '{"private":true}');
    sh('npm', ['install', '--no-audit', '--no-fund', '--silent', `esbuild@${ESBUILD}`], { cwd: toolDir });
  }
  const esbuild = require(path.join(toolDir, 'node_modules', 'esbuild'));

  const bundle = path.join(work, 'bugzoo.cjs');
  await esbuild.build({
    entryPoints: [path.join(root, 'bin', 'bugzoo.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: bundle,
    plugins: [staticLocales],
    logLevel: 'warning',
  });

  const config = path.join(work, 'sea-config.json');
  const blob = path.join(work, 'sea.blob');
  fs.writeFileSync(config, JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true }));
  sh(process.execPath, ['--experimental-sea-config', config]);

  fs.mkdirSync(dist, { recursive: true });
  fs.copyFileSync(process.execPath, out);
  if (!win) fs.chmodSync(out, 0o755);
  if (mac) sh('codesign', ['--remove-signature', out]);

  const args = [`postject@${POSTJECT}`, out, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', FUSE];
  if (mac) args.push('--macho-segment-name', 'NODE_SEA');
  sh('npx', ['--yes', ...args]);
  if (mac) sh('codesign', ['--sign', '-', out]);

  const sum = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  fs.writeFileSync(`${out}.sha256`, `${sum}  ${path.basename(out)}\n`);
  console.log(`built ${out} (${(fs.statSync(out).size / 1048576).toFixed(0)} MB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
