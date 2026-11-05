/* เกมออฟฟิศ — ฝั่งผู้เล่น */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ?p=2 ใช้แยกตัวตนเมื่ออยากเปิดหลายแท็บในเบราว์เซอร์เดียวกันเพื่อทดลองเล่น
  const SLOT = (new URLSearchParams(location.search).get('p') || '').replace(/[^\w-]/g, '').slice(0, 8);
  const TK = 'uno_token' + SLOT;
  const S = {
    ws: null, me: null, name: store('uno_name' + SLOT) || '', st: null, rooms: [], online: 0,
    av: null, lan: [], ch: 'lobby', chat: { lobby: [] }, q: [], busy: false, left: null, joinCode: null, flipNext: false, endShown: '', retry: 0,
  };
  let token = store(TK);
  if (!token) { token = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)); store(TK, token); }

  // ------------------------------------------------------------ utils
  function hash(s) { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
  // ---- ตัวละครพิกเซล (แต่งได้) ----
  const SKIN = ['#ffdbb4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
  const HAIRC = ['#1a1a1a', '#5a3825', '#e8c25a', '#b5382a', '#9a9a9a', '#3b6fd6', '#e8559b', '#f2f2f2'];
  const SHIRTC = ['#e8e8e8', '#e5382f', '#f08a24', '#f9d423', '#3ba55d', '#2d6fdb', '#7b4fd1', '#e8559b', '#333333'];
  const HAIR_N = ['โล้น', 'ผมสั้น', 'ผมยาว', 'ผมตั้ง', 'มวยผม', 'โมฮอว์ก', 'หยิกฟู'];
  const SHIRT_N = ['เสื้อยืด', 'ลายทาง', 'คอวี', 'ฮู้ด'];
  const ACC_N = ['ไม่มี', 'แว่นตา', 'แว่นกันแดด', 'หมวกแก๊ป', 'มงกุฎ', 'หูฟัง', 'สร้อยคอ'];
  const AVK = { s: SKIN.length, h: HAIR_N.length, c: HAIRC.length, t: SHIRTC.length, y: SHIRT_N.length, a: ACC_N.length };
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); }
  function avFromName(name) { const hs = hash(name || '?'), o = {}; let i = 0; for (const k in AVK) { o[k] = (hs >>> (i * 3)) % AVK[k]; i++; } return o; }
  function avatar(av, name) {
    av = av || avFromName(name);
    const g = new Map(), P = (x, y, c) => g.set(x + ',' + y, c);
    const R = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) P(x, y, c); };
    const skin = SKIN[av.s] || SKIN[0], hair = HAIRC[av.c] || HAIRC[0], shirt = SHIRTC[av.t] || SHIRTC[0];
    // ตัว + เสื้อ
    P(5, 8, skin); P(6, 8, skin);
    R(3, 8, 9, shirt); R(2, 9, 10, shirt); R(2, 9, 11, shirt);
    if (av.y === 1) R(2, 9, 10, shade(shirt, 0.7));
    if (av.y === 2) { R(4, 7, 9, skin); P(5, 10, skin); P(6, 10, skin); }
    if (av.y === 3) { R(4, 7, 11, shade(shirt, 0.75)); P(4, 9, shade(shirt, 0.75)); P(7, 9, shade(shirt, 0.75)); }
    // หัว หู หน้า
    for (let y = 2; y <= 7; y++) R(3, 8, y, skin);
    P(2, 4, skin); P(2, 5, skin); P(9, 4, skin); P(9, 5, skin);
    P(4, 4, '#111'); P(7, 4, '#111'); P(5, 6, '#8a3b2e'); P(6, 6, '#8a3b2e');
    // ผม
    const hs = av.h;
    if (hs === 1) { R(3, 8, 1, hair); R(3, 8, 2, hair); P(3, 3, hair); P(8, 3, hair); }
    if (hs === 2) { R(3, 8, 1, hair); R(2, 9, 2, hair); for (let y = 3; y <= 9; y++) { P(2, y, hair); P(9, y, hair); } }
    if (hs === 3) { P(3, 0, hair); P(5, 0, hair); P(7, 0, hair); R(3, 8, 1, hair); R(3, 8, 2, hair); }
    if (hs === 4) { R(5, 6, 0, hair); R(3, 8, 1, hair); R(3, 8, 2, hair); P(3, 3, hair); P(8, 3, hair); }
    if (hs === 5) { for (let y = 0; y <= 2; y++) R(5, 6, y, hair); }
    if (hs === 6) { R(3, 8, 0, hair); R(2, 9, 1, hair); R(2, 9, 2, hair); for (let y = 3; y <= 4; y++) { P(2, y, hair); P(9, y, hair); } P(3, 3, hair); P(8, 3, hair); }
    // เครื่องประดับ
    const a = av.a;
    if (a === 1) { for (const ox of [3, 6]) for (let dx = 0; dx < 3; dx++) for (let dy = 3; dy <= 5; dy++) if (!(dx === 1 && dy === 4)) P(ox + dx, dy, '#222'); }
    if (a === 2) { R(3, 8, 4, '#111'); P(4, 5, '#111'); P(7, 5, '#111'); }
    if (a === 3) { R(3, 8, 1, shirt); R(2, 9, 2, shirt); }
    if (a === 4) { for (const x of [3, 5, 6, 8]) P(x, 0, '#f9d423'); R(3, 8, 1, '#f9d423'); }
    if (a === 5) { R(4, 7, 1, '#444'); P(3, 2, '#444'); P(8, 2, '#444'); for (let y = 3; y <= 5; y++) { P(2, y, '#e5382f'); P(9, y, '#e5382f'); } }
    if (a === 6) { P(4, 9, '#f9d423'); P(7, 9, '#f9d423'); P(5, 10, '#f9d423'); P(6, 10, '#f9d423'); }
    let r = ''; g.forEach((c, k) => { const [x, y] = k.split(','); r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; });
    return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges">${r}</svg>`;
  }
  function avEl(av, name) { const d = h('div', 'av'); d.innerHTML = avatar(av, name); return d; }
  function loadAv() {
    let o = null; try { o = JSON.parse(store('uno_av' + SLOT) || 'null'); } catch (e) { /* */ }
    const r = {}; for (const k in AVK) r[k] = o && Number.isInteger(o[k]) && o[k] >= 0 && o[k] < AVK[k] ? o[k] : 0;
    if (!o) r.t = 0; return r;
  }
  S.av = loadAv();
  function toast(text, kind) {
    const t = h('div', kind || '', text); $('#toast').appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function send(o) { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); }
  const pname = (id) => { const p = S.st && S.st.players.find((x) => x.id === id); return p ? p.name : ''; };
  function showScreen(n) {
    for (const e of document.querySelectorAll('.screen')) e.classList.toggle('on', e.id === 's-' + n);
    if (n !== 'game') document.body.className = 'side-L';
    applyAnim();
  }

  // ------------------------------------------------------------ connection
  function connect() {
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    S.ws = ws;
    ws.onopen = () => { S.retry = 0; $('#banner').hidden = true; ws.send(JSON.stringify({ t: 'hello', token, name: S.name })); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
    ws.onclose = () => {
      if (S.ws !== ws) return;
      $('#banner').hidden = false; $('#banner').textContent = 'หลุดการเชื่อมต่อ กำลังต่อใหม่…';
      setTimeout(connect, Math.min(5000, 700 * ++S.retry));
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* */ } };
  }

  function onMsg(m) {
    switch (m.t) {
      case 'welcome':
        S.me = m.id; S.lan = m.lan || [];
        if (m.name && !S.name) { S.name = m.name; }
        $('#inName').value = S.name || ''; if (!$('#inName0').value) $('#inName0').value = S.name || '';
        break;
      case 'rooms':
        S.rooms = m.list; S.online = m.online;
        if (!S.st && S.ch !== 'lobby') setChannel('lobby');
        renderHome(); renderPick();
        if (S.joinCode) {
          const code = S.joinCode; S.joinCode = null;
          try { history.replaceState(null, '', location.pathname + (SLOT ? '?p=' + SLOT : '')); } catch (e) { /* */ }
          if (S.name) doJoin(code); else { S.afterName = code; toast('ใส่ชื่อก่อน แล้วระบบจะพาเข้าห้องให้'); }
        }
        break;
      case 'state':
        if (S.left && m.code === S.left) return;
        S.q.push(m); pump(); break;
      case 'hxs': hxOnSnap(m); break;
      case 'ev':
        if (m.k === 'hx_goal') { HX.lastGoalBy = m.by; Snd.goal && Snd.goal(); }
        else if (m.k === 'hx_go' || m.k === 'hx_start') Snd.whistle && Snd.whistle();
        else if (m.k === 'hx_end') Snd.win();
        if (/^hx_/.test(m.k)) break;
        S.q.push(m); pump(); break;
      case 'chat': addChat(m.ch, m.m); break;
      case 'chatlog': S.chat[m.ch] = m.list.slice(); if (m.ch === S.ch) redrawChat(); break;
      case 'err': if (m.pw) { toast(m.text, 'err'); askPassword(m.pw); } else toast(m.text, 'err'); Snd.err(); break;
      case 'kicked': S.st = null; S.q = []; toast('คุณถูกเชิญออกจากห้อง', 'err'); setChannel('lobby'); showScreen('home'); break;
    }
  }

  async function pump() {
    if (S.busy) return; S.busy = true;
    try {
      while (S.q.length) {
        const m = S.q.shift();
        try { if (m.t === 'ev') await handleEvent(m); else onState(m); } catch (e) { console.error(e); }
      }
    } finally { S.busy = false; }
  }

  // ------------------------------------------------------------ state
  function onState(st) {
    const prev = S.st; S.st = st;
    if (!prev || prev.code !== st.code) { setChannel(st.code); S.left = null; }
    const wasMine = prev && prev.phase === 'playing' && prev.round === st.round && prev.cur === prev.me;
    const mine = st.phase === 'playing' && st.cur === st.me;
    S.game = ['coup', 'haxball', 'ww'].includes(st.game) ? st.game : 'uno';
    if (st.phase === 'lobby') { showScreen('room'); renderRoom(); }
    else if (st.game === 'ww') { showScreen('ww'); renderWW(); }
    else if (st.game === 'haxball') { showScreen('hax'); renderHax(); }
    else if (st.game === 'coup') { showScreen('coup'); renderCoup(); }
    else { showScreen('game'); renderGame(); }
    if (mine && !wasMine) Snd.turn();
    document.title = st.game === 'ww' ? 'WEREWOLF — เกมออฟฟิศ' : st.game === 'haxball' ? 'HAXBALL — เกมออฟฟิศ' : st.game === 'coup' ? 'COUP — เกมออฟฟิศ' : (mine ? 'ถึงตาคุณ! — เกมออฟฟิศ' : 'UNO — เกมออฟฟิศ');
  }

  // ------------------------------------------------------------ เมนูเกมออฟฟิศ
  function renderPick() {
    $('#helloName').textContent = plainName(S.name); { const mc = /^\s*<color=([#\w]+)>/i.exec(S.name || ''); const C = { red: '#ff4d4d', blue: '#4d9bff', yellow: '#ffd94a', green: '#3fcf4f', purple: '#b06bff', black: '#000', orange: '#ff9a2e', pink: '#ff7ac8', white: '#fff', cyan: '#33e0e0', gray: '#aaa', grey: '#aaa', brown: '#b0763a' }; const k = mc && mc[1].toLowerCase(); $('#helloName').style.color = k ? (C[k] || (/^#[0-9a-f]{3,6}$/.test(k) ? k : '')) : ''; }
    $('#pickOnline').textContent = S.online ? `· ออนไลน์ ${S.online} คน` : '';
    const box = $('#gameList'); if (box.dataset.built) return; box.dataset.built = '1';
    const uno = h('button', 'gtile'); uno.type = 'button';
    const gi = h('div', 'gi'); gi.innerHTML = Cards.face({ c: 'R', v: '7' }, 'L') + Cards.face({ c: 'V', v: 'FLIP' }, 'D'); uno.appendChild(gi);
    const gt = h('div', 'gt'); gt.appendChild(h('b', '', 'UNO')); gt.appendChild(h('span', '', 'เล่นได้ 2–10 คน · เล่นกับบอทได้')); uno.appendChild(gt);
    uno.onclick = () => { S.game = 'uno'; $('#inName').value = S.name; showScreen('home'); renderHome(); };
    box.appendChild(uno);
    const cp = h('button', 'gtile'); cp.type = 'button';
    const ci = h('div', 'gi cpi'); ci.innerHTML = '<div class="mini-cc" style="background:#6a4bb8">' + cpIcon('duke') + '</div><div class="mini-cc" style="background:#3b3b46">' + cpIcon('assassin') + '</div>'; cp.appendChild(ci);
    const ct = h('div', 'gt'); ct.appendChild(h('b', '', 'COUP')); ct.appendChild(h('span', '', 'เล่นได้ 2–6 คน · เล่นกับบอทได้')); cp.appendChild(ct);
    cp.onclick = () => { S.game = 'coup'; $('#inName').value = S.name; showScreen('home'); renderHome(); };
    box.appendChild(cp);
    const hxb = h('button', 'gtile'); hxb.type = 'button';
    const hxi = h('div', 'gi hxi'); hxi.innerHTML = hxMenuIcon(); hxb.appendChild(hxi);
    const hxt = h('div', 'gt'); hxt.appendChild(h('b', '', 'HAXBALL')); hxt.appendChild(h('span', '', 'ฟุตบอลตัวกลม 1v1 – 5v5 · เล่นกับบอทได้')); hxb.appendChild(hxt);
    hxb.onclick = () => { S.game = 'haxball'; $('#inName').value = S.name; showScreen('home'); renderHome(); };
    box.appendChild(hxb);
    const wwb = h('button', 'gtile'); wwb.type = 'button';
    const wwi = h('div', 'gi cpi'); wwi.innerHTML = '<div class="mini-cc" style="background:#8b1f1f">' + cpIcon('wolf') + '</div><div class="mini-cc" style="background:#1d2a5a">' + cpIcon('moon') + '</div>'; wwb.appendChild(wwi);
    const wwt = h('div', 'gt'); wwt.appendChild(h('b', '', 'WEREWOLF')); wwt.appendChild(h('span', '', 'เกมหมาป่า 4–12 คน · เลือกบทบาทได้ · เล่นกับบอทได้')); wwb.appendChild(wwt);
    wwb.onclick = () => { S.game = 'ww'; $('#inName').value = S.name; showScreen('home'); renderHome(); };
    box.appendChild(wwb);
    for (let i = 0; i < 1; i++) {
      const t = h('div', 'gtile lock'); const g = h('div', 'gi'); g.appendChild(h('span', 'q', '?')); t.appendChild(g);
      const x = h('div', 'gt'); x.appendChild(h('b', '', 'เกมใหม่')); x.appendChild(h('span', '', 'เร็ว ๆ นี้')); t.appendChild(x); box.appendChild(t);
    }
  }
  function startMenu() {
    const n = $('#inName0').value.trim();
    if (!n) { toast('ใส่ชื่อของคุณก่อนนะ', 'err'); $('#inName0').focus(); return; }
    S.name = n; store('uno_name' + SLOT, n); send({ t: 'name', name: n });
    if (S.afterName) { const c = S.afterName; S.afterName = null; $('#inName').value = n; doJoin(c); return; }
    renderPick(); showScreen('pick');
  }
  function chatSend(text) {
    if (!S.name) { toast('ใส่ชื่อก่อนถึงจะแชทได้', 'err'); return; }
    send({ t: 'chat', text });
  }

  // ------------------------------------------------------------ home
  function renderHome() {
    $('#onlineN').textContent = S.online ? `· ออนไลน์ ${S.online} คน` : '';
    const box = $('#roomList'); box.innerHTML = '';
    $('#homeLogo').textContent = S.game === 'coup' ? 'COUP' : S.game === 'haxball' ? 'HAXBALL' : S.game === 'ww' ? 'WEREWOLF' : 'UNO';
    const list = S.rooms.filter((r) => (r.game || 'uno') === (S.game || 'uno'));
    if (!list.length) { box.appendChild(h('div', 'empty', 'ยังไม่มีห้อง — สร้างห้องใหม่แล้วชวนเพื่อนได้เลย')); return; }
    const rank = (r) => (r.phase !== 'playing' && !r.locked && r.n < r.max ? 0 : r.locked ? 1 : 2);
    for (const r of list.slice().sort((a, b) => rank(a) - rank(b))) {
      const full = r.n >= r.max, playing = r.phase === 'playing';
      const cls = r.locked ? 'locked' : (playing || full ? 'busy' : 'open');
      const row = h('div', 'ri ' + cls);
      row.appendChild(h('span', 'dot ' + (r.locked ? 'r' : (playing || full ? 'g0' : 'g')), ''));
      const info = h('div', 'meta');
      const t = h('div', 'mt'); t.appendChild(h('span', 'code', r.code)); t.appendChild(document.createTextNode(` ${r.game === 'coup' ? 'COUP' : r.game === 'haxball' ? 'HAXBALL' : r.game === 'ww' ? 'WEREWOLF' : (r.mode === 'classic' ? 'ธรรมดา' : 'Flip')} · ${r.n}/${r.max} คน${r.bots ? ` (บอท ${r.bots})` : ''}`));
      info.appendChild(t);
      const st = playing ? 'กำลังเล่น (รอจบรอบ)' : r.phase === 'ended' ? 'จบรอบ — เข้าแจมรอบหน้าได้' : full ? 'ห้องเต็ม' : 'รอผู้เล่น';
      info.appendChild(h('div', 'mn', `${(r.names && r.names.length ? r.names.join(', ') : r.host)} · ${st}`));
      row.appendChild(info);
      const b = h('button', 'pbtn sm ' + (r.locked ? 'red' : 'green'), r.locked ? 'ใส่รหัส' : 'เข้าแจม');
      b.disabled = playing || full;
      b.onclick = () => (r.locked ? askPassword(r.code) : doJoin(r.code));
      row.appendChild(b); box.appendChild(row);
    }
  }
  function askPassword(code) {
    const md = $('#modal'); md.innerHTML = ''; md.hidden = false;
    const pan = h('div', 'panel'); pan.appendChild(h('h2', '', `ห้อง ${code} ล็อกอยู่`));
    const inp = document.createElement('input'); inp.maxLength = 12; inp.placeholder = 'รหัสผ่านห้อง'; inp.style.cssText = 'display:block;margin:12px auto;width:100%;max-width:260px;text-align:center';
    const go = () => { const v = inp.value.trim(); md.hidden = true; md.innerHTML = ''; if (v) doJoin(code, v); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const row = h('div', 'row'); row.style.justifyContent = 'center';
    const ok = h('button', 'pbtn green', 'เข้าห้อง'); ok.onclick = go;
    const no = h('button', 'pbtn', 'ยกเลิก'); no.onclick = () => { md.hidden = true; md.innerHTML = ''; };
    row.appendChild(ok); row.appendChild(no); pan.appendChild(inp); pan.appendChild(row); md.appendChild(pan); setTimeout(() => inp.focus(), 50);
  }
  function setupAvatarEditor() {
    const ctl = $('#avCtl'); ctl.innerHTML = '';
    const refresh = () => { $('#avPrev').innerHTML = avatar(S.av); store('uno_av' + SLOT, JSON.stringify(S.av)); };
    const row = (label) => { const r = h('div', 'avrow'); r.appendChild(h('span', 'al', label)); const c = h('div', 'avopt'); r.appendChild(c); ctl.appendChild(r); return c; };
    const swatches = (label, k, cols) => {
      const c = row(label), btns = [];
      cols.forEach((col, i) => { const b = h('button', 'sw'); b.type = 'button'; b.style.background = col; b.onclick = () => { S.av[k] = i; paint(); refresh(); }; c.appendChild(b); btns.push(b); });
      const paint = () => btns.forEach((b, i) => b.classList.toggle('on', S.av[k] === i)); paint(); S.avPaint.push(paint);
    };
    const stepper = (label, k, names) => {
      const c = row(label), v = h('span', 'sv');
      const mk = (t, d) => { const b = h('button', 'pbtn sm', t); b.type = 'button'; b.onclick = () => { S.av[k] = (S.av[k] + d + names.length) % names.length; paint(); refresh(); }; return b; };
      c.appendChild(mk('◀', -1)); c.appendChild(v); c.appendChild(mk('▶', 1));
      const paint = () => { v.textContent = names[S.av[k]]; }; paint(); S.avPaint.push(paint);
    };
    S.avPaint = [];
    swatches('สีผิว', 's', SKIN); stepper('ทรงผม', 'h', HAIR_N); swatches('สีผม', 'c', HAIRC);
    swatches('สีเสื้อ', 't', SHIRTC); stepper('ลายเสื้อ', 'y', SHIRT_N); stepper('เครื่องประดับ', 'a', ACC_N);
    $('#avRand').onclick = () => { for (const k in AVK) S.av[k] = Math.floor(Math.random() * AVK[k]); S.avPaint.forEach((f) => f()); refresh(); };
    refresh();
  }
  function getName() {
    const n = (S.name || $('#inName').value || '').trim();
    if (!n) { toast('ใส่ชื่อของคุณก่อนนะ', 'err'); showScreen('start'); return null; }
    S.name = n; store('uno_name' + SLOT, n); return n;
  }
  function doJoin(code, pw) {
    const n = getName(); if (!n) { S.afterName = code; return; }
    code = String(code || '').trim().toUpperCase();
    if (code.length !== 4) { toast('รหัสห้องต้องมี 4 ตัวอักษร', 'err'); return; }
    S.left = null; send({ t: 'join', code, name: n, av: S.av, password: pw || '' });
  }
  function leave(force) {
    const st = S.st;
    if (!force && st && st.phase === 'playing') {
      const md = $('#modal'); md.innerHTML = ''; md.hidden = false;
      const pan = h('div', 'panel'); pan.appendChild(h('h2', '', 'กำลังเล่นอยู่ ออกจากห้องจริงหรือ?'));
      const row = h('div', 'row'); row.style.justifyContent = 'center';
      const ok = h('button', 'pbtn red', 'ออกเลย'); ok.onclick = () => { md.hidden = true; md.innerHTML = ''; leave(true); };
      const no = h('button', 'pbtn', 'อยู่ต่อ'); no.onclick = () => { md.hidden = true; md.innerHTML = ''; };
      row.appendChild(ok); row.appendChild(no); pan.appendChild(row); md.appendChild(pan);
      return;
    }
    S.left = st ? st.code : null;
    S.st = null; S.q = []; send({ t: 'leave' });
    setChannel('lobby'); showScreen('home'); renderHome();
    document.title = 'เกมออฟฟิศ';
  }

  // ------------------------------------------------------------ ตั้งค่าห้อง
  function optsNode(st) {
    const host = st.host === st.me, s = st.settings, box = h('div', 'opts');
    const dis = (b) => { b.disabled = !host; return b; };
    // โหมดเกม + แอบดูหลังการ์ด (อยู่แถวเดียวกัน)
    const g1 = h('div', 'optg'); g1.appendChild(h('div', 'optt', 'โหมดเกม'));
    const r1 = h('div', 'optr');
    for (const it of [{ v: 'classic', t: 'ธรรมดา' }, { v: 'flip', t: 'FLIP' }]) {
      const b = dis(h('button', 'pbtn sm' + (s.mode === it.v ? ' yellow' : ''), it.t)); b.type = 'button';
      if (host) b.onclick = () => send({ t: 'set', mode: it.v });
      if (!host && s.mode !== it.v) b.style.display = 'none';
      r1.appendChild(b);
    }
    {
      const off = s.mode !== 'flip';
      const pk = h('label', 'chk' + (off ? ' off' : '')); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !off && !!s.peek; cb.disabled = !host || off;
      cb.onchange = () => send({ t: 'set', peek: cb.checked });
      pk.appendChild(cb); pk.appendChild(document.createTextNode(' แอบดูด้านหลังการ์ดคนอื่น')); r1.appendChild(pk);
    }
    g1.appendChild(r1); box.appendChild(g1);
    const numStep = (title, key, n, min, max, pre, post) => {
      const g = h('div', 'optg'); g.appendChild(h('div', 'optt', title));
      const r = h('div', 'optr stepper');
      const minus = h('button', 'pbtn sm', '−'); minus.type = 'button'; minus.disabled = !host || n <= min;
      const plus = h('button', 'pbtn sm', '+'); plus.type = 'button'; plus.disabled = !host || n >= max;
      const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 3; inp.className = 'numin'; inp.value = n; inp.disabled = !host;
      const setN = (v) => { v = Math.round(Number(v)); if (!Number.isFinite(v)) { inp.value = n; return; } v = Math.max(min, Math.min(max, v)); inp.value = v; if (v !== n) send({ t: 'set', [key]: v }); };
      inp.oninput = () => { inp.value = inp.value.replace(/\D/g, ''); };
      inp.onchange = () => setN(inp.value); inp.onkeydown = (e) => { if (e.key === 'Enter') { setN(inp.value); inp.blur(); } };
      minus.onclick = () => setN(n - 1); plus.onclick = () => setN(n + 1);
      r.appendChild(minus); if (pre) r.appendChild(h('span', 'num', pre)); r.appendChild(inp); r.appendChild(h('span', 'num', post)); r.appendChild(plus);
      g.appendChild(r); box.appendChild(g);
    };
    numStep('จำนวนใบแรกที่แจก', 'hand', Number(s.hand) || 7, 1, 30, '', 'ใบ');
    numStep('ลืมพูด UNO แล้วถูกจับ', 'unoPenalty', Number(s.unoPenalty) || 2, 1, 100, 'จั่ว', 'ใบ');
    const g3 = h('div', 'optg'); g3.appendChild(h('div', 'optt', 'ทิศทางการเล่น (เริ่มต้น)'));
    const r3 = h('div', 'optr'); const cd = s.dir === -1 ? -1 : 1;
    for (const it of [{ v: 1, t: '↻ ตามเข็มนาฬิกา' }, { v: -1, t: '↺ ทวนเข็มนาฬิกา' }]) {
      const b = h('button', 'pbtn sm' + (cd === it.v ? ' yellow' : ''), it.t); b.type = 'button'; b.disabled = !host;
      if (host) b.onclick = () => send({ t: 'set', dir: it.v });
      if (!host && cd !== it.v) b.style.display = 'none';
      r3.appendChild(b);
    }
    g3.appendChild(r3); box.appendChild(g3);
    if (!host) box.appendChild(h('p', 'hint', 'หัวห้องเป็นคนตั้งค่า'));
    return box;
  }

  // ------------------------------------------------------------ Coup (เกมโค่นอำนาจ)
  const CPN = { duke: 'ดู๊ก', captain: 'กัปตัน', ambassador: 'บัง', assassin: 'แอสซาซิน', contessa: 'นางฟ้า' };
  const CPC = { duke: '#6a4bb8', captain: '#2d63c8', ambassador: '#2f9a52', assassin: '#3b3b46', contessa: '#c8467f' };
  const CPP = { y: '#ffd94a', o: '#d49a1a', r: '#e5382f', k: '#101030', b: '#2b5fbf', w: '#f4f1ff', s: '#d8d8e8', h: '#7a4a1a', p: '#ff9ec7', g: '#4aa83a', u: '#9b6bff', c: '#5fd0e0' };
  const CPS = {
    duke: ['y...yy...y', 'yy..yy..yy', 'yyyyyyyyyy', 'yryyyyyyry', 'yyyyyyyyyy', 'oooooooooo'],
    captain: ['..kkkkkk..', '.kbbbbbbk.', 'kbbbyybbbk', 'kbbbbbbbbk', 'kkkkkkkkkk'],
    ambassador: ['wwwwwwwwww', 'wkkkkkkkkw', 'wwwwwwwwww', 'wkkkkkkkww', 'wwwwwrrwww', 'wkkkkkrrww', 'wwwwwwwwww'],
    assassin: ['....ss....', '....ss....', '....ss....', '....ss....', '....ss....', '..hhhhhh..', '....hh....', '....hh....', '....rr....'],
    wolf: ['.ss....ss.', 'sss....sss', 'ssssssssss', 'ssrsssssrs', 'ssssssssss', '.sswwwwss.', '..swkkws..', '...wwww...'],
    silencer: ['..pppppp..', '.pppppppp.', '.pkppppkp.', '.pppppppp.', '.wwwwwwww.', '.wkwkwkwk.', '.wwwwwwww.'],
    cupid: ['.rr....rr.', 'rrrr..rrrr', 'rwrrrrrrrr', 'rrrrrrrrrr', '.rrrrrrrr.', '..rrrrrr..', '...rrrr...', '....rr....'],
    bodyguard: ['kkkkkkkkkk', 'kbbbwwbbbk', 'kbbbwwbbbk', 'kbwwwwwwbk', 'kbbbwwbbbk', '.kbbwwbbk.', '..kbbbbk..', '...kkkk...'],
    cub: ['..s....s..', '.ss....ss.', '.ssssssss.', '.srssssrs.', '.ssssssss.', '..swkkws..', '...wwpw...'],
    beggar: ['..........', '.hhhhhhhh.', 'hhhhhhhhhh', '..pppppp..', '.pkppppkp.', '..pppppp..', '.ssssssss.', '..s....s..'],
    villager: ['...hhhh...', '..hhhhhh..', 'hhhhhhhhhh', '..pppppp..', '..pkppkp..', '..pppppp..', '..pwwwwp..', '.gggggggg.'],
    seer: ['...uuuu...', '..uwuuuu..', '.uwuuuuuu.', '.uuuuuuuu.', '.uuuuuuuu.', '..uuuuuu..', '.hhhhhhhh.', '.hh....hh.'],
    doctor: ['...wwww...', '...wwww...', '...wwww...', 'wwwwwwwwww', 'wwwwwwwwww', '...wwww...', '...wwww...', '...wwww...'],
    hunter: ['..hh......', '.h.hh.....', 'h...h.....', 'hsssssssr.', 'h...h.....', '.h.hh.....', '..hh......'],
    witch: ['....uu....', '...uuuu...', '..uuuuuu..', '..uyyyyu..', '.uuuuuuuu.', 'uuuuuuuuuu'],
    moon: ['..yyyy....', '.yyyo.....', 'yyyo......', 'yyyo......', 'yyyo......', 'yyyyo.....', '.yyyyyyy..', '..yyyyy...'],
    contessa: ['...yyyy...', '..y....y..', '..y....y..', '...yyyy...', 'ww..pp..ww', 'wwwwppwwww', 'wwwwppwwww', '.www..www.'],
  };
  function cpIcon(ch) {
    const rows = CPS[ch]; let r = '';
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = CPP[row[x]]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } });
    return `<svg viewBox="0 0 10 ${rows.length}" shape-rendering="crispEdges">${r}</svg>`;
  }
  const CPD = { duke: 'เก็บภาษี +2 เหรียญ', captain: 'ขโมย 2 เหรียญ · บล็อกการขโมย', ambassador: 'เปลี่ยนการ์ดอาชีพ', assassin: 'จ่าย 3 เหรียญ ฆ่า 1 คน', contessa: 'บล็อกแอสซาซิน' };
  const TOK = ['..kkkk..', '.kyyyyk.', 'kyyoyyyk', 'kyoyyyyk', 'kyoyyyyk', 'kyyoyyyk', '.kyyyyk.', '..kkkk..'];
  const TOKC = { k: '#5a3a00', y: '#ffd94a', o: '#d49a1a' };
  let TOKSVG = '';
  { let r = ''; TOK.forEach((row, y) => { for (let x = 0; x < 8; x++) { const c = TOKC[row[x]]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } }); TOKSVG = `<svg viewBox="0 0 8 8" shape-rendering="crispEdges">${r}</svg>`; }
  function nmEl(text, nc, cls) {
    const e = h('span', cls === undefined ? 'nm' : cls, text); e.setAttribute('data-nt', '');
    if (nc) { e.style.color = nc; if (nc === '#000000') e.style.textShadow = '0 0 3px #fff, 0 0 3px #fff, 0 0 1px #fff'; }
    return e;
  }
  const plainName = (s) => String(s || '').replace(/^\s*<color=[#\w]+>/i, '').replace(/<\/color>/gi, '');
  const bubCls = (t) => (t === 'เชื่อ' ? ' yes' : /^ไม่เชื่อ/.test(t || '') ? ' no' : '');
  function coinNode(n, big) {
    const d = h('div', 'coins' + (big ? ' big' : ''));
    const row = h('span', 'toks');
    for (let i = 0; i < Math.min(n, 16); i++) { const t = h('i', 'tok'); t.innerHTML = TOKSVG; row.appendChild(t); }
    d.appendChild(row); d.appendChild(h('b', 'tn', '×' + n));
    return d;
  }
  function cpCard(c, extra) {
    const d = h('div', 'ccard' + (c.ch ? '' : ' back') + (c.dead ? ' dead' : '') + (extra ? ' ' + extra : ''));
    if (c.ch) { d.style.background = CPC[c.ch]; const i = h('div', 'ico'); i.innerHTML = cpIcon(c.ch); d.appendChild(i); d.appendChild(h('div', 'cn', CPN[c.ch])); d.title = CPN[c.ch] + ': ' + CPD[c.ch]; if (!(extra || '').includes('sm')) d.appendChild(h('div', 'cd', CPD[c.ch])); }
    else d.appendChild(h('div', 'q', '?'));
    if (c.dead) d.appendChild(h('div', 'x', 'X'));
    return d;
  }
  const CPV = { farm: 'ฟาร์มเหรียญ', duke: 'เก็บภาษี +2', steal: 'ขโมยเหรียญ', swap: 'เปลี่ยนอาชีพ', kill: 'ฆ่า', coup: 'ฆ่าเลือกการ์ด' };
  function cpHandle0() { S.cpPick = null; S.cpSel = []; }
  function cpLayout(N) {
    const T = $('#cpTable'); if (!T) return;
    const W = T.clientWidth || 600, mob = W < 560;
    T.className = 'n' + N + (N >= 5 ? ' compact' : '') + (mob ? ' mob' : '');
    const opps = [...T.querySelectorAll('.cpo')], me = $('#cpMe');
    const tw = N >= 5 ? (mob ? 86 : 104) : N === 4 ? (mob ? 104 : 150) : (mob ? 136 : 160);
    opps.forEach((o) => { o.style.width = tw + 'px'; });
    const th = Math.max(110, ...opps.map((o) => o.offsetHeight)), mh = me.offsetHeight || 200, mw = me.offsetWidth || 240;
    let H = mh + th + (N <= 2 ? 30 : N === 3 ? 80 : 120);
    const pos = (H) => {
      const ymin = th / 2 + 4, ye = H - mh / 2, ry = Math.max(10, (ye - ymin) / 2), cy = ymin + ry, rx = Math.max(10, W / 2 - tw / 2 - 4);
      return opps.map((_, k) => { const a = (90 + (k + 1) * 360 / N) * Math.PI / 180; return { x: W / 2 + rx * Math.cos(a), y: cy + ry * Math.sin(a), cy }; });
    };
    let P = pos(H);
    for (let it = 0; it < 30; it++) {
      const bad = P.some((p) => Math.abs(p.x - W / 2) < tw / 2 + mw / 2 + 4 && p.y + th / 2 > H - mh - 4);
      if (!bad) break; H += 20; P = pos(H);
    }
    T.style.height = H + 'px';
    opps.forEach((o, k) => { P[k].x = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, P[k].x)); o.style.left = P[k].x + 'px'; o.style.top = P[k].y + 'px'; });
    const dk = $('#cpMid'); dk.style.top = (P[0] ? P[0].cy : H / 2) + 'px';
  }
  let cpRO = null;
  function cpWatch() {
    if (cpRO || !window.ResizeObserver) return;
    let last = '';
    cpRO = new ResizeObserver(() => {
      const T = $('#cpTable'), me = $('#cpMe'); if (!T || !me || !S.st || S.st.game !== 'coup' || S.st.phase === 'lobby') return;
      const k = T.clientWidth + '/' + me.offsetWidth + '/' + me.offsetHeight; if (k === last) return; last = k;
      requestAnimationFrame(() => cpLayout(S.st.players.length));
    });
    cpRO.observe($('#cpTable')); cpRO.observe($('#cpMe'));
  }
  window.addEventListener('resize', () => { if (S.st && S.st.game === 'coup' && S.st.phase !== 'lobby') cpLayout(S.st.players.length); });
  let ANIM = store('cp_anim') !== '0';
  function animOn() { return ANIM; }
  function applyAnim() { document.documentElement.classList.toggle('noanim', !animOn()); }
  applyAnim();
  function cpCoinFx(st, playing) {
    const prev = S.cpCoins || {}, first = S.cpCoinRound !== st.round;
    const cur = {}; st.players.forEach((p) => { cur[p.id] = p.coins; });
    S.cpCoins = cur; S.cpCoinRound = st.round;
    if (first || !playing || !animOn() || st.paused) return;
    const el = (id) => { const e = id === st.me ? document.querySelector('#cpMe .toks') : document.querySelector(`#cpOpps .cpo[data-id="${id}"] .toks`); return e; };
    const ctr = () => { const r = $('#cpDeck').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const pt = (id) => { const e = el(id); if (!e) return ctr(); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const gain = [], lose = [];
    for (const id in cur) { const d = cur[id] - (prev[id] === undefined ? cur[id] : prev[id]); if (d > 0) gain.push([id, d]); else if (d < 0) lose.push([id, -d]); }
    const fly = (from, to, n, delay0) => {
      for (let i = 0; i < Math.min(n, 7); i++) {
        const t = h('i', 'tok flyTok'); t.innerHTML = TOKSVG; document.body.appendChild(t);
        const j = () => (Math.random() - .5) * 18;
        const a = t.animate([{ left: from.x + j() + 'px', top: from.y + j() + 'px', opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: 1, offset: .15 }, { left: to.x + 'px', top: to.y + 'px', opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 650, delay: delay0 + i * 90, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' });
        a.onfinish = () => { t.remove(); if (Snd.deal && i === 0) Snd.deal(); };
      }
    };
    const lq = lose.map((x) => x.slice());
    for (const [gid, gd] of gain) {
      const li = lq.findIndex((x) => x[1] > 0);
      if (li >= 0) { const s = lq[li]; fly(pt(s[0]), pt(gid), Math.min(gd, s[1]), 0); s[1] -= gd; } else fly(ctr(), pt(gid), gd, 0);
    }
    for (const s of lq) if (s[1] > 0) fly(pt(s[0]), ctr(), s[1], 0);
  }
  function renderCoup() {
    if (S.cpDealUntil && Date.now() < S.cpDealUntil) { clearTimeout(S.cpDealT); S.cpDealT = setTimeout(renderCoup, S.cpDealUntil - Date.now() + 30); return; }
    const st = S.st, me = st.players.find((p) => p.id === st.me) || { cards: [], coins: 0, alive: false };
    const step = st.step, playing = st.phase === 'playing';
    const nm = (id) => { const p = st.players.find((x) => x.id === id); return p ? p.name : ''; };
    $('#cpCode').textContent = 'COUP · ห้อง ' + st.code;
    $('#cpDir').textContent = st.dir === -1 ? '↺ วนซ้าย' : '↻ วนขวา';
    $('#btnSnd2').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง';
    if (!step || step.phase !== 'action' || !step.mine) S.cpPick = null;
    if (!step || step.phase !== 'swap') { S.cpSel = []; S.cpSelInit = false; }
    // timer
    const bar = $('#cpBar'); bar.style.transition = 'none';
    if (!playing) bar.style.width = '0';
    else { bar.style.width = Math.max(0, Math.min(100, (st.timerLeft / st.timerTotal) * 100)) + '%'; void bar.offsetWidth; if (animOn()) { bar.style.transition = `width ${st.timerLeft}ms linear`; bar.style.width = '0%'; } bar.className = step && step.mine ? 'mine' : ''; }
    if (st.paused) { bar.style.transition = 'none'; bar.style.width = Math.max(0, Math.min(100, (st.timerLeft / st.timerTotal) * 100)) + '%'; }
    $('#btnPause2').hidden = !(playing && st.host === st.me);
    $('#cpPause').hidden = !(playing && st.paused);
    $('#btnResume2').hidden = st.host !== st.me;
    $('#cpPauseTxt').textContent = st.host === st.me ? 'กดปุ่มเพื่อเล่นต่อ' : 'รอหัวห้องกดเล่นต่อ';
    // เสียงเตือนเมื่อถึงตาตอบ
    const mineNow = !!(playing && step && step.mine);
    if (mineNow && !S.cpWasMine) Snd.turn();
    S.cpWasMine = mineNow;
    const dk = $('#cpDeck'); dk.innerHTML = '';
    if (playing && step) { dk.appendChild(h('div', 'ccard sm back dk', '')); dk.firstChild.appendChild(h('div', 'q', '?')); dk.appendChild(h('span', 'dn', `กองกลาง ${step.deckN} ใบ`)); }
    // opponents
    const oo = $('#cpOpps'); oo.innerHTML = '';
    const mi = Math.max(0, st.players.findIndex((p) => p.id === st.me));
    const ordered = st.players.map((_, k) => st.players[(mi + 1 + k) % st.players.length]);
    for (const p of ordered) {
      if (p.id === st.me) continue;
      const canT = S.cpPick && p.alive && (S.cpPick !== 'steal' || p.coins > 0);
      const b = h('div', 'cpo' + (st.cur === p.id && playing ? ' turn' : '') + (playing && p.alive && step && step.wait.includes(p.id) ? ' think' : '') + (p.alive ? '' : ' out') + (canT ? ' targ' : ''));
      const thinking = playing && p.alive && step && step.wait.includes(p.id);
      b.dataset.id = p.id;
      b.appendChild(h('div', 'bub' + (p.bub || thinking ? ' on' : '') + (!p.bub && thinking ? ' think' : '') + bubCls(p.bub), p.bub || (thinking ? 'กำลังคิด…' : '')));
      const top = h('div', 'top'); top.appendChild(avEl(p.av, p.name)); top.appendChild(nmEl(p.name, p.nc)); b.appendChild(top);
      b.appendChild(p.left || !p.alive ? h('div', 'coins', p.left ? 'ออกแล้ว' : 'ตกรอบ') : coinNode(p.coins));
      const cs = h('div', 'cs'); const cpk = playing && step && step.phase === 'cpick' && step.mine && step.act.target === p.id; let li = 0;
      for (const c of p.cards) { const el = cpCard(c, 'sm'); if (cpk && !c.dead) { const idx = li++; el.classList.add('pick'); el.onclick = (ev) => { ev.stopPropagation(); send({ t: 'c_pick', i: idx }); }; } cs.appendChild(el); } b.appendChild(cs);
      if (canT) b.onclick = () => { const a = S.cpPick; S.cpPick = null; send({ t: 'c_act', act: a, target: p.id }); };
      oo.appendChild(b);
    }
    // คำถาม/คำสั่งถึงเรา (แสดงตรงหน้าเรา ไม่มีกล่องกลาง)
    let t = '';
    if (!playing) t = '';
    else if (!me.alive) t = 'คุณตกรอบแล้ว';
    else if (step.mine) {
      if (step.phase === 'action') t = me.coins >= 10 ? 'ต้องฆ่าเลือกการ์ด!' : 'ถึงตาคุณ!';
      else if (step.phase === 'react') t = `${nm(step.act.actor)} มี ${CPN[step.act.claim]} จริงไหม?`;
      else if (step.phase === 'block') t = `${nm(step.act.actor)} ${step.act.type === 'steal' ? 'จะขโมยคุณ' : 'จะฆ่าคุณ'} — บล็อกไหม?`;
      else if (step.phase === 'breact') t = `${nm(step.blk.by)} มี ${CPN[step.blk.claim]} จริงไหม?`;
      else if (step.phase === 'lose') t = 'เลือกการ์ดที่จะเสีย';
      else if (step.phase === 'cpick') t = `เลือกการ์ดของ ${nm(step.act.target)} ที่จะฆ่า`;
      else if (step.phase === 'swap') t = `เลือกเก็บ ${step.swap.k} ใบ`;
    }
    // me
    const mb = $('#cpMe'); mb.innerHTML = ''; mb.classList.toggle('turn', !!(playing && st.cur === st.me)); mb.classList.toggle('think', !!(playing && step && step.mine));
    const mh = h('div', 'mh'); mh.appendChild(avEl(S.st.players.find((p) => p.id === st.me) && S.st.players.find((p) => p.id === st.me).av, me.name));
    const meP = st.players.find((p) => p.id === st.me); const meThink = !!(playing && me.alive && step && step.mine && !(meP && meP.bub));
    mh.appendChild(h('span', 'bub me' + ((meP && meP.bub) || meThink ? ' on' : '') + (meThink ? ' think' : '') + bubCls(meP && meP.bub), (meP && meP.bub) || (meThink ? 'กำลังคิด…' : '')));
    mh.appendChild(nmEl((me.name || '') + ' (คุณ)', me.nc)); mh.appendChild(coinNode(me.coins, true)); mb.appendChild(mh);
    const mc = h('div', 'cs'); const losing = playing && step.phase === 'lose' && step.mine;
    me.cards.forEach((c, i) => {
      const el = cpCard(c); if (losing && !c.dead) { el.classList.add('pick'); const idx = me.cards.slice(0, i).filter((x) => !x.dead).length; el.onclick = () => send({ t: 'c_pick', i: idx }); }
      mc.appendChild(el);
    });
    mb.appendChild(mc);
    // actions
    const ac = $('#cpActs'); ac.innerHTML = '';
    const swm = !!(playing && step && step.phase === 'swap' && step.mine);
    ac.classList.toggle('swapmode', swm); $('#cpMe').classList.toggle('swapmode', swm);
    if (swm && !S.cpSelInit) setTimeout(() => { const sc = $('#s-coup'); sc.scrollTop = sc.scrollHeight; }, 60);
    if (t) ac.appendChild(h('div', 'ask' + (step && step.mine ? ' mine' : ''), t));
    const btn = (txt, cls, fn, dis) => { const b = h('button', 'pbtn ' + cls, txt); b.disabled = !!dis; b.onclick = fn; ac.appendChild(b); return b; };
    if (playing && me.alive && step) {
      if (step.phase === 'action' && step.mine) {
        if (S.cpPick) { ac.appendChild(h('span', 'hint2', `คลิกผู้เล่นที่จะ${CPV[S.cpPick]}`)); btn('ยกเลิก', '', () => { S.cpPick = null; renderCoup(); }); }
        else {
          const must = me.coins >= 10;
          btn('ฆ่าเลือกการ์ด (7 เหรียญ)', 'red', () => { S.cpPick = 'coup'; renderCoup(); }, me.coins < 7);
          btn('ฟาร์มเหรียญ +1', 'green', () => send({ t: 'c_act', act: 'farm' }), must);
          btn('ดู๊ก +2', 'blue', () => send({ t: 'c_act', act: 'duke' }), must);
          btn('กัปตัน ขโมย 2', 'blue', () => { S.cpPick = 'steal'; renderCoup(); }, must);
          btn('บัง เปลี่ยนอาชีพ', 'blue', () => send({ t: 'c_act', act: 'swap' }), must);
          btn('แอสซาซิน ฆ่า (3 เหรียญ)', 'red', () => { S.cpPick = 'kill'; renderCoup(); }, me.coins < 3 || must);
        }
      } else if ((step.phase === 'react' || step.phase === 'breact') && step.mine) {
        btn('เชื่อ', 'green', () => send({ t: 'c_resp', v: 'ok' }));
        btn('ไม่เชื่อ!', 'red', () => send({ t: 'c_resp', v: 'challenge' }));
        if (step.phase === 'react' && step.act.target === st.me && (step.act.type === 'steal' || step.act.type === 'kill')) {
          const bc = step.act.type === 'steal' ? 'captain' : 'contessa';
          btn(`บล็อก (อ้างว่าเป็น${CPN[bc]})`, 'blue', () => send({ t: 'c_resp', v: 'block' }));
        }
      } else if (step.phase === 'block' && step.mine) {
        const bc = step.act.type === 'steal' ? 'captain' : 'contessa';
        btn(`บล็อก (อ้างว่าเป็น${CPN[bc]})`, 'blue', () => send({ t: 'c_resp', v: 'block' }));
        btn('ยอมรับ', '', () => send({ t: 'c_resp', v: 'allow' }));
      } else if (step.phase === 'swap' && step.mine) {
        const K = step.swap.k;
        if (!S.cpSelInit) { S.cpSel = Array.from({ length: K }, (_, i) => i); S.cpSelInit = true; }
        const mk = (label, from, to) => {
          const grp = h('div', 'swgrp'); grp.appendChild(h('div', 'swl', label));
          const row = h('div', 'cs'); row.style.marginTop = '14px';
          for (let i = from; i < to; i++) {
            const kept = S.cpSel.includes(i);
            const el = cpCard({ ch: step.swap.opts[i] }, 'pick' + (kept ? ' sel' : ''));
            el.appendChild(h('div', 'keep', kept ? 'เก็บ' : 'ทิ้ง'));
            el.onclick = () => { const p = S.cpSel.indexOf(i); if (p >= 0) S.cpSel.splice(p, 1); else { if (S.cpSel.length >= K) S.cpSel.shift(); S.cpSel.push(i); } renderCoup(); };
            row.appendChild(el);
          }
          grp.appendChild(row); return grp;
        };
        const wrap = h('div', 'swrap');
        wrap.appendChild(mk('ในมือคุณ', 0, K)); wrap.appendChild(mk('จากกองกลาง', K, step.swap.opts.length));
        ac.appendChild(wrap);
        ac.appendChild(h('div', 'hint2', `เก็บได้ ${K} ใบ — กดการ์ดเพื่อเก็บ/ทิ้ง (ไม่เปลี่ยนก็ได้)`));
        btn('ยืนยัน', 'green', () => send({ t: 'c_pick', keep: S.cpSel.slice() }), S.cpSel.length !== K);
      } else if (step.phase === 'react' || step.phase === 'breact') {
        ac.appendChild(h('span', 'hint2', 'รอคนอื่น…'));
      }
    }
    cpLayout(st.players.length); cpWatch();
    document.querySelectorAll('.bub.think').forEach((e) => { e.style.animationDelay = -(Date.now() % 1600) + 'ms'; });
    // แอนิเมชันแจกการ์ด
    if (playing && S.cpDealt !== st.round) {
      S.cpDealt = st.round;
      if (!animOn()) { S.cpDealUntil = 0; } else { S.cpDealUntil = Date.now() + 2400;
      const dr = dk.getBoundingClientRect(), ox = dr.left + dr.width / 2, oy = dr.top + dr.height / 2;
      const groups = [...document.querySelectorAll('#cpOpps .cpo'), document.querySelector('#cpMe')].map((e) => [...e.querySelectorAll('.cs .ccard')]);
      let n = 0;
      for (let k = 0; k < 2; k++) for (const g of groups) {
        const el = g[k]; if (!el) continue;
        const r = el.getBoundingClientRect();
        el.animate([{ transform: `translate(${ox - (r.left + r.width / 2)}px, ${oy - (r.top + r.height / 2)}px) scale(.5) rotate(-25deg)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: n * 140, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
        setTimeout(() => Snd.deal && Snd.deal(), n * 140); n++;
      }
      S.cpDealUntil = Date.now() + n * 140 + 500;
      }
    }
    cpCoinFx(st, playing);
    // จบเกม
    const eb = $('#cpEnd');
    if (st.phase === 'ended') {
      eb.hidden = false; eb.innerHTML = '';
      const pan = h('div', 'panel'); pan.appendChild(h('h2', '', `${nm(st.winner)} ชนะ!`));
      for (const p of st.players) {
        const r = h('div', 'prow'); r.appendChild(avEl(p.av, p.name)); r.appendChild(nmEl((p.id === st.winner ? '👑 ' : '') + p.name + (p.wins ? ` · ชนะ ${p.wins}` : ''), p.nc));
        const cs = h('div', 'cs'); for (const c of p.cards) cs.appendChild(cpCard(c, 'sm')); r.appendChild(cs); pan.appendChild(r);
      }
      const row = h('div', 'row'); row.style.justifyContent = 'center';
      if (st.host === st.me) { const b = h('button', 'pbtn yellow big', 'เล่นอีกรอบ'); b.onclick = () => send({ t: 'start' }); row.appendChild(b); }
      else row.appendChild(h('span', 'hint2', 'รอหัวห้องเริ่มรอบใหม่'));
      const lv = h('button', 'pbtn red', 'ออกจากห้อง'); lv.onclick = () => leave(true); row.appendChild(lv); pan.appendChild(row); eb.appendChild(pan);
    } else eb.hidden = true;
  }

  // ------------------------------------------------------------ HAXBALL
  const HXN = { R: 'ทีมแดง', B: 'ทีมน้ำเงิน' };
  const HX = window.__hx = { snaps: [], keys: 0, sent: -1, raf: 0, flash: {}, lastScore: null, lastPh: '' };
  function hxSendKeys() { if (HX.keys & 16) HX.kt = performance.now(); if (HX.keys !== HX.sent) { HX.sent = HX.keys; send({ t: 'hx_in', k: HX.keys }); } }
  function hxActive() { return S.st && S.st.game === 'haxball' && S.st.phase !== 'lobby' && $('#s-hax').classList.contains('on'); }
  function hxKeyEv(e, down) {
    if (!hxActive()) return;
    const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    const bit = { KeyW: 1, ArrowUp: 1, KeyS: 2, ArrowDown: 2, KeyA: 4, ArrowLeft: 4, KeyD: 8, ArrowRight: 8, Space: 16 }[e.code];
    if (!bit) return;
    e.preventDefault();
    if (down) HX.keys |= bit; else HX.keys &= ~bit;
    hxSendKeys();
  }
  function hxMenuIcon() {
    return '<svg viewBox="0 0 64 40" shape-rendering="crispEdges"><rect width="64" height="40" fill="#2f8f3f"/><rect x="0" y="0" width="8" height="40" fill="#287a36"/><rect x="16" y="0" width="8" height="40" fill="#287a36"/><rect x="32" y="0" width="8" height="40" fill="#287a36"/><rect x="48" y="0" width="8" height="40" fill="#287a36"/><rect x="2" y="2" width="60" height="36" fill="none" stroke="#fff" stroke-width="1"/><rect x="31" y="2" width="2" height="36" fill="#fff"/><circle cx="32" cy="20" r="6" fill="none" stroke="#fff"/><circle cx="16" cy="20" r="5" fill="#d8453d" stroke="#000"/><circle cx="48" cy="20" r="5" fill="#3b78d8" stroke="#000"/><circle cx="32" cy="20" r="2.5" fill="#fff" stroke="#000" stroke-width=".8"/></svg>';
  }
  function hxFmt(ms) { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function renderHax() {
    const st = S.st, playing = st.phase === 'playing', ended = st.phase === 'ended';
    $('#hxCode').textContent = 'HAXBALL · ห้อง ' + st.code;
    $('#btnSnd3').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง';
    $('#btnPause3').hidden = !(playing && st.host === st.me);
    $('#hxPause').hidden = !(playing && st.paused);
    $('#btnResume3').hidden = st.host !== st.me;
    $('#hxPauseTxt').textContent = st.host === st.me ? 'กดปุ่มเพื่อเล่นต่อ' : 'รอหัวห้องกดเล่นต่อ';
    $('#hxR').textContent = st.score.R; $('#hxB').textContent = st.score.B;
    if (!HX.snaps.length || HX.round !== st.round) { HX.snaps = []; HX.round = st.round; HX.tm = st.tm; HX.ph = st.ph; HX.golden = st.golden; }
    HX.sc = [st.score.R, st.score.B];
    $('#hxTime').textContent = st.golden ? 'ต่อเวลา' : hxFmt(HX.tm != null ? HX.tm : st.tm);
    // ป้ายกลางจอ
    hxBanner(st.ph, st);
    const eb = $('#hxEnd');
    if (ended) {
      eb.hidden = false; eb.innerHTML = '';
      const pan = h('div', 'panel');
      const t = st.winner === 'D' ? 'เสมอ' : `${HXN[st.winner]} ชนะ!`;
      const hh = h('h2', '', t); if (st.winner !== 'D') hh.style.color = st.winner === 'R' ? '#ff7a70' : '#7ab0ff'; pan.appendChild(hh);
      pan.appendChild(h('div', '', `${st.score.R} : ${st.score.B}`)).style.cssText = 'font-family:var(--px);font-size:34px;margin:6px 0 10px';
      const g = h('div', 'hxteams');
      for (const tm of ['R', 'B']) {
        const col = h('div', 'hxteam ' + tm.toLowerCase()); col.appendChild(h('h3', '', HXN[tm]));
        for (const p of st.players.filter((x) => x.team === tm)) { const r = h('div', 'prow'); r.appendChild(avEl(p.av, p.name)); r.appendChild(nmEl(p.name, p.nc)); col.appendChild(r); }
        g.appendChild(col);
      }
      pan.appendChild(g);
      const row = h('div', 'row'); row.style.cssText = 'justify-content:center;margin-top:12px';
      if (st.host === st.me) { const b = h('button', 'pbtn yellow big', 'เล่นอีกรอบ'); b.onclick = () => send({ t: 'start' }); row.appendChild(b); }
      else row.appendChild(h('span', 'hint2', 'รอหัวห้องเริ่มรอบใหม่'));
      const lv = h('button', 'pbtn red', 'ออกจากห้อง'); lv.onclick = () => leave(true); row.appendChild(lv); pan.appendChild(row); eb.appendChild(pan);
    } else eb.hidden = true;
    if (!playing && !ended) HX.keys = 0;
    hxLoopStart();
  }
  function hxBanner(ph, st) {
    const b = $('#hxBanner'); b.className = ''; let txt = '';
    if (st.phase === 'playing') {
      if (ph === 'count') txt = 'เตรียมพร้อม…';
      else if (ph === 'goal') { const sc = st.score; const by = HX.lastGoalBy; txt = 'GOAL!'; if (by) b.className = by.toLowerCase(); }
    }
    b.hidden = !txt; b.textContent = txt;
  }
  function hxOnSnap(m) {
    if (!S.st || S.st.game !== 'haxball') return;
    const now = performance.now();
    HX.snaps.push({ t: now, b: m.b, p: m.p, ph: m.ph });
    if (HX.snaps.length > 6) HX.snaps.shift();
    HX.tm = m.tm; HX.golden = !!m.g;
    $('#hxTime').textContent = m.g ? 'ต่อเวลา' : hxFmt(m.tm);
    if (HX.ph !== m.ph) { HX.ph = m.ph; hxBanner(m.ph, S.st); }
    // เสียงเตะ
    m.p.forEach((p, i) => { if (p[2] && !HX.flash[i]) { HX.flash[i] = 1; Snd.kick && Snd.kick(); } else if (!p[2]) HX.flash[i] = 0; });
  }
  function hxLoopStart() { if (!HX.raf) HX.raf = requestAnimationFrame(hxDraw); }
  function hxDraw() {
    HX.raf = 0;
    const st = S.st;
    if (!st || st.game !== 'haxball' || st.phase === 'lobby' || !$('#s-hax').classList.contains('on')) return;
    hxPaint(st);
    HX.raf = requestAnimationFrame(hxDraw);
  }
  const HXSP = {};
  try { document.fonts && document.fonts.load('13px ZF2ndPixelus', 'ก'); } catch (e) {}
  function hxSprite(fill, hi, N) {
    const key = fill + N; if (HXSP[key]) return HXSP[key];
    const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const m = (N - 1) / 2;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const d = Math.hypot(i - m, j - m), R = N / 2 - .15; if (d > R) continue;
      x.fillStyle = d > R - 1.05 ? '#000' : (Math.hypot(i - m + N * .17, j - m + N * .2) < N * .2 ? hi : fill);
      x.fillRect(i, j, 1, 1);
    }
    return (HXSP[key] = c);
  }
  function hxPx(g, spr, cx, cy, r) { g.imageSmoothingEnabled = false; const d = Math.round(r * 2); g.drawImage(spr, Math.round(cx - d / 2), Math.round(cy - d / 2), d, d); }
  function hxPaint(st) {
    const cv = $('#hxCv'), wrap = $('#hxWrap'), dpr = window.devicePixelRatio || 1;
    const cw = wrap.clientWidth, ch = wrap.clientHeight; if (!cw || !ch) return;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false;
    const f = st.field, PAD = 22, tw = f.W + 2 * f.D + PAD * 2, th = f.H + PAD * 2;
    const meT = (st.players.find((p) => p.id === st.me) || {}).team;
    const rot = document.documentElement.classList.contains('touchy') && cw < ch ? (meT === 'B' ? Math.PI / 2 : -Math.PI / 2) : 0;
    HX.rot = rot;
    const sc = rot ? Math.min(cw / th, ch / tw) : Math.min(cw / tw, ch / th);
    g.fillStyle = '#16301d'; g.fillRect(0, 0, cw, ch);
    g.save(); g.translate(cw / 2, ch / 2); g.rotate(rot); g.scale(sc, sc); g.translate(-f.W / 2, -f.H / 2);
    // หญ้า
    const bands = 12, bw = f.W / bands;
    for (let i = 0; i < bands; i++) { g.fillStyle = i % 2 ? '#2f8f3f' : '#2a8139'; g.fillRect(i * bw, 0, bw + 1, f.H); }
    // ตาข่ายประตู
    g.fillStyle = '#1d5e2a'; g.fillRect(-f.D, f.gy0, f.D, f.gy1 - f.gy0); g.fillRect(f.W, f.gy0, f.D, f.gy1 - f.gy0);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (let y = f.gy0; y <= f.gy1; y += 10) { g.beginPath(); g.moveTo(-f.D, y); g.lineTo(0, y); g.moveTo(f.W, y); g.lineTo(f.W + f.D, y); g.stroke(); }
    for (let x = 0; x <= f.D; x += 10) { g.beginPath(); g.moveTo(-x, f.gy0); g.lineTo(-x, f.gy1); g.moveTo(f.W + x, f.gy0); g.lineTo(f.W + x, f.gy1); g.stroke(); }
    // เส้นสนาม
    g.strokeStyle = '#e9f5e6'; g.lineWidth = 3; g.strokeRect(0, 0, f.W, f.H);
    g.beginPath(); g.moveTo(f.W / 2, 0); g.lineTo(f.W / 2, f.H); g.stroke();
    g.beginPath(); g.arc(f.W / 2, f.H / 2, f.cr, 0, 7); g.stroke();
    // ประตู (สี)
    g.lineWidth = 6; g.strokeStyle = '#ff6a60'; g.beginPath(); g.moveTo(-f.D, f.gy0); g.lineTo(-f.D, f.gy1); g.moveTo(-f.D, f.gy0); g.lineTo(0, f.gy0); g.moveTo(-f.D, f.gy1); g.lineTo(0, f.gy1); g.stroke();
    g.strokeStyle = '#6aa6ff'; g.beginPath(); g.moveTo(f.W + f.D, f.gy0); g.lineTo(f.W + f.D, f.gy1); g.moveTo(f.W, f.gy0); g.lineTo(f.W + f.D, f.gy0); g.moveTo(f.W, f.gy1); g.lineTo(f.W + f.D, f.gy1); g.stroke();
    for (const [x, y] of [[0, f.gy0], [0, f.gy1], [f.W, f.gy0], [f.W, f.gy1]]) { g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke(); }
    // ตำแหน่งแบบ interpolate
    const sn = HX.snaps; let B = null, P = null;
    if (sn.length) {
      const rt = performance.now() - 50; let a = sn[0], b = sn[sn.length - 1];
      for (let i = sn.length - 1; i > 0; i--) { if (sn[i - 1].t <= rt) { a = sn[i - 1]; b = sn[i]; break; } }
      let k = b.t > a.t ? (rt - a.t) / (b.t - a.t) : 1; k = Math.max(0, Math.min(1.15, k));
      if (rt < sn[0].t) { a = b = sn[0]; k = 0; }
      B = [a.b[0] + (b.b[0] - a.b[0]) * k, a.b[1] + (b.b[1] - a.b[1]) * k];
      P = b.p.map((p, i) => { const q = a.p[i] || p; return [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k, p[2]]; });
    } else { B = [f.W / 2, f.H / 2]; P = st.players.map(() => null); }
    // ผู้เล่น
    const meIdx = st.players.findIndex((p) => p.id === st.me);
    st.players.forEach((pl, i) => {
      const p = P[i]; if (!p) return;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(p[0] + 2, p[1] + 4, f.pr, f.pr * .8, 0, 0, 7); g.fill();
      hxPx(g, hxSprite(pl.team === 'R' ? '#d8453d' : '#3b78d8', pl.team === 'R' ? '#f58a80' : '#8fb7f5', 14), p[0], p[1], f.pr);
      if (i === meIdx) { g.strokeStyle = ((HX.keys & 16) || performance.now() - (HX.kt || 0) < 200) ? '#ffd94a' : '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(p[0], p[1], f.pr + 5, 0, 7); g.stroke(); }
      g.save(); g.translate(p[0], p[1]); g.rotate(-rot);
      g.font = Math.max(13, Math.min(20, Math.round(15 / sc))) + 'px ZF2ndPixelus, Tahoma, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#000'; g.lineJoin = 'round';
      g.strokeText(pl.name, 0, -f.pr - 8); g.fillStyle = pl.nc || '#fff'; g.fillText(pl.name, 0, -f.pr - 8); g.restore();
    });
    // ลูกบอล
    const R = f.br;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(B[0] + 2, B[1] + 3, R, R * .8, 0, 0, 7); g.fill();
    hxPx(g, hxSprite('#ffffff', '#d8d8d8', R > 12 ? 12 : 9), B[0], B[1], R);
    g.restore();
  }
  function hxWire() {
    window.addEventListener('keydown', (e) => hxKeyEv(e, true));
    window.addEventListener('keyup', (e) => hxKeyEv(e, false));
    window.addEventListener('blur', () => { HX.keys = 0; hxSendKeys(); });
    window.addEventListener('resize', () => { if (hxActive()) hxLoopStart(); });
    $('#btnPause3').onclick = () => send({ t: 'pause' }); $('#btnResume3').onclick = () => send({ t: 'resume' });
    $('#btnSnd3').onclick = () => { Snd.toggle(); $('#btnSnd3').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง'; };
    $('#btnLeave4').onclick = () => leave();
    if (('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) document.documentElement.classList.add('touchy');
    const joy = $('#hxJoy'), knob = joy.querySelector('i'); let jid = null;
    const jmove = (e) => {
      const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
      let k = HX.keys & 16; const T = 0.28, rt0 = HX.rot || 0;
      if (!rt0) { if (dy < -T) k |= 1; if (dy > T) k |= 2; if (dx < -T) k |= 4; if (dx > T) k |= 8; }
      else if (rt0 < 0) { if (dy < -T) k |= 8; if (dy > T) k |= 4; if (dx > T) k |= 2; if (dx < -T) k |= 1; }
      else { if (dy < -T) k |= 4; if (dy > T) k |= 8; if (dx > T) k |= 1; if (dx < -T) k |= 2; }
      HX.keys = k; hxSendKeys();
    };
    const jend = () => { jid = null; knob.style.transform = ''; HX.keys &= 16; hxSendKeys(); };
    joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (x) { /* */ } jmove(e); e.preventDefault(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
    joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
    const kb = $('#hxKick');
    kb.addEventListener('pointerdown', (e) => { HX.keys |= 16; kb.classList.add('on'); hxSendKeys(); try { kb.setPointerCapture(e.pointerId); } catch (x) { /* */ } e.preventDefault(); });
    const kup = () => { HX.keys &= ~16; kb.classList.remove('on'); hxSendKeys(); };
    kb.addEventListener('pointerup', kup); kb.addEventListener('pointercancel', kup);
  }
  function hxLobby(st, host, ro, box) {
    // ทีม
    const S0 = st.settings, T = S0.tsize;
    box.innerHTML = '';
    const g = h('div', 'hxteams');
    for (const tm of ['R', 'B']) {
      const col = h('div', 'hxteam ' + tm.toLowerCase());
      const mem = st.players.filter((p) => p.team === tm);
      col.appendChild(h('h3', '', `${HXN[tm]} (${mem.length}/${T})`));
      for (const p of mem) {
        const row = h('div', 'prow' + (p.online ? '' : ' off'));
        row.appendChild(avEl(p.av, p.name)); row.appendChild(nmEl(p.name + (p.id === st.me ? ' (คุณ)' : '') + (p.bot ? ' [บอท]' : '') + (p.id === st.host ? ' *' : ''), p.nc));
        if (p.id === st.me || host) { const mv = h('button', 'pbtn sm', '⇄'); mv.title = 'ย้ายทีม'; mv.onclick = () => send({ t: 'hx_team', id: p.id, team: tm === 'R' ? 'B' : 'R' }); row.appendChild(mv); }
        if (host && p.id !== st.me) { const k = h('button', 'pbtn sm red', 'x'); k.title = 'เชิญออก'; k.onclick = () => send({ t: 'kick', id: p.id }); row.appendChild(k); }
        col.appendChild(row);
      }
      g.appendChild(col);
    }
    box.appendChild(g);
    ro.innerHTML = '';
    const grp = (title, items, key, cur) => {
      const gg = h('div', 'optg'); gg.appendChild(h('div', 'optt', title)); const rr = h('div', 'optr');
      for (const it of items) {
        const b = h('button', 'pbtn sm' + (cur === it.v ? ' yellow' : ''), it.t); b.type = 'button'; b.disabled = !host;
        if (host) b.onclick = () => send({ t: 'set', [key]: it.v });
        if (!host && cur !== it.v) b.style.display = 'none';
        rr.appendChild(b);
      }
      gg.appendChild(rr); ro.appendChild(gg);
    };
    grp('ขนาดทีม (สนามใหญ่ขึ้นตามจำนวนคน)', [1, 2, 3, 4, 5].map((n) => ({ v: n, t: `${n}v${n}` })), 'tsize', T);
    grp('ลูกบอล', [{ v: 's', t: 'ลูกเล็ก' }, { v: 'b', t: 'ลูกใหญ่' }], 'ball', S0.ball);
    grp('เวลาแข่ง', [1, 2, 3, 5].map((n) => ({ v: n, t: `${n} นาที` })), 'mins', S0.mins);
    ro.appendChild(h('p', 'hint', 'W A S D เดิน · Space เตะ/ส่ง · ทีมที่ไม่ครบ บอทจะเติมให้อัตโนมัติ'));
  }

  // ------------------------------------------------------------ เกมหมาป่า (WEREWOLF)
  const WWR = {
    wolf: { s: 'ทุกคืนกัดชาวบ้าน 1 คน', n: 'หมาป่า', e: '🐺', c: '#8b1f1f', d: 'ทุกคืนเลือกกัดชาวบ้านร่วมกับพวก ชนะเมื่อจำนวนเท่าหรือมากกว่าชาวบ้าน' },
    villager: { s: 'ไม่มีสกิล ช่วยโหวตหาหมาป่า', n: 'ชาวบ้าน', e: '🧑‍🌾', c: '#4a7a3a', d: 'ชาวบ้านธรรมดา ไม่มีสกิล ช่วยกันคุยและโหวตหาตัวหมาป่า' },
    cupid: { s: 'คืนแรกจับคู่ ตายตามกัน', n: 'คิวปิด', e: '', c: '#c8467f', d: 'คืนแรกเลือกผู้เล่น 2 คนให้เป็นคู่รักกัน ถ้าคนใดคนหนึ่งตาย อีกคนจะตายตามทันที (ถ้าคู่รักอยู่คนละฝั่งและเหลือกันสองคนสุดท้าย คู่รักชนะ)' },
    bodyguard: { s: 'ปกป้อง 1 คน ตัวเองก็ได้ ห้ามซ้ำ 2 คืน', n: 'บอดี้การ์ด', e: '', c: '#2d63c8', d: 'ตื่นมาตอนกลางคืนเพื่อเลือกปกป้องผู้เล่น 1 คนไม่ให้โดนหมาป่าฆ่าในคืนนั้น ปกป้องตัวเองได้ และไม่สามารถปกป้องซ้ำ 2 คืนติดกัน' },
    cub: { s: 'ตาย → คืนถัดไปหมาป่าฆ่าได้ 2 คน', n: 'ลูกหมาป่า', e: '', c: '#7a3a2a', d: 'อยู่ฝั่งหมาป่า ถ้าลูกหมาป่าตาย แม่ของมัน (หมาป่า) จะฆ่าได้ 2 คนในคืนถัดไป' },
    beggar: { s: 'ให้ตัวเองโดนโหวต = ชนะคนเดียว', n: 'ยาจก', e: '', c: '#6a5a3a', d: 'ทำยังไงก็ได้ให้ตัวเองโดนโหวตประหาร ถ้าสำเร็จ ยาจกจะชนะคนเดียวทันที' },
    silencer: { s: 'ปิดปาก 1 คน พูดไม่ได้ 1 วัน', n: 'ชู่ว', e: '🤐', c: '#555a66', d: 'อยู่ฝั่งหมาป่า ทุกคืนเลือกปิดปาก 1 คน วันถัดไปพูดไม่ได้ (โหวตได้)' },
    seer: { s: 'ส่องดูว่าใครเป็นหมาป่า', n: 'หมอดู', e: '🔮', c: '#6a4bb8', d: 'ทุกคืนส่องดู 1 คนว่าเป็นหมาป่าหรือไม่' },
    doctor: { s: 'ป้องกัน 1 คนจากหมาป่า', n: 'หมอรักษา', e: '💉', c: '#2a7a8a', d: 'ทุกคืนป้องกัน 1 คนจากหมาป่า (ห้ามคนเดิมสองคืนติด)' },
    hunter: { s: 'ตายแล้วยิงตามไป 1 คน', n: 'นายพราน', e: '🏹', c: '#2f6a4a', d: 'ถ้าตาย ได้ยิงอีก 1 คนให้ตายตามไป' },
    witch: { s: 'ยาชุบชีวิต 1 ยาพิษ 1', n: 'แม่มด', e: '🧪', c: '#8a3a8a', d: 'ยาชุบชีวิต 1 ขวด ยาพิษ 1 ขวด ใช้ได้อย่างละครั้งทั้งเกม' },
  };
  const WWOPT = ['cub', 'silencer', 'cupid', 'seer', 'bodyguard', 'hunter', 'beggar'];
  const WW = { selM: [], alive: {}, round: -1, stage: '', sel: null, key: '', night: null, logN: 0 };
  const wwIsNight = (s) => /^night/.test(s || '');
  function wwComp(S) {
    const l = [`${WWR.wolf.e} ${WWR.wolf.n} ${S.wolves}`]; let k = S.wolves;
    for (const r of ['seer', 'doctor', 'hunter', 'witch']) if (S[r]) { l.push(`${WWR[r].e} ${WWR[r].n}`); k++; }
    const v = S.n - k; if (v > 0) l.push(`${WWR.villager.e} ${WWR.villager.n} ${v}`);
    let bad = '';
    if (v < 0) bad = 'บทบาทมากกว่าจำนวนผู้เล่น'; else if (S.wolves * 2 >= S.n) bad = 'หมาป่ามากเกินไป (ต้องน้อยกว่าครึ่งหนึ่ง)';
    return { txt: l.join(' · '), bad };
  }
  const wwIc = (r) => `<span class="wic">${cpIcon(r)}</span>`;
  function wwLobby(st, host, ro) {
    const S = st.settings.ww;
    const step = (title, key, val, lo, hi) => {
      const g = h('div', 'optg'); g.appendChild(h('div', 'optt', title)); const r = h('div', 'wwstep');
      const mk = (t, d) => { const b = h('button', 'pbtn sm', t); b.type = 'button'; b.disabled = !host || val + d < lo || val + d > hi; b.onclick = () => send({ t: 'set', ww: { [key]: val + d } }); return b; };
      r.appendChild(mk('◀', -1)); r.appendChild(h('b', '', String(val))); r.appendChild(mk('▶', 1)); g.appendChild(r); ro.appendChild(g);
    };
    step('จำนวนผู้เล่น (ไม่ครบจะมีบอทเติมให้)', 'n', S.n, 4, 12);
    const g2 = h('div', 'optg'); g2.appendChild(h('div', 'optt', 'บทบาท (กดการ์ดเพื่อเปิด/ปิด)')); const grid = h('div', 'wwrg');
    const card = (r, on, ctl, cb) => {
      const c = h('div', 'wwrc' + (on ? ' on' : ' off') + (cb && host ? ' tg' : '')); const ic = h('div', 'ri2'); ic.style.background = WWR[r].c; ic.innerHTML = cpIcon(r); c.appendChild(ic);
      const tx = h('div', 'rt'); tx.appendChild(h('b', '', WWR[r].n)); tx.appendChild(h('span', '', WWR[r].s)); c.appendChild(tx); c.title = WWR[r].d;
      if (ctl) c.appendChild(ctl); if (cb && host) c.onclick = cb; return c;
    };
    const wc = h('div', 'wwstep sm'); const mkb = (t, d) => { const b = h('button', 'pbtn sm', t); b.type = 'button'; b.disabled = !host || S.wolves + d < 1 || S.wolves + d > 4; b.onclick = (e) => { e.stopPropagation(); send({ t: 'set', ww: { wolves: S.wolves + d } }); }; return b; };
    wc.appendChild(mkb('◀', -1)); wc.appendChild(h('b', '', String(S.wolves))); wc.appendChild(mkb('▶', 1));
    { const wcard = card('wolf', true, wc); wcard.classList.add('wide'); grid.appendChild(wcard); }
    for (const r of WWOPT) grid.appendChild(card(r, S[r], h('i', 'tk', S[r] ? '✓' : ''), () => send({ t: 'set', ww: { [r]: !S[r] } })));
    const sp = WWOPT.filter((r) => S[r]).length, vn = S.n - S.wolves - sp;
    grid.appendChild(card('villager', vn > 0, h('b', 'cn', vn > 0 ? '×' + vn : '0')));
    g2.appendChild(grid); ro.appendChild(g2);
    const bad = vn < 0 ? 'บทบาทมากกว่าจำนวนผู้เล่น' : (S.wolves + (S.silencer ? 1 : 0) + (S.cub ? 1 : 0)) * 2 >= S.n ? 'หมาป่ามากเกินไป (ต้องน้อยกว่าครึ่งหนึ่ง)' : '';
    if (bad) ro.appendChild(h('p', 'wwcomp bad', bad));
    const g3 = h('div', 'optg'); g3.appendChild(h('div', 'optt', 'เวลาคุยตอนกลางวัน')); const r3 = h('div', 'optr wrap');
    for (const n of [30, 60, 90, 120]) { const b = h('button', 'pbtn sm' + (S.day === n ? ' yellow' : ''), `${n} วินาที`); b.type = 'button'; b.disabled = !host; if (host) b.onclick = () => send({ t: 'set', ww: { day: n } }); if (!host && S.day !== n) b.style.display = 'none'; r3.appendChild(b); }
    g3.appendChild(r3); ro.appendChild(g3);
  }
  function wwFx(cls, big, small) {
    if (!animOn()) return;
    const f = $('#wwFx'); f.className = cls; f.innerHTML = ''; f.appendChild(h('div', '', big)); if (small) f.appendChild(h('small', '', small));
    f.hidden = false; f.style.animation = 'none'; void f.offsetWidth; f.style.animation = '';
    clearTimeout(WW.fxT); WW.fxT = setTimeout(() => { f.hidden = true; }, 2000);
  }
  function wwCause(txt) { return /ตรอมใจ/.test(txt) ? 'love' : /หมาป่า|ปกป้อง/.test(txt) ? 'wolf' : /พิษ/.test(txt) ? 'poison' : /โหวต/.test(txt) ? 'vote' : /พราน/.test(txt) ? 'hunter' : ''; }
  function wwTimer(st) {
    const bar = $('#wwBar'); bar.style.transition = 'none';
    const tot = st.timerTotal || 1, left = st.timerLeft || 0;
    bar.style.width = Math.max(0, Math.min(100, left / tot * 100)) + '%'; bar.style.background = left < 5000 ? '#e5382f' : '#7cd';
    if (st.paused || st.phase !== 'playing' || !animOn()) return;
    void bar.offsetWidth; bar.style.transition = `width ${left}ms linear`; bar.style.width = '0%';
  }
  function wwThumb(good) {
    const M = ['....##..', '...###..', '...##...', '#######.', '########', '########', '#######.', '.#####..'];
    const rows = good ? M : M.slice().reverse();
    let r = ''; rows.forEach((s, y) => { for (let x = 0; x < 8; x++) if (s[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
    return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" fill="currentColor">${r}</svg>`;
  }
  function renderWW() {
    const st = S.st, root = $('#ww'), night = wwIsNight(st.stage) || (st.stage === 'over' && false);
    const meP = st.players.find((p) => p.id === st.me) || {}; const meAlive = meP.alive !== false;
    const newGame = WW.round !== st.round;
    if (newGame) { WW.dealAt = Date.now(); WW.round = st.round; WW.alive = {}; WW.stage = ''; WW.sel = null; WW.selM = []; WW.logN = 0; WW.key = ''; }
    // กลางวัน/กลางคืน
    const wasNight = WW.night; WW.night = night;
    root.classList.toggle('night', night);
    if (st.stage !== WW.stage) {
      const grpOf = (s) => (wwIsNight(s) ? 'n' : s === 'dawn' || s === 'day' || s === 'vote' || s === 'result' || s === 'hunter' ? 'd' : 'o');
      if (grpOf(st.stage) === 'n' && wasNight !== true) { Snd.night && Snd.night(); wwFx('nightfx', '' + 'กลางคืน', `คืนที่ ${st.day}`); }
      else if (st.stage === 'dawn') { Snd.dawn && Snd.dawn(); wwFx('dayfx', '' + 'รุ่งเช้า', `วันที่ ${st.day}`); }
      else if (st.stage === 'night_wolf' && (meP.role === 'wolf' || meP.role === 'silencer')) Snd.howl && Snd.howl();
      WW.stage = st.stage; WW.sel = null; WW.selM = [];
      const m = $('#wwMsg'); m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop');
    }
    $('#wwCode').textContent = 'WEREWOLF · ห้อง ' + st.code;
    const TAG = { night_wolf: 'กลางคืน', night_silence: 'กลางคืน', night_cupid: 'กลางคืน', night_bodyguard: 'กลางคืน', night_seer: 'กลางคืน', night_doctor: 'กลางคืน', night_witch: 'กลางคืน', dawn: 'รุ่งเช้า', day: 'กลางวัน', vote: 'โหวตประหาร', result: 'ผลโหวต', hunter: 'นายพรานกำลังยิง', over: 'จบเกม' };
    $('#wwTag').textContent = (TAG[st.stage] || '') + (st.day ? ` · วันที่ ${st.day}` : '');
    $('#wwMsg').textContent = night ? '' + 'กลางคืน' : st.stage === 'vote' ? '' + 'โหวตประหาร' : st.stage === 'over' ? (st.winner === 'W' ? '' + 'หมาป่าชนะ!' : st.winner === 'L' ? '' + 'คู่รักชนะ!' : st.winner === 'B' ? '' + 'ยาจกชนะ!' : '' + 'ชาวบ้านชนะ!') : '' + 'กลางวัน';
    { const sl = night && st.phase === 'playing' && meAlive && !st.paused && (!st.act || st.act.done) && !['wolf', 'silencer', 'cub'].includes(meP.role || st.role); $('#wwSleep').classList.toggle('on', !!sl); }
    const snd = $('#btnSnd4'); snd.textContent = Snd.on ? 'เสียง' : 'ปิดเสียง';
    wwTimer(st);
    // ผู้เล่น
    const act = st.act, can = new Set(act && act.targets ? act.targets : []);
    const pb = $('#wwPlayers'); pb.innerHTML = '';
    const dying = [];
    for (const p of st.players) {
      const was = WW.alive[p.id];
      const d = h('div', 'wwp' + (p.alive ? '' : ' dead') + (p.id === st.me ? ' me' : '') + (can.has(p.id) ? ' can' : '') + ((WW.sel === p.id || WW.selM.includes(p.id)) ? ' pick' : ''));
      d.dataset.id = p.id;
      { const n = st.players.length, mi = Math.max(0, st.players.findIndex((q) => q.id === st.me)), k = (st.players.indexOf(p) - mi + n) % n, th = Math.PI / 2 + k * 2 * Math.PI / n; d.style.left = (50 + 41 * Math.cos(th)) + '%'; d.style.top = (50 + 40 * Math.sin(th)) + '%';
        const el = Date.now() - (WW.dealAt || 0), dl = k * 140 - el;
        if (animOn() && st.stage !== 'over' && dl > -900) { d.classList.add('deal'); d.style.setProperty('--dx', (-41 * Math.cos(th) / 100 * pb.clientWidth) + 'px'); d.style.setProperty('--dy', (-40 * Math.sin(th) / 100 * pb.clientHeight) + 'px'); d.style.animationDelay = dl + 'ms'; } }
      d.appendChild(avEl(p.av, p.name)); d.appendChild(nmEl(p.name + (p.id === st.me ? ' (คุณ)' : ''), p.nc));
      const rls = h('span', 'rl'); if (p.role) rls.innerHTML = wwIc(p.role) + ' ' + WWR[p.role].n; d.appendChild(rls);
      if (st.stage === 'vote' || st.stage === 'result') { if (p.vc) d.appendChild(h('i', 'vb', '×' + p.vc)); if (p.voted && p.alive && st.stage === 'vote') d.appendChild(h('i', 'ok', '✓')); }
      if (st.stage === 'day' && p.ready && p.alive) d.appendChild(h('i', 'ok', '✓'));
      if (st.silenced === p.id && p.alive && !wwIsNight(st.stage)) d.appendChild(h('i', 'sil', 'ปิดปาก'));
      else if (p.lov && p.alive) d.appendChild(h('i', 'sil lv', 'คู่รัก'));
      { const sn = (st.seen || []).find((s) => s.id === p.id); if (sn) { const t = h('i', 'thb ' + (sn.wolf ? 'bad' : 'good')); t.innerHTML = wwThumb(!sn.wolf); d.appendChild(t); } }
      if (can.has(p.id)) d.onclick = () => { if (act.kind === 'cupid') { const i = WW.selM.indexOf(p.id); if (i >= 0) WW.selM.splice(i, 1); else { WW.selM.push(p.id); if (WW.selM.length > 2) WW.selM.shift(); } } else WW.sel = WW.sel === p.id ? null : p.id; Snd.click && Snd.click(); renderWW(); };
      if (was === true && !p.alive && !newGame) { const L = st.log.slice().reverse().find((x) => x.k === 'k' && x.x.indexOf(p.name) === 0); const cs = wwCause(L ? L.x : ''); d.classList.add('dying'); d.dataset.cause = cs; dying.push({ p, txt: L ? L.x : '', cs }); }
      pb.appendChild(d);
      WW.alive[p.id] = p.alive;
    }
    if (dying.length) {
      Snd.dead && Snd.dead();
      const mine = dying.find((x) => x.p.id === st.me);
      if (mine && animOn()) { const dv = $('#wwDeath'); dv.innerHTML = ''; dv.appendChild(h('div', '', '' + 'คุณตายแล้ว')); dv.appendChild(h('small', '', mine.txt.replace(mine.p.name + ' ', ''))); dv.hidden = false; dv.style.animation = 'none'; void dv.offsetWidth; dv.style.animation = ''; clearTimeout(WW.dT); WW.dT = setTimeout(() => { dv.hidden = true; }, 2600); }
    }
    // ฉันคือใคร
    const me = $('#wwMe'); me.innerHTML = '';
    if (st.role) {
      const R = WWR[st.role]; const ic = h('div', 'ri2'); ic.innerHTML = cpIcon(st.role); ic.style.background = R.c; me.appendChild(ic);
      const tx = h('div', ''); tx.appendChild(h('b', '', R.n)); tx.appendChild(h('span', '', R.s));
      if (st.seen && st.seen.length) { const sn = h('div', 'sn'); sn.appendChild(document.createTextNode('')); st.seen.forEach((s, i) => { const q = st.players.find((p) => p.id === s.id); if (i) sn.appendChild(document.createTextNode(' · ')); sn.appendChild(nmEl(q ? q.name : '?', '', '')); sn.appendChild(document.createTextNode(s.wolf ? ' = หมาป่า' : ' = ไม่ใช่หมาป่า')); }); tx.appendChild(sn); }
      { const lv = st.players.filter((p) => p.lov); if (lv.length) tx.appendChild(h('div', 'sn', 'คู่รัก: ' + lv.map((p) => p.name).join(' + '))); }
      if (st.potion) tx.appendChild(h('div', 'sn', `ชุบชีวิต ${st.potion.heal ? '1' : '0'} · ยาพิษ ${st.potion.poison ? '1' : '0'}`));
      me.appendChild(tx);
    }
    // ส่วนทำอะไร
    const ac = $('#wwAct'); ac.innerHTML = '';
    const nm = (id) => { const q = st.players.find((p) => p.id === id); return q ? q.name : '?'; };
    const btn = (t, cls, fn, dis) => { const b = h('button', 'pbtn ' + (cls || ''), t); b.type = 'button'; b.disabled = !!dis; b.onclick = fn; return b; };
    const row = h('div', 'row');
    const go = (o) => { send(Object.assign({ t: 'w_act' }, o)); WW.sel = null; };
    if (st.phase === 'ended') { ac.appendChild(h('p', 'tt', st.winner === 'W' ? 'หมาป่าชนะ!' : st.winner === 'L' ? 'คู่รักชนะ!' : st.winner === 'B' ? 'ยาจกชนะ!' : 'ชาวบ้านชนะ!')); }
    else if (!act) {
      let t = night ? 'กลางคืน… หลับตา' : st.stage === 'dawn' ? 'รุ่งเช้าแล้ว…' : st.stage === 'result' ? 'นับคะแนน…' : st.stage === 'hunter' ? 'นายพรานกำลังยิง…' : '';
      if (!meAlive) t = 'คุณตายแล้ว';
      if (t) ac.appendChild(h('p', 'tt', t));
    } else {
      const k = act.kind, sel = WW.sel;
      if (k === 'wolf') {
        ac.appendChild(h('p', 'tt', 'เลือกเหยื่อ'));
        if (act.need > 1) ac.appendChild(h('div', 'sub', 'กัดได้ 2 คน'));
        const ms = Object.entries(act.mates || {}).map(([a, b]) => `${nm(a)} → ${b.map(nm).join(', ')}`); if (ms.length) ac.appendChild(h('div', 'sub', ms.join(' · ')));
        row.appendChild(btn('กัด', 'red', () => go({ kind: 'wolf', id: sel }), !sel));
      } else if (k === 'silence') {
        if (act.done) ac.appendChild(h('p', 'tt', 'รอคนอื่น…')); else { ac.appendChild(h('p', 'tt', 'เลือกคนปิดปาก')); row.appendChild(btn('ปิดปาก', 'red', () => go({ kind: 'silence', id: sel }), !sel)); row.appendChild(btn('ข้าม', '', () => go({ kind: 'silence', id: 'skip' }))); }
      } else if (k === 'cupid') {
        if (act.done) ac.appendChild(h('p', 'tt', 'รอคนอื่น…')); else { ac.appendChild(h('p', 'tt', 'เลือก 2 คน')); row.appendChild(btn('จับคู่', 'red', () => { send({ t: 'w_act', kind: 'cupid', ids: WW.selM.slice() }); WW.selM = []; }, WW.selM.length !== 2)); }
      } else if (k === 'bodyguard') {
        if (act.done) ac.appendChild(h('p', 'tt', 'รอคนอื่น…')); else { ac.appendChild(h('p', 'tt', 'เลือกคนที่จะปกป้อง')); row.appendChild(btn('ปกป้อง', 'green', () => go({ kind: 'bodyguard', id: sel }), !sel)); row.appendChild(btn('ข้าม', '', () => go({ kind: 'bodyguard', id: 'skip' }))); }
      } else if (k === 'seer') {
        if (act.done) ac.appendChild(h('p', 'tt', 'รอคนอื่น…')); else { ac.appendChild(h('p', 'tt', 'เลือกคนที่จะส่อง')); row.appendChild(btn('ส่อง', 'blue', () => go({ kind: 'seer', id: sel }), !sel)); row.appendChild(btn('ข้าม', '', () => go({ kind: 'seer', id: 'skip' }))); }
      } else if (k === 'doctor') {
        if (act.done) ac.appendChild(h('p', 'tt', 'รอคนอื่น…')); else { ac.appendChild(h('p', 'tt', 'เลือกคนที่จะป้องกันคืนนี้' + (act.last ? ' (ห้ามซ้ำคนเดิม)' : ''))); row.appendChild(btn('ป้องกัน', 'green', () => go({ kind: 'doctor', id: sel }), !sel)); row.appendChild(btn('ข้าม', '', () => go({ kind: 'doctor', id: 'skip' }))); }
      } else if (k === 'witch') {
        if (act.done) ac.appendChild(h('p', 'tt', 'ตัดสินใจแล้ว รอคนอื่น…'));
        else {
          ac.appendChild(h('p', 'tt', act.victims && act.victims.length ? `เมื่อคืนหมาป่ากัด ${act.victims.map(nm).join(', ')}` : 'เมื่อคืนไม่มีใครถูกกัด'));
          if (act.heal) row.appendChild(btn('ใช้ยาชุบชีวิต' + (act.victims.length > 1 ? ' (เลือกคนที่ถูกกัด)' : ''), 'green', () => go({ kind: 'witch', do: 'heal', id: sel }), act.victims.length > 1 && !(sel && act.victims.includes(sel))));
          if (act.poison) row.appendChild(btn('ใช้ยาพิษ (เลือกเป้าหมาย)', 'red', () => go({ kind: 'witch', do: 'poison', id: sel }), !sel));
          row.appendChild(btn('ไม่ใช้', '', () => go({ kind: 'witch', do: 'skip' })));
        }
      } else if (k === 'hunter') {
        ac.appendChild(h('p', 'tt', 'เลือกคนที่จะยิง'));
        row.appendChild(btn('ยิง', 'red', () => go({ kind: 'hunter', id: sel }), !sel)); row.appendChild(btn('ไม่ยิง', '', () => go({ kind: 'hunter', id: 'skip' })));
      } else if (k === 'vote') {
        ac.appendChild(h('p', 'tt', act.picked ? (act.picked === 'skip' ? 'คุณงดออกเสียง' : `คุณโหวต ${nm(act.picked)}`) : 'เลือกคนที่จะโหวต'));
        row.appendChild(btn('โหวต', 'red', () => go({ kind: 'vote', id: sel }), !sel)); row.appendChild(btn('งดออกเสียง', '', () => go({ kind: 'vote', id: 'skip' })));
      } else if (k === 'day') {
        const rd = st.players.filter((p) => p.alive && p.ready).length, tot = st.players.filter((p) => p.alive).length;
        ac.appendChild(h('p', 'tt', 'คุยกันในแชท'));
        row.appendChild(btn(act.ready ? 'พร้อมแล้ว ✓' : 'พร้อมโหวต', 'yellow', () => go({ kind: 'ready' }), act.ready)); ac.appendChild(h('div', 'sub', `พร้อมโหวต ${rd}/${tot}`));
      }
      if (row.childNodes.length) ac.appendChild(row);
      const key = k + ':' + st.stage + ':' + (act.done ? 1 : 0) + (act.picked || '') + (act.ready ? 1 : 0);
      if (key !== WW.key && !(act.done || act.ready || act.picked)) Snd.turn();
      WW.key = key;
    }
    // ล็อก
    const lg = $('#wwLog'); const atBot = lg.scrollTop + lg.clientHeight >= lg.scrollHeight - 8; lg.innerHTML = '';
    for (const L of st.log.slice(-8)) lg.appendChild(h('div', L.k || '', L.x));
    if (atBot || newGame) lg.scrollTop = lg.scrollHeight;
    // หยุด / จบ
    const host = st.host === st.me, playing = st.phase === 'playing';
    $('#btnPause4').hidden = !(playing && host); $('#wwPause').hidden = !(playing && st.paused); $('#btnResume4').hidden = !host;
    $('#wwPauseTxt').textContent = host ? 'กดปุ่มเพื่อเล่นต่อ' : 'รอหัวห้องกดเล่นต่อ';
    renderWWEnd(st, host);
  }
  function renderWWEnd(st, host) {
    const box = $('#wwEnd'); const show = st.phase === 'ended';
    if (!show) { box.hidden = true; WW.endShown = false; return; }
    if (WW.endShown === st.round) { box.hidden = false; return; }
    WW.endShown = st.round; box.hidden = false; box.innerHTML = '';
    const mineWin = st.winner === 'B' ? st.role === 'beggar' : st.winner === 'L' ? !!(st.players.find((p) => p.id === st.me) || {}).lov : (st.winner === 'W') === ['wolf', 'silencer', 'cub'].includes(st.role);
    mineWin ? Snd.win() : Snd.err();
    const pan = h('div', 'panel'); pan.appendChild(h('h2', '', st.winner === 'W' ? '' + 'หมาป่าชนะ!' : st.winner === 'L' ? '' + 'คู่รักชนะ!' : st.winner === 'B' ? '' + 'ยาจกชนะ!' : '' + 'ชาวบ้านชนะ!'));
    for (const p of st.players) {
      const r = h('div', 'prow' + (p.alive ? '' : ' off')); r.appendChild(avEl(p.av, p.name)); r.appendChild(nmEl(p.name + (p.id === st.me ? ' (คุณ)' : ''), p.nc));
      const rs = h('span', 'rl'); if (p.role) rs.innerHTML = wwIc(p.role) + ' ' + WWR[p.role].n + (p.alive ? '' : ' '); r.appendChild(rs); pan.appendChild(r);
    }
    const row = h('div', 'row');
    if (host) { const a = h('button', 'pbtn big yellow', '▶ เล่นอีกรอบ'); a.onclick = () => send({ t: 'start' }); row.appendChild(a); } else row.appendChild(h('p', 'hint', 'รอหัวห้องกดเริ่มรอบใหม่…'));
    const l = h('button', 'pbtn red', 'ออกจากห้อง'); l.onclick = () => leave(); row.appendChild(l);
    pan.appendChild(row); box.appendChild(pan);
  }
  function wwWire() {
    $('#btnPause4').onclick = () => send({ t: 'pause' }); $('#btnResume4').onclick = () => send({ t: 'resume' });
    $('#btnSnd4').onclick = () => { Snd.toggle(); $('#btnSnd4').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง'; };
    $('#btnLeave5').onclick = () => leave();
  }

  // ------------------------------------------------------------ waiting room
  function renderRoom() {
    const st = S.st, host = st.host === st.me;
    $('#rCode').textContent = st.code;
    const MAXP = st.game === 'coup' ? 6 : st.game === 'ww' ? 12 : 10;
    $('#rCount').textContent = `${st.players.length}/${MAXP}`;
    const box = $('#rPlayers'); box.innerHTML = '';
    for (const p of st.players) {
      const row = h('div', 'prow' + (p.online ? '' : ' off'));
      row.appendChild(avEl(p.av, p.name));
      row.appendChild(nmEl(p.name, p.nc));
      const tags = [];
      if (p.id === st.host) tags.push('หัวห้อง'); if (p.bot) tags.push('บอท'); if (p.id === st.me) tags.push('(คุณ)'); if (!p.online) tags.push('ออฟไลน์'); if (p.wins) tags.push(`${p.wins}`);
      row.appendChild(h('span', 'tags', tags.join(' · ')));
      if (host && p.id !== st.me) { const k = h('button', 'pbtn sm red', 'เชิญออก'); k.onclick = () => send({ t: 'kick', id: p.id }); row.appendChild(k); }
      box.appendChild(row);
    }
    $('#rHostCtl').style.display = host ? '' : 'none';
    const ro = $('#rOpts'); ro.innerHTML = '';
    if (st.game === 'coup') {
      const g3 = h('div', 'optg'); g3.appendChild(h('div', 'optt', 'ทิศทางการเล่น (หัวห้องเล่นก่อนเสมอ)'));
      const r3 = h('div', 'optr'); const cd = st.settings && st.settings.dir === -1 ? -1 : 1;
      for (const it of [{ v: 1, t: '↻ วนขวา (ตามเข็ม)' }, { v: -1, t: '↺ วนซ้าย (ทวนเข็ม)' }]) {
        const b = h('button', 'pbtn sm' + (cd === it.v ? ' yellow' : ''), it.t); b.type = 'button'; b.disabled = !host;
        if (host) b.onclick = () => send({ t: 'set', dir: it.v });
        if (!host && cd !== it.v) b.style.display = 'none';
        r3.appendChild(b);
      }
      g3.appendChild(r3); ro.appendChild(g3);
      const roles = h('div', 'roles');
      for (const [ch, d] of [['duke', 'ฟาร์มเหรียญ +2 ต่อตา'], ['captain', 'ขโมยเหรียญ 2 / บล็อกการขโมย'], ['ambassador', 'เปลี่ยนอาชีพ (สลับการ์ด)'], ['assassin', 'จ่าย 3 เหรียญ ฆ่า 1 คน'], ['contessa', 'บล็อกแอสซาซิน']]) {
        const r = h('div', 'role'); const ic = h('div', 'ri2'); ic.style.background = CPC[ch]; ic.innerHTML = cpIcon(ch); r.appendChild(ic);
        const tx = h('div', 'rt'); tx.appendChild(h('b', '', CPN[ch])); tx.appendChild(h('span', '', d)); r.appendChild(tx); roles.appendChild(r);
      }
      ro.appendChild(roles);
    } else if (st.game === 'ww') wwLobby(st, host, ro);
    else ro.appendChild(optsNode(st));
    $('#btnBot').disabled = st.players.length >= MAXP;
    $('#btnStart').style.display = host ? '' : 'none';
    $('#btnStart').disabled = (st.game === 'haxball' || st.game === 'ww') ? false : st.players.length < 2;
    if (st.game === 'haxball') hxLobby(st, host, ro, box);
    $('#rWait').textContent = host ? (st.players.length < 2 ? 'ต้องมีอย่างน้อย 2 คน — เพิ่มบอท หรือส่งลิงก์ให้เพื่อน' : 'พร้อมแล้ว! กดเริ่มเกมได้เลย') : 'รอหัวห้องกดเริ่มเกม…';
    if (st.game === 'ww') $('#rWait').textContent = host ? 'เลือกจำนวนผู้เล่นกับบทบาท แล้วกดเริ่ม — คนไม่ครบบอทจะเติมให้' : 'รอหัวห้องกดเริ่มเกม…';
    if (st.game === 'haxball') $('#rWait').textContent = host ? 'กดเริ่มได้เลย — ที่ว่างในทีมบอทจะเติมให้เอง' : 'รอหัวห้องกดเริ่มเกม';
  }

  // ------------------------------------------------------------ game render
  function sortHand(hand, side) {
    const order = Cards.SIDE_COLORS[side].concat(['W']);
    const val = (v) => (/^[0-9]$/.test(v) ? Number(v) : 20 + ['D1', 'D2', 'D5', 'REV', 'SKIP', 'SKE', 'FLIP', 'W', 'WD2', 'WD4', 'WDC'].indexOf(v));
    const num = (v) => (/^[0-9]$/.test(v) ? 100 - Number(v) : 200 + val(v));
    if (S.sortMode === 'num') return hand.slice().sort((a, b) => (num(a.f.v) - num(b.f.v)) || (order.indexOf(a.f.c) - order.indexOf(b.f.c)));
    return hand.slice().sort((a, b) => (order.indexOf(a.f.c) - order.indexOf(b.f.c)) || (num(a.f.v) - num(b.f.v)));
  }

  function orderedHand(st) {
    if (S.orderRound !== st.round) { S.orderRound = st.round; S.manual = false; S.order = []; }
    const auto = sortHand(st.hand, st.side);
    if (!S.manual) { S.order = auto.map((c) => c.id); return auto; }
    const byId = new Map(st.hand.map((c) => [c.id, c]));
    const kept = S.order.filter((id) => byId.has(id)), seen = new Set(kept);
    for (const c of auto) if (!seen.has(c.id)) kept.push(c.id);
    S.order = kept; return kept.map((id) => byId.get(id));
  }

  function renderGame() {
    const st = S.st;
    document.body.className = 'side-' + st.side;
    $('#gCode').textContent = 'ห้อง ' + st.code;
    $('#gSide').textContent = st.mode === 'classic' ? 'CLASSIC' : (st.side === 'L' ? 'LIGHT' : 'DARK');
    $('#gDir').textContent = st.dir === 1 ? '↻' : '↺';
    const gc = $('#gColor'); gc.innerHTML = '';
    if (st.color === 'W') gc.innerHTML = '<i class="chip any">ANY</i> ลงอะไรก็ได้';
    else { const c = h('i', 'chip c-' + st.color); gc.appendChild(c); gc.title = Cards.COLOR_NAME[st.color]; }
    $('#btnSnd').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง';
    renderPause(); renderOpps(); renderPiles(); renderMsg(); renderHand(); renderActs(); renderTimer(); renderChal(); renderEnd();
  }

  function oppNode(p) {
    const st = S.st;
    const b = h('div', 'opp' + (st.cur === p.id ? ' turn' : '') + (p.online ? '' : ' off'));
    b.dataset.seat = p.id;
    const top = h('div', 'top'); top.appendChild(avEl(p.av, p.name)); top.appendChild(nmEl(p.name, p.nc)); b.appendChild(top);
    if (p.place && st.phase === 'playing') {
      b.classList.add('done');
      b.appendChild(h('div', 'placeb', 'อันดับ ' + p.place));
    } else {
      const fan = h('div', 'fan'); const show = Math.min(p.n, 10);
      for (let i = 0; i < show; i++) fan.appendChild(h('i', 'mini ' + (p.peek && p.peek[i] ? 'c-' + p.peek[i] : 'back')));
      if (p.n > 10) fan.appendChild(h('i', 'mini more', '+' + (p.n - 10)));
      b.appendChild(fan);
      b.appendChild(h('div', 'cnt', p.n + ' ใบ'));
    }
    const stx = [p.bot ? '' : '', p.auto ? 'ออโต้' : '', !p.online ? 'ออฟไลน์' : '', p.wins ? '' + p.wins : ''].filter(Boolean).join(' ');
    if (stx) b.appendChild(h('div', 'st', stx));
    if (p.called && p.n === 1) b.appendChild(h('b', 'unob', 'UNO!'));
    if (st.catchable === p.id && p.id !== st.me) { const c = h('button', 'pbtn sm red catchb', 'จับ UNO!'); c.onclick = () => send({ t: 'catch' }); b.appendChild(c); }
    return b;
  }
  function renderOpps() {
    const st = S.st, box = $('#opps'); box.innerHTML = '';
    const L = st.players.length, mi = st.players.findIndex((p) => p.id === st.me);
    for (let k = 1; k < L; k++) box.appendChild(oppNode(st.players[(mi + k) % L]));
  }
  function renderPiles() {
    const st = S.st;
    const dp = $('#drawPile'); dp.innerHTML = Cards.back(st.side) + `<span class="badge">${st.drawN}</span>`;
    dp.classList.toggle('can', !!st.canDraw);
    const dc = $('#discPile'); dc.style.setProperty('--glow', st.color === 'W' ? '#fff' : Cards.PAL[st.color]);
    let html = '';
    if (st.discN > 2) html += `<div class="under u2">${Cards.back(st.side)}</div>`;
    if (st.discN > 1) html += `<div class="under">${Cards.back(st.side)}</div>`;
    html += st.top ? Cards.face(st.top.f, st.side) : '';
    dc.innerHTML = html;
  }
  function renderMsg() {
    const st = S.st, el = $('#msgline'); let t = '', mine = false;
    if (st.phase === 'playing') {
      const meP = st.players.find((p) => p.id === st.me);
      if (meP && meP.place) { t = `คุณหมดมือแล้ว ได้อันดับ ${meP.place} — ดูคนอื่นเล่นต่อ`; }
      else if (st.stack > 0 && !st.combo) t = st.cur === st.me ? `ลงการ์ด + ต่อ หรือจั่ว ${st.stack} ใบ` : `${pname(st.cur)} ต้องลงการ์ด + หรือจั่ว ${st.stack} ใบ`;
      else if (st.pending) t = st.pending.target === st.me ? 'ตัดสินใจ: ท้า หรือ ยอมรับ' : `รอ ${pname(st.pending.target)} ตัดสินใจ…`;
      else if (st.cur === st.me && st.combo) { mine = true; t = 'ลงเลขเดียวกันต่อได้ หรือกด "จบตา"'; }
      else if (st.cur === st.me) { mine = true; t = st.drew != null ? 'จั่วได้ใบที่ลงได้! ลงใบนั้น หรือกด "ผ่าน"' : 'ถึงตาคุณ! เลือกการ์ดหรือจั่ว'; }
      else t = `ถึงตา ${pname(st.cur)}…`;
    }
    el.textContent = t; el.className = mine ? 'mine' : '';
  }
  function renderHand() {
    const st = S.st, box = $('#hand'); box.innerHTML = '';
    const myTurn = st.phase === 'playing' && st.cur === st.me && !st.pending;
    const hand = orderedHand(st);
    box.classList.toggle('many', hand.length > 11);
    for (const c of hand) {
      const wrap = document.createElement('div'); wrap.innerHTML = Cards.face(c.f, st.side);
      const el = wrap.firstChild; el.dataset.card = c.id;
      if (myTurn) el.classList.add(st.playable.includes(c.id) ? 'playable' : 'dim');
      box.appendChild(el);
    }
    if (S.flipNext) { S.flipNext = false; box.classList.remove('flipin'); void box.offsetWidth; box.classList.add('flipin'); setTimeout(() => box.classList.remove('flipin'), 700); }
    const me = st.players.find((p) => p.id === st.me);
    const nm = $('#meName'); nm.innerHTML = '';
    nm.appendChild(avEl(me && me.av, me ? me.name : '?')); nm.appendChild(h('span', '', `${me ? me.name : ''} · ${hand.length} ใบ${me && me.wins ? ' · ' + me.wins : ''}`));
    $('#mebar').classList.toggle('turn', myTurn);
  }
  function playCard(id) {
    const st = S.st; if (!st) return;
    const el = st.hand.find((x) => x.id === id); if (!el) return;
    if (!st.playable.includes(id)) return;
    if (el.f.c === 'W') pickColor((col) => send({ t: 'play', card: id, color: col })); else send({ t: 'play', card: id });
  }
  function renderActs() {
    const st = S.st, playing = st.phase === 'playing';
    const me = st.players.find((p) => p.id === st.me) || { n: 0, called: false };
    $('#btnUno').disabled = !playing || me.n === 0;
    const must = playing && !me.called && (me.n === 1 || (me.n === 2 && st.cur === st.me));
    $('#btnUno').classList.toggle('blink', must); $('#btnUno').classList.toggle('must', must);
    $('#btnCatch').hidden = !(playing && st.catchable && st.catchable !== st.me);
    $('#btnDraw').disabled = !st.canDraw;
    $('#btnDraw').textContent = st.stack > 0 ? `จั่ว ${st.stack}` : 'จั่ว';
    $('#btnPass').disabled = !st.canPass;
    $('#btnPass').textContent = st.combo ? 'จบตา' : 'ผ่าน';
    $('#btnPass').classList.toggle('blink', !!st.combo);
  }
  function renderPause() {
    const st = S.st, host = st.host === st.me, playing = st.phase === 'playing';
    $('#btnPause').hidden = !(host && playing);
    const on = playing && st.paused;
    $('#pauseBox').hidden = !on;
    $('#btnResume').hidden = !host;
    $('#pauseTxt').textContent = host ? 'กดปุ่มเพื่อเล่นต่อ' : 'รอหัวห้องกดเล่นต่อ';
  }
  function renderTimer() {
    const st = S.st, bar = $('#timerBar');
    bar.style.transition = 'none';
    if (st.phase !== 'playing') { bar.style.width = '0'; return; }
    if (st.paused) { bar.style.width = Math.max(0, Math.min(100, (st.timerLeft / st.timerTotal) * 100)) + '%'; return; }
    bar.style.width = Math.max(0, Math.min(100, (st.timerLeft / st.timerTotal) * 100)) + '%';
    void bar.offsetWidth;
    bar.style.transition = `width ${st.timerLeft}ms linear`;
    bar.style.width = '0%';
    bar.className = st.cur === st.me ? 'mine' : '';
  }
  function renderChal() {
    const st = S.st, box = $('#chalBox'), p = st.pending;
    if (!p || p.target !== st.me) { box.hidden = true; box.innerHTML = ''; return; }
    const off = pname(p.offender), wdc = p.wild === 'WDC', wname = { WD2: 'Wild +2', WD4: 'Wild +4', WDC: 'Wild Draw Color' }[p.wild], wn = p.wild === 'WD4' ? 4 : 2;
    box.hidden = false; box.innerHTML = '';
    box.appendChild(h('p', '', `${off} ลง ${wname} ใส่คุณ!`));
    box.appendChild(h('p', '', `ท้า: ถ้า ${off} แอบมีสีเดิมในมือ ${off} จั่ว 4 ใบ แต่ถ้าไม่ได้โกง คุณจั่วเพิ่มอีก 2 ใบ`));
    box.appendChild(h('p', '', `ยอมรับ: คุณ${wdc ? 'จั่วจนได้สีที่เลือก' : 'จั่ว ' + wn + ' ใบ'} แล้วถูกข้ามตา`));
    const row = h('div', 'row');
    const a = h('button', 'pbtn red', 'ท้า!'); a.onclick = () => send({ t: 'challenge', yes: true });
    const b = h('button', 'pbtn blue', 'ยอมรับ'); b.onclick = () => send({ t: 'challenge', yes: false });
    row.appendChild(a); row.appendChild(b); box.appendChild(row);
  }
  function renderEnd() {
    const st = S.st, box = $('#endBox');
    if (st.phase !== 'ended') { box.hidden = true; box.innerHTML = ''; return; }
    const w = st.players.find((p) => p.id === st.winner);
    box.hidden = false; box.innerHTML = '';
    const pan = h('div', 'panel');
    pan.appendChild(h('h2', '', w ? `${w.name} ชนะ!` : 'จบรอบ'));
    const tb = document.createElement('table');
    const rows = st.players.slice().sort((a, b) => (a.place || 99) - (b.place || 99));
    for (const p of rows) {
      const tr = document.createElement('tr');
      { const td = nmEl(`${p.place || '-'}. ` + p.name + (p.id === st.me ? ' (คุณ)' : ''), p.nc, ''); const tdd = h('td', ''); tdd.appendChild(td); tr.appendChild(tdd); }
      tr.appendChild(h('td', '', p.n === 0 ? 'หมดมือ' : `เหลือ ${p.n} ใบ`));
      tr.appendChild(h('td', '', `${p.wins}`));
      tb.appendChild(tr);
    }
    pan.appendChild(tb);
    if (st.host === st.me) pan.appendChild(optsNode(st));
    const row = h('div', 'row'); row.style.justifyContent = 'center';
    if (st.host === st.me) {
      const a = h('button', 'pbtn big yellow', '▶ เล่นอีกรอบ'); a.onclick = () => send({ t: 'start' }); row.appendChild(a);
      const bt = h('button', 'pbtn', '+บอท'); bt.disabled = st.players.length >= 10; bt.onclick = () => send({ t: 'addBot' }); row.appendChild(bt);
    } else pan.appendChild(h('p', 'hint', 'รอหัวห้องกดเริ่มรอบใหม่…'));
    const lv = h('button', 'pbtn red', 'ออกจากห้อง'); lv.onclick = leave; row.appendChild(lv);
    pan.appendChild(row); box.appendChild(pan);
    const key = st.code + ':' + st.round;
    if (S.endShown !== key) { S.endShown = key; if (st.winner === st.me) confetti(); }
  }

  // ------------------------------------------------------------ effects
  function confetti() {
    const fx = $('#fx'), cols = ['#e5382f', '#f9d423', '#3ba55d', '#2d6fdb', '#e8559b', '#1fb5a6', '#f08a24', '#7b4fd1'];
    for (let i = 0; i < 70; i++) {
      const c = h('i', 'confetti'); c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length];
      c.style.animationDuration = 2 + Math.random() * 2.4 + 's'; c.style.animationDelay = Math.random() * 0.8 + 's';
      fx.appendChild(c); setTimeout(() => c.remove(), 5500);
    }
  }
  function popText(target, text) {
    let r = null;
    if (target === S.me || target == null) { const m = $('#mebar'); r = m && m.getBoundingClientRect(); }
    else { const o = document.querySelector(`.opp[data-seat="${target}"]`); r = o && o.getBoundingClientRect(); }
    if (!r) return;
    const p = h('div', 'pop', text); p.style.left = (r.left + r.width / 2 - 40) + 'px'; p.style.top = (r.top + 6) + 'px';
    document.body.appendChild(p); setTimeout(() => p.remove(), 1100);
  }
  function rectOf(sel) { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; }
  async function fly(html, src, dst, dur, delay, maxScale) {
    if (!animOn()) return;
    const node = h('div', 'fly'); node.innerHTML = html; node.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
    document.body.appendChild(node);
    const dcx = dst.left + dst.width / 2, dcy = dst.top + dst.height / 2, scx = src.left + src.width / 2, scy = src.top + src.height / 2;
    node.style.left = (dcx - 32) + 'px'; node.style.top = (dcy - 48) + 'px';
    const sc = Math.min(src.width / 64, maxScale || 1.3);
    try {
      const a = node.animate([
        { transform: `translate(${scx - dcx}px,${scy - dcy}px) scale(${sc}) rotate(-10deg)`, opacity: 1 },
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      ], { duration: dur, delay: delay || 0, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
      await Promise.race([a.finished, sleep(dur + (delay || 0) + 200)]);
    } catch (e) { /* */ }
    node.remove();
  }
  const fast = () => document.hidden || S.q.length > 5;

  async function handleEvent(ev) {
    const st = S.st;
    switch (ev.k) {
      case 'play': {
        Snd.play();
        if (fast() || !st) return;
        let src = null;
        if (ev.by === S.me) src = rectOf(`#hand [data-card="${ev.id}"]`) || rectOf('#hand');
        else src = rectOf(`.opp[data-seat="${ev.by}"]`);
        const dst = rectOf('#discPile > .card') || rectOf('#discPile');
        if (!src || !dst) return;
        await fly(Cards.face(ev.f, st.side), src, dst, 340, 0, ev.by === S.me ? 1.3 : 0.8);
        break;
      }
      case 'draw': {
        Snd.draw();
        if (fast() || !st) return;
        const src = rectOf('#drawPile .card'); const dst = ev.by === S.me ? rectOf('#hand') : rectOf(`.opp[data-seat="${ev.by}"]`);
        if (!src || !dst) return;
        const n = Math.min(ev.n, 4), ps = [];
        for (let i = 0; i < n; i++) ps.push(fly(Cards.back(st.side), src, dst, 300, i * 90, 1));
        await Promise.all(ps);
        break;
      }
      case 'flip': {
        Snd.flip(); S.flipNext = true;
        if (fast()) return;
        const fx = $('#fx'); const b = h('div', 'flipbanner', 'FLIP!'); b.style.setProperty('--glow', ev.side === 'L' ? '#f9d423' : '#7b4fd1'); fx.appendChild(b);
        await sleep(700); b.remove();
        break;
      }
      case 'uno': Snd.uno(); popText(ev.by, 'UNO!'); break;
      case 'catch': Snd.catch(); popText(ev.target, 'ถูกจับ! +' + (ev.n || 2)); break;
      case 'skip': Snd.skip(); if (ev.who) popText(ev.who, 'ข้าม!'); break;
      case 'chal': popText(ev.ok ? ev.target : ev.by, ev.ok ? 'ท้าสำเร็จ!' : 'ท้าพลาด!'); break;
      case 'deal': Snd.deal(); break;
      case 'win': Snd.win(); break;
      case 'out': Snd.uno(); toast(`${((S.st&&S.st.players.find((p)=>p.id===ev.by))||{}).name||'ผู้เล่น'} หมดมือ ได้อันดับ ${ev.place}!`); break;
    }
  }

  // ------------------------------------------------------------ modal: เลือกสี
  function pickColor(cb) {
    const st = S.st, md = $('#modal'); md.innerHTML = ''; md.hidden = false;
    const pan = h('div', 'panel');
    const grid = h('div', 'colors');
    for (const col of Cards.SIDE_COLORS[st.side]) {
      const b = h('button', 'cbtn c-' + col, ''); b.title = Cards.COLOR_NAME[col]; b.setAttribute('aria-label', Cards.COLOR_NAME[col]);
      b.onclick = () => { md.hidden = true; md.innerHTML = ''; cb(col); };
      grid.appendChild(b);
    }
    pan.appendChild(grid);
    const x = h('button', 'pbtn sm', 'ยกเลิก'); x.style.marginTop = '12px'; x.onclick = () => { md.hidden = true; md.innerHTML = ''; };
    pan.appendChild(x); md.appendChild(pan);
  }

  // ------------------------------------------------------------ chat
  function setChannel(ch) {
    S.ch = ch;
    $('#chatTitle').textContent = ch === 'lobby' ? 'แชทลอบบี้ (ทุกคนในออฟฟิศเห็น)' : `แชทห้อง ${ch} (ทุกคนในห้องเห็น)`;
    redrawChat();
  }
  function msgNode(m) {
    const d = h('div', m.s ? 'sys' : 'msg' + (m.id && m.id === S.me ? ' me' : ''));
    if (m.s) { d.appendChild(h('span', '', '' + m.x)); return d; }
    const t = new Date(m.ts || Date.now());
    d.appendChild(h('time', '', String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0')));
    const b = h('b', '', (m.dead ? '💀 ' : m.w ? '🐺 ' : '') + m.n + ':'); b.setAttribute('data-nt', ''); b.style.color = m.nc || `hsl(${hash(m.n) % 360} 75% 72%)`; if (m.nc === '#000000') b.style.textShadow = '0 0 3px #fff, 0 0 3px #fff'; d.appendChild(b);
    { const xs = h('span', '', m.x); xs.setAttribute('data-nt', ''); d.appendChild(xs); }
    return d;
  }
  function redrawChat() {
    const log = $('#chatLog'); log.innerHTML = '';
    for (const m of (S.chat[S.ch] || [])) log.appendChild(msgNode(m));
    log.scrollTop = log.scrollHeight;
  }
  function addChat(ch, m) {
    const arr = S.chat[ch] || (S.chat[ch] = []); arr.push(m); if (arr.length > 200) arr.shift();
    if (ch !== S.ch) return;
    const log = $('#chatLog'); const near = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.appendChild(msgNode(m)); while (log.childNodes.length > 200) log.removeChild(log.firstChild);
    if (near || (m.id && m.id === S.me)) log.scrollTop = log.scrollHeight;
    if (!m.s && m.id !== S.me) Snd.chat();
  }

  // ------------------------------------------------------------ wiring
  function wire() {
    document.addEventListener('pointerdown', () => Snd.unlock(), { once: true });
    document.addEventListener('keydown', () => Snd.unlock(), { once: true });
    $('#inName').value = S.name; $('#inName0').value = S.name; setupAvatarEditor();
    $('#btnStart0').onclick = startMenu;
    $('#inName0').addEventListener('keydown', (e) => { if (e.key === 'Enter') startMenu(); });
    $('#btnChangeName').onclick = () => { $('#inName0').value = S.name; showScreen('start'); };
    $('#btnMenu').onclick = () => { renderPick(); showScreen('pick'); };
    $('#inName').addEventListener('input', () => store('uno_name' + SLOT, $('#inName').value.trim()));
    $('#btnCreate').onclick = () => { const n = getName(); if (!n) return; S.left = null; send({ t: 'create', game: S.game, name: n, av: S.av, password: $('#inPw').value.trim() }); $('#inPw').value = ''; };
    $('#inPw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnCreate').click(); });
    $('#btnLeave1').onclick = () => leave(); $('#btnLeave2').onclick = () => leave(); $('#btnLeave3').onclick = () => leave();
    hxWire(); wwWire();
    $('#btnPause2').onclick = () => send({ t: 'pause' }); $('#btnResume2').onclick = () => send({ t: 'resume' });
    const an = () => { $('#btnAnim').textContent = animOn() ? 'การเคลื่อนไหว: ปิด' : 'การเคลื่อนไหว: เปิด'; };
    const lg = () => { $('#lgTh').classList.toggle('yellow', I18N.lang === 'th'); $('#lgEn').classList.toggle('yellow', I18N.lang === 'en'); };
    lg(); $('#lgTh').onclick = () => { I18N.set('th'); lg(); }; $('#lgEn').onclick = () => { I18N.set('en'); lg(); };
    an(); $('#btnAnim').onclick = () => { ANIM = !ANIM; store('cp_anim', ANIM ? '1' : '0'); applyAnim(); an(); };
    $('#btnSnd2').onclick = () => { Snd.toggle(); $('#btnSnd2').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง'; };
    $('#btnBot').onclick = () => send({ t: 'addBot' });
    $('#btnStart').onclick = () => send({ t: 'start' });
    $('#btnCopy').onclick = async () => {
      let base = location.origin;
      if (/^(localhost|127\.|\[::1\])/.test(location.hostname) && S.lan && S.lan.length) base = S.lan[0];
      const url = base + '/?room=' + (S.st ? S.st.code : '');
      try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย'); } catch (e) { const md = $('#modal'); md.innerHTML = ''; md.hidden = false; const pan = h('div', 'panel'); pan.appendChild(h('h2', '', 'คัดลอกลิงก์นี้ส่งให้เพื่อน')); const i = document.createElement('input'); i.value = url; i.readOnly = true; i.style.width = '100%'; const ok = h('button', 'pbtn', 'ปิด'); ok.style.marginTop = '10px'; ok.onclick = () => { md.hidden = true; md.innerHTML = ''; }; pan.appendChild(i); pan.appendChild(ok); md.appendChild(pan); i.focus(); i.select(); }
    };
    $('#btnSnd').onclick = () => { Snd.toggle(); $('#btnSnd').textContent = Snd.on ? 'เสียง' : 'ปิดเสียง'; };
    $('#btnUno').onclick = () => send({ t: 'uno' });
    $('#btnPause').onclick = () => send({ t: 'pause' });
    $('#btnResume').onclick = () => send({ t: 'resume' });
    $('#btnCatch').onclick = () => send({ t: 'catch' });
    $('#btnDraw').onclick = () => send({ t: 'draw' });
    $('#btnPass').onclick = () => send({ t: 'pass' });
    $('#drawPile').onclick = () => { if (S.st && S.st.canDraw) send({ t: 'draw' }); else if (S.st && S.st.phase === 'playing') { Snd.err(); toast(S.st.cur === S.st.me ? 'จั่วไม่ได้ตอนนี้' : 'ยังไม่ถึงตาคุณ'); } };
    (function setupDrag() {
      const box = $('#hand'); let d = null;
      const begin = () => { d.on = true; d.el.classList.add('dragging'); try { box.setPointerCapture(d.id); } catch (e) { /* */ } if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* */ } } };
      const end = (save) => {
        if (!d) return; clearTimeout(d.timer);
        if (d.on) {
          d.el.classList.remove('dragging');
          if (save && d.el.isConnected) { S.manual = true; S.order = [...box.children].map((c) => Number(c.dataset.card)); }
          if (save && d.out && d.el.isConnected) { const pid = Number(d.el.dataset.card); setTimeout(() => playCard(pid), 0); }
          S.dragSup = true; setTimeout(() => { S.dragSup = false; }, 0);
        }
        d = null;
      };
      box.addEventListener('pointerdown', (e) => {
        const c = e.target.closest('.card'); if (!c || (e.pointerType === 'mouse' && e.button !== 0)) return;
        d = { el: c, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, touch: e.pointerType !== 'mouse', timer: null };
        if (d.touch) d.timer = setTimeout(() => { if (d && !d.on) begin(); }, 260);
      });
      box.addEventListener('pointermove', (e) => {
        if (!d) return;
        if (!d.el.isConnected) { d = null; return; }
        if (!d.on) {
          const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
          if (d.touch) { if (dist > 10) { clearTimeout(d.timer); d = null; } return; }
          if (dist < 6) return; begin();
        }
        const sibs = [...box.children].filter((c) => c !== d.el);
        const next = sibs.find((c) => { const r = c.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
        if (next) { if (d.el.nextSibling !== next) box.insertBefore(d.el, next); } else if (box.lastChild !== d.el) box.appendChild(d.el);
        const br = box.getBoundingClientRect();
        d.out = e.clientY < br.top - 30;
        d.el.classList.toggle('toplay', d.out);
        if (e.clientX < br.left + 40) box.scrollLeft -= 14; else if (e.clientX > br.right - 40) box.scrollLeft += 14;
      });
      box.addEventListener('touchmove', (e) => { if (d && d.on) e.preventDefault(); }, { passive: false });
      box.addEventListener('pointerup', () => end(true));
      box.addEventListener('pointercancel', () => end(false));
      $('#btnSort').onclick = () => { S.sortMode = S.sortMode === 'num' ? 'color' : 'num'; $('#btnSort').textContent = S.sortMode === 'num' ? 'เรียงเลข' : 'เรียงสี'; S.manual = false; if (S.st) renderHand(); };
    })();
    $('#hand').addEventListener('click', (e) => {
      if (S.dragSup) return;
      const c = e.target.closest('.card'); if (!c) return;
      const st = S.st; if (!st || st.phase !== 'playing') return;
      const id = Number(c.dataset.card);
      if (!st.playable.includes(id)) {
        c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 320); Snd.err();
        if (st.pending && st.pending.target === st.me) toast('ต้องเลือก ท้า หรือ ยอมรับ ก่อน');
        else if (st.cur !== st.me) toast('ยังไม่ถึงตาคุณ');
        else if (st.stack > 0) toast(`ต้องลงการ์ด + หรือจั่ว ${st.stack} ใบ`);
        else if (st.combo) toast('ลงต่อได้เฉพาะเลข/การ์ดแบบเดียวกัน หรือกด จบตา');
        else if (st.drew != null) toast('หลังจั่ว เล่นได้เฉพาะใบที่เพิ่งจั่ว หรือกด "ผ่าน"');
        else toast('ใบนี้ลงไม่ได้ — ต้องสีหรือเลข/สัญลักษณ์ตรงกับใบบนสุด');
        return;
      }
      playCard(id);
    });
    // แชท
    $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chatIn'); const t = i.value.trim(); if (!t) return; chatSend(t); i.value = ''; });
    for (const b of document.querySelectorAll('#chatHead .quick button')) b.onclick = () => chatSend(b.dataset.q);
    const min = store('uno_chatmin') === '1';
    $('#chat').classList.toggle('min', min); $('#chatToggle').textContent = min ? '▲' : '▼';
    {
      const grip = $('#chatGrip'), root = document.documentElement;
      const setH = (v) => { v = Math.max(40, Math.min(Math.round(window.innerHeight * 0.6), Math.round(v))); root.style.setProperty('--chat-h', v + 'px'); return v; };
      const saved = parseInt(store('uno_chath'), 10); if (saved) setH(saved);
      let sy = 0, sh = 0, drag = false;
      grip.addEventListener('pointerdown', (e) => { drag = true; sy = e.clientY; sh = $('#chatLog').offsetHeight; grip.classList.add('drag'); try { grip.setPointerCapture(e.pointerId); } catch (x) { /* */ } e.preventDefault(); });
      grip.addEventListener('pointermove', (e) => { if (drag) setH(sh + (sy - e.clientY)); });
      const end = () => { if (!drag) return; drag = false; grip.classList.remove('drag'); store('uno_chath', String($('#chatLog').offsetHeight)); const l = $('#chatLog'); l.scrollTop = l.scrollHeight; };
      grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
      grip.addEventListener('dblclick', () => { root.style.removeProperty('--chat-h'); store('uno_chath', ''); });
    }
    $('#chatToggle').onclick = () => { const m = $('#chat').classList.toggle('min'); $('#chatToggle').textContent = m ? '▲' : '▼'; store('uno_chatmin', m ? '1' : '0'); if (!m) $('#chatLog').scrollTop = $('#chatLog').scrollHeight; };
    // คีย์ลัด
    document.addEventListener('keydown', (e) => {
      if (/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const st = S.st; if (!st || st.phase !== 'playing') return;
      const k = e.key.toLowerCase();
      if (k === 'd' && st.canDraw) send({ t: 'draw' });
      else if (k === 'p' && st.canPass) send({ t: 'pass' });
      else if (k === 'u') send({ t: 'uno' });
      else if (k === 'c') send({ t: 'catch' });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.st) document.title = (S.st.phase === 'playing' && S.st.cur === S.st.me) ? 'ถึงตาคุณ! — เกมออฟฟิศ' : 'เกมออฟฟิศ'; });
    const q = new URLSearchParams(location.search).get('room');
    if (q) S.joinCode = q.toUpperCase().slice(0, 4);
  }

  wire(); setChannel('lobby'); showScreen('start'); connect();
  window.__uno = S; // สำหรับดีบัก
})();
