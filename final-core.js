// Wspólny silnik graficzny i dźwiękowy finału (wycięty z gra.js 25.11; gra.js zostaje bez zmian do 7.12).

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('pl-PL').replace(/\s/g, ' ');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* bez pamięci */ } } };

// Paczki Dziada: punkty, wytrzymałość, kolor.
const TYPES = {
  1: { name: 'Kozie skarpety', pts: 10, hp: 1, col: '#8b8070', desc: 'Po założeniu pachną tak, jakby koza nadal w nich była.' },
  2: { name: 'Zeszłoroczny kalendarz', pts: 15, hp: 1, col: '#d9d2c3', desc: 'Same terminy, których już nie da się dotrzymać.' },
  3: { name: 'Mrożona rzepa', pts: 20, hp: 1, col: '#9c88b8', desc: 'Dziad zaleca rozmrażać do Wielkanocy.' },
  4: { name: 'Kaszanka w sreberku', pts: 30, hp: 1, col: '#7a2f2a', desc: 'Sreberko szeleści jak po czekoladzie. Na tym koniec podobieństw.' },
  5: { name: 'Galareta z nóżek', pts: 40, hp: 2, col: '#c9a04a', desc: 'Trzęsie się przy każdym stuknięciu. Trzeba trafić dwa razy.' },
  6: { name: 'Gryzący sweter', pts: 50, hp: 3, col: '#3f6b52', desc: 'Gryzie nawet przez papier pakowy. Trzy trafienia.' },
  '#': { name: 'Sejf Dziada', pts: 0, hp: Infinity, col: '#2a3533', desc: 'Nie do rozbicia. Trzeba go obejść.' },
};
const POWERS = {
  E: { name: 'Elf mechanik', desc: 'Poszerza sanie na 12 sekund.', col: '#3f8f5a' },
  C: { name: 'Gorąca czekolada', desc: 'Spowalnia śnieżkę na 10 sekund.', col: '#8a5a3c' },
  T: { name: 'Potrójna śnieżka', desc: 'Rozdziela śnieżkę na trzy.', col: '#cfd8dc' },
  P: { name: 'Panel fotowoltaiczny', desc: 'Sanie strzelają laserem przez 8 sekund.', col: '#2f4c6e' },
  L: { name: 'Zapasowe sanie', desc: 'Dodatkowe życie. Rzadkość.', col: '#FF6A39' },
};

// ───────────── dźwięk ─────────────
let AC = null;
let soundOn = store.get('gra-dzwiek') !== '0';
function blip(f, d = 0.06, type = 'square', v = 0.05, slide = 0) {
  if (!soundOn) return;
  try {
    AC ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), AC.currentTime + d);
    g.gain.setValueAtTime(v, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d + 0.02);
  } catch { /* brak dźwięku */ }
}
const sfx = {
  paddle: () => blip(330, 0.05, 'triangle', 0.07),
  brick: (t) => blip(440 + t * 70, 0.05, 'square', 0.035),
  steel: () => blip(160, 0.05, 'square', 0.03),
  power: () => { blip(660, 0.07, 'triangle', 0.06); setTimeout(() => blip(990, 0.09, 'triangle', 0.06), 70); },
  lost: () => blip(300, 0.35, 'sawtooth', 0.04, -220),
  clear: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'triangle', 0.06), i * 90)),
  laser: () => blip(1200, 0.04, 'sawtooth', 0.015, -500),
};

// ───────────── muzyka: własne 8-bitowe aranżacje melodii z domeny publicznej ─────────────
// Syntetyzowane w przeglądarce, bez plików. Każdy magazyn ma inny utwór, tempo i warstwy rosną z poziomem.
// Bas dobierany automatycznie do melodii (akord, który najlepiej pasuje do nut w takcie).
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const parseNote = (n) => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1); };
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const seq = (str) => str.trim().split(/\s+/).map((t) => { const [n, d] = t.split(':'); return [n, Number(d || 1)]; });
const TRACKS = [
  { name: 'Jingle Bells', key: 'C', bpb: 4, tempo: 138, m: `
    G4 E5 D5 C5 G4:3 G4:0.5 G4:0.5 G4 E5 D5 C5 A4:4 A4 F5 E5 D5 B4:4 G5 G5 F5 D5 E5:4
    G4 E5 D5 C5 G4:4 G4 E5 D5 C5 A4:3 A4 A4 F5 E5 D5 G5 G5 G5 G5 A5 G5 F5 D5 C5:2 G5:2
    E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:0.5 E5:4 F5 F5 F5:1.5 F5:0.5 F5 E5 E5 E5:0.5 E5:0.5 E5 D5 D5 E5 D5:2 G5:2
    E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:0.5 E5:4 F5 F5 F5:1.5 F5:0.5 F5 E5 E5 E5:0.5 E5:0.5 G5 G5 F5 D5 C5:4` },
  { name: 'Deck the Halls', key: 'C', bpb: 4, tempo: 132, m: `
    G5:1.5 F5:0.5 E5 D5 C5 D5 E5 C5 D5:0.5 E5:0.5 F5:0.5 D5:0.5 E5:1.5 D5:0.5 C5 B4 C5:2
    G5:1.5 F5:0.5 E5 D5 C5 D5 E5 C5 D5:0.5 E5:0.5 F5:0.5 D5:0.5 E5:1.5 D5:0.5 C5 B4 C5:2
    D5:1.5 E5:0.5 F5 D5 E5:1.5 F5:0.5 G5 D5 E5:0.5 F#5:0.5 G5 A5:0.5 B5:0.5 C6 B5 A5 G5:2
    G5:1.5 F5:0.5 E5 D5 C5 D5 E5 C5 A5:0.5 A5:0.5 A5:0.5 A5:0.5 G5:1.5 F5:0.5 E5 D5 C5:2` },
  { name: 'Szczedryk', key: 'Gm', bpb: 3, tempo: 152, m: `
    Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4
    D5 C5:0.5 D5:0.5 Bb4 D5 C5:0.5 D5:0.5 Bb4 F5 Eb5:0.5 F5:0.5 D5 F5 Eb5:0.5 F5:0.5 D5
    G5 F5:0.5 G5:0.5 Eb5 G5 F5:0.5 G5:0.5 Eb5 D5 C5:0.5 D5:0.5 Bb4 D5 C5:0.5 D5:0.5 Bb4
    Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4 A4 G4:0.5 A4:0.5 F#4 G4:3` },
  { name: 'We Wish You a Merry Christmas', key: 'C', bpb: 3, tempo: 160, m: `
    R:2 G4 C5 C5:0.5 D5:0.5 C5:0.5 B4:0.5 A4 A4 A4 D5 D5:0.5 E5:0.5 D5:0.5 C5:0.5 B4 G4 G4
    E5 E5:0.5 F5:0.5 E5:0.5 D5:0.5 C5 A4 G4:0.5 G4:0.5 A4 D5 B4 C5:2 G4
    C5 C5 C5 B4:2 B4 C5 B4 A4 G4:2 D5 E5 D5 C5 G5 G4 G4:0.5 G4:0.5 A4 D5 B4 C5:3` },
  { name: 'God Rest Ye Merry Gentlemen', key: 'Am', bpb: 4, tempo: 140, m: `
    R:3 A4 A4 E5 E5 D5 C5 B4 A4 G4 A4 B4 C5 D5 E5:3 A4
    A4 E5 E5 D5 C5 B4 A4 G4 A4 B4 C5 D5 E5:3 E5
    F5 D5 E5 F5 G5 A5 E5 D5 C5 A4 B4 C5 D5 E5:3 E5
    E5 D5 C5 B4 A4 C5:0.5 B4:0.5 A4 G4 A4:4` },
  { name: 'Joy to the World', key: 'C', bpb: 4, tempo: 128, m: `
    C6:2 B5:1.5 A5:0.5 G5:3 F5 E5:2 D5:2 C5:3 G5 A5:3 A5 B5:3 B5 C6:4
    C6 C6 B5 A5 G5 G5:1.5 F5:0.5 E5 C6 C6 B5 A5 G5 G5:1.5 F5:0.5 E5
    E5 E5 E5 E5 E5:0.5 F5:0.5 G5:3 F5:0.5 E5:0.5 D5 D5 D5 D5:0.5 E5:0.5 F5:3 E5:0.5 D5:0.5
    C5 C6:2 A5 G5:1.5 F5:0.5 E5 F5 E5:2 D5:2 C5:4` },
  { name: 'Hark! The Herald Angels Sing', key: 'C', bpb: 4, tempo: 134, m: `
    G4 C5 C5:1.5 B4:0.5 C5 E5 E5 D5 G5 G5 G5:1.5 F5:0.5 E5 D5 E5:2
    G4 C5 C5:1.5 B4:0.5 C5 E5 E5 D5 G5 D5 D5:1.5 C5:0.5 B4 A4 B4:2
    G5 G5 G5 C5 F5 E5 E5 D5 G5 G5 G5 C5 F5 E5 E5 D5
    A5 A5 A5 G5 F5 E5 F5:2 D5 E5 F5 G5 C5:1.5 C5:0.5 D5 E5:2 A5:1.5 A5:0.5 A5 G5 F5 E5 F5:2 D5 E5 F5 G5 C5:1.5 C5:0.5 D5 C5:2` },
  { name: 'Silent Night', key: 'C', bpb: 3, tempo: 168, m: `
    G4:1.5 A4:0.5 G4 E4:3 G4:1.5 A4:0.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3
    A4:2 A4 C5:1.5 B4:0.5 A4 G4:1.5 A4:0.5 G4 E4:3 A4:2 A4 C5:1.5 B4:0.5 A4 G4:1.5 A4:0.5 G4 E4:3
    D5:2 D5 F5:1.5 D5:0.5 B4 C5:3 E5:3 C5 G4 E4 G4:1.5 F4:0.5 D4 C4:6` },
  { name: 'Good King Wenceslas', key: 'G', bpb: 4, tempo: 144, m: `
    G4 G4 G4 A4 G4 G4 D4:2 E4 D4 E4 F#4 G4:2 G4:2
    G4 G4 G4 A4 G4 G4 D4:2 E4 D4 E4 F#4 G4:2 G4:2
    D5 C5 B4 A4 B4 A4 G4:2 E4 D4 E4 F#4 G4:2 G4:2
    D4 D4 E4 F#4 G4 G4 A4:2 D5 C5 B4 A4 G4:2 C5:2 G4:4` },
  { name: 'Ding Dong Merrily on High', key: 'G', bpb: 4, tempo: 136, m: `
    G4 G4 A4:0.5 G4:0.5 F#4:0.5 E4:0.5 D4:2 D4:2 E4 G4 G4 F#4 G4:2 G4:2
    G4 G4 A4:0.5 G4:0.5 F#4:0.5 E4:0.5 D4:2 D4:2 E4 G4 G4 F#4 G4:2 G4:2
    D5:1.5 C5:0.5 B4:0.5 C5:0.5 D5:0.5 B4:0.5 C5:1.5 B4:0.5 A4:0.5 B4:0.5 C5:0.5 A4:0.5
    B4:1.5 A4:0.5 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:1.5 G4:0.5 F#4:0.5 G4:0.5 A4:0.5 F#4:0.5
    G4:1.5 F#4:0.5 E4 G4 G4 F#4 G4:2 D5:1.5 C5:0.5 B4:0.5 C5:0.5 D5:0.5 B4:0.5 C5:1.5 B4:0.5 A4:0.5 B4:0.5 C5:0.5 A4:0.5
    B4:1.5 A4:0.5 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:1.5 G4:0.5 F#4:0.5 G4:0.5 A4:0.5 F#4:0.5 G4:1.5 F#4:0.5 E4 G4 G4 F#4 G4:4` },
];
// Akordy dla tonacji: [stopień w półtonach, molowy?]. Kolejność = pierwszeństwo przy remisie.
const KEYS = { C: [0, false], G: [7, false], Am: [9, true], Gm: [7, true] };
const DEG = { major: [[0, 0], [7, 0], [5, 0], [9, 1], [2, 1]], minor: [[0, 1], [7, 0], [5, 1], [8, 0], [3, 0]] };
function prepare(tr) {
  if (tr.ev) return tr;
  const notes = seq(tr.m);
  let beat = 0; tr.ev = [];
  for (const [n, d] of notes) { if (n !== 'R') tr.ev.push({ beat, midi: parseNote(n), d }); beat += d; }
  tr.len = Math.ceil(beat / tr.bpb) * tr.bpb;
  const [tonic, minor] = KEYS[tr.key];
  const cands = (minor ? DEG.minor : DEG.major).map(([deg, min]) => { const r = (tonic + deg) % 12; return { r, pcs: [r, (r + (min ? 3 : 4)) % 12, (r + 7) % 12] }; });
  tr.bass = [];
  for (let b = 0; b < tr.len / tr.bpb; b++) {
    const s0 = b * tr.bpb, s1 = s0 + tr.bpb;
    let best = cands[0], bestSc = -1;
    cands.forEach((c, i) => {
      let sc = 0;
      for (const e of tr.ev) { const o = Math.min(s1, e.beat + e.d) - Math.max(s0, e.beat); if (o > 0 && c.pcs.includes(e.midi % 12)) sc += o * (e.beat >= s0 && e.beat < s0 + 0.01 ? 1.5 : 1); }
      sc -= i * 0.01;
      if (sc > bestSc) { bestSc = sc; best = c; }
    });
    tr.bass.push(36 + ((best.r + 12 - 0) % 12) + (best.r < 4 ? 12 : 0));
  }
  return tr;
}
let musicOn = store.get('gra-muzyka') !== '0';
let trackOffset = Math.floor(Math.random() * TRACKS.length);
const MUSIC = {
  timer: 0, track: null, beat: 0, next: 0, bus: null, level: 1, playing: false,
  ctx() { AC ||= new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; },
  start(level) {
    if (!musicOn) return;
    const ac = this.ctx();
    this.stop(true);
    this.level = level;
    this.track = prepare(TRACKS[(level - 1 + trackOffset) % TRACKS.length]);
    this.beat = 0; this.next = ac.currentTime + 0.08;
    this.bus = ac.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(ac.destination);
    this.bus.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.4);
    this.playing = true;
    this.timer = setInterval(() => this.tick(), 25);
  },
  tempo() { return Math.min(this.track.tempo + 48, this.track.tempo + 6 * (this.level - 1)); },
  stop(now) {
    clearInterval(this.timer); this.timer = 0; this.playing = false;
    if (this.bus && AC) { const b = this.bus; try { b.gain.cancelScheduledValues(AC.currentTime); b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), AC.currentTime); b.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + (now ? 0.05 : 0.6)); } catch { /* */ } setTimeout(() => b.disconnect(), 800); }
    this.bus = null;
  },
  pause() { if (AC && this.playing) AC.suspend(); },
  resume() { if (AC && this.playing) AC.resume(); },
  voice(type, f, t, d, v, opt = {}) {
    const ac = AC, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.008; l.connect(lg).connect(o.frequency); l.start(t + 0.08); l.stop(t + d + 0.05); }
    if (opt.drop) o.frequency.exponentialRampToValueAtTime(opt.drop, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.setValueAtTime(v * 0.8, t + Math.max(0.01, d * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + d + 0.02);
  },
  noise(t, d, v, hp) {
    const ac = AC;
    NOISE ||= (() => { const b = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const c = b.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; return b; })();
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = NOISE; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(this.bus); s.start(t); s.stop(t + d + 0.02);
  },
  tick() {
    if (!this.bus || !AC) return;
    const spb = 60 / this.tempo(), tr = this.track, L = this.level;
    while (this.next < AC.currentTime + 0.12) {
      const t = this.next, b0 = this.beat % tr.len;
      // melodia: nuty zaczynające się w tej ósemce
      for (const e of tr.ev) {
        if (e.beat >= b0 - 1e-6 && e.beat < b0 + 0.5 - 1e-6) {
          const tt = t + (e.beat - b0) * spb, f = hz(e.midi);
          this.voice('square', f, tt, e.d * spb * 0.9, 0.07, { vib: e.d >= 2 });
          if (L >= 3) this.voice('triangle', f * 2, tt, Math.min(0.2, e.d * spb * 0.5), 0.028);
        }
      }
      const step = Math.round(b0 * 2), inBar = step % (tr.bpb * 2);
      const root = hz(tr.bass[Math.floor(b0 / tr.bpb)]);
      if (step % 2 === 0) this.voice('triangle', tr.bpb === 4 && inBar % 4 === 2 ? root * 1.5 : root, t, spb * 0.8, 0.13);
      else if (L >= 2) this.voice('triangle', root * 2, t, spb * 0.35, 0.05);
      // dzwoneczki sań
      if (L >= 2) { this.noise(t, 0.05, step % 2 ? 0.022 : 0.04, 7000); this.noise(t + spb / 4, 0.04, 0.016, 8000); }
      // stopa i werbel od 4. magazynu
      if (L >= 4) {
        if (inBar === 0 || (tr.bpb === 4 && inBar === 4)) this.voice('sine', 140, t, 0.16, 0.22, { drop: 45 });
        if ((tr.bpb === 4 && (inBar === 2 || inBar === 6)) || (tr.bpb === 3 && inBar === 3)) this.noise(t, 0.12, 0.08, 1800);
      }
      this.beat += 0.5;
      this.next += spb / 2;
    }
  },
};
let NOISE = null;


const PY = 738, PH = 14, PW = 96, PW_WIDE = 150, BR = 8;

export const W = 600, H = 800, TOP = 96, SIDE = 24, GAP = 6, BW = (W - SIDE * 2 - GAP * 9) / 10, BH = 24;

// Grafika paczek rysowana raz do bufora.
const sprite = new Map();
function drawPackage(g, type, hp, w, h) {
  const t = TYPES[type];
  g.clearRect(0, 0, w, h);
  const r = 3;
  const path = () => { g.beginPath(); g.roundRect(0.5, 0.5, w - 1, h - 1, r); };
  if (type === '#') {
    path(); g.fillStyle = t.col; g.fill(); g.strokeStyle = '#4a5754'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#5d6b67';
    [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]].forEach(([x, y]) => { g.beginPath(); g.arc(x + 1, y + 1, 1.6, 0, 7); g.fill(); });
    g.strokeStyle = '#536260'; g.beginPath(); g.arc(w / 2, h / 2, 5, 0, 7); g.stroke();
    return;
  }
  path(); g.fillStyle = t.col; g.fill();
  // papier: lekki połysk u góry
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
  path(); g.fillStyle = gr; g.fill();
  // wstążka
  const ribbon = type === 2 ? '#a63a2b' : 'rgba(233,229,221,.55)';
  g.fillStyle = ribbon; g.fillRect(w * 0.62, 0, 3, h); g.fillRect(0, h / 2 - 1.5, w, 3);
  // piktogram po lewej
  g.save(); g.translate(13, h / 2);
  g.lineWidth = 1.6; g.strokeStyle = type === 2 ? '#2a2a2a' : 'rgba(10,14,12,.75)'; g.fillStyle = g.strokeStyle;
  switch (Number(type)) {
    case 1: g.beginPath(); g.moveTo(-3, -7); g.lineTo(2, -7); g.lineTo(2, 2); g.lineTo(6, 4); g.lineTo(5, 7); g.lineTo(-3, 6); g.closePath(); g.stroke(); break; // skarpeta
    case 2: g.strokeRect(-6, -6, 12, 12); g.beginPath(); for (let i = -2; i <= 4; i += 3) { g.moveTo(-6, i); g.lineTo(6, i); } g.moveTo(-2, -3); g.lineTo(-2, 6); g.moveTo(2, -3); g.lineTo(2, 6); g.stroke(); break; // kalendarz
    case 3: g.beginPath(); g.arc(0, 2, 5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, -3); g.lineTo(-3, -8); g.moveTo(0, -3); g.lineTo(3, -8); g.moveTo(0, 7); g.lineTo(0, 9); g.stroke(); break; // rzepa
    case 4: g.beginPath(); g.ellipse(0, 0, 8, 3.6, -0.35, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-8, 3); g.lineTo(-10, 5); g.moveTo(8, -3); g.lineTo(10, -5); g.stroke(); break; // kaszanka
    case 5: g.strokeRect(-5, -4, 10, 10); g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.stroke(); g.beginPath(); g.moveTo(-3, 1); g.quadraticCurveTo(0, -2, 3, 1); g.stroke(); break; // słoik
    case 6: g.beginPath(); g.moveTo(-4, -7); g.lineTo(4, -7); g.lineTo(8, -3); g.lineTo(5, -1); g.lineTo(5, 7); g.lineTo(-5, 7); g.lineTo(-5, -1); g.lineTo(-8, -3); g.closePath(); g.stroke(); break; // sweter
  }
  g.restore();
  // pęknięcia, gdy paczka jest nadwyrężona
  if (hp < t.hp) {
    g.strokeStyle = 'rgba(4,9,8,.7)'; g.lineWidth = 1.2; g.beginPath();
    g.moveTo(w * 0.3, 0); g.lineTo(w * 0.38, h * 0.45); g.lineTo(w * 0.3, h * 0.6); g.lineTo(w * 0.42, h);
    if (t.hp - hp > 1) { g.moveTo(w * 0.8, 0); g.lineTo(w * 0.72, h * 0.5); g.lineTo(w * 0.84, h); }
    g.stroke();
  }
}
function spriteFor(type, hp) {
  const k = `${type}:${hp}`;
  if (!sprite.has(k)) {
    const c = document.createElement('canvas'); const dpr = 2;
    c.width = Math.ceil(BW * dpr); c.height = BH * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr); drawPackage(g, type, hp, BW, BH);
    sprite.set(k, c);
  }
  return sprite.get(k);
}
function drawPower(g, type, x, y, r = 11) {
  const p = POWERS[type];
  g.save(); g.translate(x, y);
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = p.col; g.fill();
  g.strokeStyle = 'rgba(233,229,221,.8)'; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = g.fillStyle = '#f4f1ea'; g.lineWidth = 1.6;
  if (type === 'E') { g.beginPath(); g.moveTo(-6, 5); g.lineTo(0, -7); g.lineTo(6, 5); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -7, 2, 0, 7); g.fillStyle = '#FF6A39'; g.fill(); }
  if (type === 'C') { g.strokeRect(-5, -3, 8, 8); g.beginPath(); g.arc(4, 1, 3, -1.4, 1.4); g.stroke(); g.beginPath(); g.moveTo(-3, -5); g.quadraticCurveTo(-1, -8, 0, -5); g.stroke(); }
  if (type === 'T') { [[-4, 2], [4, 2], [0, -5]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2.8, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#7d8b88'; g.lineWidth = .8; g.stroke(); }); }
  if (type === 'P') { g.strokeRect(-6, -5, 12, 10); g.beginPath(); g.moveTo(-2, -5); g.lineTo(-2, 5); g.moveTo(2, -5); g.lineTo(2, 5); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke(); }
  if (type === 'L') { g.beginPath(); g.moveTo(-6, -2); g.lineTo(5, -2); g.lineTo(5, 2); g.lineTo(-6, 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-7, 5); g.lineTo(6, 5); g.quadraticCurveTo(9, 5, 8, 2); g.stroke(); }
  g.restore();
}
function drawSled(g, x, y, w, laser) {
  g.save(); g.translate(x, y);
  // płozy
  g.strokeStyle = '#E9E5DD'; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-w / 2 + 4, PH + 3); g.lineTo(w / 2 - 2, PH + 3); g.quadraticCurveTo(w / 2 + 8, PH + 3, w / 2 + 6, PH - 5); g.stroke();
  g.beginPath(); g.moveTo(-w / 2 + 12, PH); g.lineTo(-w / 2 + 12, PH + 3); g.moveTo(w / 2 - 12, PH); g.lineTo(w / 2 - 12, PH + 3); g.stroke();
  // skrzynia sań
  g.beginPath(); g.roundRect(-w / 2, 0, w, PH, [7, 3, 3, 7]); g.fillStyle = '#FF6A39'; g.fill();
  g.fillStyle = 'rgba(20,10,5,.25)'; g.fillRect(-w / 2 + 6, PH - 4, w - 12, 2);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-w / 2 + 6, 2, w - 12, 2);
  if (laser) {
    g.fillStyle = '#2f4c6e'; g.fillRect(-w / 2 + 3, -6, 8, 6); g.fillRect(w / 2 - 11, -6, 8, 6);
    g.fillStyle = '#9fc3ea'; g.fillRect(-w / 2 + 6, -8, 2, 2); g.fillRect(w / 2 - 8, -8, 2, 2);
  }
  g.restore();
}

export function setSound(v) { soundOn = v; }

export function setMusic(v) { musicOn = v; if (!v) MUSIC.stop(); }

export const isSound = () => soundOn, isMusic = () => musicOn;

export { esc, fmt, rand, pick, store, TYPES, POWERS, blip, sfx, MUSIC, PY, PH, PW, PW_WIDE, BR, spriteFor, drawPower, drawSled, drawPackage };