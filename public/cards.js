/* วาดการ์ดแบบพิกเซล: ไอคอนทำจากบิตแมปเล็ก ๆ แล้วแปลงเป็น SVG ขอบคม */
(function () {
  'use strict';
  const PAL = { R: '#e5382f', Y: '#f9d423', G: '#3ba55d', B: '#2d6fdb', P: '#e8559b', T: '#1fb5a6', O: '#f08a24', V: '#7b4fd1', W: '#222' };
  const SIDE_COLORS = { L: ['R', 'Y', 'G', 'B'], D: ['P', 'T', 'O', 'V'] };
  const COLOR_NAME = { R: 'แดง', Y: 'เหลือง', G: 'เขียว', B: 'น้ำเงิน', P: 'ชมพู', T: 'เขียวน้ำทะเล', O: 'ส้ม', V: 'ม่วง' };
  const TIPS = { D1: '+1 คนถัดไปลง + ต่อ หรือจั่ว', D2: '+2 คนถัดไปลง + ต่อ หรือจั่ว', WD4: 'เปลี่ยนสี + 4 คนถัดไปลง + ต่อ หรือจั่ว', D5: '+5 คนถัดไปลง + ต่อ หรือจั่ว', REV: 'กลับทิศทาง (ลงซ้อนได้ กลับทีละครั้ง)', SKIP: 'ข้ามตา (ลงซ้อนได้)', SKE: 'ข้ามทุกคน (เล่นต่อ)', FLIP: 'พลิกด้านการ์ดทั้งหมด', W: 'เปลี่ยนสี', WD2: 'เปลี่ยนสี + 2 คนถัดไปลง + ต่อ หรือจั่ว', WDC: 'เปลี่ยนสี + คนถัดไปจั่วจนได้สีนั้น' };

  function rowsToSvg(rows) {
    const h = rows.length, w = rows[0].length; let r = '';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === 'X') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    return `<svg class="pix" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="currentColor">${r}</svg>`;
  }
  function skipRows() {
    const rows = [];
    for (let y = 0; y < 11; y++) {
      let s = '';
      for (let x = 0; x < 11; x++) {
        const dx = x - 5, dy = y - 5, d = Math.hypot(dx, dy);
        s += ((d <= 5.4 && d >= 3.5) || (Math.abs(dx - dy) <= 0.9 && d <= 4.6)) ? 'X' : '.';
      }
      rows.push(s);
    }
    return rows;
  }
  const BITS = {
    SKIP: skipRows(),
    SKE: skipRows(),
    REV: ['....X......', '...XX......', '..XXXXXXXX.', '...XX......', '....X......', '...........', '......X....', '......XX...', '.XXXXXXXX..', '......XX...', '......X....'],
    FLIP: ['....X.X....', '...XX.XX...', '..XXX.XXX..', '.XXXX.XXXX.', 'XXXXX.XXXXX', '.XXXX.XXXX.', '..XXX.XXX..', '...XX.XX...', '....X.X....'],
  };
  const ICON = {};
  for (const k in BITS) ICON[k] = rowsToSvg(BITS[k]);

  function wildSvg(side) {
    const c = SIDE_COLORS[side].map((k) => PAL[k]);
    return `<svg class="pix wildsq" viewBox="0 0 2 2" shape-rendering="crispEdges"><rect x="0" y="0" width="1" height="1" fill="${c[0]}"/><rect x="1" y="0" width="1" height="1" fill="${c[1]}"/><rect x="0" y="1" width="1" height="1" fill="${c[2]}"/><rect x="1" y="1" width="1" height="1" fill="${c[3]}"/></svg>`;
  }

  function corner(v, side) {
    if (/^[0-9]$/.test(v)) return v;
    if (v === 'D1') return '+1';
    if (v === 'D2') return '+2';
    if (v === 'WD4') return '+4';
    if (v === 'D5') return '+5';
    if (v === 'WD2') return '+2';
    if (v === 'WDC') return '+C';
    if (v === 'W') return wildSvg(side);
    return ICON[v] || v;
  }
  function center(v, side) {
    if (/^[0-9]$/.test(v)) return `<b class="big">${v}</b>`;
    if (v === 'D1') return '<b class="big">+1</b>';
    if (v === 'D2') return '<b class="big">+2</b>';
    if (v === 'WD4') return '<b class="big">+4</b>';
    if (v === 'D5') return '<b class="big">+5</b>';
    if (v === 'WD2') return '<b class="big">+2</b>';
    if (v === 'WDC') return '<b class="big sm">+C</b>';
    if (v === 'W') return wildSvg(side).replace('class="pix wildsq"', 'class="pix wildsq bigico"');
    if (v === 'SKE') return `<span class="ico">${ICON.SKE}</span><b class="tiny">ALL</b>`;
    return `<span class="ico">${ICON[v]}</span>`;
  }

  /** HTML ของหน้าการ์ด */
  function face(f, side) {
    const wild = f.c === 'W';
    const q = SIDE_COLORS[side].map((k) => PAL[k]);
    const style = wild ? ` style="--q1:${q[0]};--q2:${q[1]};--q3:${q[2]};--q4:${q[3]}"` : '';
    return `<div class="card c-${f.c}${wild ? ' wild' : ''} s-${side}" data-v="${f.v}" title="${TIPS[f.v] || ''}"${style}>` +
      `<div class="cf"><div class="ci"><i class="cn tl">${corner(f.v, side)}</i><div class="ov">${center(f.v, side)}</div><i class="cn br">${corner(f.v, side)}</i></div></div></div>`;
  }
  /** หลังการ์ด */
  function back(side, extra) {
    const t = side === 'L' ? 'UNO' : 'FLIP';
    return `<div class="card back s-${side}${extra ? ' ' + extra : ''}"><div class="cf"><div class="ci"><div class="ov"><b class="logo">${t}</b></div></div></div></div>`;
  }

  // วงรีแบบขั้นบันได (ให้ดูเป็นพิกเซล) -> ตัวแปร CSS --oval
  function ellipseStairs(n) {
    const right = [], left = [];
    for (let i = 0; i < n; i++) {
      const y0 = (i / n) * 100, y1 = ((i + 1) / n) * 100;
      const t = ((i + 0.5) / n) * 2 - 1, w = Math.sqrt(1 - t * t);
      const x0 = (50 - 50 * w).toFixed(1), x1 = (50 + 50 * w).toFixed(1);
      right.push(`${x1}% ${y0}%`, `${x1}% ${y1}%`);
      left.unshift(`${x0}% ${y1}%`, `${x0}% ${y0}%`);
    }
    return `polygon(${right.concat(left).join(',')})`;
  }
  document.documentElement.style.setProperty('--oval', ellipseStairs(14));

  window.Cards = { PAL, SIDE_COLORS, COLOR_NAME, TIPS, face, back };
})();
