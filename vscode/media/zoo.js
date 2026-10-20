(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const zoo = document.getElementById('zoo');
  const bar = document.getElementById('bar');
  const pen = document.getElementById('pen');
  const empty = document.getElementById('empty');
  const ladderEl = document.getElementById('ladder');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TONE = { common: '#9aa0a6', uncommon: '#34a853', rare: '#1a9bd7', legendary: '#b33fd1' };
  const TEXT = {
    en: { caught: 'caught', seen: 'seen', pen: 'caught', empty: 'The zoo is empty.<br>Run a command that fails in the terminal<br>and a monster will show up.', wild: 'wild', power: 'power', evo: 'form', since: 'since', ladder: 'Ladder', offline: 'offline copy', noladder: 'Ladder unavailable' },
    'zh-TW': { caught: '已捕獲', seen: '已遇見', pen: '已捕獲', empty: '動物園還是空的。<br>在終端機跑一個會出錯的指令,<br>怪物就會出現。', wild: '野生', power: '戰力', evo: '型態', since: '出現於', ladder: '榜單', offline: '離線資料', noladder: '榜單暫時無法載入' },
  };
  let lang = 'en';
  const tr = (k) => (TEXT[lang] || TEXT.en)[k];

  const mons = new Map();
  let last = performance.now();
  let penOn = false;
  const MAX_WILD = 14;

  const rand = (a, b) => a + Math.random() * (b - a);
  const size = () => ({ w: zoo.clientWidth, h: zoo.clientHeight });
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  function bounds(m) {
    const { w, h } = size();
    const mw = m.el.offsetWidth || 60;
    const mh = m.el.offsetHeight || 50;
    // Wild bugs stay above the pen; caught ones stay inside it.
    const top = m.wild ? 28 : h * 0.54;
    const bottom = m.wild && penOn ? h * 0.5 : h - 10;
    return {
      minX: 6,
      maxX: Math.max(6, w - mw - 6),
      minY: Math.min(top, bottom - mh),
      maxY: Math.max(top, bottom - mh),
    };
  }

  function chooseTarget(m) {
    const b = bounds(m);
    m.tx = rand(b.minX, b.maxX);
    m.ty = rand(b.minY, b.maxY);
  }

  function makeEl(c, wild) {
    const el = document.createElement('div');
    el.className = 'mon ' + (wild ? 'wild' : 'caught') + ' stage' + (c.stage || 0);
    el.style.setProperty('--tone', TONE[c.rarity] || TONE.common);
    const body = document.createElement('div');
    body.className = 'body';
    const pre = document.createElement('pre');
    pre.textContent = (c.art || []).join('\n');
    body.appendChild(pre);
    const name = document.createElement('div');
    name.className = 'name';
    el.append(body, name);
    el.addEventListener('click', () => poke(c.id));
    zoo.appendChild(el);
    return el;
  }

  function shortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function fullDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString();
  }

  function label(c, wild) {
    let s = '<b>' + esc(c.name) + '</b>';
    if (!wild && c.stage) s += ' ' + '★'.repeat(c.stage);
    if (wild) {
      s += '<div class="meta">' + esc(c.type) + (c.since ? ' · ' + shortDate(c.since) : '') + '</div>';
      if (c.power) s += '<div class="meta">⚔ ' + tr('power') + ' ' + c.power + '</div>';
    }
    return s;
  }

  function tip(c, wild) {
    const parts = [c.name + ' the ' + c.type, c.rarity];
    if (wild && c.since) parts.push(tr('since') + ' ' + fullDate(c.since));
    if (wild && c.power) parts.push(tr('power') + ' ' + c.power);
    if (wild && c.sample) parts.push(c.sample);
    if (!wild) parts.push(tr('caught') + ' x' + c.captures, tr('evo') + ' ' + (c.stage + 1));
    return parts.join(' · ');
  }

  function fx(text, x, y) {
    if (reduce) return;
    const f = document.createElement('div');
    f.className = 'fx';
    f.textContent = text;
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    zoo.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  function burst(m, glyphs) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => fx(glyphs[i % glyphs.length], m.x + rand(-6, 40), m.y + rand(-4, 24)), i * 70);
    }
  }

  function hop(m) {
    m.el.classList.remove('hop');
    void m.el.offsetWidth;
    m.el.classList.add('hop');
  }

  function poke(id) {
    const m = mons.get(id);
    if (!m) return;
    hop(m);
    m.state = 'walk';
    m.el.classList.remove('sleep');
    chooseTarget(m);
    fx(m.wild ? '💢' : '💛', m.x + 12, m.y - 6);
  }

  function upsert(c, wild, isNew) {
    let m = mons.get(c.id);
    if (!m) {
      const { w, h } = size();
      const el = makeEl(c, wild);
      m = {
        id: c.id, el, wild,
        x: rand(10, Math.max(12, w - 70)), y: wild ? 40 : h * 0.6,
        tx: 0, ty: 0, state: 'walk', timer: 0, flip: false, bob: 0,
      };
      mons.set(c.id, m);
      if (isNew && !reduce) {
        el.classList.add('drop');
        setTimeout(() => el.classList.remove('drop'), 700);
        burst(m, ['❗', '✨']);
      }
      chooseTarget(m);
    } else if (m.wild !== wild) {
      m.wild = wild;
      m.el.className = 'mon ' + (wild ? 'wild' : 'caught') + ' stage' + (c.stage || 0);
      chooseTarget(m);
      if (!wild) burst(m, ['🎉', '✨', '⭐']);
    }
    m.el.querySelector('.name').innerHTML = label(c, wild);
    m.el.title = tip(c, wild);
    m.seen = true;
    return m;
  }

  function render(state, events) {
    if (state.lang && TEXT[state.lang]) lang = state.lang;
    else if (/^zh/i.test(navigator.language)) lang = 'zh-TW';
    bar.innerHTML = '<span>' + tr('caught') + ' ' + state.caughtCount + ' / ' + tr('seen') + ' ' + state.seen + '</span><span>' +
      (state.wild.length ? tr('wild') + ' ' + state.wild.length : '') + '</span>';
    pen.dataset.label = tr('pen');
    empty.innerHTML = tr('empty');

    const fresh = new Set(((events && events.brandNew) || []).concat((events && events.spawned) || []).map((c) => c.id));
    for (const m of mons.values()) m.seen = false;
    state.wild.slice(0, MAX_WILD).forEach((c) => upsert(c, true, fresh.has(c.id)));
    state.caught.slice(0, 30).forEach((c) => upsert(c, false, false));
    for (const [id, m] of Array.from(mons)) {
      if (!m.seen) { m.el.remove(); mons.delete(id); }
    }
    const nothing = state.wild.length + state.caught.length === 0;
    empty.style.display = nothing ? 'flex' : 'none';
    pen.style.display = state.caught.length ? 'block' : 'none';
    const hadPen = penOn;
    penOn = state.caught.length > 0;
    if (hadPen !== penOn) for (const m of mons.values()) if (m.wild) chooseTarget(m);
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const m of mons.values()) {
      m.timer -= dt;
      if (m.state === 'walk') {
        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const dist = Math.hypot(dx, dy);
        const speed = (m.wild ? 70 : 26) * (reduce ? 0.3 : 1);
        if (dist < 3) {
          m.state = Math.random() < (m.wild ? 0.15 : 0.45) ? 'sleep' : 'idle';
          m.timer = m.state === 'sleep' ? rand(3, 7) : rand(0.4, m.wild ? 1.1 : 2.6);
          m.el.classList.toggle('sleep', m.state === 'sleep');
        } else {
          m.x += (dx / dist) * speed * dt;
          m.y += (dy / dist) * speed * dt;
          if (Math.abs(dx) > 2) {
            const f = dx < 0;
            if (f !== m.flip) { m.flip = f; m.el.classList.toggle('flip', f); }
          }
          m.bob = reduce ? 0 : Math.sin(now / (m.wild ? 70 : 150) + m.x) * (m.wild ? 2 : 1.2);
        }
      } else if (m.timer <= 0) {
        m.state = 'walk';
        m.bob = 0;
        m.el.classList.remove('sleep');
        chooseTarget(m);
        if (!m.wild && Math.random() < 0.15) hop(m);
      }
      m.el.style.transform = 'translate(' + m.x.toFixed(1) + 'px, ' + (m.y + (m.state === 'walk' ? m.bob : 0)).toFixed(1) + 'px)';
    }
    requestAnimationFrame(tick);
  }

  let ladderData = null;
  let ladderCollapsed = false;
  function renderLadder() {
    if (!ladderData) { ladderEl.hidden = true; zoo.style.setProperty('--ladder-h', '0px'); return; }
    ladderEl.hidden = false;
    ladderEl.classList.toggle('collapsed', ladderCollapsed);
    const rows = ladderData.rows.slice(0, 50).map((r) =>
      '<div class="row' + (r.me ? ' me' : '') + '" title="' + esc(r.team.join(', ')) + '"><span class="rk">' + r.rank +
      '</span><span>' + esc(r.name) + '</span><span class="pw">⚔ ' + r.power + '</span></div>').join('');
    const note = ladderData.rows.length === 0 ? tr('noladder') : (ladderData.offline ? tr('offline') : '');
    ladderEl.innerHTML = '<h3 id="lh"><span>🏆 ' + tr('ladder') + '</span><span>' + (ladderCollapsed ? '▸' : '▾') + '</span></h3>' +
      '<div class="rows">' + rows + '</div>' + (note ? '<div class="note">' + note + '</div>' : '');
    document.getElementById('lh').addEventListener('click', () => { ladderCollapsed = !ladderCollapsed; renderLadder(); });
    zoo.style.setProperty('--ladder-h', ladderEl.offsetHeight + 'px');
    for (const m of mons.values()) chooseTarget(m);
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg && msg.type === 'state') { render(msg.state, msg.events); renderLadder(); }
    if (msg && msg.type === 'ladder') { ladderData = msg.ladder; renderLadder(); }
  });
  window.addEventListener('resize', () => { for (const m of mons.values()) chooseTarget(m); });
  requestAnimationFrame(tick);
  vscode.postMessage({ type: 'ready' });
})();
