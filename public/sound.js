/* เสียง 8-bit สร้างด้วย WebAudio (ไม่ต้องมีไฟล์เสียง) */
(function () {
  'use strict';
  let ctx = null;
  let on = true, unlocked = false;
  try { on = localStorage.getItem('uno_snd') !== '0'; } catch (e) { /* */ }

  function ac() {
    if (!unlocked) return null; // รอให้ผู้ใช้แตะหน้าจอก่อน (ข้อกำหนดของเบราว์เซอร์)
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, opt) {
    if (!on) return;
    const c = ac(); if (!c) return;
    opt = opt || {};
    const t0 = c.currentTime + (opt.at || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = opt.type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    const v = opt.vol || 0.05;
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const seq = (notes, step, opt) => notes.forEach((n, i) => tone(n, step * 1.2, Object.assign({ at: i * step }, opt || {})));

  window.Snd = {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('uno_snd', on ? '1' : '0'); } catch (e) { /* */ } if (on) tone(660, 0.1); return on; },
    unlock() { unlocked = true; ac(); },
    play() { tone(330, 0.09, { to: 660 }); },
    draw() { tone(520, 0.08, { type: 'triangle', to: 260 }); },
    turn() { seq([660, 880], 0.09, { vol: 0.045 }); },
    flip() { tone(180, 0.45, { to: 1200, type: 'sawtooth', vol: 0.04 }); tone(1200, 0.25, { at: 0.4, to: 200, type: 'square', vol: 0.03 }); },
    uno() { seq([523, 659, 784, 1047], 0.07); },
    catch() { seq([392, 262, 196], 0.1, { type: 'sawtooth', vol: 0.05 }); },
    skip() { tone(300, 0.14, { to: 120, type: 'square' }); },
    deal() { seq([392, 392, 523], 0.07, { vol: 0.04 }); },
    win() { seq([523, 659, 784, 1047, 784, 1047, 1319], 0.1); },
    kick() { tone(220, 0.06, { to: 90, type: 'square', vol: 0.04 }); },
    goal() { seq([392, 523, 659, 784, 1047], 0.09, { vol: 0.06 }); },
    whistle() { tone(1500, 0.18, { type: 'triangle', vol: 0.04 }); },
    howl() { tone(260, 0.8, { to: 620, type: 'sawtooth', vol: 0.04 }); tone(620, 0.5, { at: 0.7, to: 300, type: 'sawtooth', vol: 0.03 }); },
    dead() { seq([300, 220, 140, 90], 0.12, { type: 'square', vol: 0.05 }); },
    night() { seq([392, 330, 262], 0.2, { vol: 0.04, type: 'triangle' }); },
    dawn() { seq([523, 659, 784], 0.15, { vol: 0.045 }); },
    chat() { tone(880, 0.04, { vol: 0.02 }); },
    err() { tone(120, 0.18, { type: 'sawtooth', vol: 0.05 }); },
    click() { tone(500, 0.04, { vol: 0.03 }); },
  };
})();
