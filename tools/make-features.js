'use strict';

// Writes docs/features.en.svg and docs/features.zh-TW.svg: a one-page overview for sharing.
const fs = require('node:fs');
const path = require('node:path');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TEXT = {
  en: {
    title: 'Bug Zoo',
    tagline: 'Turn your error messages into collectible monsters.',
    steps: [
      ['1', 'Your code fails', 'A monster spawns'],
      ['2', 'You fix the bug', 'Run it again'],
      ['3', 'Caught!', 'It joins your bestiary'],
      ['4', 'Battle', 'Climb the ladder'],
    ],
    cards: [
      ['🔧', 'Catch by fixing', ['A monster is caught only when', 'a clean re-run proves the fix.']],
      ['⚡', 'Automatic capture', ['Node, Python, Go, Rust, Java,', 'npm, gcc, .NET and more.']],
      ['🤖', 'AI assistants count', ['Claude Code runs a failing', 'command? A monster shows up.']],
      ['💪', 'Power from real code', ['Stack depth, blast radius,', 'project size, error rate.']],
      ['⚔️', 'Ladder and friends', ['Fight rivals and friends.', 'No server, no database.']],
      ['✨', 'Evolve and achieve', ['Catch again to evolve.', '13 achievements to earn.']],
      ['🃏', 'Shareable cards', ['Export your bestiary and', 'battle results as SVG.']],
      ['🌐', 'Zero dependencies', ['One npm install. English', 'and Traditional Chinese.']],
    ],
    install: 'npm install -g bug-zoo',
  },
  'zh-TW': {
    title: 'Bug Zoo',
    tagline: '把你的錯誤訊息變成可以收集的怪物。',
    steps: [
      ['1', '程式出錯', '怪物出現'],
      ['2', '修好 bug', '再跑同一條指令'],
      ['3', '捕捉成功！', '加入你的圖鑑'],
      ['4', '對戰', '攀登天梯'],
    ],
    cards: [
      ['🔧', '修好才算捕捉', ['重跑成功，才證明', '你真的修好了。']],
      ['⚡', '自動捕捉', ['Node、Python、Go、Rust、', 'Java、npm、gcc、.NET…']],
      ['🤖', 'AI 助手也算', ['Claude Code 跑的指令失敗，', '同樣會出現怪物。']],
      ['💪', '戰鬥力來自真實專案', ['堆疊深度、影響範圍、', '專案規模、錯誤頻率。']],
      ['⚔️', '天梯與好友', ['挑戰對手與朋友，', '不需要伺服器與資料庫。']],
      ['✨', '進化與成就', ['同一隻捕捉多次會進化，', '13 個成就等你收集。']],
      ['🃏', '可分享的卡片', ['圖鑑與戰鬥結果', '都能匯出成 SVG。']],
      ['🌐', '零依賴', ['一行 npm 安裝，', '支援繁體中文與英文。']],
    ],
    install: 'npm install -g bug-zoo',
  },
};

const W = 1200;
const H = 880;
const FONT = "'Segoe UI','Microsoft JhengHei','Noto Sans TC','PingFang TC',sans-serif";
const ACCENTS = ['#5eead4', '#fbbf24', '#a78bfa', '#f87171', '#60a5fa', '#f472b6', '#34d399', '#fb923c'];

function build(t) {
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">`);
  out.push(`<rect width="${W}" height="${H}" fill="#0f172a"/>`);
  out.push(`<text x="${W / 2}" y="92" text-anchor="middle" font-size="64" font-weight="700" fill="#f8fafc">🐛 ${esc(t.title)}</text>`);
  out.push(`<text x="${W / 2}" y="140" text-anchor="middle" font-size="26" fill="#94a3b8">${esc(t.tagline)}</text>`);

  // the loop: fail -> fix -> catch -> battle
  const sw = 255;
  const gap = 40;
  const sx = (W - (4 * sw + 3 * gap)) / 2;
  t.steps.forEach(([n, a, b], i) => {
    const x = sx + i * (sw + gap);
    out.push(`<rect x="${x}" y="185" width="${sw}" height="96" rx="14" fill="#1e293b" stroke="${ACCENTS[i]}" stroke-width="2"/>`);
    out.push(`<circle cx="${x + 36}" cy="233" r="20" fill="${ACCENTS[i]}"/>`);
    out.push(`<text x="${x + 36}" y="241" text-anchor="middle" font-size="22" font-weight="700" fill="#0f172a">${n}</text>`);
    out.push(`<text x="${x + 70}" y="228" font-size="22" font-weight="600" fill="#f8fafc">${esc(a)}</text>`);
    out.push(`<text x="${x + 70}" y="257" font-size="16" fill="#94a3b8">${esc(b)}</text>`);
    if (i < 3) out.push(`<text x="${x + sw + gap / 2}" y="241" text-anchor="middle" font-size="28" fill="#475569">›</text>`);
  });

  // feature cards, 4 x 2
  const cw = 270;
  const ch = 210;
  const cg = 20;
  const cx0 = (W - (4 * cw + 3 * cg)) / 2;
  t.cards.forEach(([icon, head, lines], i) => {
    const x = cx0 + (i % 4) * (cw + cg);
    const y = 330 + Math.floor(i / 4) * (ch + cg);
    const c = ACCENTS[i];
    out.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="#1e293b"/>`);
    out.push(`<rect x="${x}" y="${y}" width="${cw}" height="6" rx="3" fill="${c}"/>`);
    out.push(`<text x="${x + 24}" y="${y + 68}" font-size="40">${icon}</text>`);
    out.push(`<text x="${x + 24}" y="${y + 115}" font-size="22" font-weight="700" fill="#f8fafc">${esc(head)}</text>`);
    lines.forEach((l, j) => out.push(`<text x="${x + 24}" y="${y + 148 + j * 24}" font-size="16" fill="#cbd5e1">${esc(l)}</text>`));
  });

  out.push(`<rect x="${(W - 560) / 2}" y="${H - 84}" width="560" height="52" rx="26" fill="#0b1220" stroke="#334155"/>`);
  out.push(`<text x="${W / 2}" y="${H - 50}" text-anchor="middle" font-size="22" font-family="Consolas,'Courier New',monospace" fill="#5eead4">${esc(t.install)}</text>`);
  out.push(`<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="16" fill="#64748b">github.com/MilkteaTW1/bug-zoo</text>`);
  out.push('</svg>');
  return out.join('\n');
}

const docs = path.resolve(__dirname, '..', 'docs');
for (const lang of Object.keys(TEXT)) {
  const file = path.join(docs, `features.${lang}.svg`);
  fs.writeFileSync(file, build(TEXT[lang]));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
