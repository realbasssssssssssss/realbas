'use strict';
/**
 * UNO FLIP (pixel) - เซิร์ฟเวอร์เกมออนไลน์สำหรับเล่นในองค์กร
 * Node.js + ws  |  เปิดด้วย: npm start  (พอร์ต 3000)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const BOT_DELAY = Number(process.env.BOT_DELAY) || 2200;   // ms ที่บอทคิดต่อตา
const TURN_MS = Number(process.env.TURN_MS) || 45000;      // เวลาต่อตา
const MAX_PLAYERS = 10;
const HAND = 7;
const PUB = path.join(__dirname, 'public');

// สีด้านสว่าง R Y G B | ด้านมืด P(ชมพู) T(เขียวน้ำทะเล) O(ส้ม) V(ม่วง)
const COLORS = { L: ['R', 'Y', 'G', 'B'], D: ['P', 'T', 'O', 'V'] };
const BOT_NAMES = ['บอทข้าวเหนียว', 'บอทส้มตำ', 'บอทหมูปิ้ง', 'บอทไข่เจียว', 'บอทชาเย็น', 'บอทโอเลี้ยง', 'บอทปลาทู', 'บอทมะม่วง', 'บอทลอดช่อง', 'บอทกะเพรา'];

// ---------------------------------------------------------------- utils
const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const other = (s) => (s === 'L' ? 'D' : 'L');
const face = (c, side) => (side === 'L' ? c.L : c.D);
const isNum = (v) => /^[0-9]$/.test(v);
const NAME_COLORS = { red: '#ff4d4d', blue: '#4d9bff', yellow: '#ffd94a', green: '#3fcf4f', purple: '#b06bff', black: '#000000', orange: '#ff9a2e', pink: '#ff7ac8', white: '#ffffff', cyan: '#33e0e0', gray: '#aaaaaa', grey: '#aaaaaa', brown: '#b0763a' };
// รูปแบบ <color=red>ชื่อ  (หรือ <color=#ff8800>ชื่อ)
function parseName(raw) {
  raw = String(raw || ''); let c = '';
  const m = /^\s*<color=([#\w]{1,9})>/i.exec(raw);
  if (m) { const k = m[1].toLowerCase(); if (NAME_COLORS[k]) c = NAME_COLORS[k]; else if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(k)) c = k; raw = raw.slice(m[0].length); }
  raw = raw.replace(/<\/color>/gi, '');
  const n = Array.from(raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 16).join('');
  return { n, c };
}
const cleanName = (s) => parseName(s).n;
const cleanText = (s) => Array.from(String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 200).join('');

/** โหมดธรรมดา: สำรับ UNO คลาสสิก 108 ใบ (ไม่มีด้านมืด) */
function buildClassicDeck() {
  const cards = [];
  for (const c of COLORS.L) {
    cards.push({ c, v: '0' });
    for (let n = 1; n <= 9; n++) cards.push({ c, v: String(n) }, { c, v: String(n) });
    for (const v of ['D2', 'REV', 'SKIP']) cards.push({ c, v }, { c, v });
  }
  for (let i = 0; i < 4; i++) cards.push({ c: 'W', v: 'W' }, { c: 'W', v: 'WD4' });
  shuffle(cards);
  return cards.map((l, i) => ({ id: i, L: l, D: l }));
}
function buildDeck(mode) {
  return mode === 'classic' ? buildClassicDeck() : buildFlipDeck();
}
/** โหมด Flip: สำรับ 112 ใบ แต่ละใบมี 2 ด้าน (L = สว่าง, D = มืด) */
function buildFlipDeck() {
  const light = [], dark = [];
  for (const c of COLORS.L) {
    for (let n = 1; n <= 9; n++) { light.push({ c, v: String(n) }, { c, v: String(n) }); }
    for (const v of ['D1', 'REV', 'SKIP', 'FLIP']) light.push({ c, v }, { c, v });
  }
  for (let i = 0; i < 4; i++) light.push({ c: 'W', v: 'W' });
  for (let i = 0; i < 4; i++) light.push({ c: 'W', v: 'WD2' });
  for (const c of COLORS.D) {
    for (let n = 1; n <= 9; n++) { dark.push({ c, v: String(n) }, { c, v: String(n) }); }
    for (const v of ['D5', 'REV', 'SKE', 'FLIP']) dark.push({ c, v }, { c, v });
  }
  for (let i = 0; i < 4; i++) dark.push({ c: 'W', v: 'W' });
  for (let i = 0; i < 4; i++) dark.push({ c: 'W', v: 'WDC' });
  shuffle(light); shuffle(dark);
  return light.map((l, i) => ({ id: i, L: l, D: dark[i] }));
}

// ---------------------------------------------------------------- state
const sessions = new Map(); // token -> session
const byId = new Map();     // id -> session
const rooms = new Map();    // code -> room
const lobbyChat = [];
let idCounter = 1;

const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const isOnline = (seat) => { const s = byId.get(seat.id); return !!(s && s.ws && s.ws.readyState === 1); };
const humans = (room) => room.players.filter((p) => !p.isBot);
const roomMax = (room) => (room.game === 'coup' ? 6 : room.game === 'ww' ? 12 : MAX_PLAYERS);
const GAMES = ['uno', 'coup', 'haxball', 'ww'];

function newRoom(code, hostId, game) {
  return { code, game: GAMES.includes(game) ? game : 'uno', hostId, password: '', players: [], phase: 'lobby', settings: { peek: false, mode: 'flip', unoPenalty: 2, dir: 1, hand: 7, tsize: 2, ball: 's', mins: 3, ww: { n: 7, wolves: 2, seer: true, bodyguard: true, hunter: false, silencer: false, cupid: false, cub: false, beggar: false, day: 60 } }, chat: [], draw: [], discard: [], side: 'L', color: 'R', dir: 1, cur: 0, drew: null, pending: null, unoCatch: null, winner: null, round: 0, timer: null, stackN: 0, placed: 0, combo: null, comboTimer: null, timerEnd: 0, timerTotal: TURN_MS, paused: false, pausedLeft: 0, botTimer: null, emptySince: null };
}

const cleanPw = (x) => Array.from(String(x || '').replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 12).join('');

function lanUrls() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${PORT}`);
  return out;
}

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let c = ''; for (let i = 0; i < 4; i++) c += A[rnd(A.length)];
    if (!rooms.has(c)) return c;
  }
}

function toRoom(room, obj) {
  const m = JSON.stringify(obj);
  for (const p of room.players) {
    if (p.isBot) continue;
    const s = byId.get(p.id);
    if (s && s.ws && s.ws.readyState === 1) s.ws.send(m);
  }
}
const emit = (room, ev) => toRoom(room, Object.assign({ t: 'ev' }, ev));

function say(room, x) {
  const m = { s: 1, x, ts: Date.now() };
  room.chat.push(m); if (room.chat.length > 150) room.chat.shift();
  toRoom(room, { t: 'chat', ch: room.code, m });
}

function broadcastRooms() {
  const list = [];
  for (const r of rooms.values()) {
    const host = r.players.find((p) => p.id === r.hostId);
    list.push({ code: r.code, host: host ? host.name : '-', locked: !!r.password, names: r.players.filter((p) => !p.isBot).map((p) => p.name).slice(0, 5), n: r.players.length, max: roomMax(r), game: r.game, phase: r.phase, mode: r.settings.mode, bots: r.players.filter((p) => p.isBot).length });
  }
  const online = Array.from(sessions.values()).filter((s) => s.ws && s.ws.readyState === 1).length;
  for (const s of sessions.values()) if (!s.room && s.ws) send(s.ws, { t: 'rooms', list, online });
}

// ---------------------------------------------------------------- room helpers
const seatById = (room, id) => room.players.find((p) => p.id === id);
const topCard = (room) => room.discard[room.discard.length - 1];

function responder(room) {
  if (room.phase !== 'playing') return null;
  if (room.pending) return seatById(room, room.pending.target);
  return room.players[room.cur];
}
const activeSeats = (room) => room.players.filter((p) => !p.place);
function stepSeat(room, from, n) {
  // เดินไป n คน (นับเฉพาะคนที่ยังเล่นอยู่ ข้ามคนที่จบแล้ว)
  const L = room.players.length; let i = from;
  for (let k = 0; k < n; k++) { for (let g = 0; g < L; g++) { i = (((i + room.dir) % L) + L) % L; if (!room.players[i].place) break; } }
  return i;
}
function advance(room, n) {
  if (n === 0) { if (room.players[room.cur] && room.players[room.cur].place) room.cur = stepSeat(room, room.cur, 1); return; }
  room.cur = stepSeat(room, room.cur, n);
}
function nextSeat(room, n = 1) { return room.players[stepSeat(room, room.cur, n)]; }
function pickWinner(room) {
  const placed = room.players.filter((p) => p.place).sort((a, b) => a.place - b.place);
  return placed[0] || activeSeats(room)[0] || null;
}

function canPlay(room, card) {
  const f = face(card, room.side);
  if (f.c === 'W') return true;
  if (room.color === 'W') return true; // พลิกแล้วเจอ Wild: ลงอะไรก็ได้
  const t = face(topCard(room), room.side);
  return f.c === room.color || f.v === t.v;
}

function drawOne(room) {
  if (!room.draw.length && room.discard.length > 1) {
    const top = room.discard.pop();
    room.draw = shuffle(room.discard);
    room.discard = [top];
    say(room, 'สับกองทิ้งกลับมาเป็นกองจั่ว');
  }
  return room.draw.pop();
}
function drawN(room, seat, n) {
  let got = 0;
  for (let i = 0; i < n; i++) { const c = drawOne(room); if (!c) break; seat.hand.push(c); got++; }
  if (got) { seat.called = false; emit(room, { k: 'draw', by: seat.id, n: got }); }
  return got;
}
function drawUntilColor(room, seat, color) {
  let got = 0;
  for (let i = 0; i < 60; i++) {
    const c = drawOne(room); if (!c) break;
    seat.hand.push(c); got++;
    if (face(c, room.side).c === color) break;
  }
  if (got) { seat.called = false; emit(room, { k: 'draw', by: seat.id, n: got }); }
  return got;
}

// ---------------------------------------------------------------- game flow
function startRound(room) {
  room.paused = false;
  const deck = buildDeck(room.settings.mode);
  room.draw = deck; room.discard = [];
  room.side = 'L'; room.dir = room.settings.dir === -1 ? -1 : 1; room.drew = null; room.pending = null; room.unoCatch = null; room.winner = null;
  room.round++; clearCombo(room); room.stackN = 0; room.placed = 0;
  for (const p of room.players) { p.hand = []; p.place = 0; p.called = false; p.afk = 0; p.auto = false; }
  for (let i = 0; i < room.settings.hand; i++) for (const p of room.players) p.hand.push(room.draw.pop());
  let c = null;
  while (!c) {
    c = room.draw.pop();
    if (!isNum(c.L.v)) { room.draw.splice(rnd(room.draw.length + 1), 0, c); c = null; }
  }
  room.discard.push(c);
  room.color = c.L.c;
  room.cur = Math.max(0, room.players.findIndex((p) => p.id === room.hostId));
  room.phase = 'playing';
  emit(room, { k: 'deal' });
  say(room, `เริ่มรอบที่ ${room.round} (${room.settings.mode === 'classic' ? 'โหมดธรรมดา' : 'โหมด Flip'} · ลืมพูด UNO จั่ว ${room.settings.unoPenalty}) — ${room.players[room.cur].name} เริ่มก่อน`);
  broadcastRooms();
  tick(room);
}

function endRound(room, seat) {
  room.paused = false;
  room.combo = null; room.stackN = 0; room.phase = 'ended'; room.winner = seat.id; room.pending = null; room.drew = null; room.unoCatch = null;
  const rest = activeSeats(room); for (const p of rest) { p.place = ++room.placed; }
  seat.wins++;
  clearTimeout(room.timer); clearTimeout(room.botTimer); clearTimeout(room.comboTimer);
  emit(room, { k: 'win', by: seat.id });
  say(room, `${seat.name} ชนะรอบนี้! (ชนะรวม ${seat.wins} ครั้ง)`);
  broadcastRooms();
}

const MULTI_OK = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'D1', 'D2', 'D5', 'SKIP', 'REV']);
function tryPlay(room, seat, cardId, color, more) {
  if (room.phase !== 'playing') return 'เกมยังไม่เริ่ม';
  if (room.pending) return 'ต้องรอตอบรับการ์ดจั่วก่อน';
  if (responder(room) !== seat) return 'ยังไม่ถึงตาคุณ';
  const card = seat.hand.find((c) => c.id === cardId);
  if (!card) return 'ไม่พบการ์ดใบนี้';
  const f0 = face(card, room.side);
  if (room.combo && room.combo.seat === seat.id) {
    if (room.combo.kind === 'plus') {
      if (!isPlus(f0.v)) return 'ลงต่อได้เฉพาะการ์ด + หรือกด จบตา';
      if (f0.c === 'W' && !COLORS[room.side].includes(color)) return 'ต้องเลือกสีก่อน';
    } else if (f0.v !== room.combo.v) return 'ลงต่อได้เฉพาะเลข/การ์ดแบบเดียวกัน หรือกด จบตา';
    doPlay(room, seat, card, color);
    return null;
  }
  if (room.stackN > 0) {
    if (!isPlus(f0.v)) return `ต้องลงการ์ด + หรือจั่ว ${room.stackN} ใบ`;
    if (f0.c === 'W' && !COLORS[room.side].includes(color)) return 'ต้องเลือกสีก่อน';
    doPlay(room, seat, card, color);
    return null;
  }
  if (room.drew !== null && room.drew !== card.id) return 'หลังจั่ว เล่นได้เฉพาะใบที่เพิ่งจั่วมา';
  if (Array.isArray(more) && more.length) {
    const ids = [cardId].concat(more.slice(0, 12).map(Number));
    if (new Set(ids).size !== ids.length) return 'เลือกการ์ดซ้ำกัน';
    const cards = ids.map((id) => seat.hand.find((c) => c.id === id));
    if (cards.some((c) => !c)) return 'ไม่พบการ์ดที่เลือก';
    const v = face(cards[0], room.side).v;
    if (!MULTI_OK.has(v) || cards.some((c) => face(c, room.side).v !== v)) return 'ลงพร้อมกันได้เฉพาะการ์ดเลข การ์ด + การ์ดข้ามตา หรือการ์ดกลับทิศที่เหมือนกัน';
    let first;
    if (room.drew !== null) { first = cards.find((c) => c.id === room.drew); if (!first) return 'หลังจั่ว ต้องลงใบที่เพิ่งจั่วเป็นใบแรก'; if (!canPlay(room, first)) return 'เล่นการ์ดใบนี้ไม่ได้'; }
    else { first = cards.find((c) => canPlay(room, c)); if (!first) return 'ไม่มีใบไหนลงได้เลย'; }
    doPlay(room, seat, first, null, cards.filter((c) => c !== first));
    return null;
  }
  if (!canPlay(room, card)) return 'เล่นการ์ดใบนี้ไม่ได้';
  const f = face(card, room.side);
  if (f.c === 'W' && !COLORS[room.side].includes(color)) return 'ต้องเลือกสีก่อน';
  doPlay(room, seat, card, color);
  return null;
}

const COMBO_MS = 3500;
const PLUS_VAL = { D1: 1, D2: 2, D5: 5, WD2: 2, WD4: 4 };
const isPlus = (v) => Object.prototype.hasOwnProperty.call(PLUS_VAL, v);
function clearCombo(room) { clearTimeout(room.comboTimer); room.comboTimer = null; room.combo = null; }
function doPlay(room, seat, card, color, rest) {
  rest = rest || [];
  const f = face(card, room.side);
  const prevColor = room.color;
  const prev = room.combo && room.combo.seat === seat.id ? room.combo : null;
  clearCombo(room);
  room.drew = null; room.unoCatch = null;
  for (const c of [card].concat(rest)) {
    const ff = face(c, room.side);
    seat.hand.splice(seat.hand.indexOf(c), 1);
    room.discard.push(c);
    room.color = ff.c === 'W' ? color : ff.c;
    emit(room, { k: 'play', by: seat.id, id: c.id, f: ff, color: room.color });
  }
  const cnt = (prev ? prev.n : 0) + 1 + rest.length;
  let sum = prev ? prev.sum || 0 : 0;
  for (const c of [card].concat(rest)) sum += PLUS_VAL[face(c, room.side).v] || 0;
  if (seat.hand.length === 0) {
    if (cnt > 1) say(room, `${seat.name} ลง ${cnt} ใบพร้อมกัน`);
    seat.place = ++room.placed;
    emit(room, { k: 'out', by: seat.id, place: seat.place });
    say(room, `${seat.name} หมดมือ ได้อันดับ ${seat.place}!`);
    if (activeSeats(room).length <= 1) { endRound(room, pickWinner(room)); return; }
    finishPlay(room, seat, f, cnt, prevColor, sum);
    return;
  }
  // คนจริงที่ยังมีใบต่อได้ในมือ: เปิดช่วงสั้นๆ ให้ลงต่อได้ (ไม่ต้องกดอะไรก็จบตาเอง)
  const plusPlay = isPlus(f.v);
  if (!seat.isBot && !seat.auto && (plusPlay || MULTI_OK.has(f.v)) &&
      seat.hand.some((c) => { const v = face(c, room.side).v; return plusPlay ? isPlus(v) : v === f.v; })) {
    room.combo = { seat: seat.id, v: f.v, n: cnt, sum, kind: plusPlay ? 'plus' : 'v' };
    room.comboTimer = setTimeout(() => { if (room.combo && room.phase === 'playing') { finalizeCombo(room); tick(room); } }, COMBO_MS);
    return;
  }
  finishPlay(room, seat, f, cnt, prevColor, sum);
}
function finalizeCombo(room) {
  const c = room.combo; if (!c) return;
  const seat = room.players.find((p) => p.id === c.seat);
  clearCombo(room);
  if (!seat || room.phase !== 'playing') return;
  finishPlay(room, seat, face(topCard(room), room.side), c.n, room.color, c.sum || 0);
}
function finishPlay(room, seat, f, cnt, prevColor, sum) {
  if (cnt > 1 && seat.hand.length > 0) say(room, `${seat.name} ลง ${cnt} ใบพร้อมกัน`);
  if (seat.hand.length === 1 && !seat.called) { room.unoCatch = seat.id; botCatchSoon(room); }
  if (seat.hand.length === 1 && seat.called) say(room, `${seat.name}: UNO!`);
  const L = activeSeats(room).length;
  if (sum > 0) {
    room.stackN += sum;
    const t = nextSeat(room, 1);
    say(room, `${seat.name} ลง +${sum} — กองรวม +${room.stackN} · ${t.name} ลงการ์ด + ต่อ หรือจั่ว ${room.stackN} ใบ`);
    advance(room, 1);
    return;
  }
  switch (f.v) {
    case 'REV':
      if (cnt % 2 === 1) room.dir *= -1;
      say(room, cnt > 1 ? `${seat.name} กลับทิศทาง ${cnt} ครั้ง ${cnt % 2 ? '↺' : '(ทิศเดิม)'}` : `${seat.name} กลับทิศทาง ↺`);
      advance(room, L === 2 ? 0 : 1); break;
    case 'SKIP': {
      const names = [];
      for (let i = 1; i <= cnt; i++) { const t = nextSeat(room, i); emit(room, { k: 'skip', who: t.id }); names.push(t.id === seat.id ? 'ตัวเอง' : t.name); }
      say(room, `${seat.name} ข้ามตา ${names.join(', ')}`);
      advance(room, cnt + 1); break;
    }
    case 'SKE':
      emit(room, { k: 'skip', who: null });
      say(room, `${seat.name} ลง Skip Everyone — ข้ามทุกคน เล่นต่อ!`);
      advance(room, 0); break;
    case 'FLIP': {
      room.side = other(room.side);
      const nf = face(topCard(room), room.side);
      room.color = nf.c;
      emit(room, { k: 'flip', side: room.side });
      say(room, `${seat.name} พลิก! ตอนนี้เป็นด้าน${room.side === 'L' ? 'สว่าง ' : 'มืด '}` + (nf.c === 'W' ? ' (ใบบนสุดเป็น Wild — ใครจะลงอะไรก็ได้)' : ''));
      advance(room, 1); break;
    }
    case 'W':
      say(room, `${seat.name} เปลี่ยนสีเป็น ${colorName(room.color)}`);
      advance(room, 1); break;
    case 'WDC': {
      const t = nextSeat(room, 1);
      const got = drawUntilColor(room, t, room.color);
      say(room, `${seat.name} ลง Wild Draw Color เลือกสี ${colorName(room.color)} → ${t.name} จั่ว ${got} ใบ และถูกข้ามตา`);
      advance(room, 2); break;
    }
    default: advance(room, 1);
  }
}

function colorName(c) {
  return ({ R: 'แดง', Y: 'เหลือง', G: 'เขียว', B: 'น้ำเงิน', P: 'ชมพู', T: 'เขียวน้ำทะเล', O: 'ส้ม', V: 'ม่วง' })[c] || c;
}

function doDraw(room, seat) {
  if (room.combo) return 'ตอนนี้ลงการ์ดต่อ หรือกด จบตา';
  if (room.phase !== 'playing' || room.pending || responder(room) !== seat || room.drew !== null) return 'จั่วไม่ได้ในตอนนี้';
  room.unoCatch = null;
  if (room.stackN > 0) {
    const n = room.stackN; room.stackN = 0;
    const got = drawN(room, seat, n);
    say(room, `${seat.name} จั่ว ${got} ใบ และถูกข้ามตา`);
    advance(room, 1);
    return null;
  }
  const c = drawOne(room);
  if (!c) { say(room, 'กองจั่วหมดแล้ว ข้ามตา'); advance(room, 1); return null; }
  seat.hand.push(c); seat.called = false;
  emit(room, { k: 'draw', by: seat.id, n: 1 });
  if (canPlay(room, c)) { room.drew = c.id; }
  else { say(room, `${seat.name} จั่วแล้วเล่นไม่ได้ ผ่านตา`); advance(room, 1); }
  return null;
}
function doPass(room, seat) {
  if (room.combo && room.phase === 'playing' && responder(room) === seat) { finalizeCombo(room); return null; }
  if (room.phase !== 'playing' || room.pending || responder(room) !== seat || room.drew === null) return 'ผ่านไม่ได้ในตอนนี้';
  room.drew = null; advance(room, 1);
  return null;
}
function doUno(room, seat) {
  if (room.phase !== 'playing') return null;
  if (seat.hand.length > 3) {
    drawN(room, seat, 1);
    say(room, `${seat.name} กด UNO เล่น โดนจั่วเพิ่ม 1 ใบ`);
    return null;
  }
  if (seat.hand.length === 1 && room.unoCatch === seat.id) { room.unoCatch = null; }
  seat.called = true;
  emit(room, { k: 'uno', by: seat.id });
  say(room, `${seat.name} เรียก UNO!`);
  return null;
}
function doCatch(room, catcher) {
  if (room.phase !== 'playing' || !room.unoCatch) return 'ไม่มีใครให้จับ';
  const target = seatById(room, room.unoCatch);
  if (!target || target === catcher) return 'จับไม่ได้';
  room.unoCatch = null;
  const pen = Math.min(100, Math.max(1, Number(room.settings.unoPenalty) || 2));
  drawN(room, target, pen);
  emit(room, { k: 'catch', by: catcher.id, target: target.id, n: pen });
  say(room, `${catcher.name} จับได้! ${target.name} ลืมเรียก UNO จั่ว ${pen} ใบ`);
  return null;
}
function doResolve(room, seat, challenge) {
  const p = room.pending;
  if (!p || p.target !== seat.id) return 'ไม่มีอะไรให้ตอบ';
  const off = seatById(room, p.offender);
  room.pending = null;
  let extra = 0;
  if (challenge && off) {
    const guilty = p.prevColor !== 'W' && off.hand.some((c) => face(c, room.side).c === p.prevColor);
    emit(room, { k: 'chal', ok: guilty, by: seat.id, target: off.id });
    if (guilty) {
      drawN(room, off, 4);
      say(room, `${seat.name} ท้าสำเร็จ! ${off.name} มีสี ${colorName(p.prevColor)} อยู่ในมือ จั่ว 4 ใบ — ${seat.name} เล่นต่อได้เลย`);
      room.cur = room.players.indexOf(seat);
      return null;
    }
    extra = 2;
    say(room, `${seat.name} ท้าพลาด! ${off.name} ไม่ได้โกง — ${seat.name} จั่วเพิ่ม 2 ใบ`);
  }
  let got;
  if (p.wild === 'WD2' || p.wild === 'WD4') got = drawN(room, seat, (p.wild === 'WD2' ? 2 : 4) + extra);
  else got = drawUntilColor(room, seat, room.color) + (extra ? drawN(room, seat, extra) : 0);
  say(room, `${seat.name} จั่ว ${got} ใบ และถูกข้ามตา`);
  room.cur = room.players.indexOf(seat);
  advance(room, 1);
  return null;
}

// ---------------------------------------------------------------- timers / bots
function armTimer(room) {
  clearTimeout(room.timer);
  if (room.phase !== 'playing') return;
  const r = responder(room);
  const away = r && !r.isBot && !r.auto && !isOnline(r);
  const ms = away ? 8000 : TURN_MS;
  room.timerEnd = Date.now() + ms; room.timerTotal = ms;
  room.timer = setTimeout(() => onTimeout(room), ms);
}
function onTimeout(room) {
  if (room.combo) { finalizeCombo(room); tick(room); return; }
  const r = responder(room);
  if (!r || room.phase !== 'playing') return;
  if (!r.isBot) {
    r.afk++;
    if (r.afk >= 2 && !r.auto) { r.auto = true; say(room, `${r.name} หายไปนาน — ให้บอทเล่นแทนชั่วคราว (กลับมากดอะไรก็ได้เพื่อรับช่วงคืน)`); }
    else say(room, `${r.name} หมดเวลา`);
  }
  if (room.pending) doResolve(room, r, false);
  else {
    if (room.drew === null) doDraw(room, r);
    if (room.phase === 'playing' && room.drew !== null && responder(room) === r) doPass(room, r);
  }
  tick(room);
}

function scheduleBot(room) {
  clearTimeout(room.botTimer);
  const r = responder(room);
  if (r && (r.isBot || r.auto)) {
    room.botTimer = setTimeout(() => botAct(room, r), BOT_DELAY * (0.6 + Math.random() * 0.8));
  }
}
function botCatchSoon(room) {
  const target = room.unoCatch;
  const bots = room.players.filter((p) => (p.isBot || p.auto) && p.id !== target);
  if (!bots.length || Math.random() > 0.4) return;
  setTimeout(() => {
    if (room.phase === 'playing' && !room.paused && room.unoCatch === target) {
      doCatch(room, bots[rnd(bots.length)]); tick(room);
    }
  }, BOT_DELAY + 600 + rnd(1500));
}

function botPickColor(room, seat, excludeCard) {
  const cnt = {};
  for (const c of seat.hand) { if (c === excludeCard) continue; const f = face(c, room.side); if (f.c !== 'W') cnt[f.c] = (cnt[f.c] || 0) + 1; }
  let best = null, bn = -1;
  for (const col of COLORS[room.side]) { const n = cnt[col] || 0; if (n > bn || (n === bn && Math.random() < 0.5)) { best = col; bn = n; } }
  return best;
}
function botAct(room, seat) {
  if (room.paused) return;
  if (room.phase !== 'playing' || responder(room) !== seat) return;
  if (room.pending) { doResolve(room, seat, Math.random() < 0.2); tick(room); return; }
  if (room.stackN > 0) {
    const plus = seat.hand.filter((c) => isPlus(face(c, room.side).v));
    if (plus.length && Math.random() < 0.85) {
      const pick = plus[rnd(plus.length)];
      const rest = plus.filter((c) => c !== pick && Math.random() < 0.5);
      const hasW = [pick].concat(rest).some((c) => face(c, room.side).c === 'W');
      doPlay(room, seat, pick, hasW ? botPickColor(room, seat, pick) : null, rest);
    } else doDraw(room, seat);
    tick(room); return;
  }
  const playable = seat.hand.filter((c) => (room.drew === null || room.drew === c.id) && canPlay(room, c));
  if (playable.length) {
    if (room.drew !== null && Math.random() < 0.2) { doPass(room, seat); tick(room); return; }
    const nxt = nextSeat(room, 1);
    const scored = playable.map((c) => {
      const f = face(c, room.side);
      let s = Math.random();
      if (f.c === 'W') s -= 5; else s += 2;
      if (!isNum(f.v) && f.c !== 'W') s += 2;
      if (nxt.hand.length <= 2 && ['D1', 'D2', 'D5', 'SKIP', 'SKE', 'REV', 'WD2', 'WD4', 'WDC'].includes(f.v)) s += 6;
      if (f.v === 'FLIP') s += 1;
      if (isNum(f.v)) s += Number(f.v) / 10;
      return { c, s };
    }).sort((a, b) => b.s - a.s);
    const pick = scored[0].c;
    const pf = face(pick, room.side);
    const rest = isPlus(pf.v) ? seat.hand.filter((c) => c !== pick && isPlus(face(c, room.side).v) && Math.random() < 0.5 && room.drew === null)
      : (MULTI_OK.has(pf.v) && Math.random() < 0.7) ? seat.hand.filter((c) => c !== pick && face(c, room.side).v === pf.v && (room.drew === null)) : [];
    if (seat.hand.length - 1 - rest.length === 1 && Math.random() < 0.88) { seat.called = true; emit(room, { k: 'uno', by: seat.id }); say(room, `${seat.name} เรียก UNO!`); }
    const f = face(pick, room.side);
    doPlay(room, seat, pick, (f.c === 'W' || rest.some((c) => face(c, room.side).c === 'W')) ? botPickColor(room, seat, pick) : null, rest);
  } else if (room.drew === null) doDraw(room, seat);
  else doPass(room, seat);
  tick(room);
}

function tick(room) {
  if (room.game === 'coup') return cpTick(room);
  if (room.game === 'haxball' || room.game === 'ww') return pushState(room);
  if (room.paused) { pushState(room); return; }
  armTimer(room);
  pushState(room);
  scheduleBot(room);
}

// ---------------------------------------------------------------- state view
function viewState(room, seat) {
  const side = room.side, top = topCard(room), os_ = other(side);
  const r = responder(room);
  const myTurn = room.phase === 'playing' && !room.pending && r === seat;
  const pend = room.pending;
  const inCombo = !!(room.combo && myTurn && room.combo.seat === seat.id);
  const playable = inCombo ? seat.hand.filter((c) => (room.combo.kind === 'plus' ? isPlus(face(c, side).v) : face(c, side).v === room.combo.v)).map((c) => c.id) : (myTurn && room.stackN > 0 ? seat.hand.filter((c) => isPlus(face(c, side).v)).map((c) => c.id) : myTurn ? seat.hand.filter((c) => (room.drew === null || room.drew === c.id) && canPlay(room, c)).map((c) => c.id) : []);
  return {
    t: 'state', locked: !!room.password, password: seat.id === room.hostId ? room.password : undefined, mode: room.settings.mode, code: room.code, phase: room.phase, round: room.round, host: room.hostId, me: seat.id,
    side, color: room.color, dir: room.dir,
    cur: r ? r.id : null,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, nc: p.nc || '', av: p.av, place: p.place || 0, n: p.hand.length, bot: p.isBot, auto: !!p.auto, online: p.isBot || isOnline(p), wins: p.wins, called: p.called,
      peek: room.settings.peek && room.settings.mode === 'flip' && p !== seat && room.phase === 'playing' ? p.hand.map((c) => face(c, os_).c) : null,
    })),
    hand: seat.hand.map((c) => ({ id: c.id, f: face(c, side) })),
    top: top ? { id: top.id, f: face(top, side) } : null,
    drawN: room.draw.length, discN: room.discard.length,
    playable, drew: myTurn ? room.drew : null,
    canDraw: myTurn && room.drew === null && !inCombo, canPass: myTurn && (room.drew !== null || inCombo), stack: room.stackN || 0, combo: inCombo ? { v: room.combo.v, n: room.combo.n } : null,
    pending: pend ? { target: pend.target, offender: pend.offender, wild: pend.wild } : null,
    paused: !!room.paused,
    timerLeft: room.phase === 'playing' ? (room.paused ? room.pausedLeft : Math.max(0, room.timerEnd - Date.now())) : 0,
    timerTotal: room.timerTotal || TURN_MS,
    catchable: room.unoCatch, winner: room.winner, settings: room.settings,
  };
}
function pushState(room) {
  for (const p of room.players) {
    if (p.isBot) continue;
    const s = byId.get(p.id);
    if (s && s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify(room.game === 'ww' ? wwView(room, p) : room.game === 'haxball' ? hxView(room, p) : room.game === 'coup' ? cpView(room, p) : viewState(room, p)));
  }
}

// ---------------------------------------------------------------- room mgmt
const AV_MAX = { s: 6, h: 7, c: 8, t: 9, y: 4, a: 7 };
function cleanAv(a) {
  const o = {}; a = a && typeof a === 'object' ? a : {};
  for (const k in AV_MAX) { const v = Number(a[k]); o[k] = Number.isInteger(v) && v >= 0 && v < AV_MAX[k] ? v : 0; }
  return o;
}
function randomAv() { const o = {}; for (const k in AV_MAX) o[k] = rnd(AV_MAX[k]); return o; }
function makeSeat(id, name, isBot, av, nc) { return { id, name, nc: nc || '', place: 0, av: isBot ? randomAv() : cleanAv(av), isBot: !!isBot, auto: false, afk: 0, hand: [], called: false, wins: 0 }; }
function uniqueName(room, name) {
  let n = name || 'ผู้เล่น', k = 2;
  const taken = (x) => room.players.some((p) => p.name === x);
  let out = n;
  while (taken(out)) out = `${n.slice(0, 13)}${k++}`;
  return out;
}

function removeSeat(room, seat) {
  const idx = room.players.indexOf(seat);
  if (idx < 0) return;
  if (room.game === 'coup' && room.phase === 'playing') { cpDrop(room, seat); return; }
  if (room.game === 'haxball' && room.phase === 'playing') { hxDrop(room, seat); return; }
  if (room.game === 'ww' && room.phase === 'playing') { wwDrop(room, seat); return; }
  if (room.phase === 'playing') {
    for (const c of seat.hand) room.draw.unshift(c);
    shuffle(room.draw);
  }
  if (room.combo && room.combo.seat === seat.id) clearCombo(room);
  seat.hand = [];
  room.players.splice(idx, 1);
  if (room.hostId === seat.id) {
    const nh = room.players.find((p) => !p.isBot) || room.players[0];
    room.hostId = nh ? nh.id : null;
    if (nh) say(room, `${nh.name} เป็นหัวห้องคนใหม่`);
  }
  if (room.phase === 'playing') {
    const L = room.players.length;
    if (activeSeats(room).length < 2) {
      const w = pickWinner(room);
      if (w) { say(room, 'ผู้เล่นไม่พอ จบรอบ'); endRound(room, w); }
      else room.phase = 'lobby';
      return;
    }
    if (idx < room.cur) room.cur--;
    else if (idx === room.cur) room.cur = room.dir === 1 ? idx % L : (idx - 1 + L) % L;
    room.cur = ((room.cur % L) + L) % L;
    if (room.players[room.cur].place) advance(room, 0);
    room.drew = null;
    if (room.unoCatch === seat.id) room.unoCatch = null;
    if (room.pending && (room.pending.target === seat.id || room.pending.offender === seat.id)) {
      const tgt = seatById(room, room.pending.target);
      room.pending = null;
      if (tgt) room.cur = room.players.indexOf(tgt);
    }
  }
}

function destroyRoom(room) {
  clearTimeout(room.timer); clearTimeout(room.botTimer); clearTimeout(room.comboTimer); clearInterval(room.hxTimer); wwClear(room);
  rooms.delete(room.code);
}

function leaveRoom(ses, reason) {
  const room = ses.room ? rooms.get(ses.room) : null;
  ses.room = null;
  if (!room) return;
  const seat = seatById(room, ses.id);
  if (seat) { say(room, `${seat.name} ${reason || 'ออกจากห้อง'}`); removeSeat(room, seat); }
  if (!humans(room).length) destroyRoom(room);
  else if (room.phase === 'playing') tick(room);
  else pushState(room);
  if (ses.ws) sendHome(ses); else broadcastRooms();
}

function sendHome(ses) {
  send(ses.ws, { t: 'chatlog', ch: 'lobby', list: lobbyChat });
  broadcastRooms();
}
function sendRoomInit(ses, room) {
  const seat = seatById(room, ses.id);
  if (!seat) return;
  send(ses.ws, { t: 'chatlog', ch: room.code, list: room.chat });
  send(ses.ws, room.game === 'ww' ? wwView(room, seat) : room.game === 'haxball' ? hxView(room, seat) : room.game === 'coup' ? cpView(room, seat) : viewState(room, seat));
}


// ================================================================ COUP (เกมโค่นอำนาจ)
const CP_MS = Number(process.env.CP_MS) || 35000;
const CP_CH = ['duke', 'captain', 'ambassador', 'assassin', 'contessa'];
const CP_NAME = { duke: 'ดู๊ก', captain: 'กัปตัน', ambassador: 'บัง', assassin: 'แอสซาซิน', contessa: 'นางฟ้า' };
const CP_ACT = {
  farm: { claim: null },
  duke: { claim: 'duke', label: 'เก็บภาษี +2' },
  steal: { claim: 'captain', target: true, blk: 'captain', label: 'ขโมย' },
  swap: { claim: 'ambassador', label: 'เปลี่ยนอาชีพ' },
  kill: { claim: 'assassin', target: true, blk: 'contessa', cost: 3, label: 'ฆ่า' },
  coup: { claim: null, target: true, cost: 7, label: 'ฆ่าเลือกการ์ด' },
};
const cpLive = (p) => (p.cards || []).filter((c) => !c.dead);
const cpIsAlive = (p) => cpLive(p).length > 0;
const cpAlive = (room) => room.players.filter(cpIsAlive);
function cpBub(room, id, t) { if (room.c) { room.c.bub = room.c.bub || {}; room.c.bub[id] = t; } }
function cpLog(room, x) { room.c.log.push(x); if (room.c.log.length > 40) room.c.log.shift(); }
const cpN = (room, id) => { const p = seatById(room, id); return p ? p.name : '?'; };

function cpStart(room) {
  room.players = room.players.filter((p) => !p.left);
  if (room.players.length < 2) return;
  const deck = [];
  for (const ch of CP_CH) for (let i = 0; i < 3; i++) deck.push(ch);
  shuffle(deck);
  for (const p of room.players) { p.cards = [{ ch: deck.pop(), dead: false }, { ch: deck.pop(), dead: false }]; p.coins = 2; p.place = 0; }
  room.round++; room.phase = 'playing'; room.winner = null; room.paused = false;
  room.c = { deck, turn: (room.players.find((p) => p.id === room.hostId) || room.players[0]).id, dir: room.settings.dir === -1 ? -1 : 1, phase: 'action', act: null, blk: null, resp: {}, lose: null, swap: null, after: null, bub: {}, log: [] };
  cpLog(room, `เริ่มเกม · ${cpN(room, room.c.turn)} เริ่มก่อน`);
  broadcastRooms();
  cpTick(room);
}

function cpWaiting(room) {
  const c = room.c; if (!c || room.phase !== 'playing') return [];
  const al = cpAlive(room);
  switch (c.phase) {
    case 'action': return [c.turn];
    case 'react': return al.filter((p) => (c.act.target ? p.id === c.act.target : p.id !== c.act.actor) && !c.resp[p.id]).map((p) => p.id); // ขโมย/ฆ่า = ดวลกับเป้าหมายคนเดียว
    case 'block': return [c.act.target];
    case 'breact': return al.filter((p) => p.id === c.act.actor && !c.resp[p.id]).map((p) => p.id); // ดวลกัน: มีแค่คนที่ทำท่าเป็นคนตัดสินว่าเชื่อบล็อกไหม
    case 'lose': return [c.lose];
    case 'swap': return [c.swap.id];
    case 'cpick': return [c.act.actor];
    default: return [];
  }
}

function cpTick(room) {
  clearTimeout(room.timer); clearTimeout(room.botTimer);
  if (room.paused) return pushState(room);
  if (room.phase === 'playing' && room.c) {
    room.timerEnd = Date.now() + CP_MS; room.timerTotal = CP_MS;
    room.timer = setTimeout(() => cpTimeout(room), CP_MS);
    const bots = cpWaiting(room).map((id) => seatById(room, id)).filter((p) => p && p.isBot && !p.left);
    if (bots.length) room.botTimer = setTimeout(() => cpBotAct(room, bots[0]), BOT_DELAY * (1.1 + Math.random() * 0.9));
  }
  pushState(room);
}

function cpEnd(room, w) {
  room.paused = false;
  room.phase = 'ended'; room.winner = w.id; w.wins++;
  for (const p of room.players) if (!p.left) { p.place = p === w ? 1 : 2; }
  cpLog(room, `${w.name} ครองอำนาจ ชนะเกม!`);
  say(room, `${w.name} ชนะเกม COUP!`);
  clearTimeout(room.timer); clearTimeout(room.botTimer);
  broadcastRooms();
  pushState(room);
}

function cpEndTurn(room) {
  const c = room.c, al = cpAlive(room);
  c.act = null; c.blk = null; c.resp = {}; c.lose = null; c.swap = null; c.after = null;
  if (al.length <= 1) { if (al[0]) return cpEnd(room, al[0]); room.phase = 'lobby'; return pushState(room); }
  let i = room.players.findIndex((p) => p.id === c.turn);
  const N = room.players.length;
  for (let k = 0; k < N; k++) { i = (i + (c.dir === -1 ? -1 : 1) + N) % N; if (cpIsAlive(room.players[i])) break; }
  c.turn = room.players[i].id; c.phase = 'action';
  cpTick(room);
}

function cpLose(room, p, pick) {
  const c = room.c, live = cpLive(p);
  if (!live.length) return cpResume(room);
  if (live.length === 1 || pick !== undefined) {
    const card = live.length === 1 ? live[0] : live[pick];
    card.dead = true;
    cpLog(room, `${p.name} เสียการ์ด 1 ใบ${cpIsAlive(p) ? '' : ' (ตกรอบ)'}`); cpBub(room, p.id, 'เสียการ์ด');
    c.lose = null;
    return cpResume(room);
  }
  c.phase = 'lose'; c.lose = p.id;
  cpTick(room);
}

function cpResume(room) {
  const c = room.c, al = cpAlive(room);
  if (al.length <= 1) { if (al[0]) return cpEnd(room, al[0]); return; }
  const a = c.after; c.after = null;
  const tgtAlive = c.act && c.act.target && cpIsAlive(seatById(room, c.act.target));
  if (a === 'actOK') return cpAfterReact(room);
  if (a === 'actFalse') { const actor = seatById(room, c.act.actor); const cost = (CP_ACT[c.act.type] || {}).cost || 0; if (actor && cost) actor.coins += cost; return cpEndTurn(room); }
  if (a === 'blkOK') return cpEndTurn(room);
  if (a === 'blkFalse') return cpExec(room);
  return cpEndTurn(room);
}

function cpAfterReact(room) {
  const c = room.c, A = CP_ACT[c.act.type];
  const t = c.act.target ? seatById(room, c.act.target) : null;
  if (A.target && (!t || !cpIsAlive(t))) return cpEndTurn(room);
  if (A.blk) {
    c.resp = {};
    if (c.pre) { c.pre = false; c.blk = { by: t.id, claim: A.blk }; c.phase = 'breact'; cpLog(room, `${t.name} บล็อก (${CP_NAME[A.blk]})`); return cpTick(room); }
    if (t && !t.isBot) return cpExec(room); // คนจริงมีโอกาสบล็อกตอน react แล้ว
    c.phase = 'block'; return cpTick(room);
  }
  return cpExec(room);
}

function cpExec(room) {
  const c = room.c, ty = c.act.type;
  const actor = seatById(room, c.act.actor), t = c.act.target ? seatById(room, c.act.target) : null;
  if (!actor || !cpIsAlive(actor)) return cpEndTurn(room);
  if (ty === 'farm') { actor.coins += 1; cpLog(room, `${actor.name} ฟาร์ม +1`); return cpEndTurn(room); }
  if (ty === 'duke') { actor.coins += 2; cpLog(room, `${actor.name} ดู๊ก +2`); return cpEndTurn(room); }
  if (ty === 'steal') {
    if (t && cpIsAlive(t)) { const n = Math.min(2, t.coins); t.coins -= n; actor.coins += n; cpLog(room, `${actor.name} ขโมย ${n} จาก ${t.name}`); }
    return cpEndTurn(room);
  }
  if (ty === 'kill') {
    if (!t || !cpIsAlive(t)) return cpEndTurn(room);
    cpLog(room, `${actor.name} ฆ่า ${t.name}`);
    c.after = 'done'; return cpLose(room, t);
  }
  if (ty === 'coup') {
    if (!t || !cpIsAlive(t)) return cpEndTurn(room);
    if (cpLive(t).length === 1) { c.after = 'done'; return cpLose(room, t, 0); }
    c.phase = 'cpick'; return cpTick(room);
  }
  if (ty === 'swap') {
    const k = cpLive(actor).length;
    const drawn = [c.deck.pop(), c.deck.pop()].filter(Boolean);
    c.swap = { id: actor.id, k, opts: cpLive(actor).map((x) => x.ch).concat(drawn) };
    c.phase = 'swap';
    return cpTick(room);
  }
  cpEndTurn(room);
}

function cpChallenge(room, chal, claimer, ch, ctx) {
  const c = room.c;
  const mine = cpLive(claimer).find((x) => x.ch === ch);
  if (mine) {
    cpLog(room, `${chal.name} ท้า — ${claimer.name} มี ${CP_NAME[ch]} จริง`); cpBub(room, chal.id, 'ไม่เชื่อ!'); cpBub(room, claimer.id, 'มีจริง!');
    c.deck.push(mine.ch); shuffle(c.deck); mine.ch = c.deck.pop();
    c.after = ctx === 'act' ? 'actOK' : 'blkOK';
    cpLose(room, chal);
  } else {
    cpLog(room, `${chal.name} ท้า — ${claimer.name} โกหก!`); cpBub(room, chal.id, 'ไม่เชื่อ!'); cpBub(room, claimer.id, 'โกหก!');
    c.after = ctx === 'act' ? 'actFalse' : 'blkFalse';
    cpLose(room, claimer);
  }
}

function cpHandle(room, seat, m) {
  if (room.phase !== 'playing' || !room.c) return 'ยังไม่ได้เริ่มเกม';
  if (room.paused) return 'เกมหยุดชั่วคราวอยู่';
  const c = room.c;
  if (!cpIsAlive(seat)) return 'คุณตกรอบแล้ว';
  if (m.t === 'c_act') {
    if (c.phase !== 'action' || c.turn !== seat.id) return 'ยังไม่ถึงตาคุณ';
    const A = CP_ACT[m.act]; if (!A) return 'ทำแบบนี้ไม่ได้';
    if (seat.coins >= 10 && m.act !== 'coup') return 'มี 10 เหรียญขึ้นไป ต้องใช้ฆ่าเลือกการ์ด';
    if (A.cost && seat.coins < A.cost) return `ต้องมี ${A.cost} เหรียญ`;
    let target = null;
    if (A.target) {
      const t = seatById(room, m.target);
      if (!t || t === seat || !cpIsAlive(t)) return 'เลือกเป้าหมายก่อน';
      if (m.act === 'steal' && t.coins < 1) return 'คนนี้ไม่มีเหรียญให้ขโมย';
      target = t.id;
    }
    if (A.cost) seat.coins -= A.cost;
    c.bub = {};
    c.act = { type: m.act, actor: seat.id, target, claim: A.claim, cost: A.cost || 0 };
    c.blk = null; c.resp = {}; c.pre = false;
    const tn = target ? cpN(room, target) : '';
    cpBub(room, seat.id, { farm: 'ฟาร์ม 1 เหรียญ', duke: 'ฟาร์ม 2 เหรียญ (ดู๊ก)', steal: `ขโมย ${tn} (กัปตัน)`, swap: 'เปลี่ยนอาชีพ (บัง)', kill: `ฆ่า ${tn} (แอสซาซิน)`, coup: `ฆ่า ${tn} (7 เหรียญ)` }[m.act]);
    if (!A.claim) { if (m.act === 'coup') cpLog(room, `${seat.name} จ่าย 7 ฆ่า ${tn}`); cpExec(room); return null; }
    c.phase = 'react'; cpTick(room); return null;
  }
  if (m.t === 'c_resp') {
    const v = m.v;
    if (c.phase === 'react' || c.phase === 'breact') {
      if (!cpWaiting(room).includes(seat.id)) return 'ตอนนี้ไม่ต้องตอบ';
      if (v === 'block' && c.phase === 'react') {
        const A = CP_ACT[c.act.type];
        if (!A.blk || c.act.target !== seat.id) return 'บล็อกไม่ได้';
        c.pre = true; c.resp[seat.id] = 1; cpBub(room, seat.id, `บล็อก (${CP_NAME[A.blk]})`);
        if (!cpWaiting(room).length) cpAfterReact(room); else cpTick(room);
        return null;
      }
      if (v === 'ok') { c.resp[seat.id] = 1; cpBub(room, seat.id, 'เชื่อ'); if (!cpWaiting(room).length) { if (c.phase === 'react') cpAfterReact(room); else { cpLog(room, `ไม่มีใครท้า บล็อกสำเร็จ`); cpEndTurn(room); } } else cpTick(room); return null; }
      if (v === 'challenge') {
        if (c.phase === 'react') cpChallenge(room, seat, seatById(room, c.act.actor), c.act.claim, 'act');
        else cpChallenge(room, seat, seatById(room, c.blk.by), c.blk.claim, 'blk');
        return null;
      }
      return 'ตอบไม่ถูก';
    }
    if (c.phase === 'block') {
      if (c.act.target !== seat.id) return 'ตอนนี้ไม่ต้องตอบ';
      if (v === 'allow') { cpBub(room, seat.id, 'ยอมรับ'); cpExec(room); return null; }
      if (v === 'block') {
        const bc = CP_ACT[c.act.type].blk;
        c.blk = { by: seat.id, claim: bc }; c.phase = 'breact'; c.resp = {};
        cpLog(room, `${seat.name} บล็อก (${CP_NAME[bc]})`); cpBub(room, seat.id, `บล็อก (${CP_NAME[bc]})`);
        cpTick(room); return null;
      }
    }
    return 'ตอนนี้ตอบไม่ได้';
  }
  if (m.t === 'c_pick') {
    if (c.phase === 'lose') {
      if (c.lose !== seat.id) return 'ไม่ใช่ตาคุณเลือก';
      const live = cpLive(seat); const i = Number(m.i);
      if (!Number.isInteger(i) || i < 0 || i >= live.length) return 'เลือกการ์ดไม่ถูก';
      cpLose(room, seat, i); return null;
    }
    if (c.phase === 'cpick') {
      if (c.act.actor !== seat.id) return 'ไม่ใช่ตาคุณเลือก';
      const t = seatById(room, c.act.target); const i = Number(m.i);
      if (!t || !Number.isInteger(i) || i < 0 || i >= cpLive(t).length) return 'เลือกการ์ดไม่ถูก';
      c.after = 'done'; cpLose(room, t, i); return null;
    }
    if (c.phase === 'swap') {
      if (c.swap.id !== seat.id) return 'ไม่ใช่ตาคุณเลือก';
      const keep = Array.isArray(m.keep) ? Array.from(new Set(m.keep.map(Number))) : [];
      if (keep.length !== c.swap.k || keep.some((i) => !Number.isInteger(i) || i < 0 || i >= c.swap.opts.length)) return `เลือกเก็บ ${c.swap.k} ใบ`;
      cpApplySwap(room, seat, keep); return null;
    }
  }
  return 'ทำแบบนี้ไม่ได้ตอนนี้';
}

function cpApplySwap(room, seat, keep) {
  const c = room.c, opts = c.swap.opts;
  const live = cpLive(seat);
  keep.forEach((oi, k) => { live[k].ch = opts[oi]; });
  opts.forEach((ch, i) => { if (!keep.includes(i)) c.deck.push(ch); });
  shuffle(c.deck);
  cpEndTurn(room);
}

function cpDefault(room, id) {
  const c = room.c, p = seatById(room, id); if (!p) return;
  if (c.phase === 'action') {
    if (p.coins >= 10) { const t = cpAlive(room).find((x) => x !== p); return cpHandle(room, p, { t: 'c_act', act: 'coup', target: t && t.id }); }
    return cpHandle(room, p, { t: 'c_act', act: 'farm' });
  }
  if (c.phase === 'react' || c.phase === 'breact') return cpHandle(room, p, { t: 'c_resp', v: 'ok' });
  if (c.phase === 'block') return cpHandle(room, p, { t: 'c_resp', v: 'allow' });
  if (c.phase === 'lose' || c.phase === 'cpick') return cpHandle(room, p, { t: 'c_pick', i: 0 });
  if (c.phase === 'swap') return cpHandle(room, p, { t: 'c_pick', keep: c.swap.opts.slice(0, c.swap.k).map((_, i) => i) });
}
function cpTimeout(room) {
  if (room.phase !== 'playing' || !room.c || room.paused) return;
  const ph = room.c.phase, round = room.round;
  for (const id of cpWaiting(room)) {
    if (room.phase !== 'playing' || room.round !== round || room.c.phase !== ph) break;
    cpDefault(room, id);
  }
  if (room.phase === 'playing' && room.c && room.c.phase === ph) cpTick(room);
}

// ---------- บอท
const cpVal = { duke: 3, assassin: 3, captain: 2, contessa: 2, ambassador: 1 };
function cpRevealed(room, ch) { let n = 0; for (const p of room.players) for (const x of p.cards || []) if (x.dead && x.ch === ch) n++; return n; }
function cpBotAct(room, b) {
  if (room.phase !== 'playing' || !room.c || room.paused) return;
  const c = room.c;
  if (!cpWaiting(room).includes(b.id)) return cpTick(room);
  const held = (ch) => cpLive(b).filter((x) => x.ch === ch).length;
  const others = cpAlive(room).filter((p) => p !== b);
  const act = (a, t) => cpHandle(room, b, { t: 'c_act', act: a, target: t && t.id });
  const resp = (v) => cpHandle(room, b, { t: 'c_resp', v });
  switch (c.phase) {
    case 'action': {
      const rich = others.slice().sort((x, y) => y.coins - x.coins);
      const weak = others.slice().sort((x, y) => (cpLive(x).length - cpLive(y).length) || (y.coins - x.coins))[0];
      if (b.coins >= 10 || (b.coins >= 7 && Math.random() < 0.7)) return act('coup', weak);
      const opts = [['farm', 1.5]];
      opts.push(['duke', held('duke') ? 3 : 1.2]);
      if (rich.some((p) => p.coins >= 1)) opts.push(['steal', held('captain') ? 3 : 0.8]);
      opts.push(['swap', held('ambassador') ? 1.5 : 0.4]);
      if (b.coins >= 3) opts.push(['kill', held('assassin') ? 4 : 1.2]);
      let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), pick = 'farm';
      for (const o of opts) { r -= o[1]; if (r <= 0) { pick = o[0]; break; } }
      if (pick === 'steal') return act('steal', rich.find((p) => p.coins >= 1));
      if (pick === 'kill') { const t = others.slice().sort((x, y) => (cpLive(x).length - cpLive(y).length) || (y.coins - x.coins))[0]; return act('kill', t); }
      return act(pick);
    }
    case 'react': case 'breact': {
      const claim = c.phase === 'react' ? c.act.claim : c.blk.claim;
      const known = held(claim) + cpRevealed(room, claim);
      let p = c.phase === 'react' ? 0.1 : 0.2;
      if (known >= 3) p = 1; else if (known === 2) p = 0.4;
      if (c.phase === 'react' && c.act.target === b.id && c.act.type === 'kill') p = Math.max(p, 0.45);
      return resp(Math.random() < p ? 'challenge' : 'ok');
    }
    case 'block': {
      const need = CP_ACT[c.act.type].blk;
      const bluff = c.act.type === 'kill' ? (cpLive(b).length === 1 ? 0.6 : 0.3) : 0.25;
      return resp(held(need) || Math.random() < bluff ? 'block' : 'allow');
    }
    case 'lose': {
      const live = cpLive(b).map((x, i) => [i, cpVal[x.ch] + Math.random()]);
      live.sort((x, y) => x[1] - y[1]);
      return cpHandle(room, b, { t: 'c_pick', i: live[0][0] });
    }
    case 'cpick': return cpHandle(room, b, { t: 'c_pick', i: rnd(2) % Math.max(1, cpLive(seatById(room, c.act.target)).length) });
    case 'swap': {
      const idx = c.swap.opts.map((ch, i) => [i, cpVal[ch] + Math.random() * 0.5]).sort((x, y) => y[1] - x[1]).slice(0, c.swap.k).map((x) => x[0]);
      return cpHandle(room, b, { t: 'c_pick', keep: idx });
    }
  }
}

// ---------- ออกกลางเกม
function cpDrop(room, seat) {
  for (const x of seat.cards || []) x.dead = true;
  seat.left = true; seat.isBot = true;
  if (room.hostId === seat.id) {
    const nh = room.players.find((p) => !p.isBot) || null;
    room.hostId = nh ? nh.id : null;
  }
  const c = room.c;
  if (!c) return;
  cpLog(room, `${seat.name} ออกจากเกม`);
  const al = cpAlive(room);
  if (al.length <= 1) { if (al[0]) cpEnd(room, al[0]); return; }
  const ph = c.phase;
  if (ph === 'action' && c.turn === seat.id) return cpEndTurn(room);
  if (c.act && c.act.actor === seat.id) return cpEndTurn(room);
  if ((ph === 'block' || ph === 'cpick') && c.act.target === seat.id) return cpEndTurn(room);
  if (ph === 'breact' && c.blk.by === seat.id) return cpEndTurn(room);
  if (ph === 'lose' && c.lose === seat.id) { c.lose = null; return cpResume(room); }
  if ((ph === 'react' || ph === 'breact') && !cpWaiting(room).length) { if (ph === 'react') return cpAfterReact(room); return cpEndTurn(room); }
}

// ---------- มุมมอง
function cpView(room, seat) {
  const c = room.c || {}, over = room.phase !== 'playing';
  const wait = cpWaiting(room);
  const v = {
    t: 'state', game: 'coup', locked: !!room.password, password: seat.id === room.hostId ? room.password : undefined,
    code: room.code, phase: room.phase, round: room.round, host: room.hostId, me: seat.id, settings: room.settings,
    cur: room.phase === 'playing' ? c.turn : null, winner: room.winner, dir: room.phase === 'playing' && c.dir ? c.dir : (room.settings.dir === -1 ? -1 : 1),
    players: room.players.map((p) => ({
      id: p.id, name: p.name, nc: p.nc || '', av: p.av, online: p.isBot || isOnline(p), bot: p.isBot && !p.left, left: !!p.left, wins: p.wins, coins: p.coins || 0, bub: (c.bub && c.bub[p.id]) || '',
      alive: p.cards && p.cards.length ? cpIsAlive(p) : true,
      cards: (p.cards || []).map((x) => ({ ch: p === seat || over ? x.ch : null, dead: x.dead })),
    })),
    paused: !!room.paused,
    timerLeft: room.phase === 'playing' ? (room.paused ? room.pausedLeft : Math.max(0, room.timerEnd - Date.now())) : 0, timerTotal: room.timerTotal || CP_MS,
  };
  if (c.log) v.log = c.log.slice(-5);
  if (room.phase === 'playing' && c.phase) {
    v.step = { phase: c.phase, act: c.act ? { type: c.act.type, actor: c.act.actor, target: c.act.target, claim: c.act.claim } : null, blk: c.blk || null, wait, mine: wait.includes(seat.id), deckN: c.deck.length };
    if (c.phase === 'swap' && c.swap.id === seat.id) v.step.swap = { opts: c.swap.opts, k: c.swap.k };
  }
  return v;
}

// ---------------------------------------------------------------- message handling
function handle(ses, msg) {
  if (!msg || typeof msg.t !== 'string') return;
  const room = ses.room ? rooms.get(ses.room) : null;
  const seat = room ? seatById(room, ses.id) : null;
  const err = (text) => send(ses.ws, { t: 'err', text });
  const touch = () => { if (seat && (seat.auto || seat.afk)) { seat.auto = false; seat.afk = 0; } };

  switch (msg.t) {
    case 'name': {
      const n = cleanName(msg.name); if (!n) return err('ใส่ชื่อก่อนนะ');
      if (!room) { ses.name = n; ses.nc = parseName(msg.name).c; send(ses.ws, { t: 'welcome', id: ses.id, name: ses.name }); }
      return;
    }
    case 'create': {
      if (room) return err('คุณอยู่ในห้องอยู่แล้ว');
      const n = cleanName(msg.name || ses.name); if (!n) return err('ใส่ชื่อก่อนนะ');
      ses.name = n; ses.nc = parseName(msg.name || '').c || (msg.name ? '' : ses.nc);
      const code = newCode();
      const r = newRoom(code, ses.id, msg.game);
      r.password = cleanPw(msg.password);
      rooms.set(code, r);
      { const s0 = makeSeat(ses.id, n, false, msg.av, ses.nc); r.players.push(s0); hxAssign(r, s0); }
      ses.room = code;
      say(r, `ห้อง ${code} ถูกสร้างโดย ${n}`);
      sendRoomInit(ses, r);
      broadcastRooms();
      return;
    }
    case 'join': {
      if (room) return err('คุณอยู่ในห้องอยู่แล้ว');
      const n = cleanName(msg.name || ses.name); if (!n) return err('ใส่ชื่อก่อนนะ');
      ses.name = n; ses.nc = parseName(msg.name || '').c || (msg.name ? '' : ses.nc);
      const r = rooms.get(String(msg.code || '').toUpperCase().trim());
      if (!r) return err('ไม่พบห้องนี้ ลองเช็กรหัสอีกครั้ง');
      if (r.password) {
        const given = cleanPw(msg.password);
        if (given !== r.password) return send(ses.ws, { t: 'err', text: given ? 'รหัสผ่านห้องไม่ถูกต้อง' : 'ห้องนี้ล็อกอยู่ ใส่รหัสผ่านก่อนนะ', pw: r.code });
      }
      if (r.players.length >= roomMax(r)) return err('ห้องเต็มแล้ว');
      if (r.phase === 'playing') return err('ห้องนี้กำลังเล่นอยู่ รอจบรอบก่อนนะ');
      const s = makeSeat(ses.id, uniqueName(r, n), false, msg.av, ses.nc);
      r.players.push(s); hxAssign(r, s); ses.room = r.code;
      say(r, `${s.name} เข้าห้อง`);
      sendRoomInit(ses, r);
      pushState(r);
      broadcastRooms();
      return;
    }
    case 'leave': return leaveRoom(ses);
    case 'addBot': {
      if (!room || room.hostId !== ses.id) return err('เฉพาะหัวห้องเท่านั้น');
      if (room.phase === 'playing') return err('กำลังเล่นอยู่');
      if (room.players.length >= roomMax(room)) return err('ห้องเต็มแล้ว');
      const used = new Set(room.players.map((p) => p.name));
      const free = BOT_NAMES.filter((x) => !used.has(x));
      const name = free.length ? free[rnd(free.length)] : `บอท${idCounter}`;
      { const bs = makeSeat('bot' + (idCounter++), name, true); room.players.push(bs); hxAssign(room, bs); }
      say(room, `เพิ่ม ${name}`);
      pushState(room); broadcastRooms();
      return;
    }
    case 'kick': {
      if (!room || room.hostId !== ses.id) return err('เฉพาะหัวห้องเท่านั้น');
      const t = seatById(room, msg.id);
      if (!t || t.id === ses.id) return;
      const ts = byId.get(t.id);
      say(room, `${t.name} ถูกเชิญออกจากห้อง`);
      removeSeat(room, t);
      if (ts) { ts.room = null; send(ts.ws, { t: 'kicked' }); sendHome(ts); }
      if (room.phase === 'playing') tick(room); else pushState(room);
      broadcastRooms();
      return;
    }
    case 'set': {
      if (!room || room.hostId !== ses.id) return err('เฉพาะหัวห้องเท่านั้น');
      if (room.phase === 'playing') return err('ตั้งค่าตอนกำลังเล่นไม่ได้');
      if (typeof msg.peek === 'boolean') room.settings.peek = msg.peek;
      if (typeof msg.password === 'string') room.password = cleanPw(msg.password);
      if (Number.isInteger(msg.hand) && msg.hand >= 1 && msg.hand <= 30) room.settings.hand = msg.hand;
      if (msg.dir === 1 || msg.dir === -1) room.settings.dir = msg.dir;
      if (msg.mode === 'flip' || msg.mode === 'classic') room.settings.mode = msg.mode;
      if (Number.isInteger(msg.tsize) && msg.tsize >= 1 && msg.tsize <= 5) room.settings.tsize = msg.tsize;
      if (msg.ball === 's' || msg.ball === 'b') room.settings.ball = msg.ball;
      if ([1, 2, 3, 5].includes(msg.mins)) room.settings.mins = msg.mins;
      if (msg.ww) wwSettings(room.settings.ww, msg.ww);
      if (Number.isInteger(msg.unoPenalty) && msg.unoPenalty >= 1 && msg.unoPenalty <= 100) room.settings.unoPenalty = msg.unoPenalty;
      broadcastRooms();
      pushState(room);
      return;
    }
    case 'start': {
      if (!room || room.hostId !== ses.id) return err('เฉพาะหัวห้องเท่านั้น');
      if (room.phase === 'playing') return;
      if (room.game === 'haxball') { const e = hxStart(room); if (e) return err(e); return; }
      if (room.game === 'ww') { if (room.players.length < 1) return; const e = wwStart(room); if (e) return err(e); return; }
      if (room.game === 'coup') { if (room.players.length < 2) return err('ต้องมีผู้เล่นอย่างน้อย 2 คน (เพิ่มบอทได้)'); return cpStart(room); }
      if (room.players.length < 2) return err('ต้องมีผู้เล่นอย่างน้อย 2 คน (เพิ่มบอทได้)');
      { const deckN = room.settings.mode === 'classic' ? 108 : 112;
        if (room.players.length * room.settings.hand > deckN - 8) return err(`การ์ดไม่พอแจก (${room.players.length} คน × ${room.settings.hand} ใบ) ลดจำนวนใบเริ่มต้นลงหน่อยนะ`); }
      startRound(room);
      return;
    }
    case 'pause': case 'resume': {
      if (room && room.game === 'haxball') {
        if (!seat || room.phase !== 'playing' || room.hostId !== seat.id) return;
        if (msg.t === 'pause' && !room.paused) { room.paused = true; say(room, `${seat.name} หยุดเกมชั่วคราว`); pushState(room); }
        else if (msg.t === 'resume' && room.paused) { room.paused = false; room.hx.last = Date.now(); say(room, `${seat.name} เล่นต่อ`); pushState(room); }
        return;
      }
      if (room && room.game === 'ww') {
        if (!seat || room.phase !== 'playing' || room.hostId !== seat.id || !room.ww) return;
        if (msg.t === 'pause' && !room.paused) { room.ww.left = Math.max(500, room.ww.end - Date.now()); room.paused = true; wwClear(room); say(room, `${seat.name} หยุดเกมชั่วคราว`); pushState(room); }
        else if (msg.t === 'resume' && room.paused) {
          room.paused = false; const W = room.ww; W.end = Date.now() + W.left; const stg = W.stage; W.T.push(setTimeout(() => wwTimeout(room, stg), W.left));
          wwBots(room, stg); say(room, `${seat.name} เล่นต่อ`); pushState(room);
        }
        return;
      }
      if (room && room.game === 'coup') {
        if (!seat || room.phase !== 'playing' || room.hostId !== seat.id) return;
        if (msg.t === 'pause' && !room.paused) {
          room.pausedLeft = Math.max(1000, room.timerEnd - Date.now()); room.paused = true;
          clearTimeout(room.timer); clearTimeout(room.botTimer);
          say(room, `${seat.name} หยุดเกมชั่วคราว`); pushState(room);
        } else if (msg.t === 'resume' && room.paused) {
          room.paused = false; say(room, `${seat.name} เล่นต่อ`);
          cpTick(room); clearTimeout(room.timer);
          room.timerEnd = Date.now() + room.pausedLeft; room.timerTotal = CP_MS;
          room.timer = setTimeout(() => cpTimeout(room), room.pausedLeft); pushState(room);
        }
        return;
      }
      if (!room || !seat || room.phase !== 'playing' || room.hostId !== seat.id) return;
      if (msg.t === 'pause' && !room.paused) {
        room.pausedLeft = Math.max(1000, room.timerEnd - Date.now());
        room.paused = true;
        clearTimeout(room.timer); clearTimeout(room.botTimer); clearTimeout(room.comboTimer);
        if (room.combo) { finalizeCombo(room); }
        say(room, `${seat.name} หยุดเกมชั่วคราว`);
        pushState(room);
      } else if (msg.t === 'resume' && room.paused) {
        room.paused = false;
        say(room, `${seat.name} เล่นต่อ`);
        armTimer(room); room.timerEnd = Date.now() + room.pausedLeft; clearTimeout(room.timer);
        room.timer = setTimeout(() => onTimeout(room), room.pausedLeft);
        pushState(room); scheduleBot(room);
      }
      return;
    }
    case 'hx_in': {
      if (!room || !seat || room.game !== 'haxball') return;
      seat.k = Number(msg.k) | 0; return;
    }
    case 'hx_team': {
      if (!room || !seat || room.game !== 'haxball' || room.phase === 'playing') return;
      const tgt = msg.id && room.hostId === ses.id ? seatById(room, msg.id) : seat;
      if (!tgt || (msg.team !== 'R' && msg.team !== 'B')) return;
      tgt.team = msg.team; pushState(room); return;
    }
    case 'w_act': {
      if (!room || !seat || room.game !== 'ww') return;
      const e = wwHandle(room, seat, msg);
      if (e) return err(e);
      return;
    }
    case 'c_act': case 'c_resp': case 'c_pick': {
      if (!room || !seat || room.game !== 'coup') return;
      const e = cpHandle(room, seat, msg);
      if (e) return err(e);
      return;
    }
    case 'play': case 'draw': case 'pass': case 'uno': case 'catch': case 'challenge': {
      if (!room || !seat) return;
      if (room.paused) return err('เกมหยุดชั่วคราวอยู่');
      touch();
      let e = null;
      if (msg.t === 'play') e = tryPlay(room, seat, Number(msg.card), msg.color, msg.more);
      else if (msg.t === 'draw') e = doDraw(room, seat);
      else if (msg.t === 'pass') e = doPass(room, seat);
      else if (msg.t === 'uno') e = doUno(room, seat);
      else if (msg.t === 'catch') e = doCatch(room, seat);
      else if (msg.t === 'challenge') e = doResolve(room, seat, !!msg.yes);
      if (e) err(e);
      if (room.phase === 'playing' || room.phase === 'ended') tick(room);
      return;
    }
    case 'chat': {
      const text = cleanText(msg.text); if (!text) return;
      const now = Date.now();
      if (now - (ses.lastChat || 0) < 400) return;
      ses.lastChat = now;
      touch();
      const m = { n: seat ? seat.name : ses.name, nc: seat ? seat.nc : ses.nc, id: ses.id, x: text, ts: now };
      if (room && room.game === 'ww' && room.phase === 'playing' && room.ww && seat) {
        const night = room.ww.stage.startsWith('night');
        if (seat.alive === false) { m.dead = 1; toSome(room, (p) => p.alive === false, { t: 'chat', ch: room.code, m }); return; }
        if (night) {
          if (!wwW(seat)) return err('ตอนกลางคืนห้ามคุย');
          m.w = 1; toSome(room, (p) => p.alive === false || wwW(p), { t: 'chat', ch: room.code, m }); return;
        }
        if (room.ww.silenced === seat.id) return err('คุณถูกปิดปากวันนี้ พูดไม่ได้');
      }
      if (room) { room.chat.push(m); if (room.chat.length > 150) room.chat.shift(); toRoom(room, { t: 'chat', ch: room.code, m }); }
      else {
        lobbyChat.push(m); if (lobbyChat.length > 100) lobbyChat.shift();
        for (const s of sessions.values()) if (!s.room && s.ws) send(s.ws, { t: 'chat', ch: 'lobby', m });
      }
      return;
    }
    default: return;
  }
}

// ---------------------------------------------------------------- http + ws
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
wss.on('connection', (ws) => {
  let ses = null;
  let count = 0, winStart = Date.now();
  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - winStart > 1000) { winStart = now; count = 0; }
    if (++count > 30) return;
    let msg; try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    try {
      if (!ses) {
        if (msg.t !== 'hello') return;
        const token = String(msg.token || '');
        if (token.length < 8 || token.length > 80) return;
        ses = sessions.get(token);
        if (ses) { if (ses.ws && ses.ws !== ws) { try { ses.ws.close(); } catch (e) { /* */ } } ses.ws = ws; }
        else { ses = { id: 'u' + (idCounter++), token, name: '', ws, room: null, lastChat: 0 }; sessions.set(token, ses); byId.set(ses.id, ses); }
        const n = cleanName(msg.name); if (n && !ses.room) { ses.name = n; ses.nc = parseName(msg.name).c; }
        ses.lastSeen = now;
        send(ws, { t: 'welcome', id: ses.id, name: ses.name, lan: lanUrls() });
        const room = ses.room ? rooms.get(ses.room) : null;
        if (room && seatById(room, ses.id)) { sendRoomInit(ses, room); pushState(room); if (room.phase === 'playing') armTimer(room); }
        else { ses.room = null; sendHome(ses); }
        return;
      }
      handle(ses, msg);
    } catch (e) { console.error('handler error', e); }
  });
  ws.on('close', () => {
    if (!ses || ses.ws !== ws) return;
    ses.ws = null; ses.lastSeen = Date.now();
    const room = ses.room ? rooms.get(ses.room) : null;
    if (room) {
      const seat = seatById(room, ses.id);
      pushState(room);
      if (seat && room.phase !== 'playing') {
        setTimeout(() => { if (ses.ws || ses.room !== room.code || !rooms.has(room.code)) return; leaveRoom(ses, 'หลุดการเชื่อมต่อ'); }, 20000);
      } else if (seat && room.phase === 'playing') { armTimer(room); }
    }
  });
  ws.on('error', () => { /* ignore */ });
});

// ================================================================ HAXBALL
const HX_STEP = 1000 / 60;
const HX = { PR: 15, ACC: 0.27, DAMP_P: 0.91, DAMP_B: 0.985, KICK: 6.0, KICK_REACH: 4, E_WALL_B: 0.55, E_WALL_P: 0.1, E_PB: 0.5, E_PP: 0.3, GD: 40 };
const hxBallR = (room) => (room.settings.ball === 'b' ? 17 : 9);
const hxBallM = (room) => (room.settings.ball === 'b' ? 1.6 : 0.75);
function hxField(n, brad) {
  n = Math.max(1, Math.min(5, n | 0 || 2));
  const W = 520 + 200 * (n - 1), H = 280 + 70 * (n - 1), GH = Math.max(110, 104 + 16 * (n - 1) + (brad > 12 ? 14 : 0));
  return { W, H, GH, D: HX.GD, gy0: (H - GH) / 2, gy1: (H + GH) / 2, cr: n === 1 ? 45 : 60 };
}
function hxSegs(f) {
  const { W, H, D, gy0, gy1 } = f;
  return [
    [0, 0, W, 0], [0, H, W, H],
    [0, 0, 0, gy0], [0, gy1, 0, H], [W, 0, W, gy0], [W, gy1, W, H],
    [-D, gy0, 0, gy0], [-D, gy1, 0, gy1], [-D, gy0, -D, gy1],
    [W, gy0, W + D, gy0], [W, gy1, W + D, gy1], [W + D, gy0, W + D, gy1],
  ];
}
function hxAssign(room, seat) {
  if (room.game !== 'haxball') return;
  const r = room.players.filter((p) => p !== seat && p.team === 'R').length, b = room.players.filter((p) => p !== seat && p.team === 'B').length;
  seat.team = r <= b ? 'R' : 'B';
}
function hxTeamName(t) { return t === 'R' ? 'ทีมแดง' : 'ทีมน้ำเงิน'; }
function hxView(room, me) {
  const hx = room.hx, S = room.settings;
  const fld = hx ? hx.f : hxField(S.tsize, hxBallR(room));
  return {
    t: 'state', game: 'haxball', code: room.code, phase: room.phase, host: room.hostId, me: me ? me.id : null, round: room.round, paused: !!room.paused,
    password: room.hostId === (me && me.id) ? room.password : undefined, locked: !!room.password,
    players: (hx && room.phase !== 'lobby' ? hx.order.map((id) => seatById(room, id)).filter(Boolean) : room.players).map((p) => ({ id: p.id, name: p.name, nc: p.nc || '', av: p.av, team: p.team || 'R', bot: !!p.isBot && !p.left, left: !!p.left, online: p.isBot || isOnline(p), wins: p.wins || 0 })),
    settings: { tsize: S.tsize, ball: S.ball, mins: S.mins },
    field: { W: fld.W, H: fld.H, GH: fld.GH, D: fld.D, gy0: fld.gy0, gy1: fld.gy1, cr: fld.cr, br: hxBallR(room), pr: HX.PR },
    score: hx ? hx.score : { R: 0, B: 0 }, winner: hx ? hx.winner : null, golden: !!(hx && hx.golden), ph: hx ? hx.ph : 'lobby', tm: hx ? Math.max(0, Math.round(hx.rem)) : S.mins * 60000,
  };
}
function hxStart(room) {
  const S = room.settings;
  const cnt = (t) => room.players.filter((p) => p.team === t).length;
  for (const t of ['R', 'B']) if (cnt(t) > S.tsize) return `${hxTeamName(t)}มีคนเกิน ${S.tsize} คน (ย้ายทีมหรือเอาบอทออก)`;
  for (const t of ['R', 'B']) {
    while (cnt(t) < S.tsize) {
      const used = new Set(room.players.map((p) => p.name));
      const free = BOT_NAMES.filter((x) => !used.has(x));
      const name = free.length ? free[rnd(free.length)] : `บอท${idCounter}`;
      const s = makeSeat('bot' + (idCounter++), name, true); s.team = t; room.players.push(s);
    }
  }
  room.round++; room.phase = 'playing'; room.paused = false;
  const brad = hxBallR(room), f = hxField(S.tsize, brad);
  const order = [];
  for (const t of ['R', 'B']) room.players.filter((p) => p.team === t).forEach((p) => order.push(p));
  const hx = room.hx = {
    f, segs: hxSegs(f), br: brad, bm: hxBallM(room), score: { R: 0, B: 0 }, rem: S.mins * 60000, golden: false, ph: 'count', phT: 3000, winner: null, last: 0, seq: 0, tickN: 0,
    ball: { x: f.W / 2, y: f.H / 2, vx: 0, vy: 0, last: null },
    ko: 'R', koUntil: 0,
    order: order.map((p) => p.id), ps: order.map((p) => ({ id: p.id, team: p.team, x: 0, y: 0, vx: 0, vy: 0, k: 0, kq: 0, kf: 0, ax: 0, ay: 0, prevK: 0 })), kickoff: 'R',
  };
  hxPlace(room);
  for (const p of room.players) p.k = 0;
  say(room, `เริ่มแมตช์ ${S.tsize} vs ${S.tsize} (${S.mins} นาที)`);
  emit(room, { k: 'hx_start' });
  clearInterval(room.hxTimer); hx.last = Date.now();
  room.hxTimer = setInterval(() => hxLoop(room), HX_STEP);
  pushState(room); broadcastRooms();
  return null;
}
function hxPlace(room) {
  const hx = room.hx, { W, H } = hx.f;
  hx.ball.x = W / 2; hx.ball.y = H / 2; hx.ball.vx = hx.ball.vy = 0; hx.ball.last = null;
  for (const t of ['R', 'B']) {
    const mine = hx.ps.filter((p) => p.team === t), n = mine.length;
    mine.forEach((p, i) => {
      const side = t === 'R' ? -1 : 1;
      p.x = W / 2 + side * (hx.f.cr + 22 + (i % 2) * 50 + (n > 3 ? (i % 3) * 20 : 0));
      p.y = H * (i + 1) / (n + 1); p.vx = p.vy = 0; p.kq = 0; p.kf = 0;
    });
  }
}
function hxCircleSeg(c, r, seg, e, mass) {
  const [x1, y1, x2, y2] = seg, dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
  let t = L2 ? ((c.x - x1) * dx + (c.y - y1) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t, py = y1 + dy * t; let nx = c.x - px, ny = c.y - py; const d = Math.hypot(nx, ny);
  if (d >= r || d === 0) return;
  nx /= d; ny /= d; c.x = px + nx * r; c.y = py + ny * r;
  const vn = c.vx * nx + c.vy * ny;
  if (vn < 0) { c.vx -= (1 + e) * vn * nx; c.vy -= (1 + e) * vn * ny; }
}
function hxCircles(a, ra, ma, b, rb, mb, e) {
  let nx = b.x - a.x, ny = b.y - a.y; const d = Math.hypot(nx, ny), R = ra + rb;
  if (d >= R || d === 0) return false;
  nx /= d; ny /= d;
  const ia = 1 / ma, ib = 1 / mb, pen = R - d;
  a.x -= nx * pen * ia / (ia + ib); a.y -= ny * pen * ia / (ia + ib); b.x += nx * pen * ib / (ia + ib); b.y += ny * pen * ib / (ia + ib);
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) { const j = -(1 + e) * rv / (ia + ib); a.vx -= j * ia * nx; a.vy -= j * ia * ny; b.vx += j * ib * nx; b.vy += j * ib * ny; }
  return true;
}
function hxBots(room) {
  const hx = room.hx, { W, H, gy0, gy1 } = hx.f, ball = hx.ball, T = hx.tickN;
  const bsp = Math.hypot(ball.vx, ball.vy);
  const kickoffHold = hx.ko && T < hx.koUntil && bsp < 0.6; // ช่วงเริ่มเตะ: ทีมที่ไม่ได้เตะรอก่อน
  for (const t of ['R', 'B']) {
    const mine = hx.ps.filter((p) => p.team === t), n = mine.length, dirX = t === 'R' ? 1 : -1, ownX = t === 'R' ? 0 : W, oppX = t === 'R' ? W : 0;
    let chaser = null, second = null, best = 1e9, best2 = 1e9;
    for (const p of mine) { const d = Math.hypot(ball.x - p.x, ball.y - p.y); if (d < best) { second = chaser; best2 = best; best = d; chaser = p; } else if (d < best2) { best2 = d; second = p; } }
    mine.forEach((p, i) => {
      const seat = seatById(room, p.id); if (!seat || !seat.isBot) return;
      p.kc = (p.kc || 0) - 4;
      let tx, ty, kick = false;
      const toBall = Math.hypot(ball.x - p.x, ball.y - p.y), reach = HX.PR + hx.br + HX.KICK_REACH - 1;
      const keeper = n >= 2 && i === 0 && p !== chaser;
      if (kickoffHold && hx.ko !== t) {
        tx = ownX + dirX * (W / 2 - hx.f.cr - 30 - (i % 2) * 40); ty = H * (i + 1) / (n + 1);
      } else if (keeper) {
        tx = ownX + dirX * 36; ty = Math.max(gy0 + 8, Math.min(gy1 - 8, ball.y));
        if (Math.abs(ball.x - ownX) < W * 0.3 && toBall < 100) { tx = ball.x - dirX * 6; ty = ball.y; }
        if (toBall < reach + 3 && dirX * (ball.x - p.x) > -2) kick = true;
      } else if (p === chaser) {
        const wob = Math.sin(T / 70 + i * 2.1 + (t === 'R' ? 0 : 1.3)) * (gy1 - gy0) * 0.32;
        let gdx = oppX - ball.x, gdy = H / 2 + wob - ball.y; const gl = Math.hypot(gdx, gdy) || 1; gdx /= gl; gdy /= gl;
        const pb = (p.x - ball.x) * gdx + (p.y - ball.y) * gdy;
        const bx = ball.x - gdx * (hx.br + HX.PR + 2), by = ball.y - gdy * (hx.br + HX.PR + 2);
        if (toBall < reach + 4 && bsp < 0.5) p.st = (p.st || 0) + 1; else p.st = Math.max(0, (p.st || 0) - 1);
        if (p.st > 8 + (i * 5 + (t === 'R' ? 0 : 3)) % 7) { p.st = 0; p.back = 10 + Math.floor(Math.random() * 8); p.bs = Math.random() < 0.5 ? 1 : -1; }
        if (p.back > 0) { p.back--; const px2 = -gdy, py2 = gdx; tx = ball.x - gdx * 80 + px2 * p.bs * 60; ty = ball.y - gdy * 80 + py2 * p.bs * 60; }
        else if (pb < -3) { const lat = Math.sin(T / 55 + i * 1.7) * HX.PR * 0.8; tx = ball.x + (-gdy) * lat; ty = ball.y + gdx * lat; }
        else {
          const px = -gdy, py = gdx, sg = ((p.x - ball.x) * px + (p.y - ball.y) * py) >= 0 ? 1 : -1;
          tx = bx + px * sg * (toBall < 70 ? 46 : 0); ty = by + py * sg * (toBall < 70 ? 46 : 0);
        }
        if (toBall < reach + 2 && pb < 2) kick = true;
      } else if (n >= 4 && p === second && dirX * (ball.x - ownX) > W * 0.3) {
        // ตัวรองเข้าประกบ/ซัพพอร์ตด้านข้างลูก เพื่อเพิ่มการบุก
        const sg = (i % 2) ? 1 : -1; tx = ball.x + dirX * 30; ty = ball.y + sg * 38;
        if (toBall < reach + 2 && dirX * (ball.x - p.x) > 0) kick = true;
      } else {
        const lane = i / Math.max(1, n - 1);               // 0 = ตั้งรับ ... 1 = ตัวบุก
        const adv = (ball.x - W / 2) * dirX / (W / 2);      // บอลอยู่ฝั่งไหน -1..1
        const fx = 0.12 + 0.36 * lane + 0.2 * adv;           // ระยะจากประตูตัวเอง (สัดส่วนสนาม)
        tx = ownX + dirX * W * Math.max(0.08, Math.min(0.85, fx));
        ty = H * (i + 1) / (n + 1) * 0.55 + ball.y * 0.45;
        if (toBall < reach + 2 && dirX * (ball.x - p.x) > 0) kick = true;
      }
      const dx = tx - p.x, dy = ty - p.y, dl = Math.hypot(dx, dy);
      if (dl > 5) { p.ax = dx / dl * 0.95; p.ay = dy / dl * 0.95; } else { p.ax = 0; p.ay = 0; }
      if (kick && p.kc <= 0) { p.kq = 6; p.kc = 14; }
    });
  }
}
function hxLoop(room) {
  const hx = room.hx;
  if (!hx || room.phase !== 'playing') { clearInterval(room.hxTimer); return; }
  const now = Date.now();
  if (room.paused) { hx.last = now; hx.seq++; if (hx.tickN++ % 15 === 0) hxSnap(room); return; }
  let steps = Math.floor((now - hx.last) / HX_STEP); if (steps < 1) return; steps = Math.min(steps, 4); hx.last += steps * HX_STEP;
  for (let s = 0; s < steps; s++) hxStep(room);
  hx.seq++; if (room.phase === 'playing') hxSnap(room);
}
function hxSnap(room) {
  const hx = room.hx, b = hx.ball, r1 = (v) => Math.round(v * 10) / 10;
  toRoom(room, { t: 'hxs', n: hx.seq, tm: Math.round(hx.rem), ph: hx.ph, sc: [hx.score.R, hx.score.B], g: hx.golden ? 1 : 0, b: [r1(b.x), r1(b.y)], p: hx.ps.map((p) => [r1(p.x), r1(p.y), p.kf > 0 ? 1 : 0]) });
}
function hxEnd(room, winner) {
  const hx = room.hx; hx.winner = winner; hx.ph = 'over'; room.phase = 'ended';
  clearInterval(room.hxTimer);
  for (const p of room.players) if (!p.isBot && winner !== 'D' && p.team === winner) p.wins = (p.wins || 0) + 1;
  say(room, winner === 'D' ? `จบแมตช์ เสมอ ${hx.score.R}-${hx.score.B}` : `${hxTeamName(winner)} ชนะ ${hx.score.R}-${hx.score.B}`);
  emit(room, { k: 'hx_end', w: winner });
  pushState(room); broadcastRooms();
}
function hxStep(room) {
  const hx = room.hx, f = hx.f, ball = hx.ball; hx.tickN++;
  if (hx.ph === 'count') { hx.phT -= HX_STEP; if (hx.phT <= 0) { hx.ph = 'play'; hx.phT = 0; hx.koUntil = hx.tickN + 150; emit(room, { k: 'hx_go' }); pushState(room); } return; }
  if (hx.ph === 'goal') {
    hx.phT -= HX_STEP;
    ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.94; ball.vy *= 0.94;
    if (hx.phT <= 0) {
      if (hx.golden || (hx.rem <= 0 && hx.score.R !== hx.score.B)) { hxEnd(room, hx.score.R > hx.score.B ? 'R' : 'B'); return; }
      hxPlace(room); hx.ph = 'count'; hx.phT = 1400; pushState(room);
    }
    return;
  }
  // ---- play
  hx.rem -= HX_STEP;
  if (hx.rem <= 0 && !hx.golden) {
    if (hx.score.R !== hx.score.B) { hxEnd(room, hx.score.R > hx.score.B ? 'R' : 'B'); return; }
    hx.golden = true; hx.rem = 0; hx.gl = 60000; say(room, 'เสมอ! ต่อเวลา 1 นาที ประตูทองคำ'); emit(room, { k: 'hx_golden' }); pushState(room);
  }
  if (hx.golden) { hx.gl -= HX_STEP; if (hx.gl <= 0) { hxEnd(room, 'D'); return; } }
  if (hx.tickN % 4 === 0) hxBots(room);
  for (const p of hx.ps) {
    const seat = seatById(room, p.id); if (!seat) continue;
    let ax = p.ax, ay = p.ay;
    if (!seat.isBot) {
      const k = seat.k | 0; ax = ((k & 8) ? 1 : 0) - ((k & 4) ? 1 : 0); ay = ((k & 2) ? 1 : 0) - ((k & 1) ? 1 : 0);
      const l = Math.hypot(ax, ay); if (l > 1) { ax /= l; ay /= l; }
      const kk = (k & 16) ? 1 : 0; if (kk && !p.prevK) p.kq = 8; p.prevK = kk;
    }
    p.vx = (p.vx + ax * HX.ACC) * HX.DAMP_P; p.vy = (p.vy + ay * HX.ACC) * HX.DAMP_P;
    p.x += p.vx; p.y += p.vy;
    if (p.kf > 0) p.kf--;
  }
  ball.vx *= HX.DAMP_B; ball.vy *= HX.DAMP_B; ball.x += ball.vx; ball.y += ball.vy;
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < hx.ps.length; i++) for (let j = i + 1; j < hx.ps.length; j++) hxCircles(hx.ps[i], HX.PR, 2, hx.ps[j], HX.PR, 2, HX.E_PP);
    for (const p of hx.ps) { if (hxCircles(p, HX.PR, 2, ball, hx.br, hx.bm, HX.E_PB)) ball.last = p.id; }
    for (const sg of hx.segs) { for (const p of hx.ps) hxCircleSeg(p, HX.PR, sg, HX.E_WALL_P); hxCircleSeg(ball, hx.br, sg, HX.E_WALL_B); }
  }
  for (const p of hx.ps) {
    if (p.kq > 0) {
      p.kq--;
      const dx = ball.x - p.x, dy = ball.y - p.y, d = Math.hypot(dx, dy);
      if (d <= HX.PR + hx.br + HX.KICK_REACH && d > 0) {
        const nx = dx / d, ny = dy / d; ball.vx += nx * HX.KICK; ball.vy += ny * HX.KICK; ball.last = p.id; p.kq = 0; p.kf = 8;
        p.vx -= nx * 0.35; p.vy -= ny * 0.35;
        const sp = Math.hypot(ball.vx, ball.vy); if (sp > 9.5) { ball.vx *= 9.5 / sp; ball.vy *= 9.5 / sp; }
      }
    }
  }
  // ---- goal
  if (ball.x < -hx.br - 1 || ball.x > f.W + hx.br + 1) {
    const by = ball.x < 0 ? 'B' : 'R'; // ลูกเข้าประตูซ้าย = น้ำเงินได้แต้ม
    hx.score[by]++;
    const sc = ball.last ? seatById(room, ball.last) : null, scp = sc ? hx.ps.find((p) => p.id === sc.id) : null;
    const own = scp && scp.team !== by;
    say(room, `ประตู! ${own ? 'เข้าประตูตัวเอง ' : ''}${sc ? sc.name : ''} — ${hx.score.R}:${hx.score.B}`);
    emit(room, { k: 'hx_goal', by });
    hx.ko = by === 'R' ? 'B' : 'R'; hx.ph = 'goal'; hx.phT = 2200; pushState(room);
  }
}
function hxDrop(room, seat) {
  seat.isBot = true; seat.left = true; seat.k = 0;
  if (room.hostId === seat.id) {
    const nh = room.players.find((p) => !p.isBot);
    room.hostId = nh ? nh.id : room.hostId;
    if (nh) say(room, `${nh.name} เป็นหัวห้องคนใหม่`);
  }
}

// ================================================================ WEREWOLF (เกมหมาป่า)
const WW_ROLES = { wolf: 'หมาป่า', villager: 'ชาวบ้าน', silencer: 'ชู่ว', cupid: 'คิวปิด', bodyguard: 'บอดี้การ์ด', cub: 'ลูกหมาป่า', beggar: 'ยาจก', seer: 'หมอดู', doctor: 'หมอรักษา', hunter: 'นายพราน', witch: 'แม่มด' };
const WW_SECS = { night_cupid: 30, night_bodyguard: 25, night_wolf: 35, night_silence: 25, night_seer: 25, night_doctor: 25, night_witch: 30, hunter: 30, vote: 45, dawn: 5, result: 7 };
const WW_NIGHT = ['night_cupid', 'night_wolf', 'night_silence', 'night_seer', 'night_bodyguard'];
const WW_OPT = ['cub', 'silencer', 'cupid', 'seer', 'bodyguard', 'hunter', 'beggar'];
const wwW = (p) => p.role === 'wolf' || p.role === 'silencer' || p.role === 'cub';
const wwAlive = (room) => room.players.filter((p) => p.alive !== false);
const wwOf = (room, role) => wwAlive(room).filter((p) => p.role === role);
function wwLog(room, x, k) { const L = room.ww.log; L.push({ x, k: k || 'i' }); if (L.length > 80) L.shift(); }
function wwClear(room) { if (room.ww) { for (const t of room.ww.T) clearTimeout(t); room.ww.T = []; } }
function toSome(room, pred, obj) {
  const m = JSON.stringify(obj);
  for (const p of room.players) { if (p.isBot || !pred(p)) continue; const s = byId.get(p.id); if (s && s.ws && s.ws.readyState === 1) s.ws.send(m); }
}
function wwSettings(S, m) {
  if (!m || typeof m !== 'object') return;
  const I = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (I(m.n, 4, 12)) S.n = m.n;
  if (I(m.wolves, 1, 4)) S.wolves = m.wolves;
  for (const k of WW_OPT) if (typeof m[k] === 'boolean') S[k] = m[k];
  if ([30, 60, 90, 120].includes(m.day)) S.day = m.day;
}
function wwRoleList(S) {
  const r = []; for (let i = 0; i < S.wolves; i++) r.push('wolf');
  for (const k of WW_OPT) if (S[k]) r.push(k);
  while (r.length < S.n) r.push('villager');
  return r;
}
function wwStart(room) {
  room.players = room.players.filter((p) => !p.left);
  const S = room.settings.ww;
  if (room.players.length > S.n) return `ผู้เล่นในห้องมากกว่าจำนวนที่ตั้งไว้ (${S.n} คน)`;
  const roles = wwRoleList(S);
  if (roles.length > S.n) return 'บทบาทมากกว่าจำนวนผู้เล่น ลดบทบาทหรือเพิ่มจำนวนผู้เล่น';
  if ((S.wolves + (S.silencer ? 1 : 0) + (S.cub ? 1 : 0)) * 2 >= S.n) return 'หมาป่ามากเกินไป (ต้องน้อยกว่าครึ่งหนึ่งของผู้เล่น)';
  while (room.players.length < S.n) {
    const used = new Set(room.players.map((p) => p.name));
    const free = BOT_NAMES.filter((x) => !used.has(x));
    const name = free.length ? free[rnd(free.length)] : `บอท${idCounter}`;
    room.players.push(makeSeat('bot' + (idCounter++), name, true));
  }
  shuffle(roles);
  room.players.forEach((p, i) => { p.role = roles[i]; p.alive = true; p.place = 0; p.lover = null; p.beg = false; });
  room.round++; room.phase = 'playing'; room.paused = false; room.winner = null;
  room.ww = { day: 0, stage: '', end: 0, total: 0, left: 0, log: [], night: {}, lastDoc: null, lastGuard: null, potion: { heal: true, poison: true }, paired: false, cubFlag: false, dbl: false, silenced: null, seen: [], votes: {}, ready: {}, T: [], hunterQ: [], hunter: null, after: null };
  say(room, `เริ่มเกมหมาป่า ${S.n} คน`);
  wwLog(room, `เริ่มเกม ${S.n} คน · หมาป่า ${S.wolves}`, 'n');
  broadcastRooms();
  wwNight(room);
  return null;
}
function wwStage(room, stage, secs) {
  const W = room.ww; wwClear(room);
  W.stage = stage; W.total = secs * 1000; W.end = Date.now() + W.total; W.left = 0;
  W.T.push(setTimeout(() => wwTimeout(room, stage), W.total));
  wwBots(room, stage);
  pushState(room);
}
function wwTimeout(room, stage) {
  if (room.phase !== 'playing' || room.paused || !room.ww || room.ww.stage !== stage) return;
  wwFinish(room);
}
function wwNight(room) {
  const W = room.ww; W.day++; W.silenced = null; W.dbl = W.cubFlag; W.cubFlag = false; W.night = { wv: {}, victims: [], victim: null, guard: null, save: null, poison: null, heal: false, done: {} }; W.votes = {}; W.ready = {};
  wwLog(room, `คืนที่ ${W.day}`, 'n');
  wwNextNight(room, 0);
}
function wwStepActive(room, st) {
  const W = room.ww;
  if (st === 'night_cupid') return W.day === 1 && !W.paired && wwOf(room, 'cupid').length > 0;
  if (st === 'night_wolf') return wwAlive(room).filter(wwW).length > 0;
  if (st === 'night_silence') return wwOf(room, 'silencer').length > 0;
  if (st === 'night_seer') return wwOf(room, 'seer').length > 0;
  if (st === 'night_doctor') return wwOf(room, 'doctor').length > 0;
  if (st === 'night_bodyguard') return wwOf(room, 'bodyguard').length > 0;
  if (st === 'night_witch') return wwOf(room, 'witch').length > 0 && (W.potion.heal || W.potion.poison);
  return false;
}

function wwNextNight(room, i) {
  for (; i < WW_NIGHT.length; i++) if (wwStepActive(room, WW_NIGHT[i])) return wwStage(room, WW_NIGHT[i], WW_SECS[WW_NIGHT[i]]);
  wwDawn(room);
}
function wwStepDone(room) {
  const W = room.ww, st = W.stage, n = W.night;
  if (st === 'night_wolf') {
    const need = W.dbl ? Math.min(2, wwAlive(room).filter((p) => !wwW(p)).length) : 1;
    return wwAlive(room).filter(wwW).every((p) => (n.wv[p.id] || []).length >= need);
  }
  const R = { night_cupid: 'cupid', night_silence: 'silencer', night_seer: 'seer', night_doctor: 'doctor', night_bodyguard: 'bodyguard', night_witch: 'witch' }[st];
  if (R) return wwOf(room, R).every((p) => n.done[p.id]);
  if (st === 'vote') return wwAlive(room).filter((p) => !p.beg).every((p) => W.votes[p.id]);
  if (st === 'day') return wwAlive(room).every((p) => W.ready[p.id]);
  return false;
}

function wwFinish(room) {
  const W = room.ww, st = W.stage;
  if (st === 'night_wolf') {
    const c = {}; for (const L of Object.values(W.night.wv)) for (const id of L) c[id] = (c[id] || 0) + 1;
    const ids = shuffle(Object.keys(c)).sort((a, b) => c[b] - c[a]);
    W.night.victims = ids.slice(0, W.dbl ? 2 : 1); W.night.victim = W.night.victims[0] || null;
  }
  if (WW_NIGHT.includes(st)) return wwNextNight(room, WW_NIGHT.indexOf(st) + 1);
  if (st === 'dawn') return wwAfterDeaths(room, () => wwDay(room));
  if (st === 'day') { W.votes = {}; wwLog(room, 'เริ่มโหวตประหาร', 'd'); return wwStage(room, 'vote', WW_SECS.vote); }
  if (st === 'vote') return wwTally(room);
  if (st === 'result') return wwAfterDeaths(room, () => wwNight(room));
  if (st === 'hunter') { W.hunter = null; return wwAfterDeaths(room, W.after); }
}
function wwKill(room, seat, why) {
  if (seat.alive === false) return;
  seat.alive = false;
  wwLog(room, `${seat.name} ${why} — เป็น${WW_ROLES[seat.role]}`, 'k');
  emit(room, { k: 'ww_die', id: seat.id });
  if (seat.role === 'hunter') room.ww.hunterQ.push(seat.id);
  if (seat.role === 'cub') room.ww.cubFlag = true;
  if (seat.lover) { const q = seatById(room, seat.lover); if (q && q.alive !== false) wwKill(room, q, 'ตรอมใจตายตามคู่รัก'); }
}

function wwAfterDeaths(room, next) {
  const W = room.ww;
  if (W.hunterQ.length) { W.after = next; W.hunter = W.hunterQ.shift(); wwLog(room, 'นายพรานกำลังเลือกคนที่จะยิง', 'i'); return wwStage(room, 'hunter', WW_SECS.hunter); }
  if (wwCheckWin(room)) return;
  next();
}
function wwDawn(room) {
  const W = room.ww, n = W.night, died = [];
  for (const id of n.victims || []) {
    const v = seatById(room, id); if (!v || v.alive === false) continue;
    if (n.heal === v.id || n.save === v.id || n.guard === v.id) continue;
    died.push([v, 'ถูกหมาป่ากัดตาย']);
  }
  const pz = seatById(room, n.poison);
  if (pz && pz.alive !== false && !died.some((d) => d[0] === pz)) died.push([pz, 'ถูกวางยาพิษตาย']);
  W.lastDoc = n.save || null; W.lastGuard = n.guard || null;
  W.silenced = null;
  wwLog(room, died.length ? 'รุ่งเช้า' : 'รุ่งเช้า — เมื่อคืนไม่มีใครตาย', 'd');
  for (const [p, why] of died) wwKill(room, p, why);
  say(room, died.length ? `รุ่งเช้า — ${died.map((d) => d[0].name).join(', ')} ตาย` : 'รุ่งเช้า — เมื่อคืนไม่มีใครตาย');
  const sl = seatById(room, n.silence);
  if (sl && sl.alive !== false) { W.silenced = sl.id; wwLog(room, `${sl.name} ถูกปิดปากตลอดวันนี้ (พูดไม่ได้ แต่โหวตได้)`, 'k'); say(room, `${sl.name} ถูกปิดปากตลอดวันนี้`); }
  wwStage(room, 'dawn', WW_SECS.dawn);
}

function wwDay(room) { const W = room.ww; W.ready = {}; W.votes = {}; wwLog(room, `กลางวัน วันที่ ${W.day}`, 'd'); wwStage(room, 'day', room.settings.ww.day); }
function wwTally(room) {
  const W = room.ww, c = {}, parts = [];
  for (const p of wwAlive(room)) {
    if (p.beg) continue;
    const t = W.votes[p.id];
    if (t && t !== 'skip' && seatById(room, t)) { c[t] = (c[t] || 0) + 1; parts.push(`${p.name} → ${seatById(room, t).name}`); } else parts.push(`${p.name} → งดออกเสียง`);
  }
  wwLog(room, 'ผลโหวต: ' + parts.join(' · '), 'i');
  const top = Math.max(0, ...Object.values(c)), ids = Object.keys(c).filter((k) => c[k] === top);
  if (top > 0 && ids.length === 1) {
    const t = seatById(room, ids[0]);
    if (t.role === 'beggar') { wwLog(room, `${t.name} เป็นยาจก! ถูกโหวตประหาร — ยาจกชนะคนเดียว`, 'k'); return wwEnd(room, 'B'); }
    wwKill(room, t, 'ถูกโหวตประหาร');
  } else wwLog(room, 'โหวตเสมอหรือไม่มีใครถูกเลือก — ไม่มีใครถูกประหาร', 'd');
  wwStage(room, 'result', WW_SECS.result);
}

function wwCheckWin(room) {
  const al = wwAlive(room), w = al.filter(wwW).length, o = al.length - w;
  const lov = room.players.filter((p) => p.lover);
  if (lov.length === 2 && al.length === 2 && al.every((p) => p.lover) && wwW(lov[0]) !== wwW(lov[1])) { wwEnd(room, 'L'); return true; }
  if (w === 0) { wwEnd(room, 'V'); return true; }
  if (w >= o) { wwEnd(room, 'W'); return true; }
  return false;
}

function wwEnd(room, side) {
  const W = room.ww; wwClear(room);
  room.winner = side; room.phase = 'ended'; W.stage = 'over';
  for (const p of room.players) if (!p.isBot && (side === 'B' ? p.role === 'beggar' : side === 'L' ? !!p.lover : (side === 'W') === wwW(p))) p.wins = (p.wins || 0) + 1;
  wwLog(room, side === 'W' ? 'หมาป่าชนะ!' : side === 'L' ? 'คู่รักชนะ!' : side === 'B' ? 'ยาจกชนะ!' : 'ชาวบ้านชนะ!', 'd');
  say(room, side === 'W' ? 'จบเกม — หมาป่าชนะ!' : side === 'L' ? 'จบเกม — คู่รักชนะ!' : side === 'B' ? 'จบเกม — ยาจกชนะ!' : 'จบเกม — ชาวบ้านชนะ!');
  emit(room, { k: 'ww_end', w: side });
  broadcastRooms(); pushState(room);
}
function wwHandle(room, seat, msg) {
  const W = room.ww;
  if (!W || room.phase !== 'playing') return 'ยังไม่ได้เริ่มเกม';
  if (room.paused) return 'เกมหยุดชั่วคราวอยู่';
  const st = W.stage, n = W.night, tgt = seatById(room, msg.id), live = (p) => p && p.alive !== false;
  const k = msg.kind;
  if (k === 'ready') { if (st !== 'day' || !live(seat)) return 'ทำแบบนี้ไม่ได้ตอนนี้'; W.ready[seat.id] = 1; }
  else if (k === 'vote') {
    if (st !== 'vote' || !live(seat)) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (seat.beg) return 'ยาจกเสียสิทธิ์โหวตแล้ว';
    if (msg.id !== 'skip' && (!live(tgt) || tgt === seat)) return 'เลือกเป้าหมายไม่ถูก';
    W.votes[seat.id] = msg.id === 'skip' ? 'skip' : tgt.id;
  } else if (k === 'hunter') {
    if (st !== 'hunter' || W.hunter !== seat.id) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.id !== 'skip') { if (!live(tgt) || tgt === seat) return 'เลือกเป้าหมายไม่ถูก'; wwKill(room, tgt, 'ถูกนายพรานยิงตาย'); }
    return wwFinish(room);
  } else if (k === 'wolf') {
    if (st !== 'night_wolf' || !wwW(seat) || !live(seat)) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (!live(tgt) || wwW(tgt)) return 'เลือกเป้าหมายไม่ถูก';
    if (W.dbl) { const L = (n.wv[seat.id] || []).filter((x) => x !== tgt.id); L.push(tgt.id); if (L.length > 2) L.shift(); n.wv[seat.id] = L; } else n.wv[seat.id] = [tgt.id];
  } else if (k === 'cupid') {
    if (st !== 'night_cupid' || seat.role !== 'cupid' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    const ids = Array.isArray(msg.ids) ? msg.ids : [], a = seatById(room, ids[0]), b = seatById(room, ids[1]);
    if (!live(a) || !live(b) || a === b) return 'เลือกคู่รัก 2 คน';
    a.lover = b.id; b.lover = a.id; W.paired = true; n.done[seat.id] = 1;
    wwLog(room, 'คิวปิดจับคู่รักเรียบร้อยแล้ว', 'i');
  } else if (k === 'bodyguard') {
    if (st !== 'night_bodyguard' || seat.role !== 'bodyguard' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.id !== 'skip') { if (!live(tgt)) return 'เลือกเป้าหมายไม่ถูก'; if (tgt.id === W.lastGuard) return 'ห้ามปกป้องคนเดิมสองคืนติดกัน'; n.guard = tgt.id; }
    n.done[seat.id] = 1;
  } else if (k === 'silence') {
    if (st !== 'night_silence' || seat.role !== 'silencer' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.id !== 'skip') { if (!live(tgt) || tgt === seat) return 'เลือกเป้าหมายไม่ถูก'; n.silence = tgt.id; }
    n.done[seat.id] = 1;
  } else if (k === 'seer') {
    if (st !== 'night_seer' || seat.role !== 'seer' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.id !== 'skip') { if (!live(tgt) || tgt === seat) return 'เลือกเป้าหมายไม่ถูก'; W.seen.push({ id: tgt.id, wolf: wwW(tgt) }); }
    n.done[seat.id] = 1;
  } else if (k === 'doctor') {
    if (st !== 'night_doctor' || seat.role !== 'doctor' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.id !== 'skip') { if (!live(tgt)) return 'เลือกเป้าหมายไม่ถูก'; if (tgt.id === W.lastDoc) return 'ห้ามป้องกันคนเดิมสองคืนติดกัน'; n.save = tgt.id; }
    n.done[seat.id] = 1;
  } else if (k === 'witch') {
    if (st !== 'night_witch' || seat.role !== 'witch' || !live(seat) || n.done[seat.id]) return 'ทำแบบนี้ไม่ได้ตอนนี้';
    if (msg.do === 'heal') { const hid = n.victims.length > 1 ? msg.id : n.victim; if (!W.potion.heal || !hid || !n.victims.includes(hid)) return 'เลือกเป้าหมายไม่ถูก'; W.potion.heal = false; n.heal = hid; }
    else if (msg.do === 'poison') { if (!W.potion.poison || !live(tgt) || tgt === seat) return 'เลือกเป้าหมายไม่ถูก'; W.potion.poison = false; n.poison = tgt.id; }
    n.done[seat.id] = 1;
  } else return 'ทำแบบนี้ไม่ได้';
  pushState(room);
  if (wwStepDone(room)) wwFinish(room);
  return null;
}
function wwBots(room, stage) {
  const W = room.ww, al = wwAlive(room), pick = (a) => a[rnd(a.length)];
  const go = (b, lo, hi, fn) => W.T.push(setTimeout(() => { if (room.phase !== 'playing' || room.paused || W.stage !== stage || b.alive === false) return; fn(b); }, (lo + Math.random() * (hi - lo)) * 1.9));
  const act = (b, msg) => { wwHandle(room, b, msg); };
  const bots = (role) => al.filter((p) => p.isBot && (!role || p.role === role));
  if (stage === 'night_wolf') for (const b of bots().filter(wwW)) go(b, 1500, 5000, () => { const c = shuffle(al.filter((p) => !wwW(p))); act(b, { kind: 'wolf', id: c[0].id }); if (W.dbl && c[1]) act(b, { kind: 'wolf', id: c[1].id }); });
  else if (stage === 'night_cupid') for (const b of bots('cupid')) go(b, 1500, 4000, () => { const c = shuffle(al.slice()); act(b, { kind: 'cupid', ids: [c[0].id, c[1].id] }); });
  else if (stage === 'night_bodyguard') for (const b of bots('bodyguard')) go(b, 1500, 4500, () => act(b, { kind: 'bodyguard', id: pick(al.filter((p) => p.id !== W.lastGuard)).id }));
  else if (stage === 'night_silence') for (const b of bots('silencer')) go(b, 1500, 4500, () => act(b, { kind: 'silence', id: pick(al.filter((p) => !wwW(p))).id }));
  else if (stage === 'night_seer') for (const b of bots('seer')) go(b, 1500, 4500, () => {
    const known = new Set(W.seen.map((s) => s.id)); const c = al.filter((p) => p !== b && !known.has(p.id));
    act(b, c.length ? { kind: 'seer', id: pick(c).id } : { kind: 'seer', id: 'skip' });
  });
  else if (stage === 'night_doctor') for (const b of bots('doctor')) go(b, 1500, 4500, () => act(b, { kind: 'doctor', id: pick(al.filter((p) => p.id !== W.lastDoc)).id }));
  else if (stage === 'night_witch') for (const b of bots('witch')) go(b, 2000, 5500, () => {
    const n = W.night;
    const hv = n.victims.filter((id) => id !== b.id);
    if (W.potion.heal && hv.length && Math.random() < 0.6) return act(b, { kind: 'witch', do: 'heal', id: pick(hv) });
    if (W.potion.poison && W.day >= 2 && Math.random() < 0.25) return act(b, { kind: 'witch', do: 'poison', id: pick(al.filter((p) => p !== b)).id });
    act(b, { kind: 'witch', do: 'skip' });
  });
  else if (stage === 'hunter') { const b = seatById(room, W.hunter); if (b && b.isBot) go(b, 1500, 4000, () => act(b, { kind: 'hunter', id: pick(al.filter((p) => p !== b)).id })); }
  else if (stage === 'day') for (const b of bots()) go(b, 3000, 9000, () => act(b, { kind: 'ready' }));
  else if (stage === 'vote') for (const b of bots().filter((x) => !x.beg)) go(b, 2000, 8000, () => {
    let c = al.filter((p) => p !== b);
    if (wwW(b)) c = c.filter((p) => !wwW(p));
    if (b.role === 'seer') { const w = W.seen.filter((s) => s.wolf && seatById(room, s.id) && seatById(room, s.id).alive !== false); if (w.length) c = [seatById(room, w[0].id)]; else { const inn = new Set(W.seen.map((s) => s.id)); const c2 = c.filter((p) => !inn.has(p.id)); if (c2.length) c = c2; } }
    act(b, Math.random() < 0.08 ? { kind: 'vote', id: 'skip' } : { kind: 'vote', id: pick(c).id });
  });
}
function wwAct(room, me) {
  const W = room.ww, st = W.stage, n = W.night || {}, al = wwAlive(room), live = me.alive !== false;
  if (!live && st !== 'hunter') return null;
  const ids = (f) => al.filter(f).map((p) => p.id);
  if (st === 'night_cupid' && me.role === 'cupid') return { kind: 'cupid', targets: ids(() => true), done: !!n.done[me.id] };
  if (st === 'night_bodyguard' && me.role === 'bodyguard') return { kind: 'bodyguard', targets: ids((p) => p.id !== W.lastGuard), done: !!n.done[me.id], last: W.lastGuard };
  if (st === 'night_silence' && me.role === 'silencer') return { kind: 'silence', targets: ids((p) => p !== me), done: !!n.done[me.id] };
  if (st === 'night_wolf' && wwW(me)) return { kind: 'wolf', targets: ids((p) => !wwW(p)), picked: n.wv[me.id] || [], need: W.dbl ? 2 : 1, mates: Object.fromEntries(Object.entries(n.wv)) };
  if (st === 'night_seer' && me.role === 'seer') return { kind: 'seer', targets: ids((p) => p !== me), done: !!n.done[me.id] };
  if (st === 'night_doctor' && me.role === 'doctor') return { kind: 'doctor', targets: ids((p) => p.id !== W.lastDoc), done: !!n.done[me.id], last: W.lastDoc };
  if (st === 'night_witch' && me.role === 'witch') return { kind: 'witch', victim: n.victim, victims: n.victims, heal: W.potion.heal && n.victims.length > 0, poison: W.potion.poison, targets: ids((p) => p !== me), done: !!n.done[me.id] };
  if (st === 'hunter' && W.hunter === me.id) return { kind: 'hunter', targets: ids((p) => p !== me) };
  if (st === 'vote' && me.beg) return null;
  if (st === 'vote') return { kind: 'vote', targets: ids((p) => p !== me), picked: W.votes[me.id] || null };
  if (st === 'day') return { kind: 'day', ready: !!W.ready[me.id] };
  return null;
}
function wwView(room, me) {
  const W = room.ww, S = room.settings.ww, played = !!W && (room.phase === 'playing' || room.phase === 'ended');
  const over = room.phase === 'ended', meDead = played && me.alive === false;
  const vc = {}; if (played) for (const t of Object.values(W.votes)) if (t !== 'skip') vc[t] = (vc[t] || 0) + 1;
  const st = {
    t: 'state', game: 'ww', locked: !!room.password, password: me.id === room.hostId ? room.password : undefined, code: room.code, phase: room.phase, round: room.round,
    host: room.hostId, me: me.id, settings: room.settings, paused: !!room.paused, winner: room.winner, cur: null,
    players: room.players.map((p) => {
      const o = { id: p.id, name: p.name, nc: p.nc || '', av: p.av, bot: p.isBot, online: p.isBot || isOnline(p), wins: p.wins, alive: p.alive !== false };
      if (played) {
        if (over || meDead || p === me || p.alive === false || p.beg || (wwW(me) && wwW(p))) o.role = p.role;
        if (p.beg) o.beg = true;
        if (p.lover && (over || meDead || p === me || me.lover === p.id || me.role === 'cupid')) o.lov = true;
        o.vc = vc[p.id] || 0; o.voted = !!W.votes[p.id]; o.ready = !!W.ready[p.id];
      }
      return o;
    }),
  };
  if (played) {
    st.role = me.role; st.day = W.day; st.stage = W.stage; st.log = W.log.slice(-60);
    st.timerLeft = room.paused ? W.left : Math.max(0, W.end - Date.now()); st.timerTotal = W.total;
    st.act = over ? null : wwAct(room, me);
    st.seen = me.role === 'seer' ? W.seen : null;
    st.potion = me.role === 'witch' ? W.potion : null;
    st.hunter = W.hunter; st.silenced = W.silenced || null;
  }
  return st;
}
function wwDrop(room, seat) {
  seat.isBot = true; seat.left = true;
  if (room.hostId === seat.id) {
    const nh = room.players.find((p) => !p.isBot);
    room.hostId = nh ? nh.id : room.hostId;
    if (nh) say(room, `${nh.name} เป็นหัวห้องคนใหม่`);
  }
  if (room.ww && room.phase === 'playing' && !room.paused) wwBots(room, room.ww.stage);
}

// ล้างห้อง/เซสชันที่ไม่มีใครอยู่
setInterval(() => {
  const now = Date.now();
  for (const room of Array.from(rooms.values())) {
    const online = humans(room).some(isOnline);
    if (online) room.emptySince = null;
    else if (!room.emptySince) room.emptySince = now;
    else if (now - room.emptySince > 5 * 60 * 1000) {
      for (const p of humans(room)) { const s = byId.get(p.id); if (s) s.room = null; }
      destroyRoom(room); broadcastRooms();
    }
  }
  for (const [tok, s] of sessions) {
    if (!s.ws && !s.room && now - (s.lastSeen || 0) > 30 * 60 * 1000) { sessions.delete(tok); byId.delete(s.id); }
  }
}, 30000).unref();

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n  UNO FLIP (pixel) พร้อมเล่นแล้ว!\n');
    console.log(`  เครื่องนี้:   http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) console.log(`  เพื่อนในออฟฟิศ: http://${i.address}:${PORT}`);
    }
    console.log('');
  });
}
module.exports = { server, rooms, buildDeck, _hx: { hxStart, hxStep, hxField }, _t: { newRoom, makeSeat, startRound, tryPlay, doPlay, doDraw, doPass, doUno, doCatch, doResolve, drawOne, canPlay, removeSeat, face } };
