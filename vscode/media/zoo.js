(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const zoo = document.getElementById('zoo');
  const bar = document.getElementById('bar');
  const pen = document.getElementById('pen');
  const empty = document.getElementById('empty');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TONE = { common: '#9aa0a6', uncommon: '#34a853', rare: '#1a9bd7', legendary: '#b33fd1' };
  // All texts come from the player's language file (src/locales/<code>.js, keys vs.*) through the state.
  let text = {};
  const tr = (k) => text[k] || '';

  const mons = new Map();
  let justDragged = false; // a drag ends with a click event that must not poke the monster
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
    // Wild bugs stay above the pen; caught ones stay inside it, unless the player dropped one up in the wild area.
    const outside = m.wild || m.roam === 'wild';
    const top = outside ? 28 : h * 0.54;
    const bottom = outside && penOn ? h * 0.5 : h - 10;
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
    el.addEventListener('click', () => {
      if (justDragged) { justDragged = false; return; }
      poke(c.id);
    });
    // Caught monsters can be picked up with the mouse and put down anywhere in the zoo.
    el.addEventListener('pointerdown', (e) => {
      const m = mons.get(c.id);
      if (!m || m.wild || e.button !== 0) return;
      const start = { x: e.clientX, y: e.clientY, mx: m.x, my: m.y, moved: false };
      const move = (ev) => {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 4) return;
        if (!start.moved) { start.moved = true; m.drag = true; m.el.classList.add('held'); m.el.classList.remove('sleep'); }
        const { w, h } = size();
        m.x = Math.min(Math.max(0, start.mx + dx), Math.max(0, w - (m.el.offsetWidth || 60)));
        m.y = Math.min(Math.max(0, start.my + dy), Math.max(0, h - (m.el.offsetHeight || 50)));
        m.el.style.transform = 'translate(' + m.x.toFixed(1) + 'px, ' + m.y.toFixed(1) + 'px)';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!start.moved) return;
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 0);
        m.drag = false;
        // Where it was put down decides where it lives: the wild area above the pen, or the pen.
        m.roam = penOn && m.y + (m.el.offsetHeight || 50) / 2 < size().h * 0.54 ? 'wild' : 'pen';
        m.el.classList.remove('held');
        m.state = 'idle'; // stay where it was put down for a few seconds, then wander again
        m.timer = rand(4, 7);
        m.bob = 0;
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    // Caught monsters can be given a nickname.
    el.addEventListener('dblclick', () => { if (!wild) vscode.postMessage({ type: 'nick', id: c.id }); });
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
    if (!wild && c.shinies) s += ' <span class="shiny" title="' + esc(tr('shiny')) + '">✨</span>';
    if (!wild && c.companion) s += ' <span title="' + esc(tr('companion')) + '">🤝</span>';
    if (!wild && c.hearts) s += '<div class="meta hearts" title="' + esc(tr('affection') + ' ' + c.bond) + '">' + '♥'.repeat(Math.min(c.hearts, 5)) + (c.hearts > 5 ? '+' : '') + '</div>';
    if (!wild && c.power) s += '<div class="meta">⚔ ' + tr('power') + ' ' + c.power + '</div>';
    if (wild) {
      s += '<div class="meta">' + esc(c.type) + (c.since ? ' · ' + shortDate(c.since) : '') + '</div>';
      if (c.power) s += '<div class="meta">⚔ ' + tr('power') + ' ' + c.power + '</div>';
    }
    return s;
  }

  function tip(c, wild) {
    const parts = [tr('creature').replace('{name}', c.name).replace('{type}', c.type), tr('rarity.' + c.rarity) || c.rarity];
    if (c.species) parts.push(c.species);
    if (c.element) parts.push(tr('element.' + c.element) || c.element);
    if (wild && c.since) parts.push(tr('since') + ' ' + fullDate(c.since));
    if (c.power) parts.push(tr('power') + ' ' + c.power);
    if (wild && c.sample) parts.push(c.sample);
    if (!wild) parts.push(tr('caught') + ' x' + c.captures, tr('evo') + ' ' + (c.stage + 1));
    if (!wild && c.shinies) parts.push('✨ x' + c.shinies);
    if (!wild) parts.push(tr('affection') + ' ' + c.bond);
    if (!wild) parts.push(tr('nickHint'));
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
    text = state.text || text;
    bar.innerHTML = '<span title="' + esc(tr('species') + ' ' + state.kinds + '/' + state.kindsTotal) + '">' + tr('caught') + ' ' +
      state.caughtCount + ' / ' + tr('seen') + ' ' + state.seen + ' · ' + tr('species') + ' ' + state.kinds + '/' + state.kindsTotal + '</span><span title="' +
      esc(tr('streakTip').replace('{n}', state.streakEvery)) + '">' + '🪙 ' + state.shop.coins + ' ' + (state.streak ? '🔥 ' + (state.streak % state.streakEvery) + '/' + state.streakEvery + ' ' : '') +
      (state.wild.length ? tr('wild') + ' ' + state.wild.length : '') + '</span>';
    pen.dataset.label = tr('pen');
    pen.innerHTML = state.shop.furniture.filter((f) => f.owned).map((f) => '<span class="deco" title="' + esc(f.name) + '">' + f.icon + '</span>').join('');
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
      if (m.drag) continue; // being held: the mouse moves it
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

  // arena.js (the ladder, friends and fights) shares the page through this handle.
  window.bugzoo = {
    vscode,
    tr,
    esc,
    relayout(ladderHeight) {
      zoo.style.setProperty('--ladder-h', ladderHeight + 'px');
      for (const m of mons.values()) chooseTarget(m);
    },
  };

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg && msg.type === 'state') render(msg.state, msg.events);
  });
  window.addEventListener('resize', () => { for (const m of mons.values()) chooseTarget(m); });
  requestAnimationFrame(tick);
  vscode.postMessage({ type: 'ready' });
})();
