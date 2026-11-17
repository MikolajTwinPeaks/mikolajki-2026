// Operacja: Tajny Mikołaj — frontend (vanilla JS, bez bundlera)
import { COPY, fill } from './copy.js';

const API = window.API_BASE || '';
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let STATE = null;
let clockOffset = 0;
const now = () => Date.now() + clockOffset;

// Zaplecze w Google Apps Script (window.GAS_URL w config.js): te same ścieżki, odpowiedzi z polem error zamiast kodów HTTP.
async function gas(path, body) {
  const a = path.split('/').pop();
  // Google bywa wolny przy pierwszym wywołaniu albo zawiesza połączenie: limit czasu + ponowienie.
  // Ponawiamy tylko odczyty; zapis (register/draw) nie jest powtarzany, żeby nie dublować maili.
  const once = (ms) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    const req = body
      ? fetch(window.GAS_URL, { method: 'POST', body: JSON.stringify({ a, ...body }), signal: ctl.signal }) // text/plain: bez preflight CORS
      : fetch(`${window.GAS_URL}?a=${a}&_=${Date.now()}`, { signal: ctl.signal, cache: 'no-store' });
    return req.finally(() => clearTimeout(timer));
  };
  const reads = !body || a === 'mission';
  let r;
  for (let i = 0; ; i++) {
    try { r = await once(body ? 30000 : 12000); break; } catch {
      if (!reads || i >= 2) throw Object.assign(new Error('siec'), { code: 'siec' });
    }
  }
  const data = await r.json().catch(() => ({ error: 'siec' }));
  if (data.error) throw Object.assign(new Error(data.error), { code: data.error });
  return data;
}

async function api(path, body) {
  if (window.GAS_URL) return gas(path, body);
  const r = await fetch(API + path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'siec'), { code: data.error || 'siec', status: r.status });
  return data;
}

// ── polszczyzna: daty i liczebniki ──
const TZ = { timeZone: 'Europe/Warsaw' };
const fmtDT = (iso) => NB(`${new Date(iso).toLocaleDateString('pl-PL', { ...TZ, day: 'numeric', month: 'long' })} o ${new Date(iso).toLocaleTimeString('pl-PL', { ...TZ, hour: 'numeric', minute: '2-digit' })}`);
const NB = (t) => String(t).replace(/(\d) (?=\S)/g, '$1\u00a0'); // liczba nie odrywa się od słowa
const fmtDay = (iso) => NB(new Date(iso).toLocaleDateString('pl-PL', { ...TZ, day: 'numeric', month: 'long' }));
const fmtD = (iso) => new Date(iso).toLocaleDateString('pl-PL', { ...TZ, weekday: 'long', day: 'numeric', month: 'long' });
function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}
function timeLeft(ms) {
  ms = Math.max(0, ms);
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  const parts = [];
  if (d) parts.push(`${d} ${plural(d, 'dzień', 'dni', 'dni')}`);
  if (h) parts.push(`${h} ${plural(h, 'godzinę', 'godziny', 'godzin')}`);
  if (m || !parts.length) parts.push(`${m} ${plural(m, 'minutę', 'minuty', 'minut')}`);
  return NB(parts.length > 1 ? `${parts.slice(0, -1).join(', ')} i ${parts.at(-1)}` : parts[0]);
}
function agentsSentence(n) {
  if (n === 0) return 'Lista jest jeszcze pusta.';
  if (n === 1) return 'Zgłosiła się już jedna osoba.';
  return plural(n, '', `Zgłosiły się już ${n} osoby.`, `Zgłosiło się już ${n} osób.`);
}
const vars = () => STATE ? {
  TERMIN: fmtDT(STATE.regDeadline), TERMIN_LOSOWANIA: fmtDT(STATE.drawDeadline), START: fmtDT(STATE.drawOpen || STATE.regDeadline), TERMIN_KROTKO: fmtDay(STATE.drawOpen || STATE.regDeadline),
  BUDZET: NB(STATE.budget), DATA_WRECZENIA: fmtD(STATE.giftDate), DOMENA: '@' + STATE.domains[0],
} : {};
const T = (s, extra) => fill(s, { ...vars(), ...extra });

// ═════════════════════════ DŹWIĘK (syntezowany, domyślnie wyłączony) ═════════════════════════
const sfx = (() => {
  let ctx = null, on = false;
  on = true; try { on = localStorage.getItem('sfx') !== '0'; } catch {}
  const btn = $('#sound');
  const paint = () => { btn.setAttribute('aria-pressed', on); btn.querySelector('span').textContent = on ? 'wł.' : 'wył.'; };
  paint();
  // Muzyka: plik dostarczony przez organizatora (public/audio/motyw.mp3, poza repozytorium). Brak pliku = cisza.
  const music = new Audio('audio/motyw.mp3');
  music.loop = true; music.volume = 0.35; music.preload = 'none';
  let hasMusic = false;
  fetch('audio/motyw.mp3', { method: 'HEAD' }).then((r) => { hasMusic = r.ok; if (on && hasMusic) tryPlay(); }).catch(() => {});
  const tryPlay = () => {
    if (!on) return;
    if (hasMusic) music.play().catch(() => {});
    else theme.start();
  };

  // Własny motyw (oryginalny, generowany na żywo): d-moll, 112 BPM, puls basu, werbel, dzwoneczki sań, krótka melodia.
  const theme = (() => {
    let timer = null, step = 0, next = 0, bus = null;
    const BPM = 112, S = 60 / BPM / 4;                 // szesnastka
    const hz = (m) => 440 * 2 ** ((m - 69) / 12);
    const BASS = [38, 0, 38, 38, 0, 38, 41, 0, 38, 0, 38, 38, 0, 36, 37, 0];   // D D F … C C#
    const LEAD = [[0, 74, 6], [8, 77, 2], [10, 76, 2], [12, 74, 4], [32, 81, 6], [40, 79, 2], [42, 77, 2], [44, 76, 4],
      [64, 74, 4], [68, 69, 4], [72, 70, 6], [80, 69, 2], [82, 67, 2], [84, 69, 12]];               // 6 taktów, własna fraza
    function note(t, f, d, type, vol, cut = 4000) {
      const c = ctx, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cut;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(lp).connect(g).connect(bus); o.start(t); o.stop(t + d + .05);
    }
    function noise(t, d, f, vol, q = 1) {
      const c = ctx, n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      n.buffer = b; n.connect(bp).connect(g).connect(bus); n.start(t);
    }
    function schedule() {
      while (next < ctx.currentTime + .15) {
        const i = step % 16, bar = Math.floor(step / 16) % 8, t = next;
        if (BASS[i]) note(t, hz(BASS[i] + (bar === 6 ? 3 : 0)), S * 1.6, 'sawtooth', .07, 600);
        if (i % 2 === 0) noise(t, .05, 9000, .025, 2);                   // dzwoneczki / hi-hat
        if (i === 4 || i === 12) noise(t, .14, 1800, .09, .7);           // werbel
        if (i === 0) note(t, 55, .35, 'sine', .25, 200);                 // stopa
        if (step % 128 >= 16) for (const [pos, m, len] of LEAD) if ((step % 128) - 16 === pos) note(t, hz(m), S * len * .95, 'triangle', .06, 3000);
        if (i === 0 && bar % 2 === 0) [74, 77, 81].forEach((m) => note(t, hz(m + 12), 1.2, 'sine', .012, 6000)); // szron
        next += S; step++;
      }
    }
    return {
      start() {
        if (timer) return;
        ac(); bus = ctx.createGain(); bus.gain.value = .55; bus.connect(ctx.destination);
        next = ctx.currentTime + .05; step = 0; timer = setInterval(schedule, 25);
      },
      stop() { clearInterval(timer); timer = null; if (bus) { bus.gain.setTargetAtTime(0, ctx.currentTime, .1); bus = null; } },
    };
  })();
  addEventListener('pointerdown', tryPlay, { once: true }); // przeglądarki wymagają gestu użytkownika
  btn.addEventListener('click', () => {
    on = !on; try { localStorage.setItem('sfx', on ? '1' : '0'); } catch {} paint();
    if (on) { beep(880, .06); tryPlay(); } else { music.pause(); theme.stop(); }
  });
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function beep(f = 660, d = .05, type = 'square', vol = .03) {
    if (!on) return;
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + d);
  }
  function whoosh() {
    if (!on) return;
    const c = ac(), n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * .6, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, c.currentTime); f.frequency.exponentialRampToValueAtTime(3000, c.currentTime + .5);
    const g = c.createGain(); g.gain.value = .1; n.buffer = b; n.connect(f).connect(g).connect(c.destination); n.start();
  }
  function chord() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .5, 'triangle', .04), i * 90)); }
  return { tick: () => beep(1400 + Math.random() * 300, .015, 'square', .01), beep, whoosh, chord, unlock: () => { if (on) { ac().resume?.(); tryPlay(); } } };
})();

// ═════════════════════════ TŁO: śnieg, iskry, rzadki laser ═════════════════════════
const fx = (() => {
  const cv = $('#fx'), g = cv.getContext('2d');
  let W, H, dpr;
  const flakes = [], embers = [], beams = [];
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }
  size(); addEventListener('resize', size);
  const N = REDUCED ? 25 : Math.min(90, Math.round(innerWidth / 16));
  for (let i = 0; i < N; i++) flakes.push(newFlake(true));
  function newFlake(any) {
    const z = Math.random();
    return { x: Math.random() * W, y: any ? Math.random() * H : -10, r: (0.5 + z * 1.6) * dpr, vy: (0.15 + z * 0.55) * dpr, ph: Math.random() * 6.28, z };
  }
  function burst(x, y, n = 40, colors = ['#FF6A39', '#ffcf9a', '#ffffff']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = (1 + Math.random() * 4) * dpr;
      embers.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5 * dpr, life: 1, c: colors[i % colors.length], r: (0.8 + Math.random() * 1.8) * dpr });
    }
  }
  function sweep() { beams.push({ t: 0, y: H * (.2 + Math.random() * .6), a: (Math.random() - .5) * .35, dur: 260 + Math.random() * 120 }); }
  let last = 0;
  function frame(ts) {
    const dt = Math.min(2, (ts - last) / 16.7 || 1); last = ts;
    g.clearRect(0, 0, W, H);
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i]; b.t += dt; const p = b.t / b.dur;
      if (p >= 1) { beams.splice(i, 1); continue; }
      const alpha = Math.sin(p * Math.PI) * .22, y = b.y + (p - .5) * H * .2;
      g.save(); g.translate(W / 2, y); g.rotate(b.a);
      const grd = g.createLinearGradient(-W, 0, W, 0);
      grd.addColorStop(0, 'rgba(255,80,40,0)'); grd.addColorStop(.5, `rgba(255,106,57,${alpha})`); grd.addColorStop(1, 'rgba(255,80,40,0)');
      g.fillStyle = grd; g.fillRect(-W, -.5 * dpr, W * 2, 1 * dpr);
      g.restore();
    }
    g.fillStyle = '#E9E5DD';
    for (const f of flakes) {
      f.y += f.vy * dt; f.ph += 0.008 * dt; f.x += Math.sin(f.ph) * 0.25 * dpr;
      if (f.y > H + 10) Object.assign(f, newFlake(false));
      g.globalAlpha = 0.1 + f.z * 0.32; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 0.1 * dpr * dt; e.vx *= 0.985; e.life -= 0.013 * dt;
      if (e.life <= 0) { embers.splice(i, 1); continue; }
      g.globalAlpha = e.life; g.fillStyle = e.c;
      g.beginPath(); g.arc(e.x, e.y, e.r, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (!REDUCED) setInterval(() => Math.random() < .4 && sweep(), 5200);
  return { burst, sweep };
})();

// lampki: ciepłe, przygaszone, na jednym kablu
(function lights() {
  const n = Math.max(8, Math.round(innerWidth / 110));
  const cols = ['#ffb070', '#ffd9a8', '#FF6A39', '#ffe9cf'];
  let path = 'M0,4', bulbs = '';
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100;
    if (i) path += ` Q${x - 50 / n},${4 + 10} ${x},4`;
    if (i < n) {
      const bx = x + 50 / n, c = cols[i % cols.length];
      bulbs += `<circle class="bulb" cx="${bx}%" cy="16" r="2.6" fill="${c}" style="animation-delay:${(i * 0.53) % 3.2}s;filter:drop-shadow(0 0 4px ${c})"/>`;
    }
  }
  $('#lights').innerHTML = `<svg preserveAspectRatio="none" viewBox="0 0 100 34"><path d="${path}" stroke="#16201d" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/></svg>
    <svg style="position:absolute;inset:0">${bulbs}</svg>`;
})();

// latarka
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  document.documentElement.style.setProperty('--lx', `${e.clientX}px`);
  document.documentElement.style.setProperty('--ly', `${e.clientY}px`);
});
const torch = (on) => document.body.classList.toggle('torch', on && !REDUCED);

// ═════════════════════════ NARZĘDZIA ANIMACJI ═════════════════════════
async function typeLines(el, lines, { speed = 28, pause = 420 } = {}) {
  el.innerHTML = '';
  for (const line of lines) {
    const div = document.createElement('div'); el.appendChild(div);
    if (REDUCED) { div.textContent = line; continue; }
    for (let i = 0; i <= line.length; i++) {
      if (!document.body.contains(el)) return;
      div.innerHTML = esc(line.slice(0, i)) + '<span class="caret"></span>';
      if (i % 2) sfx.tick();
      await sleep(speed + (line[i] === ' ' ? 18 : 0));
    }
    div.textContent = line;
    await sleep(pause);
  }
}

const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUWZŁŚŻ0123456789';
function scramble(el, target, dur = 900) {
  return new Promise((res) => {
    if (REDUCED) { el.textContent = target; return res(); }
    const start = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const fixed = Math.floor(p * target.length);
      el.textContent = target.split('').map((ch, i) => {
        if (i < fixed || ch === ' ') return ch;
        const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        return ch === ch.toLowerCase() ? g.toLowerCase() : g;
      }).join('');
      if (p < 1) requestAnimationFrame(step); else { el.textContent = target; res(); }
    })(start);
  });
}

let timers = [];
const every = (fn, ms) => { fn(); timers.push(setInterval(fn, ms)); };
const clearTimers = () => { timers.forEach(clearInterval); timers = []; };

function show(html, { dark = false } = {}) {
  clearTimers(); torch(dark);
  app.innerHTML = `<section class="screen">${html}</section>`;
  scrollTo({ top: 0, behavior: 'smooth' });
  return app.firstElementChild;
}

function modal(html) {
  const m = $('#modal'); m.firstElementChild.innerHTML = html; m.hidden = false;
  const close = () => { m.hidden = true; };
  m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); };
  return { el: m.firstElementChild, close };
}

// ═════════════════════════ BOOT: terminal + lont ═════════════════════════
async function gate() {
  const g = document.createElement('div');
  g.className = 'boot gate';
  g.innerHTML = `<div class="boot-inner"><div class="boot-lines"><div>Przychodząca transmisja z centrali SunHelp.</div><div class="ok">Kanał zaszyfrowany.</div></div>
    <button class="btn" id="enter" type="button">Nawiąż połączenie <span class="arr" aria-hidden="true">→</span></button></div>`;
  document.body.appendChild(g);
  await new Promise((r) => $('#enter', g).addEventListener('click', r, { once: true }));
  sfx.unlock();
  g.remove();
}

async function boot() {
  let seen = false; try { seen = sessionStorage.getItem('boot') === '1'; } catch {}
  const el = document.createElement('div');
  el.className = 'boot';
  el.innerHTML = `<div class="boot-inner"><div class="boot-lines" id="bl"></div>
      <div class="fuse"><div class="fuse-burnt"></div><div class="spark"></div></div></div>`;
  document.body.appendChild(el);
  const lines = seen ? COPY.boot.slice(-1) : COPY.boot;
  const total = seen ? 900 : 6000;
  const spark = $('.spark', el), burnt = $('.fuse-burnt', el), bl = $('#bl', el);
  const t0 = performance.now();
  let li = 0;
  await new Promise((res) => {
    (function step(t) {
      const p = Math.min(1, (t - t0) / total);
      spark.style.left = burnt.style.width = `${p * 100}%`;
      while (li < lines.length && p >= li / lines.length) {
        const d = document.createElement('div'); d.textContent = lines[li]; if (li === lines.length - 1) d.className = 'ok';
        bl.appendChild(d); sfx.beep(500 + li * 120, .04); li++;
      }
      if (p < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
  try { sessionStorage.setItem('boot', '1'); } catch {}
  const fl = document.createElement('div'); fl.className = 'flash go'; document.body.appendChild(fl);
  sfx.whoosh();
  el.classList.add('done');
  setTimeout(() => { el.remove(); fl.remove(); }, 1100);
}

// ═════════════════════════ EKRANY ═════════════════════════
function screenRegistration() {
  const c = COPY.rejestracja;
  const s = show(`
    <svg class="mark" viewBox="52 70 77 40" aria-hidden="true"><path d="M101.381 72C97.3064 72 93.4673 73.5535 90.5772 76.3711L81.8399 84.916C80.318 86.4074 78.2039 87.2598 76.0411 87.2598H54.96V92.7441H94.4346L87.3731 99.7822C85.274 101.832 82.3686 103.008 79.4073 103.008H54.96V108H80.5469C84.6327 108 88.4678 106.446 91.3428 103.625L100.08 95.0801C101.609 93.5925 103.724 92.7363 105.887 92.7363H126.96V87.252H87.4922L94.5547 80.2139C96.6839 78.1347 99.5143 76.9883 102.521 76.9883H126.96V72H101.381Z"/></svg>
    <div class="reg seq">
      <div class="transmission" id="tr"></div>
      <h1>${c.naglowek}</h1>
      <p class="prose" id="brief"></p>
      <p class="prose">${c.redakcja} <span class="redacted" style="width:7.5em"></span> — ${esc(T(c.redakcjaPo))}</p>
      <form id="reg" novalidate autocomplete="on">
        <p class="sentence">
          ${c.zdanie.a}
          <input class="w-name" name="first" autocomplete="given-name" placeholder="${c.placeholdery.imie}" aria-label="${c.pola.imie}" maxlength="60" required>
          <input class="w-last" name="last" autocomplete="family-name" placeholder="${c.placeholdery.nazwisko}" aria-label="${c.pola.nazwisko}" maxlength="60" required>${c.zdanie.b}
          <input class="w-mail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="${c.placeholdery.email}" aria-label="${c.pola.email}" maxlength="120" required>${c.zdanie.c}
        </p>
        <div class="err" id="err" role="alert"></div>
        <div class="form-foot">
          <button class="btn" type="submit">${c.przycisk} <span class="arr" aria-hidden="true">→</span></button>
        </div>
      </form>
    </div>`, { dark: true });
  typeLines($('#tr', s), COPY.intro);
  const deadline = Date.parse(STATE.regDeadline);
  const brief = $('#brief', s);
  every(() => {
    const left = deadline - now();
    if (left <= 0) return refresh();
    brief.innerHTML = esc(T(c.briefing, { LICZNIK: '\u0000', AGENCI_ZDANIE: agentsSentence(STATE.agents) }))
      .replace('\u0000', `<span class="num">${timeLeft(left)}</span>`);
  }, 1000);
  every(async () => { try { STATE = await api('/api/state'); } catch {} }, 20000);

  const form = $('#reg', s);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#err', s);
    const data = Object.fromEntries(new FormData(form));
    const bad = (k) => { err.textContent = T(COPY.bledy[k]); err.classList.remove('shake'); void err.offsetWidth; err.classList.add('shake'); sfx.beep(180, .2, 'sawtooth', .03); };
    if (!data.first.trim() || !data.last.trim() || !data.email.trim()) return bad('puste');
    const dom = data.email.trim().toLowerCase().split('@')[1];
    const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (!STATE.domains.includes(dom) && !(STATE.extra || []).includes(await sha(data.email.trim().toLowerCase()))) return bad('domena');
    err.textContent = '';
    const btn = $('button', form); btn.disabled = true;
    const scan = faceScan();
    try {
      const [res] = await Promise.all([api('/api/register', data), sleep(REDUCED ? 200 : 3300)]);
      await scan.granted();
      screenInGame(res);
    } catch (ex) {
      scan.close(); btn.disabled = false;
      bad(COPY.bledy[ex.code] ? ex.code : 'siec');
      if (ex.code === 'zamknieta') refresh();
    }
  });
}

function faceScan() {
  // twarz z linii + punkty charakterystyczne (siatka), rysowane jak w kamerze centrali
  const P = [[100,22],[136,30],[160,62],[167,108],[160,152],[140,190],[100,210],[60,190],[40,152],[33,108],[40,62],[64,30],
    [62,94],[90,92],[110,92],[138,94],[66,108],[84,108],[116,108],[134,108],[100,112],[100,140],[90,148],[110,148],
    [80,170],[100,176],[120,170],[100,190],[75,128],[125,128],[100,60]];
  const E = [[0,30],[30,13],[30,14],[13,14],[12,13],[14,15],[12,16],[13,17],[14,18],[15,19],[16,17],[18,19],[17,20],[18,20],
    [20,21],[21,22],[21,23],[22,24],[23,26],[24,25],[25,26],[25,27],[24,7],[26,5],[27,6],[16,28],[19,29],[28,22],[29,23],
    [28,8],[29,4],[12,10],[15,2],[11,12],[1,15],[10,9],[2,3],[17,28],[18,29]];
  const pts = P.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.8" style="animation-delay:${1.6 + i * 0.035}s"/>`).join('');
  const mesh = E.map(([a, b], i) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" style="animation-delay:${2.1 + i * 0.02}s"/>`).join('');
  const el = document.createElement('div');
  el.className = 'scanner';
  el.innerHTML = `<div><div class="scanner-box face">
      <svg viewBox="0 0 200 240">
        <g class="outline">
          <path d="M100,20 C150,20 170,60 168,110 C166,160 140,205 100,212 C60,205 34,160 32,110 C30,60 50,20 100,20 Z"/>
          <path d="M62,108 Q75,99 88,108 Q75,114 62,108 Z"/><path d="M112,108 Q125,99 138,108 Q125,114 112,108 Z"/>
          <path d="M58,94 Q74,86 90,92"/><path d="M110,92 Q126,86 142,94"/>
          <path d="M99,112 L95,142 Q100,149 108,145"/><path d="M80,170 Q100,180 120,170"/>
          <path d="M32,104 Q21,112 30,132"/><path d="M168,104 Q179,112 170,132"/>
          <path d="M76,204 L72,238"/><path d="M124,204 L128,238"/>
        </g>
        <g class="mesh">${mesh}</g><g class="pts">${pts}</g>
        <g class="frame"><path d="M8,30 V8 H30"/><path d="M170,8 H192 V30"/><path d="M192,210 V232 H170"/><path d="M30,232 H8 V210"/></g>
      </svg>
      <div class="beam"></div></div>
      <div class="scanner-txt" id="st">${COPY.rejestracja.skanowanie}</div></div>`;
  document.body.appendChild(el);
  sfx.whoosh();
  return {
    async granted() {
      $('.beam', el)?.remove();
      el.querySelector('.scanner-box').classList.add('ok');
      $('#st', el).innerHTML = `<div class="granted">${COPY.rejestracja.potwierdzone}</div>`;
      sfx.chord();
      await sleep(REDUCED ? 100 : 1300);
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      await sleep(380);
      el.remove();
    },
    close() { el.remove(); },
  };
}

function screenInGame(res) {
  const c = COPY.wGrze;
  const s = show(`
    <div class="ingame seq">
      <h1>${c.naglowek}</h1>
      <p class="prose">${esc(T(c.tekst))}</p>
      <div>
        <div class="codename-label">${c.start}</div>
        <div class="codename" id="cn">&nbsp;</div>
      </div>
      <div style="margin-top:56px"><button class="btn quiet" id="back">${c.powrot}</button></div>
    </div>`);
  setTimeout(() => scramble($('#cn', s), fmtDay(STATE.drawOpen || STATE.regDeadline).replace(/\u00a0/g, ' '), 1400), 700);
  $('#back', s).onclick = () => refresh();
}

function screenWaiting(kind) {
  const c = kind === 'finished' ? COPY.koniec : kind === 'draw' ? COPY.trwa : COPY.oczekiwanie;
  const text = kind === 'standby' && STATE.agents < STATE.minAgents ? COPY.oczekiwanie.zaMalo : T(c.tekst);
  const s = show(`
    <div class="wait seq">
      <h1>${c.naglowek}</h1>
      <p class="prose">${esc(text)}</p>
      <p class="prose">${esc(agentsSentence(STATE.agents).replace('już ', ''))}</p>
      ${kind !== 'standby' ? `<div class="below"><button class="link" id="resend">${COPY.przypomnij.link}</button></div>` : ''}
    </div>`, { dark: true });
  const r = $('#resend', s); if (r) r.onclick = resendModal;
  if (kind === 'standby') every(async () => { try { const st = await api('/api/state'); if (st.phase !== 'standby') { STATE = st; refresh(); } } catch {} }, 15000);
}

function resendModal() {
  const c = COPY.przypomnij;
  const m = modal(`<h3>${c.naglowek}</h3><p>${c.tekst}</p>
    <form id="rs"><input id="rse" type="email" required aria-label="${COPY.rejestracja.pola.email}" placeholder="${COPY.rejestracja.placeholdery.email}">
    <div class="actions"><button class="btn">${c.przycisk}</button><button type="button" class="link" data-close>Anuluj</button></div></form>`);
  $('#rse', m.el).focus();
  $('#rs', m.el).onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/resend', { email: $('#rse', m.el).value }); } catch {}
    m.el.innerHTML = `<h3>Depesza nadana.</h3><p>${c.ok}</p><div class="actions"><button class="btn" data-close>Dobrze</button></div>`;
  };
}

// ── misja: osobisty link ──
async function screenMission(token) {
  let m;
  try { m = await api('/api/mission', { t: token }); } catch (ex) { return screenError(ex.code === 'limit' ? 'limit' : 'link'); }
  if (m.drawn) return screenSealed(m, token, COPY.wynik.juzLosowales, 'Dossier zapieczętowane.');
  if (m.phase !== 'draw') return screenWaiting(m.phase);
  const c = COPY.losowanie;
  const pool = `${m.pool} ${plural(m.pool, 'osoba', 'osoby', 'osób')}`;
  const s = show(`
    <div class="mission seq">
      <div class="transmission">wiadomość dla: ${esc(m.agent.first.toLowerCase())}</div>
      <h1>${esc(m.agent.first)},<br>${c.naglowek.toLowerCase()}.</h1>
      <p class="prose">W puli jest teraz <span class="num">${pool}</span>. Losowanie zamykamy <span class="num">${esc(fmtDT(STATE.drawDeadline))}</span>. Im wcześniej losujesz, tym większy wybór. Siebie nie trafisz, a wynik zobaczysz tylko ty.</p>
      <div class="hold-wrap">
        <button class="hold" id="hold" type="button" aria-label="${c.przycisk} — przytrzymaj">
          <svg viewBox="0 0 200 200"><circle class="prog" id="prog" cx="100" cy="100" r="99"/></svg>
          <span class="lbl">${c.przycisk}</span>
        </button>
        <div class="hold-hint">Przytrzymaj, aż okrąg się zamknie.</div>
      </div>
    </div>`, { dark: true });

  const hold = $('#hold', s), prog = $('#prog', s), HOLD = REDUCED ? 300 : 1400;
  let t0 = 0, raf = 0, fired = false;
  const reset = () => { cancelAnimationFrame(raf); hold.classList.remove('holding'); if (!fired) prog.style.strokeDashoffset = 625; };
  const start = (e) => {
    e.preventDefault(); if (fired) return;
    hold.classList.add('holding'); t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / HOLD);
      prog.style.strokeDashoffset = 625 - 625 * p;
      if (Math.random() < .3) sfx.tick();
      if (p >= 1) { fired = true; hold.classList.remove('holding'); return runDraw(m, token); }
      raf = requestAnimationFrame(step);
    })(t0);
  };
  hold.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, reset));
  hold.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
  hold.addEventListener('keyup', reset);
}

async function runDraw(m, token) {
  const c = COPY.losowanie;
  const th = document.createElement('div');
  th.className = 'theatre';
  const lasers = Array.from({ length: 6 }, (_, i) => `<div class="laser" style="top:${14 + i * 14}%"></div>`).join('');
  th.innerHTML = `<div class="lasers">${lasers}</div>
    <div class="theatre-inner">
      <div class="status" id="status"></div>
      <div class="reel blur" id="reel">&nbsp;</div>
      <div class="progress"><i id="pg"></i></div>
    </div>`;
  document.body.appendChild(th);
  th.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
  sfx.whoosh();

  const lz = [...th.querySelectorAll('.laser')];
  const laserAnim = lz.map((l, i) => l.animate([
    { transform: `rotate(${(i % 2 ? 1 : -1) * (3 + i)}deg) translateY(0)` },
    { transform: `rotate(${(i % 2 ? -1 : 1) * (2 + i)}deg) translateY(${(i % 2 ? 1 : -1) * 36}px)` },
  ], { duration: 1800 + i * 320, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));

  const req = api('/api/draw', { t: token }).catch((e) => ({ error: e.code }));
  const status = $('#status', th), reel = $('#reel', th), pg = $('#pg', th);
  const DUR = REDUCED ? 800 : 6200;
  const t0 = performance.now();
  let msgI = -1;
  const names = m.names.length ? m.names : ['…'];
  let ni = 0, nextSwap = 0;

  await new Promise((res) => {
    (function step(t) {
      const p = Math.min(1, (t - t0) / DUR);
      pg.style.width = `${p * 100}%`;
      const mi = Math.min(c.animacja.length - 1, Math.floor(p * c.animacja.length));
      if (mi !== msgI) { msgI = mi; status.textContent = c.animacja[mi]; }
      const interval = 45 + Math.pow(p, 2.6) * 420;
      if (t >= nextSwap && p < .97) { reel.textContent = names[ni++ % names.length]; nextSwap = t + interval; sfx.tick(); }
      if (p > .8) reel.classList.remove('blur');
      if (p < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
  const r = await req;
  if (r.error) { th.remove(); return screenError(r.error === 'faza' ? 'zamknieta' : 'link'); }
  const full = `${r.target.first} ${r.target.last}`;
  status.textContent = c.odsloniecie;
  reel.classList.add('locked');
  await scramble(reel, full, REDUCED ? 10 : 1100);
  sfx.chord();
  laserAnim.forEach((a) => a.cancel());
  lz.forEach((l) => l.animate([{ opacity: .75 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }));
  const rr = reel.getBoundingClientRect();
  fx.burst(rr.left + rr.width / 2, rr.top + rr.height / 2, 70);
  await sleep(REDUCED ? 100 : 1600);
  th.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
  await sleep(550);
  th.remove();
  screenResult({ ...m, target: r.target, drawn: true }, token);
}

function screenSealed(m, token, text, title) {
  const s = show(`
    <div class="sealed seq">
      <div class="transmission">wiadomość dla: ${esc(m.agent.first.toLowerCase())}</div>
      <h1>${title}</h1>
      <p class="prose">${esc(text)}</p>
      <div><button class="btn" id="open">${COPY.wynik.pokaz} <span class="arr" aria-hidden="true">→</span></button></div>
    </div>`, { dark: true });
  $('#open', s).onclick = () => screenResult(m, token);
}

function screenResult(m, token) {
  const t = m.target;
  const initials = (t.first[0] + t.last[0]).toUpperCase();
  const no = `SH-${new Date().getFullYear()}/12/${String(Math.floor(Math.random() * 900) + 100)}`;
  const row = (k, v, cls = '') => `<div class="d-row"><span class="d-k">${k}</span><span class="d-v ${cls}">${v}</span></div>`;
  const bar = (w) => `<span class="d-red" style="width:${w}em"></span>`;
  const s = show(`
    <div class="result">
      <div class="folder" id="file">
        <div class="folder-tab">${no}</div>
        <article class="paper">
          <svg class="clip" viewBox="0 0 30 90" aria-hidden="true"><path d="M8,85 V18 a7,7 0 0 1 14,0 V70 a4,4 0 0 1 -8,0 V24"/></svg>
          <header class="d-head">
            <div>
              <div class="d-org">Centrala SunHelp · wydział świątecznych operacji specjalnych</div>
              <div class="d-title">Akta personalne celu</div>
            </div>
            <div class="d-stamp">Ściśle tajne</div>
          </header>
          <div class="d-body">
            <div class="d-photo"><b>${esc(initials)}</b><span>zdjęcie<br>niedostępne</span></div>
            <div class="d-fields">
              ${row('Nazwisko', esc(t.last.toUpperCase()), 'big')}
              ${row('Imię', esc(t.first.toUpperCase()), 'big')}
              ${row('Status', 'cel operacji „Tajny Mikołaj”')}
              ${row('Znaki szczególne', bar(9))}
              ${row('Ostatnio widziany', bar(6) + ' ' + bar(4))}
            </div>
          </div>
          <div class="d-orders">
            <div class="d-k">Rozkaz</div>
            <p>Przygotować prezent dla wskazanej osoby. Budżet operacyjny: <b>${esc(NB(STATE.budget))}</b>. Przekazanie: <b>${esc(fmtD(STATE.giftDate))}</b>. Tożsamości celu nie ujawniać nikomu.</p>
          </div>
          <footer class="d-foot">
            <span>Ta wiadomość ulegnie samozniszczeniu</span>
            <div class="fuse"><div class="fuse-burnt"></div><div class="spark"></div></div>
            <span class="sec" id="dnum">20 s</span>
          </footer>
        </article>
      </div>
    </div>`);
  selfDestruct(s, m, token, 20);
}

function selfDestruct(s, m, token, secs) {
  const file = $('#file', s), spark = $('.spark', file), burnt = $('.fuse-burnt', file), num = $('#dnum', file);
  const t0 = performance.now(), dur = secs * 1000;
  let done = false;
  (function step(t) {
    if (done || !document.body.contains(file)) return;
    const p = Math.min(1, (t - t0) / dur);
    spark.style.left = burnt.style.width = `${p * 100}%`;
    const left = Math.max(0, Math.ceil((dur - (t - t0)) / 1000));
    const label = `${left} s`;
    if (num.textContent !== label) { num.textContent = label; if (left <= 5) sfx.beep(990, .05); }
    if (p < 1) return requestAnimationFrame(step);
    done = true; destroy();
  })(t0);
  async function destroy() {
    const edge = document.createElement('div'); edge.className = 'burn-edge'; file.appendChild(edge);
    file.classList.add('burning');
    sfx.whoosh();
    const r = file.getBoundingClientRect();
    const iv = setInterval(() => fx.burst(r.left + Math.random() * r.width, r.top + r.height * (0.4 + Math.random() * 0.6), 5, ['#FF6A39', '#ffcf9a', '#55605c']), 90);
    await sleep(REDUCED ? 50 : 2000);
    clearInterval(iv);
    screenSealed(m, token, COPY.wynik.zniszczone, 'Wiadomość uległa samozniszczeniu.');
  }
}

function screenError(code) {
  const s = show(`
    <div class="wait seq">
      <h1>Przepustka nieważna.</h1>
      <p class="prose">${esc(T(COPY.bledy[code] || COPY.bledy.link))}</p>
      <div class="form-foot">
        <button class="btn" id="resend">${COPY.przypomnij.przycisk}</button>
        <button class="link" id="home">${COPY.wGrze.powrot}</button></div>
    </div>`, { dark: true });
  $('#resend', s).onclick = resendModal;
  $('#home', s).onclick = () => { history.replaceState(null, '', location.pathname); refresh(); };
}

// ═════════════════════════ ROUTER ═════════════════════════
async function refresh() {
  try {
    const st = await api('/api/state');
    STATE = st; clockOffset = Date.parse(st.serverTime) - Date.now();
  } catch {
    return show(`<div class="wait"><h1>Brak łączności.</h1><p class="prose" style="margin-top:24px">${COPY.bledy.siec}</p></div>`, { dark: true });
  }
  const token = new URLSearchParams(location.hash.slice(1)).get('misja');
  if (token) return screenMission(token);
  if (STATE.phase === 'registration') return screenRegistration();
  return screenWaiting(STATE.phase);
}

$('#foot').textContent = COPY.stopka;
addEventListener('hashchange', refresh);
(async () => {
  await gate();
  await Promise.all([boot(), api('/api/state').then((s) => { STATE = s; }).catch(() => {})]);
  refresh();
})();
