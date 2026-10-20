'use strict';

// Records the README GIFs: the real zoo/arena webview inside a mock VS Code window, driven by a script.
//   node tools/record-demo.js [outDir]
// Needs puppeteer-core (not a dependency of the extension) and Chrome, plus ffmpeg on PATH.
//   NODE_PATH=<dir with node_modules/puppeteer-core> node tools/record-demo.js
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const puppeteer = require('puppeteer-core');
const { build } = require('./demo-data');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WIDTH = 1120;
const HEIGHT = 660;
const outDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs'));
const work = path.join(require('node:os').tmpdir(), `bugzoo-rec-${Date.now()}`);
const ZH = process.env.BZ_LANG === 'zh';
const media = path.join(__dirname, '..', 'media');

function sidebarHtml() {
  const css = fs.readFileSync(path.join(media, 'zoo.css'), 'utf8');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--vscode-foreground:#cccccc;--vscode-sideBar-background:#252526;--vscode-editor-background:#1e1e1e;
--vscode-font-family:"Segoe UI",system-ui,sans-serif;--vscode-editor-font-family:Consolas,"Cascadia Mono",monospace;
--vscode-button-background:#0e639c;--vscode-button-foreground:#fff;--vscode-button-hoverBackground:#1177bb;
--vscode-button-secondaryBackground:#3a3d41;--vscode-button-secondaryForeground:#fff;--vscode-button-secondaryHoverBackground:#45494e;
--vscode-list-activeSelectionBackground:#094771;--vscode-editorWidget-border:#454545;--vscode-sideBarSectionHeader-border:#454545}
body{background:#252526}${css}</style></head><body>
<div class="bar" id="bar"></div>
<div class="zoo" id="zoo"><div class="pen" id="pen" data-label="caught"></div><div class="empty" id="empty"></div></div>
<div class="ladder" id="ladder" hidden></div><div class="arena" id="arena" hidden></div>
<script>window.acquireVsCodeApi=()=>({postMessage:(m)=>parent.postMessage({__bz:1,msg:m},'*')});</script>
<script src="zoo.js"></script><script src="arena.js"></script></body></html>`;
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function record(browser, base, name) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`${base}/mock.html?${name}${ZH ? '&zh' : ''}`);
  await page.waitForFunction('window.__ready === true');

  const frames = [];
  const client = await page.createCDPSession();
  client.on('Page.screencastFrame', async (f) => {
    frames.push({ ts: f.metadata.timestamp, data: f.data });
    await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.evaluate(`window.runScenario(${JSON.stringify(name)})`);
  await new Promise((r) => setTimeout(r, 400));
  await client.send('Page.stopScreencast');
  await page.close();

  const dir = path.join(work, name);
  fs.mkdirSync(dir, { recursive: true });
  const list = [];
  frames.forEach((f, i) => {
    const file = path.join(dir, `f${String(i).padStart(5, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    const next = frames[i + 1] ? frames[i + 1].ts : f.ts + 0.4;
    list.push(`file '${file.replace(/\\/g, '/')}'`, `duration ${Math.max(0.02, next - f.ts).toFixed(3)}`);
  });
  list.push(list[list.length - 2]);
  const listFile = path.join(dir, 'list.txt');
  fs.writeFileSync(listFile, list.join('\n'));
  return { dir, listFile, count: frames.length };
}

function encode(listFile, gif, mp4) {
  const run = (args) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg failed');
  };
  const vf = 'fps=15,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
  run(['-f', 'concat', '-safe', '0', '-i', listFile, '-vf', vf, '-loop', '0', gif]);
  if (mp4) {
    run(['-f', 'concat', '-safe', '0', '-i', listFile, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', mp4]);
  }
}

(async () => {
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const data = await build();
  fs.writeFileSync(path.join(work, 'data.json'), JSON.stringify(data));
  fs.copyFileSync(path.join(__dirname, 'demo', 'mock.html'), path.join(work, 'mock.html'));
  fs.copyFileSync(path.join(media, 'zoo.js'), path.join(work, 'zoo.js'));
  fs.copyFileSync(path.join(media, 'arena.js'), path.join(work, 'arena.js'));
  fs.writeFileSync(path.join(work, 'sidebar.html'), sidebarHtml());

  const server = await serve(work);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
  try {
    for (const name of ['catch', 'fight', 'friends']) {
      const r = await record(browser, base, name);
      const gif = path.join(outDir, `${name}${ZH ? '.zh' : ''}.gif`);
      const mp4 = process.env.MP4_DIR ? path.join(process.env.MP4_DIR, `${name}${ZH ? '.zh' : ''}.mp4`) : null;
      encode(r.listFile, gif, mp4);
      console.log(`${name}: ${r.count} frames -> ${gif} (${(fs.statSync(gif).size / 1048576).toFixed(1)} MB)`);
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
