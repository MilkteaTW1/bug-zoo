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

  function renderPanel() {
    if (!data) { panel.hidden = true; bz.relayout(0); return; }
    panel.hidden = false;
    panel.classList.toggle('collapsed', collapsed);
    const canFight = !!(data.me && data.me.canFight);
    let body;
    if (tab === 'ladder') {
      body = data.rows.filter((r) => r.section === 'ladder').slice(0, 50).map((r) => row(r, canFight)).join('');
    } else {
      body = data.rows.filter((r) => r.section === 'friend' || r.section === 'practice').map((r) => row(r, canFight)).join('') +
        '<div class="btns"><button class="btn" id="add">' + tr('addFriend') + '</button><button class="btn" id="copy">' + tr('copyCode') + '</button></div>';
    }
    const notes = [];
    if (!canFight) notes.push(tr('noTeam'));
    if (tab === 'ladder' && !data.rows.some((r) => r.section === 'ladder')) notes.push(tr('noladder'));
    else if (data.offline) notes.push(tr('offline'));
    if (notice) notes.push(notice);
    panel.innerHTML = '<h3><span class="tabs"><b class="tab' + (tab === 'ladder' ? ' on' : '') + '" data-tab="ladder">🏆 ' + tr('ladder') +
      '</b><b class="tab' + (tab === 'friends' ? ' on' : '') + '" data-tab="friends">👥 ' + tr('friends') + '</b></span><span class="fold">' +
      (collapsed ? '▸' : '▾') + '</span></h3><div class="rows">' + body + '</div>' +
      (notes.length ? '<div class="note">' + notes.map(esc).join(' · ') + '</div>' : '');
    bz.relayout(panel.offsetHeight);
  }

  panel.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const tabEl = t.closest('.tab');
    if (tabEl) { tab = tabEl.dataset.tab; collapsed = false; renderPanel(); return; }
    if (t.closest('h3')) { collapsed = !collapsed; renderPanel(); return; }
    const f = t.closest('.fight');
    if (f) { notice = ''; vscode.postMessage({ type: 'fight', section: f.dataset.section, name: f.dataset.name }); return; }
    const rm = t.closest('.rm');
    if (rm) { vscode.postMessage({ type: 'removeFriend', name: rm.dataset.name }); return; }
    if (t.closest('#add')) vscode.postMessage({ type: 'addFriend' });
    if (t.closest('#copy')) vscode.postMessage({ type: 'copyCode' });
  });

  // ---- battle replay ----------------------------------------------------------------------------------
  let timer = null;

  const maxHp = (m) => Math.max(40, m.power * 4);

  function card(m, side, i) {
    return '<div class="bcard" id="c-' + side + '-' + i + '" style="--tone:' + (TONE[m.rarity] || TONE.common) + '">' +
      '<pre>' + esc((m.art || []).join('\n')) + '</pre><div class="cn">' + esc(m.name) + (m.stage ? ' ' + '★'.repeat(m.stage) : '') + '</div>' +
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
      notice = b && b.error === 'noTeam' ? tr('noTeam') : tr('gone');
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
      const note = b.outcome === 'promote' ? fill(tr('promote'), { name: b.foe.name })
        : b.outcome === 'outOfReach' ? fill(tr('outOfReach'), { reach: b.reach })
          : (tr(b.outcome === 'practice' ? 'practiceNote' : b.outcome) || '');
      const ach = (b.earned || []).map((a) => '<div class="ach">🏅 ' + tr('achievement') + ': ' + esc(a.name) + '<br><small>' + esc(a.desc) + '</small></div>').join('');
      document.getElementById('foot').innerHTML =
        '<div class="res ' + (b.won ? 'win' : 'lose') + '">' + (b.won ? '🏆 ' + tr('win') : '💔 ' + tr('lose')) + '</div>' +
        '<div class="rnote">' + esc(note) + '</div>' + ach +
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
      document.getElementById('log').textContent = ev.att + ' ' + tr('hits') + ' ' + ev.def + ' · -' + ev.dmg + (ev.crit ? ' ' + tr('crit') : '');
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
    if (msg.type === 'state' && data) renderPanel();
  });
})();
