"""Render the demo GIFs from REAL bugzoo output.

Runs a scripted session (bug appears, fix, caught, team, battle) against a throwaway project,
captures the actual terminal output, and draws it as an animated terminal.

    python tools/make-gif.py            # writes docs/demo.en.gif and docs/demo.zh-TW.gif

Needs Pillow and Node. Windows fonts: Consolas for Latin, Microsoft JhengHei for Chinese.
The only edits to the captured text: Node-internal stack frames are dropped and the temp
project path is shown as C:\\my-app.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BIN = ROOT / "bin" / "bugzoo.js"
REGISTER = (ROOT / "src" / "register.js").as_posix()

FONTS = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
LATIN, LATIN_BOLD = FONTS / "consola.ttf", FONTS / "consolab.ttf"
CJK, CJK_BOLD = FONTS / "msjh.ttc", FONTS / "msjhbd.ttc"

COLS, ROWS = 98, 27
CW, LH = 10, 24
PAD, BAR = 18, 38
SIZE_LATIN, SIZE_CJK = 17, 18

BG, BAR_BG = (22, 22, 27), (38, 38, 46)
FG = (212, 212, 212)
PALETTE = {
    "31": (240, 108, 108), "32": (88, 206, 124), "33": (232, 196, 100),
    "35": (200, 130, 226), "36": (92, 190, 204), "37": (225, 225, 225),
}
DIM = (128, 128, 138)
PROMPT = (120, 170, 255)

ANSI = re.compile(r"\x1b\[([0-9;]*)m")


def font(path, size):
    return ImageFont.truetype(str(path), size, index=0) if str(path).endswith(".ttc") else ImageFont.truetype(str(path), size)


F_LATIN, F_LATIN_B = font(LATIN, SIZE_LATIN), font(LATIN_BOLD, SIZE_LATIN)
F_CJK, F_CJK_B = font(CJK, SIZE_CJK), font(CJK_BOLD, SIZE_CJK)


def is_wide(ch):
    return unicodedata.east_asian_width(ch) in ("W", "F")


def parse_ansi(text):
    """-> list of lines; each line is a list of (char, color, bold)."""
    lines, cur = [], []
    color, bold = FG, False
    pos = 0
    for m in ANSI.finditer(text):
        for ch in text[pos:m.start()]:
            if ch == "\n":
                lines.append(cur)
                cur = []
            elif ch != "\r":
                cur.append((ch, color, bold))
        for code in (m.group(1) or "0").split(";"):
            if code in ("0", ""):
                color, bold = FG, False
            elif code == "1":
                bold = True
            elif code == "2":
                color = DIM
            elif code in PALETTE:
                color = PALETTE[code]
        pos = m.end()
    for ch in text[pos:]:
        if ch == "\n":
            lines.append(cur)
            cur = []
        elif ch != "\r":
            cur.append((ch, color, bold))
    if cur:
        lines.append(cur)
    return lines


def wrap(line):
    """Hard-wrap a line to COLS cells."""
    out, cur, w = [], [], 0
    for cell in line:
        cw = 2 if is_wide(cell[0]) else 1
        if w + cw > COLS:
            out.append(cur)
            cur, w = [], 0
        cur.append(cell)
        w += cw
    out.append(cur)
    return out


def render(buffer, title):
    width = COLS * CW + PAD * 2
    height = ROWS * LH + BAR + PAD
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, width, BAR], fill=BAR_BG)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([16 + i * 22, 12, 30 + i * 22, 26], fill=c)
    d.text((width // 2 - len(title) * 4, 10), title, fill=DIM, font=F_LATIN)
    for r, line in enumerate(buffer[-ROWS:]):
        x, base = PAD, BAR + 10 + r * LH + 18  # one shared baseline keeps Latin and CJK level
        for ch, color, bold in line:
            if ch == " ":
                x += CW
                continue
            if is_wide(ch):
                d.text((x, base), ch, fill=color, font=F_CJK_B if bold else F_CJK, anchor="ls")
                x += CW * 2
            else:
                d.text((x, base), ch, fill=color, font=F_LATIN_B if bold else F_LATIN, anchor="ls")
                x += CW
    return img


def captured(cmd, cwd, env):
    p = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                       encoding="utf-8", errors="replace")
    return p.stdout


INTERNAL = re.compile(r"^\s+at .*\(node:|^\s+at (Module|Object\.\.js|wrapModuleLoad|node:)")


def clean(text, project, fake):
    text = text.replace(str(project), fake).replace(str(project).replace("\\", "/"), fake)
    return "\n".join(l for l in text.split("\n") if not INTERNAL.search(l))


APP = "const api = require('./lib/api');\n\nconsole.log('users:', api.listUsers());\n"
API = "const db = require('./db');\n\nfunction listUsers() {\n  return db.get('users').rows.map((r) => r.name);\n}\n\nmodule.exports = { listUsers };\n"
DB_BAD = "const tables = {};\n\nfunction get(name) {\n  return tables[name];\n}\n\nmodule.exports = { get };\n"
DB_GOOD = "const tables = { users: { rows: [{ name: 'ann' }, { name: 'bob' }] } };\n\nfunction get(name) {\n  return tables[name];\n}\n\nmodule.exports = { get };\n"

TEXT = {
    "en": {"fix": "# fix lib/db.js: create the users table"},
    "zh-TW": {"fix": "# 修好 lib/db.js：建立 users 資料表"},
}


def build(lang, out):
    work = Path(tempfile.mkdtemp(prefix="bugzoo-gif-"))
    project = work / "my-app"
    (project / "lib").mkdir(parents=True)
    (project / "app.js").write_text(APP)
    (project / "lib" / "api.js").write_text(API)
    (project / "lib" / "db.js").write_text(DB_BAD)

    env = {**os.environ, "BUGZOO_HOME": str(work / "home"), "BUGZOO_LANG": lang, "BUGZOO_FORCE": "1",
           "NODE_OPTIONS": f'--require "{REGISTER}"'}
    node = shutil.which("node") or "node"
    subprocess.run([node, str(BIN), "setup", "--lang", lang, "--name", "MilkteaTW1"], env=env,
                   stdout=subprocess.DEVNULL, check=True)

    fake = "C:\\my-app"
    prompt = [("P", PROMPT, True), ("S", PROMPT, True), (" ", FG, False)] + [(c, DIM, False) for c in "C:\\my-app>"] + [(" ", FG, False)]
    buffer, frames, durations = [], [], []

    def snap(ms):
        frames.append(render(buffer, "Windows PowerShell"))
        durations.append(ms)

    def new_prompt_line():
        buffer.append(list(prompt))

    def type_cmd(cmd):
        for ch in cmd:
            buffer[-1].append((ch, FG, False))
            snap(45)
        snap(380)

    def reveal(text, per=3, ms=70):
        pending = parse_ansi(text)
        batch = 0
        for line in pending:
            for piece in (wrap(line) if line else [[]]):
                buffer.append(piece)
                batch += 1
                if batch % per == 0:
                    snap(ms)
        snap(120)

    def scene(display, argv, hold=1700, note=None):
        if note:
            buffer.append([(c, DIM, False) for c in note])
            snap(900)
        new_prompt_line()
        snap(300)
        type_cmd(display)
        out = captured(argv, project, env)
        reveal(clean(out, project, fake))
        snap(hold)

    buffer.append([])
    scene("node app.js", [node, "app.js"])
    (project / "lib" / "db.js").write_text(DB_GOOD)
    scene("node app.js", [node, "app.js"], note=TEXT[lang]["fix"])
    scene("bugzoo team", [node, str(BIN), "team"], hold=1900)
    scene("bugzoo battle --bot", [node, str(BIN), "battle", "--bot"], hold=3200)

    # one shared palette keeps the GIF small and the colours stable
    sample = frames[:: max(1, len(frames) // 12)]
    w, h = sample[0].size
    mosaic = Image.new("RGB", (w, h * len(sample)))
    for i, f in enumerate(sample):
        mosaic.paste(f, (0, i * h))
    pal = mosaic.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    quant = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]

    out.parent.mkdir(parents=True, exist_ok=True)
    quant[0].save(out, save_all=True, append_images=quant[1:], duration=durations, loop=0, optimize=True, disposal=1)
    shutil.rmtree(work, ignore_errors=True)
    return len(frames), out.stat().st_size


def main():
    docs = ROOT / "docs"
    for lang in ("en", "zh-TW"):
        n, size = build(lang, docs / f"demo.{lang}.gif")
        print(f"{lang}: {n} frames, {size / 1024:.0f} KB")


if __name__ == "__main__":
    sys.exit(main())
