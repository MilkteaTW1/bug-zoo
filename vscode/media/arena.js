(function () {
  'use strict';
  const bz = window.bugzoo;
  const vscode = bz.vscode;
  const esc = bz.esc;
  const panel = document.getElementById('ladder');
  const arenaEl = document.getElementById('arena');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TONE = { common: '#9aa0a6', uncommon: '#34a853', rare: '#1a9bd7', legendary: '#b33fd1' };
  const tr = (k) => bz.tr(k); // texts: src/locales/<code>.js (keys vs.*)
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_m, k) => (vars[k] === undefined ? '' : vars[k]));

  let data = null;
  let achs = [];
  let S = null; // the latest state: quests, tower and team come from it
  let tab = 'ladder';
  let collapsed = false;
  let notice = '';

  // ---- ladder / friends panel -------------------------------------------------------------------------
  function row(r, canFight) {
    const mine = r.isMe ? ' me' : '';
    const rk = r.section === 'ladder' ? r.rank : (r.section === 'practice' ? '·' : '♥');
    const tags = [];
    if (r.isMe) tags.push(tr('you'));
    if (r.kind) tags.push(tr('kind.' + r.kind) || r.kind);
    const title = r.team.map((m) => m.name).join(', ') + (r.reach ? ' · ' + tr('challenge') : '');
    const star = r.reach ? '<span class="reach" title="' + esc(tr('challenge')) + '">★</span>' : '';
    const fightBtn = canFight && !r.isMe
      ? '<button class="btn fight" data-section="' + r.section + '" data-name="' + esc(r.name) + '">⚔ ' + tr('fight') + '</button>'
      : '';
    const rm = r.section === 'friend'
      ? '<button class="btn ghost rm" title="' + esc(tr('remove')) + '" data-name="' + esc(r.name) + '">✕</button>'
      : '';
    return '<div class="row' + mine + '" title="' + esc(title) + '"><span class="rk">' + rk + '</span><span class="nm">' +
      esc(r.name) + star + (tags.length ? ' <i>' + esc(tags.join(' · ')) + '</i>' : '') + '</span><span class="pw">⚔ ' + r.power +
      '</span><span class="act">' + fightBtn + rm + '</span></div>';
  }

  // ---- achievements ----------------------------------------------------------------------------------
  // Unlock times are ISO instants; show them as the player's own local date.
  const localDate = (iso) => {
    const t = new Date(iso);
    return isNaN(t) ? '' : t.toLocaleDateString();
  };

  function achRow(x) {
    const on = !!x.at;
    return '<div class="ach-row' + (on ? ' on' : '') + '" title="' + esc(x.desc) + '"><span class="ic">' + (on ? '🏅' : '🔒') +
      '</span><span class="nm">' + esc(x.name) + '<small>' + esc(x.desc) + '</small></span><span class="when">' +
      (on ? esc(fill(tr('achUnlocked'), { date: localDate(x.at) })) : esc(tr('achLocked'))) + '</span></div>';
  }

  // ---- quests, tower and team -----------------------------------------------------------------------
  const elName = (e) => tr('element.' + e) || e;

  function questsBody() {
    if (!S) return '';
    const q = S.quests;
    return q.list.map((x) => '<div class="ach-row' + (x.done ? ' on' : '') + '"><span class="ic">' + (x.done ? '✅' : '⬜') + '</span><span class="nm">' +
      esc(x.name) + '</span><span class="when">' + x.have + '/' + x.goal + '</span></div>').join('') +
      '<div class="note">' + esc(fill(tr('questTotal'), { n: q.total, p: q.perfect })) + '</div>';
  }

  function towerBody() {
    if (!S) return '';
    const t = S.tower;
    if (!t.floor) return '<div class="note">' + esc(tr('towerDone')) + '</div>';
    const foes = t.foe.map((m) => '<div class="row"><span class="rk">·</span><span class="nm">' + esc(m.name) + ' <i>' + esc(elName(m.element)) +
      '</i></span><span class="pw">⚔ ' + m.power + '</span><span class="act"></span></div>').join('');
    return '<div class="note">' + esc(fill(tr('towerFloor'), { n: t.floor, total: t.total })) + '</div>' + foes +
      '<div class="btns"><button class="btn primary" id="tower">⚔ ' + tr('fight') + '</button></div>';
  }

  function shopBody() {
    if (!S) return '';
    const sh = S.shop;
    const bag = sh.foods.filter((f) => f.have > 0);
    let h = '<div class="note">' + esc(fill(tr('shop.title'), { coins: sh.coins })) + (sh.comfort ? ' · ' + esc(fill(tr('shop.comfort'), { n: sh.comfort })) : '') + '</div>';
    h += '<div class="note">' + esc(tr('shop.food')) + '</div>';
    h += sh.foods.map((f) => '<div class="ach-row on"><span class="ic">🍖</span><span class="nm">' + esc(f.name) + '<small>' +
      esc(fill(tr('shop.gives'), { n: f.bond })) + (f.have ? ' · ' + esc(fill(tr('shop.have'), { n: f.have })) : '') + '</small></span><span class="when"><button class="btn buy" data-id="' +
      f.id + '"' + (sh.coins < f.price ? ' disabled' : '') + '>🪙 ' + f.price + '</button>' +
      ' <button class="btn buy" data-id="' + f.id + '" data-n="5"' + (sh.coins < f.price * 2 ? ' disabled' : '') + '>×5</button>' +
      ' <button class="btn buy" data-id="' + f.id + '" data-n="max"' + (sh.coins < f.price * 2 ? ' disabled' : '') + '>' + esc(tr('maxBtn')) + '</button>' +
      (f.have ? ' <button class="btn feed" data-food="' + f.id + '">' + esc(tr('feedBtn')) + '</button>' +
        (f.have > 1 ? ' <button class="btn feed" data-food="' + f.id + '" data-n="max">' + esc(tr('feedBtn')) + ' ' + esc(tr('maxBtn')) + '</button>' : '') : '') + '</span></div>').join('');
    h += '<div class="note">' + esc(tr('shop.furniture')) + '</div>';
    h += sh.furniture.map((f) => '<div class="ach-row on"><span class="ic">' + f.icon + '</span><span class="nm">' + esc(f.name) + '</span><span class="when">' +
      (f.owned ? esc(tr('shop.owned')) : '<button class="btn buy" data-id="' + f.id + '"' + (sh.coins < f.price ? ' disabled' : '') + '>🪙 ' + f.price + '</button>') + '</span></div>').join('');
    return h + (bag.length ? '' : '');
  }

  function teamBody() {
    if (!S) return '';
    if (!S.team.rows.length) return '<div class="note">' + esc(tr('noTeam')) + '</div>';
    const rows = S.team.rows.map((m) => '<div class="row pick' + (m.fighting ? ' me' : '') + '" data-id="' + esc(m.id) + '"><span class="rk">' +
      (m.pick || (m.fighting ? '⚔' : '')) + '</span><span class="nm">' + esc(m.name) + (m.stage ? ' ' + '★'.repeat(m.stage) : '') + ' <i>' +
      esc(elName(m.element)) + '</i></span><span class="pw">⚔ ' + m.power + '</span><span class="act"></span></div>').join('');
    return '<div class="note">' + esc(tr('teamHint')) + '</div>' + rows +
      '<div class="btns"><button class="btn" id="auto"' + (S.team.auto ? ' disabled' : '') + '>' + tr('teamAuto') + '</button></div>';
  }

  function renderPanel() {
    panel.hidden = false;
    const d = data || { rows: [], me: null, offline: true };
    panel.classList.toggle('collapsed', collapsed);
    const canFight = !!(d.me && d.me.canFight);
    let body;
    if (tab === 'achievements') {
      body = achs.map(achRow).join('');
    } else if (tab === 'quests') {
      body = questsBody();
    } else if (tab === 'tower') {
      body = towerBody();
    } else if (tab === 'team') {
      body = teamBody();
    } else if (tab === 'shop') {
      body = shopBody();
    } else if (tab === 'ladder') {
      body = d.rows.filter((r) => r.section === 'ladder').slice(0, 50).map((r) => row(r, canFight)).join('');
    } else {
      body = d.rows.filter((r) => r.section === 'friend' || r.section === 'practice').map((r) => row(r, canFight)).join('') +
        '<div class="btns"><button class="btn" id="add">' + tr('addFriend') + '</button><button class="btn" id="copy">' + tr('copyCode') + '</button></div>';
    }
    const notes = [];
    if (tab === 'ladder' || tab === 'friends') {
      if (!canFight) notes.push(tr('noTeam'));
      if (tab === 'ladder' && !d.rows.some((r) => r.section === 'ladder')) notes.push(tr('noladder'));
      else if (d.offline) notes.push(tr('offline'));
    }
    if (notice) notes.push(notice);
    const tabs = [
      ['ladder', '🏆', tr('ladder')], ['friends', '👥', tr('friends')], ['team', '🛡', tr('team')], ['tower', '🗼', tr('tower')], ['shop', '🛒', tr('shopTab')],
      ['quests', '📋', tr('questsTab') + (S ? ' ' + S.quests.list.filter((q) => q.done).length + '/' + S.quests.list.length : '')],
      ['achievements', '🏅', tr('achievements') + ' ' + achs.filter((x) => x.at).length + '/' + achs.length],
    ];
    // Every tab shows its icon; only the open one spells its name out, so six tabs fit a narrow sidebar.
    panel.innerHTML = '<h3><span class="tabs">' + tabs.map(([id, ic, name]) =>
      '<b class="tab' + (tab === id ? ' on' : '') + '" data-tab="' + id + '" title="' + esc(name) + '">' + ic + (tab === id ? ' ' + esc(name) : '') + '</b>').join('') +
      '</span><span class="share" title="' + esc(tr('shareBtn')) + '">📤</span><span class="fold">' + (collapsed ? '▸' : '▾') + '</span></h3><div class="rows">' + body + '</div>' +
      (notes.length ? '<div class="note">' + notes.map(esc).join(' · ') + '</div>' : '');
    bz.relayout(panel.offsetHeight);
  }

  panel.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const tabEl = t.closest('.tab');
    if (tabEl) { tab = tabEl.dataset.tab; collapsed = false; renderPanel(); return; }
    if (t.closest('.share')) { vscode.postMessage({ type: 'share' }); return; }
    if (t.closest('h3')) { collapsed = !collapsed; renderPanel(); return; }
    const f = t.closest('.fight');
    if (f) { notice = ''; vscode.postMessage({ type: 'fight', section: f.dataset.section, name: f.dataset.name }); return; }
    const rm = t.closest('.rm');
    if (rm) { vscode.postMessage({ type: 'removeFriend', name: rm.dataset.name }); return; }
    const pick = t.closest('.pick');
    if (pick && S) {
      const cur = S.team.rows.filter((m) => m.pick).sort((a, c) => a.pick - c.pick).map((m) => m.id);
      const at = cur.indexOf(pick.dataset.id);
      if (at >= 0) cur.splice(at, 1); else cur.push(pick.dataset.id);
      vscode.postMessage({ type: 'setTeam', ids: cur.slice(-3) });
      return;
    }
    const buy = t.closest('.buy');
    if (buy) { vscode.postMessage({ type: 'buy', id: buy.dataset.id, n: buy.dataset.n || 1 }); return; }
    const feedBtn = t.closest('.feed');
    if (feedBtn) { vscode.postMessage({ type: 'feed', food: feedBtn.dataset.food, n: feedBtn.dataset.n || 1 }); return; }
    if (t.closest('#auto')) { vscode.postMessage({ type: 'setTeam', ids: [] }); return; }
    if (t.closest('#tower')) { notice = ''; vscode.postMessage({ type: 'tower' }); return; }
    if (t.closest('#add')) vscode.postMessage({ type: 'addFriend' });
    if (t.closest('#copy')) vscode.postMessage({ type: 'copyCode' });
  });

  // ---- battle replay ----------------------------------------------------------------------------------
  let timer = null;

  const maxHp = (m) => Math.max(40, m.power * 4);

  function card(m, side, i) {
    return '<div class="bcard" id="c-' + side + '-' + i + '" style="--tone:' + (TONE[m.rarity] || TONE.common) + '">' +
      '<pre>' + esc((m.art || []).join('\n')) + '</pre><div class="cn">' + esc(m.name) + (m.stage ? ' ' + '★'.repeat(m.stage) : '') + '</div>' +
      (m.element ? '<div class="cp">' + esc(tr('element.' + m.element) || m.element) + '</div>' : '') +
      '<div class="hp"><i id="h-' + side + '-' + i + '"></i></div><div class="cp">⚔ ' + m.power + '</div></div>';
  }

  function closeBattle() {
    clearInterval(timer);
    arenaEl.hidden = true;
    arenaEl.innerHTML = '';
  }

  function float(side, i, text, crit) {
    if (reduce) return;
    const c = document.getElementById('c-' + side + '-' + i);
    if (!c) return;
    const f = document.createElement('div');
    f.className = 'dmg' + (crit ? ' crit' : '');
    f.textContent = text;
    c.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function playBattle(b) {
    if (!b || b.error) {
      notice = b && b.error === 'noTeam' ? tr('noTeam') : b && b.error === 'towerDone' ? tr('towerDone') : tr('gone');
      renderPanel();
      return;
    }
    clearInterval(timer);
    arenaEl.hidden = false;
    const cards = (team, side) => team.map((m, i) => card(m, side, i)).join('');
    arenaEl.innerHTML =
      '<div class="bt-head"><span>' + esc(b.me.name) + ' ' + tr('vs') + ' ' + esc(b.foe.name) + '</span><button class="btn ghost" id="skip">' + tr('skip') + '</button></div>' +
      '<div class="bt-name">' + esc(b.foe.name) + '</div><div class="side">' + cards(b.foe.team, 'foe') + '</div>' +
      '<div class="bt-log" id="log">&nbsp;</div>' +
      '<div class="side">' + cards(b.me.team, 'me') + '</div><div class="bt-name">' + esc(b.me.name) + '</div>' +
      '<div class="bt-foot" id="foot"></div>';

    const team = { me: b.me.team, foe: b.foe.team };
    const hp = { me: team.me.map(maxHp), foe: team.foe.map(maxHp) };
    const front = { me: 0, foe: 0 };
    const firstMe = !b.log.length || b.log[0].att === team.me[0].name;
    let k = 0;

    function finish() {
      clearInterval(timer);
      document.getElementById('skip').hidden = true;
      const note = b.outcome === 'towerWin' ? fill(tr('towerWin'), { n: b.floor })
        : b.outcome === 'towerLose' ? fill(tr('towerLose'), { n: b.floor })
        : b.outcome === 'promote' ? fill(tr('promote'), { name: b.foe.name })
        : b.outcome === 'outOfReach' ? fill(tr('outOfReach'), { reach: b.reach })
          : (tr(b.outcome === 'practice' ? 'practiceNote' : b.outcome) || '');
      const ach = (b.earned || []).map((a) => '<div class="ach">🏅 ' + tr('achievement') + ': ' + esc(a.name) + '<br><small>' + esc(a.desc) + '</small></div>').join('');
      const coin = b.coins ? '<div class="ach">🪙 ' + esc(fill(tr('coinsEarned'), { n: b.coins })) + '</div>' : '';
      const qs = (b.quests || []).map((q) => '<div class="ach">📋 ' + tr('questDone') + ': ' + esc(q) + '</div>').join('');
      document.getElementById('foot').innerHTML =
        '<div class="res ' + (b.won ? 'win' : 'lose') + '">' + (b.won ? '🏆 ' + tr('win') : '💔 ' + tr('lose')) + '</div>' +
        '<div class="rnote">' + esc(note) + '</div>' + coin + qs + ach +
        '<div class="btns">' + (b.canSubmit ? '<button class="btn primary" id="submit">' + tr('submit') + '</button>' : '') +
        '<button class="btn" id="replay">' + tr('replay') + '</button><button class="btn" id="close">' + tr('close') + '</button></div>';
      document.getElementById('close').onclick = closeBattle;
      document.getElementById('replay').onclick = () => playBattle(b);
      const sub = document.getElementById('submit');
      if (sub) sub.onclick = () => vscode.postMessage({ type: 'submit' });
    }

    function step() {
      if (k >= b.log.length) { finish(); return; }
      const ev = b.log[k];
      const meAttacks = firstMe ? k % 2 === 0 : k % 2 === 1;
      const att = meAttacks ? 'me' : 'foe';
      const def = meAttacks ? 'foe' : 'me';
      const ai = front[att];
      const di = front[def];
      const ac = document.getElementById('c-' + att + '-' + ai);
      const dc = document.getElementById('c-' + def + '-' + di);
      if (ac && !reduce) { ac.classList.remove('lunge'); void ac.offsetWidth; ac.classList.add('lunge'); }
      if (dc && !reduce) { dc.classList.remove('hurt'); void dc.offsetWidth; dc.classList.add('hurt'); }
      float(def, di, '-' + ev.dmg + (ev.crit ? '!' : ''), ev.crit);
      const bar = document.getElementById('h-' + def + '-' + di);
      if (bar) bar.style.width = Math.round((ev.hp / maxHp(team[def][di])) * 100) + '%';
      if (ev.faint && dc) { dc.classList.add('dead'); front[def] += 1; }
      document.getElementById('log').textContent = ev.att + ' ' + tr('hits') + ' ' + ev.def + ' · -' + ev.dmg + (ev.crit ? ' ' + tr('crit') : '') +
        (ev.mult > 1 ? ' · ' + tr('super') : ev.mult < 1 ? ' · ' + tr('weak') : '');
      k += 1;
    }

    document.getElementById('skip').onclick = () => { while (k < b.log.length) step(); finish(); };
    timer = setInterval(step, reduce ? 150 : 650);
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg) return;
    if (msg.type === 'ladder') { data = msg.ladder; renderPanel(); }
    if (msg.type === 'battle') playBattle(msg.battle);
    if (msg.type === 'state') { S = msg.state; achs = (S && S.achievements) || []; renderPanel(); }
  });
})();
