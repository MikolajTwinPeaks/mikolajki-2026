// Wielki finał 7.12: plansza z napierającym murem Dziada, lustro planszy rywala i rysowanie.
import { W, H, TOP, SIDE, GAP, BW, BH, PY, PH, PW, PW_WIDE, BR, TYPES, POWERS, sfx, blip, fmt, rand, spriteFor, drawPower, drawSled } from './final-core.js';

export const ROUND_MS = 180000;          // runda: 3 minuty
export const PITCH = BH + GAP;           // wysokość rzędu muru
export const CEIL = TOP - 34;            // sufit (pod paskiem wyniku); nowe rzędy wysuwają się spod niego
export const DANGER = PY - 30;           // mur poniżej tej linii przygniata sanie
const ROWS0 = 5;
// Tempo muru: [sekundy na rząd na starcie, sekundy na rząd pod koniec rundy].
export const TEMPO = { spokojnie: [12, 4.5], normalnie: [10, 3.2], ostro: [8, 2.4] };

// Powtarzalne losowanie: obaj gracze dostają te same rzędy w tej samej kolejności.
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const brickX = (c) => SIDE + c * (BW + GAP);

export class Board {
  constructor(seed, tempo, hooks = {}) {
    this.R = mulberry(seed);
    this.Rp = mulberry((seed * 7 + 13) >>> 0);
    this.tempo = TEMPO[tempo] || TEMPO.normalnie;
    this.hooks = hooks;                      // onAttack(n, why), onEnd(reason)
    this.quiet = !!hooks.quiet;
    this.bricks = []; this.balls = []; this.drops = []; this.shots = []; this.parts = []; this.floats = [];
    this.score = 0; this.lives = 3; this.px = W / 2; this.tx = W / 2; this.pw = PW;
    this.wideT = 0; this.slowT = 0; this.laserT = 0; this.laserCd = 0;
    this.wallY = TOP; this.pushPx = 0; this.rowNo = 0; this.nid = 0; this.wallVer = 0;
    this.chain = 0; this.hits = 0; this.flash = 0; this.toast = null; this.t = 0; this.el = 0;
    this.dead = false; this.done = false; this.diedAt = 0; this.sent = 0; this.got = 0;
    for (let i = 0; i < ROWS0; i++) this.addRow(true);
    while (this.wallY > CEIL) this.addRow(false);
    this.serve();
  }
  snd(fn, ...a) { if (!this.quiet) fn(...a); }
  addRow(initial) {
    for (const b of this.bricks) b.r++;
    if (!initial) this.wallY -= PITCH;
    const lvl = 1 + Math.floor(this.rowNo / 5);
    this.rowNo++;
    const kinds = Math.min(6, 2 + lvl);
    for (let c = 0; c < 10; c++) {
      if (this.R() < 0.14) continue;
      const t = String(1 + Math.floor(this.R() * kinds));
      this.bricks.push({ id: ++this.nid, r: 0, c, type: t, hp: TYPES[t].hp });
    }
    this.wallVer++;
  }
  by(b) { return this.wallY + b.r * PITCH; }
  serve() { this.mode = 'serve'; this.serveT = 1.4; this.balls = [{ x: this.px, y: PY - BR - 1, vx: 0, vy: 0, sp: this.speed(), trail: [] }]; this.chain = 0; }
  speed() { return Math.min(640, 400 + this.el / 1000); }
  launch() {
    if (this.mode !== 'serve' || this.dead || this.done) return;
    const b = this.balls[0], a = rand(-0.35, 0.35);
    b.vx = Math.sin(a) * b.sp; b.vy = -Math.cos(a) * b.sp;
    this.mode = 'play';
  }
  say(text, ms = 1400, hot = false) { this.toast = { text, until: performance.now() + ms, hot }; }
  burst(x, y, col, n = 10) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-200, 60), life: rand(0.4, 0.8), col, r: rand(1.2, 3) }); }
  attack(n, why) {
    this.sent += n;
    this.floats.push({ x: this.px, y: PY - 44, text: why === 'power' ? 'Paczka leci do rywala' : 'Rząd dla rywala!', life: 1.3, big: true });
    this.snd(blip, 520, 0.12, 'triangle', 0.06, 520);
    if (this.hooks.onAttack) this.hooks.onAttack(n, why);
  }
  receive(n) {
    if (this.dead || this.done) return;
    this.got += n;
    this.pushPx += n * PITCH;
    this.flash = 0.7;
    this.say(n > 1 ? `Dziad dorzuca ${n} rzędy!` : 'Dziad dorzuca rząd!', 1300, true);
    this.snd(blip, 180, 0.3, 'sawtooth', 0.05, -90);
  }
  hitBrick(br, byLaser) {
    br.hp--;
    const t = TYPES[br.type];
    const x = brickX(br.c) + BW / 2, y = this.by(br) + BH / 2;
    if (br.hp > 0) { this.snd(sfx.steel); this.burst(x, y, t.col, 3); this.wallVer++; return; }
    this.snd(sfx.brick, Number(br.type));
    this.bricks.splice(this.bricks.indexOf(br), 1);
    this.wallVer++;
    const pts = Math.round(t.pts * (1 + this.el / 60000));
    this.score += pts;
    this.floats.push({ x, y: y - 12, text: `+${pts}`, life: 0.9 });
    this.burst(x, y, t.col, 12);
    if (!byLaser) { this.chain++; if (this.chain % 3 === 0) this.attack(1, 'combo'); }
    if (!byLaser || this.Rp() < 0.5) {
      const r = this.Rp();
      if (r < 0.015) this.drops.push({ x, y, type: 'L' });
      else if (r < 0.12) this.drops.push({ x, y, type: ['E', 'C', 'T', 'P'][Math.floor(this.Rp() * 4)] });
    }
  }
  power(type) {
    this.snd(sfx.power);
    if (type === 'E') this.wideT = 12;
    if (type === 'C') this.slowT = 10;
    if (type === 'P') this.laserT = 8;
    if (type === 'L') this.lives = Math.min(6, this.lives + 1);
    if (type === 'T' && this.balls[0]) {
      const src = this.balls[0];
      for (const da of [-0.45, 0.45]) {
        const ang = Math.atan2(src.vx, -src.vy) + da;
        this.balls.push({ x: src.x, y: src.y, vx: Math.sin(ang) * src.sp, vy: -Math.cos(ang) * src.sp, sp: src.sp, trail: [] });
      }
      if (this.mode === 'serve') this.launch();
    }
    this.floats.push({ x: this.px, y: PY - 20, text: POWERS[type].name, life: 1.2, big: true });
    this.attack(1, 'power');
  }
  loseLife(text) {
    this.lives--;
    this.snd(sfx.lost);
    if (this.lives <= 0) return this.die();
    this.say(text, 1500, true);
  }
  die() {
    this.lives = 0; this.dead = true; this.diedAt = this.el; this.balls = []; this.drops = []; this.shots = [];
    this.say('Sanie przygniecione. Koniec rundy.', 4000, true);
    if (this.hooks.onEnd) this.hooks.onEnd('dead');
  }
  finish() { if (this.done || this.dead) return; this.done = true; this.balls = []; this.drops = []; this.shots = []; if (this.hooks.onEnd) this.hooks.onEnd('time'); }
  stepFx(dt) {
    this.t += dt;
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) { f.life -= dt; f.y -= 40 * dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
    this.flash = Math.max(0, this.flash - dt);
  }
  // inp: { left, right, launch }, el: ms od startu rundy (wspólny zegar)
  step(dt, inp, el) {
    this.stepFx(dt);
    if (this.dead || this.done) return;
    this.el = el;
    if (inp.left) this.tx -= 640 * dt;
    if (inp.right) this.tx += 640 * dt;
    if (inp.axis) this.tx += inp.axis * 700 * dt;
    this.pw = this.wideT > 0 ? PW_WIDE : PW;
    const pw = this.pw;
    this.tx = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, this.tx));
    this.px += (this.tx - this.px) * Math.min(1, dt * 22);
    this.wideT = Math.max(0, this.wideT - dt); this.slowT = Math.max(0, this.slowT - dt); this.laserT = Math.max(0, this.laserT - dt);

    // mur zjeżdża coraz szybciej, ataki rywala dopychają go w dół
    const [s0, s1] = this.tempo;
    const spr = s0 - (s0 - s1) * Math.min(1, el / (ROUND_MS - 15000));
    let dy = (PITCH / spr) * dt;
    if (this.pushPx > 0) { const p = Math.min(this.pushPx, 260 * dt); dy += p; this.pushPx -= p; }
    this.wallY += dy;
    while (this.wallY > CEIL) this.addRow(false);
    let low = -Infinity, maxR = -1;
    for (const b of this.bricks) { low = Math.max(low, this.by(b) + BH); maxR = Math.max(maxR, b.r); }
    if (low >= DANGER) {
      for (const b of this.bricks.filter((x) => x.r >= maxR - 3)) this.burst(brickX(b.c) + BW / 2, this.by(b) + BH / 2, TYPES[b.type].col, 4);
      this.bricks = this.bricks.filter((x) => x.r < maxR - 3);
      this.wallVer++;
      this.flash = 1;
      this.loseLife('Mur Dziada dojechał do sań!');
      if (this.dead) return;
    }

    if (this.mode === 'serve') {
      const b = this.balls[0]; b.x = this.px; b.y = PY - BR - 1;
      this.serveT -= dt;
      if (inp.launch || this.serveT <= 0) this.launch();
      return;
    }
    if (this.laserT > 0) {
      this.laserCd -= dt;
      if (this.laserCd <= 0) { this.laserCd = 0.32; this.shots.push({ x: this.px - pw / 2 + 7, y: PY - 8 }, { x: this.px + pw / 2 - 7, y: PY - 8 }); this.snd(sfx.laser); }
    }
    for (const s of this.shots) {
      s.y -= 760 * dt;
      const br = this.bricks.find((b) => s.x > brickX(b.c) && s.x < brickX(b.c) + BW && s.y > this.by(b) && s.y < this.by(b) + BH);
      if (br) { s.dead = true; this.hitBrick(br, true); }
      if (s.y < CEIL) s.dead = true;
    }
    this.shots = this.shots.filter((s) => !s.dead);
    for (const d of this.drops) {
      d.y += 170 * dt;
      if (d.y + 11 > PY && d.y - 11 < PY + PH && Math.abs(d.x - this.px) < pw / 2 + 10) { d.dead = true; this.power(d.type); }
      if (d.y > H + 20) d.dead = true;
    }
    this.drops = this.drops.filter((d) => !d.dead);

    const slow = this.slowT > 0 ? 0.68 : 1;
    for (const b of this.balls) {
      const speed = Math.hypot(b.vx, b.vy) * slow;
      const n = Math.max(1, Math.ceil((speed * dt) / 4));
      const sdt = (dt * slow) / n;
      for (let i = 0; i < n && !b.dead; i++) {
        b.x += b.vx * sdt; b.y += b.vy * sdt;
        if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); }
        if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
        if (b.y < CEIL + BR) { b.y = CEIL + BR; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + BR >= PY && b.y - BR <= PY + PH && b.x >= this.px - pw / 2 - BR && b.x <= this.px + pw / 2 + BR) {
          const off = Math.max(-1, Math.min(1, (b.x - this.px) / (pw / 2)));
          const ang = off * 1.05;
          this.hits++; this.chain = 0;
          b.sp = Math.max(b.sp, this.speed());
          b.vx = Math.sin(ang) * b.sp; b.vy = -Math.cos(ang) * b.sp; b.y = PY - BR;
          this.snd(sfx.paddle);
        }
        for (const br of this.bricks) {
          const x0 = brickX(br.c), y0 = this.by(br);
          const cx = Math.max(x0, Math.min(b.x, x0 + BW)), cy = Math.max(y0, Math.min(b.y, y0 + BH));
          const dx = b.x - cx, dy2 = b.y - cy;
          if (dx * dx + dy2 * dy2 > BR * BR) continue;
          const ox = Math.min(b.x + BR - x0, x0 + BW - (b.x - BR)), oy = Math.min(b.y + BR - y0, y0 + BH - (b.y - BR));
          if (ox < oy) b.vx = b.x < x0 + BW / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
          else b.vy = b.y < y0 + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          this.hitBrick(br, false);
          break;
        }
        if (Math.abs(b.vy) < b.sp * 0.22) { b.vy = (b.vy < 0 ? -1 : 1) * b.sp * 0.22; b.vx = Math.sign(b.vx || 1) * Math.sqrt(b.sp * b.sp - b.vy * b.vy); }
        if (b.y - BR > H) b.dead = true;
      }
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
    }
    this.balls = this.balls.filter((b) => !b.dead);
    if (!this.balls.length) {
      this.loseLife('Śnieżka przepadła w zaspie.');
      if (!this.dead) this.serve();
    }
  }
  // Stan do przesłania (ok. 15 razy na sekundę). Mur tylko, gdy się zmienił.
  snap() {
    const r = (v) => Math.round(v);
    return {
      px: r(this.px), pw: this.pw, sc: this.score, l: this.lives, wy: Math.round(this.wallY * 10) / 10,
      b: this.balls.map((b) => [r(b.x), r(b.y), r(b.vx), r(b.vy)]),
      d: this.drops.map((d) => [r(d.x), r(d.y), d.type]),
      s: this.shots.map((s) => [r(s.x), r(s.y)]),
      fx: (this.wideT > 0 ? 1 : 0) + (this.slowT > 0 ? 2 : 0) + (this.laserT > 0 ? 4 : 0) + (this.flash > 0 ? 8 : 0),
      st: this.dead ? 'dead' : this.done ? 'done' : 'play', at: this.diedAt, tx: this.toast && performance.now() < this.toast.until ? this.toast.text : '',
    };
  }
  wallStr() { return this.bricks.map((b) => `${b.id}.${b.r}.${b.c}.${b.type}.${b.hp}`).join(' '); }
}

// Lustro planszy rywala: odtwarza stan z przesyłanych migawek, między nimi przesuwa śnieżki.
export class Mirror {
  constructor() {
    this.bricks = []; this.balls = []; this.drops = []; this.shots = []; this.parts = []; this.floats = [];
    this.score = 0; this.lives = 3; this.px = W / 2; this.pw = PW; this.wallY = TOP; this.wallS = '';
    this.wideT = this.slowT = this.laserT = 0; this.flash = 0; this.dead = false; this.done = false; this.toast = null; this.age = 0; this.seen = false;
  }
  by(b) { return this.wallY + b.r * PITCH; }
  apply(st) {
    if (!st) return;
    const m = st.m || {};
    this.seen = true;
    this.px = m.px ?? this.px; this.pw = m.pw ?? this.pw; this.score = m.sc ?? 0; this.lives = m.l ?? 3; this.wallY = m.wy ?? this.wallY;
    const prevBalls = this.balls;
    this.balls = (m.b || []).map(([x, y, vx, vy], i) => ({ x, y, vx, vy, trail: prevBalls[i] ? prevBalls[i].trail.slice(-6) : [] }));
    this.drops = (m.d || []).map(([x, y, type]) => ({ x, y, type }));
    this.shots = (m.s || []).map(([x, y]) => ({ x, y }));
    const fx = m.fx || 0;
    this.wideT = fx & 1; this.slowT = fx & 2; this.laserT = fx & 4;
    if (fx & 8) this.flash = Math.max(this.flash, 0.3);
    this.dead = m.st === 'dead'; this.done = m.st === 'done'; this.diedAt = m.at || 0;
    this.toast = m.tx ? { text: m.tx, until: performance.now() + 300, hot: true } : null;
    if (st.w != null && st.w !== this.wallS) {
      const next = st.w ? st.w.split(' ').map((s) => { const [id, r, c, type, hp] = s.split('.'); return { id: +id, r: +r, c: +c, type, hp: +hp }; }) : [];
      const ids = new Set(next.map((b) => b.id));
      for (const b of this.bricks) if (!ids.has(b.id) && this.by(b) + BH < DANGER - 4) {
        const x = brickX(b.c) + BW / 2, y = this.by(b) + BH / 2;
        for (let i = 0; i < 10; i++) this.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-200, 60), life: rand(0.4, 0.8), col: TYPES[b.type].col, r: rand(1.2, 3) });
      }
      this.bricks = next; this.wallS = st.w;
    }
    this.age = 0;
  }
  step(dt) {
    this.age += dt;
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.flash = Math.max(0, this.flash - dt);
    if (this.age < 0.2) for (const b of this.balls) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < BR || b.x > W - BR) { b.vx = -b.vx; b.x = Math.max(BR, Math.min(W - BR, b.x)); }
      if (b.y < CEIL + BR) { b.vy = Math.abs(b.vy); }
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
    }
  }
}

// Kto wygrał rundę. res: { score, dead, at } albo null (brak meldunku). null = remis.
export function decide(a, b) {
  const da = !!(a && a.dead), db = !!(b && b.dead);
  if (da && !db) return 'b';
  if (db && !da) return 'a';
  if (da && db) return a.at === b.at ? (a.score === b.score ? null : a.score > b.score ? 'a' : 'b') : a.at > b.at ? 'a' : 'b';
  const sa = a ? a.score : 0, sb = b ? b.score : 0;
  return sa === sb ? null : sa > sb ? 'a' : 'b';
}

// ───────────── rysowanie ─────────────
export const flakes = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.6, 2), v: rand(12, 40), d: rand(0, 6) }));
let flakeT = 0;
export function stepFlakes(dt) { flakeT += dt; for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin((flakeT + f.d) * 0.8) * 8 * dt; if (f.y > H) { f.y = -4; f.x = rand(0, W); } } }

// o: { name, count (tekst odliczania), banner }
export function drawBoard(ctx, B, o = {}) {
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#081311'); bg.addColorStop(1, '#040908');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(233,229,221,.55)';
  for (const f of flakes) { ctx.globalAlpha = 0.25 + f.r / 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(233,229,221,.06)'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 18 - Math.sin(x / 70) * 6); ctx.lineTo(W, H); ctx.fill();
  // linia zagrożenia
  ctx.strokeStyle = 'rgba(255,106,57,.28)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, DANGER + 0.5); ctx.lineTo(W, DANGER + 0.5); ctx.stroke(); ctx.setLineDash([]);
  if (!B) return;
  // mur
  ctx.save(); ctx.beginPath(); ctx.rect(0, CEIL, W, H - CEIL); ctx.clip();
  for (const br of B.bricks) ctx.drawImage(spriteFor(br.type, br.hp), brickX(br.c), B.by(br), BW, BH);
  ctx.restore();
  // pasek wyniku
  ctx.fillStyle = '#040908'; ctx.fillRect(0, 0, W, CEIL);
  ctx.fillStyle = 'rgba(233,229,221,.12)'; ctx.fillRect(0, CEIL, W, 1);
  ctx.font = '400 12px "JetBrains Mono", monospace'; ctx.fillStyle = '#66746f'; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('WYNIK', SIDE, 22);
  ctx.textAlign = 'center'; ctx.fillText('AGENT', W / 2, 22);
  ctx.textAlign = 'right'; ctx.fillText('SANIE', W - SIDE, 22);
  ctx.font = '500 24px Sterling, Inter, sans-serif'; ctx.fillStyle = '#E9E5DD';
  ctx.textAlign = 'left'; ctx.fillText(fmt(B.score), SIDE, 48);
  ctx.textAlign = 'center'; ctx.fillText(o.name || '', W / 2, 48);
  for (let i = 0; i < B.lives; i++) { ctx.fillStyle = '#FF6A39'; ctx.beginPath(); ctx.roundRect(W - SIDE - 22 - i * 28, 36, 22, 8, [4, 2, 2, 4]); ctx.fill(); ctx.fillStyle = '#E9E5DD'; ctx.fillRect(W - SIDE - 22 - i * 28 + 2, 46, 20, 1.6); }

  for (const d of B.drops) drawPower(ctx, d.type, d.x, d.y);
  ctx.fillStyle = '#FF6A39';
  for (const s of B.shots) ctx.fillRect(s.x - 1.5, s.y, 3, 12);
  for (const p of B.parts) { ctx.globalAlpha = Math.max(0, p.life * 1.4); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.r, p.r); }
  ctx.globalAlpha = 1;
  if (!B.dead) drawSled(ctx, B.px, PY, B.pw, B.laserT > 0);
  for (const b of B.balls) {
    b.trail.forEach((p, i) => { ctx.globalAlpha = (i / b.trail.length) * 0.25; ctx.fillStyle = '#E9E5DD'; ctx.beginPath(); ctx.arc(p.x, p.y, BR * (i / b.trail.length), 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BR);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, B.slowT > 0 ? '#d8b48a' : '#b9c6c4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 7); ctx.fill();
  }
  ctx.textAlign = 'center';
  for (const f of B.floats) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = f.big ? '500 15px Sterling, Inter, sans-serif' : '400 12px "JetBrains Mono", monospace'; ctx.fillStyle = f.big ? '#FF6A39' : '#E9E5DD'; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
  if (B.flash > 0) { ctx.fillStyle = `rgba(255,106,57,${Math.min(0.22, B.flash * 0.3)})`; ctx.fillRect(0, CEIL, W, H - CEIL); }
  if (B.dead || B.done) { ctx.fillStyle = 'rgba(4,9,8,.6)'; ctx.fillRect(0, CEIL, W, H - CEIL); }
  if (B.toast && performance.now() < B.toast.until) {
    ctx.font = '500 24px Sterling, Inter, sans-serif'; ctx.fillStyle = B.toast.hot ? '#FF6A39' : '#E9E5DD';
    ctx.fillText(B.toast.text, W / 2, 560);
  }
  if (o.count) {
    ctx.fillStyle = 'rgba(4,9,8,.55)'; ctx.fillRect(0, CEIL, W, H - CEIL);
    ctx.font = '500 120px Sterling, Inter, sans-serif'; ctx.fillStyle = '#E9E5DD'; ctx.fillText(o.count, W / 2, 470);
  }
  if (o.banner) {
    ctx.fillStyle = 'rgba(4,9,8,.82)'; ctx.fillRect(0, 330, W, 150);
    ctx.font = '500 40px Sterling, Inter, sans-serif'; ctx.fillStyle = o.banner.hot ? '#FF6A39' : '#E9E5DD'; ctx.fillText(o.banner.h, W / 2, 400);
    if (o.banner.p) { ctx.font = '400 18px Inter, sans-serif'; ctx.fillStyle = '#a3aea9'; ctx.fillText(o.banner.p, W / 2, 440); }
  }
}
