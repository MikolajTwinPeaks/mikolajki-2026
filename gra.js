// Śnieżka kontra Dziad — gra na stronie misji (vanilla JS, canvas). Teksty: _gpt/gra-gpt.txt (ChatGPT), redakcja Claude.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('pl-PL').replace(/\s/g, ' ');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* bez pamięci */ } } };

// ───────────── teksty ─────────────
const TXT = {
  start: { h: 'Rozbij magazyny Dziada', p: 'Steruj saniami strzałkami ← → (albo palcem na telefonie) i odbijaj śnieżkę, żeby rozbić paczki Dziada. Spacja albo dotknięcie wypuszcza śnieżkę.', btn: 'Ruszaj do akcji' },
  clear: ['Magazyn rozbity. Lecimy dalej!', 'Dziad może odwołać wysyłkę.', 'Ostatnia paczka poszła w strzępy.', 'Magazyn pusty. Święty potwierdza.', 'Dziad znów musi robić inwentaryzację.'],
  lost: ['Śnieżka wypadła z akcji.', 'Śnieżka przepadła gdzieś pod saniami.', 'Centrala straciła śnieżkę z oczu.', 'Śnieżka wybrała zaspę.', 'Śnieżka opuściła teren operacji.'],
  over: { h: 'Koniec akcji', btn: 'Jeszcze raz' },
  record: 'Nowy rekord! Święty wpisuje go do akt.',
  title: 'Złote Sanie Świętego',
  // Meldunki o prowadzeniu. {KTO} = imię i inicjał, {CZAS} = „2 godziny i 14 minut”, {PKT} = przewaga w punktach.
  leadFirst: [
    'Otwierasz tablicę wyników. Na razie Złote Sanie stoją przed twoim biurkiem.',
    'Pierwszy wynik w aktach i od razu pierwsze miejsce. Dziad już szuka okularów, żeby to przeczytać.',
  ],
  leadNew: [
    'Przejmujesz prowadzenie. {KTO} po {CZAS} na szczycie ogląda teraz twoje płozy.',
    'Złote Sanie zmieniają garaż. Poprzednie prowadzenie trwało {CZAS}, a teraz {KTO} goni ciebie.',
    'Zmiana warty na szczycie: {KTO} schodzi z pierwszego miejsca po {CZAS}. Prowadzisz ty.',
    'Dziad nie nadąża z notatkami. {KTO}: {CZAS} na czele, a od teraz pościg za tobą.',
    'Meldunek do sztabu: nowy lider tablicy. {KTO} oddaje pierwsze miejsce po {CZAS}.',
  ],
  leadNewNoPrev: [
    'Przejmujesz prowadzenie. Złote Sanie stoją teraz pod twoim biurkiem.',
  ],
  leadKeep: [
    'Wciąż na czele. Prowadzisz już {CZAS}, a przewaga nad drugim miejscem to {PKT} pkt.',
    'Pierwsze miejsce od {CZAS} w tych samych rękach. Drugie miejsce traci {PKT} pkt.',
    'Dziad liczy dni do twojego potknięcia. Na razie liczy już {CZAS}. Przewaga: {PKT} pkt.',
  ],
  leadKeepAlone: ['Prowadzisz już {CZAS}. Na razie nikt nawet nie próbuje.'],
  dethroned: [
    'Złe wieści z centrali. Prowadzenie przejmuje {KTO}. Twoje panowanie na szczycie trwało {CZAS}.',
    'Twoje Złote Sanie stoją teraz w innym garażu. Na czele: {KTO}, o {PKT} pkt przed tobą. Twoje prowadzenie trwało {CZAS}.',
    'Po {CZAS} na szczycie oddajesz pierwsze miejsce. Teraz prowadzi {KTO}. Dziad zaciera ręce.',
    'Zmiana warty: {KTO} spycha cię z pierwszego miejsca. {CZAS} prowadzenia to dobry wynik, ale sanie czekają na rewanż.',
    'Meldunek ze sztabu: {KTO} ma {PKT} pkt więcej. Twoje prowadzenie trwało {CZAS}. Odbij je.',
  ],
  dethronedBtn: 'Odbijam prowadzenie',
};
// „2 godziny i 14 minut”, „1 dzień i 3 godziny”, „niecałą minutę” (biernik, pasuje do „przez”, „trwało”, „już”).
function plural(n, one, few, many) { const d = n % 10, dd = n % 100; return n === 1 ? one : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many; }
function dur(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'niecałą minutę';
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  const part = (n, w) => (n === 1 ? w[0] : `${n} ${plural(n, ...w)}`);
  const D = ['dzień', 'dni', 'dni'], Hh = ['godzinę', 'godziny', 'godzin'], M = ['minutę', 'minuty', 'minut'];
  const bits = d ? [part(d, D), h && part(h, Hh)] : h ? [part(h, Hh), mm && part(mm, M)] : [part(mm, M)];
  return bits.filter(Boolean).join(' i ').replace(/^dzień/, '1 dzień');
}
const fill = (t, v) => t.replace('{KTO}', `<b>${esc(v.kto || '')}</b>`).replace('{CZAS}', v.czas || '').replace('{PKT}', fmt(v.pkt || 0));
const RANKS = [[0, 'Nasłuch'], [500, 'Zwiad'], [2000, 'Patrol Sań'], [6000, 'Sekcja Specjalna'], [15000, 'Sztab Świętego'], [30000, 'Naczelne Dowództwo']];
const rankOf = (sc) => RANKS.filter(([t]) => sc >= t).at(-1)[1];

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

// Magazyny (10 kolumn). Cyfra = paczka, # = sejf, . = pusto. Od 9. magazynu plansze losowe.
const LEVELS = [
  ['....11....', '...1221...', '..122221..', '.12233221.', '1223333221', '....44....'],
  ['3333333333', '2222222222', '1111111111', '4444444444', '1111111111'],
  ['5555445555', '5222442225', '5222442225', '4444444444', '5222442225', '5555445555'],
  ['6.6.6.6.6.', '.4.4.4.4.4', '3.3.3.3.3.', '.2.2.2.2.2', '#1#1##1#1#'],
  ['....55....', '...5665...', '4444664444', '.44466444.', '..433334..', '.43....34.', '43......34'],
  ['##..66..##', '2222222222', '3333333333', '.55.55.55.', '1111111111', '4444444444'],
  ['6666666666', '6#......#6', '6#.5555.#6', '6#.5445.#6', '6#......#6', '6###..###6'],
  ['5656565656', '4545454545', '3434343434', '2323232323', '1212121212', '6.6.6.6.6.'],
];
function levelMap(n) {
  if (n <= LEVELS.length) return LEVELS[n - 1];
  const rows = Math.min(8, 5 + Math.floor((n - 8) / 2));
  const out = [];
  for (let r = 0; r < rows; r++) {
    let row = '';
    for (let c = 0; c < 10; c++) {
      const x = Math.random();
      if (x < 0.08) row += '.';
      else if (x < 0.08 + Math.min(0.1, 0.02 * (n - 8))) row += '#';
      else row += String(Math.min(6, 1 + Math.floor(Math.random() * (3 + Math.min(3, n - 8)))));
    }
    out.push(row);
  }
  if (!out.some((r) => /[1-6]/.test(r))) out[0] = '1111111111';
  return out;
}

// ───────────── zaplecze ─────────────
const token = new URLSearchParams(location.hash.slice(1)).get('misja') || '';
async function call(a, body) {
  if (!window.GAS_URL) throw new Error('brak');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = body
      ? await fetch(window.GAS_URL, { method: 'POST', body: JSON.stringify({ a, ...body }), signal: ctl.signal })
      : await fetch(`${window.GAS_URL}?a=${a}&_=${Date.now()}`, { signal: ctl.signal, cache: 'no-store' });
    const d = await r.json();
    if (d.error) throw Object.assign(new Error(d.error), { code: d.error });
    return d;
  } finally { clearTimeout(t); }
}
let ME = null;          // { first, name, best }
let OPEN = true;
let lastTop = null;
let NEWS = null;        // meldunek: ktoś zabrał ci prowadzenie (pokazywany raz)
let LEAD = null;        // prowadzisz: { since, gap }
function renderBoard(top) {
  lastTop = top;
  OPEN = top.open !== false;
  const list = $('#board');
  if (!top.top.length) { list.innerHTML = '<li class="g-empty">Na tablicy jeszcze pusto. Pierwszy wynik będzie twój.</li>'; }
  else list.innerHTML = top.top.map((r) => `<li class="${ME && ME.name === r.name ? 'me' : ''}"><span class="pl">${r.place}.</span><span class="nm">${esc(r.name)}</span><span class="sc">${fmt(r.score)}</span></li>`).join('');
  const d = new Date(top.deadline);
  const when = `${d.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long', day: 'numeric', month: 'long' })} o ${d.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: 'numeric', minute: '2-digit' })}`;
  $('#note').textContent = OPEN
    ? `Tablicę zamykam w ${when}. Najlepszy wynik dostaje tytuł „${TXT.title}”. ${top.players ? `Wyników na tablicy: ${top.players}.` : ''}${top.leader ? ` Prowadzi ${top.leader.name}, już ${dur(Date.now() - top.leader.since)}.` : ''}`
    : `Tablica zamknięta. Tytuł „${TXT.title}” trafia do: ${top.top[0] ? top.top[0].name : 'nikogo'}.`;
}
async function loadBoard() { try { renderBoard(await call('top')); } catch { $('#board').innerHTML = '<li class="g-empty">Brak łączności z centralą. Spróbuj odświeżyć stronę.</li>'; } }
let LOCK = token ? null : 'link';   // null = wolno grać, 'link' = brak przepustki, 'losuj' = najpierw losowanie
async function newSession() {
  if (!token) return null;
  try {
    const s = await call('game_start', { t: token });
    ME = { first: s.first, name: s.name, best: s.best };
    if (s.news) NEWS = s.news;
    LEAD = s.lead || null;
    OPEN = s.open !== false;
    LOCK = null;
    return s.sid;
  } catch (e) { if (e.code === 'link' || e.code === 'losuj') LOCK = e.code; return null; }
}

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
function syncSound() { const b = $('#sound'); b.setAttribute('aria-pressed', String(soundOn)); b.querySelector('span').textContent = soundOn ? 'wł.' : 'wył.'; }
$('#sound').onclick = () => { soundOn = !soundOn; store.set('gra-dzwiek', soundOn ? '1' : '0'); syncSound(); };
syncSound();


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
function syncMusic() { const b = $('#music'); if (!b) return; b.setAttribute('aria-pressed', String(musicOn)); b.querySelector('span').textContent = musicOn ? 'wł.' : 'wył.'; }
$('#music').onclick = () => {
  musicOn = !musicOn; store.set('gra-muzyka', musicOn ? '1' : '0'); syncMusic();
  if (!musicOn) MUSIC.stop(); else if (S && (S.mode === 'play' || S.mode === 'serve')) MUSIC.start(S.level);
};
syncMusic();

// ───────────── plansza ─────────────
const W = 600, H = 800, TOP = 96, SIDE = 24, GAP = 6, BW = (W - SIDE * 2 - GAP * 9) / 10, BH = 24;
const PY = 738, PH = 14, PW = 96, PW_WIDE = 150, BR = 8;
const cv = $('#game'), ctx = cv.getContext('2d');
function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
addEventListener('resize', fit);

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

// ───────────── stan gry ─────────────
let S = null;
const flakes = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.6, 2), v: rand(12, 40), d: rand(0, 6) }));
function newGame() {
  trackOffset = Math.floor(Math.random() * TRACKS.length);
  S = { level: 0, score: 0, lives: 3, mode: 'serve', balls: [], bricks: [], drops: [], shots: [], parts: [], floats: [],
    px: W / 2, tx: W / 2, wideT: 0, slowT: 0, laserT: 0, laserCd: 0, toast: null, hits: 0, t: 0, sid: newSession() };
  nextLevel();
}
function nextLevel() {
  S.level++;
  S.bricks = [];
  levelMap(S.level).forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    S.bricks.push({ x: SIDE + c * (BW + GAP), y: TOP + r * (BH + GAP), type: ch, hp: TYPES[ch].hp });
  }));
  S.drops = []; S.shots = []; S.wideT = S.slowT = S.laserT = 0;
  MUSIC.start(S.level);
  serve();
}
const baseSpeed = () => Math.min(720, 380 + 30 * (S.level - 1));
function serve() { S.mode = 'serve'; S.balls = [{ x: S.px, y: PY - BR - 1, vx: 0, vy: 0, sp: baseSpeed(), trail: [] }]; S.hits = 0; }
function launch() {
  if (S.mode !== 'serve') return;
  const b = S.balls[0], a = rand(-0.35, 0.35);
  b.vx = Math.sin(a) * b.sp; b.vy = -Math.cos(a) * b.sp;
  S.mode = 'play';
}
const paddleW = () => (S.wideT > 0 ? PW_WIDE : PW);
const mult = () => 1 + 0.25 * (S.level - 1);
function toast(text, ms = 1500) { S.toast = { text, until: performance.now() + ms }; }
function addScore(n, x, y) { S.score += n; if (x != null) S.floats.push({ x, y, text: `+${n}`, life: 0.9 }); }
function burst(x, y, col, n = 10) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-200, 60), life: rand(0.4, 0.8), col, r: rand(1.2, 3) }); }

function hitBrick(br, byLaser) {
  if (br.hp === Infinity) { sfx.steel(); return; }
  br.hp--;
  const t = TYPES[br.type];
  if (br.hp > 0) { sfx.steel(); burst(br.x + BW / 2, br.y + BH / 2, t.col, 3); return; }
  sfx.brick(Number(br.type));
  S.bricks.splice(S.bricks.indexOf(br), 1);
  addScore(Math.round(t.pts * mult()), br.x + BW / 2, br.y);
  burst(br.x + BW / 2, br.y + BH / 2, t.col, 12);
  if (!byLaser || Math.random() < 0.5) {
    const r = Math.random();
    if (r < 0.02) S.drops.push({ x: br.x + BW / 2, y: br.y + BH / 2, type: 'L' });
    else if (r < 0.14) S.drops.push({ x: br.x + BW / 2, y: br.y + BH / 2, type: pick(['E', 'C', 'T', 'P']) });
  }
}
function power(type) {
  sfx.power();
  if (type === 'E') S.wideT = 12;
  if (type === 'C') S.slowT = 10;
  if (type === 'P') S.laserT = 8;
  if (type === 'L') { S.lives = Math.min(6, S.lives + 1); toast('Zapasowe sanie w drodze.'); }
  if (type === 'T') {
    const src = S.balls[0];
    if (!src) return;
    for (const da of [-0.45, 0.45]) {
      const ang = Math.atan2(src.vx, -src.vy) + da;
      S.balls.push({ x: src.x, y: src.y, vx: Math.sin(ang) * src.sp, vy: -Math.cos(ang) * src.sp, sp: src.sp, trail: [] });
    }
    if (S.mode === 'serve') launch();
  }
  S.floats.push({ x: S.px, y: PY - 20, text: POWERS[type].name, life: 1.2, big: true });
}

function step(dt) {
  S.t += dt;
  for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin((S.t + f.d) * 0.8) * 8 * dt; if (f.y > H) { f.y = -4; f.x = rand(0, W); } }
  for (const p of S.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
  S.parts = S.parts.filter((p) => p.life > 0);
  for (const f of S.floats) { f.life -= dt; f.y -= 40 * dt; }
  S.floats = S.floats.filter((f) => f.life > 0);
  if (S.mode !== 'play' && S.mode !== 'serve') return;

  // sanie
  if (keys.left) S.tx -= 640 * dt;
  if (keys.right) S.tx += 640 * dt;
  const pw = paddleW();
  S.tx = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, S.tx));
  S.px += (S.tx - S.px) * Math.min(1, dt * 22);
  S.wideT = Math.max(0, S.wideT - dt); S.slowT = Math.max(0, S.slowT - dt); S.laserT = Math.max(0, S.laserT - dt);

  if (S.mode === 'serve') { const b = S.balls[0]; b.x = S.px; b.y = PY - BR - 1; return; }

  // laser
  if (S.laserT > 0) {
    S.laserCd -= dt;
    if (S.laserCd <= 0) { S.laserCd = 0.32; S.shots.push({ x: S.px - pw / 2 + 7, y: PY - 8 }, { x: S.px + pw / 2 - 7, y: PY - 8 }); sfx.laser(); }
  }
  for (const s of S.shots) {
    s.y -= 760 * dt;
    const br = S.bricks.find((b) => s.x > b.x && s.x < b.x + BW && s.y > b.y && s.y < b.y + BH);
    if (br) { s.dead = true; hitBrick(br, true); }
    if (s.y < TOP - 30) s.dead = true;
  }
  S.shots = S.shots.filter((s) => !s.dead);

  // paczki z wzmocnieniami
  for (const d of S.drops) {
    d.y += 170 * dt;
    if (d.y + 11 > PY && d.y - 11 < PY + PH && Math.abs(d.x - S.px) < pw / 2 + 10) { d.dead = true; power(d.type); }
    if (d.y > H + 20) d.dead = true;
  }
  S.drops = S.drops.filter((d) => !d.dead);

  // śnieżki
  const slow = S.slowT > 0 ? 0.68 : 1;
  for (const b of S.balls) {
    const speed = Math.hypot(b.vx, b.vy) * slow;
    const n = Math.max(1, Math.ceil((speed * dt) / 4));
    const sdt = (dt * slow) / n;
    for (let i = 0; i < n && !b.dead; i++) {
      b.x += b.vx * sdt; b.y += b.vy * sdt;
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); }
      if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
      if (b.y < TOP - 34 + BR) { b.y = TOP - 34 + BR; b.vy = Math.abs(b.vy); }
      // sanie
      if (b.vy > 0 && b.y + BR >= PY && b.y - BR <= PY + PH && b.x >= S.px - pw / 2 - BR && b.x <= S.px + pw / 2 + BR) {
        const off = Math.max(-1, Math.min(1, (b.x - S.px) / (pw / 2)));
        const ang = off * 1.05;
        S.hits++;
        if (S.hits % 8 === 0) b.sp = Math.min(baseSpeed() * 1.35, b.sp * 1.04);
        b.vx = Math.sin(ang) * b.sp; b.vy = -Math.cos(ang) * b.sp; b.y = PY - BR;
        sfx.paddle();
      }
      // paczki
      for (const br of S.bricks) {
        const cx = Math.max(br.x, Math.min(b.x, br.x + BW)), cy = Math.max(br.y, Math.min(b.y, br.y + BH));
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy > BR * BR) continue;
        const ox = Math.min(b.x + BR - br.x, br.x + BW - (b.x - BR)), oy = Math.min(b.y + BR - br.y, br.y + BH - (b.y - BR));
        if (ox < oy) { b.vx = b.x < br.x + BW / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); }
        else { b.vy = b.y < br.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); }
        hitBrick(br, false);
        break;
      }
      // zabezpieczenie przed lotem prawie poziomym
      if (Math.abs(b.vy) < b.sp * 0.22) { b.vy = (b.vy < 0 ? -1 : 1) * b.sp * 0.22; b.vx = Math.sign(b.vx || 1) * Math.sqrt(b.sp * b.sp - b.vy * b.vy); }
      if (b.y - BR > H) b.dead = true;
    }
    b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
  }
  S.balls = S.balls.filter((b) => !b.dead);
  if (!S.balls.length) {
    S.lives--;
    sfx.lost();
    if (S.lives <= 0) return gameOver();
    toast(pick(TXT.lost));
    S.wideT = S.slowT = S.laserT = 0; S.drops = []; S.shots = [];
    serve();
  }
  if (!S.bricks.some((b) => b.hp !== Infinity)) {
    sfx.clear();
    addScore(250 * S.level);
    toast(`${pick(TXT.clear)}  +${fmt(250 * S.level)}`, 2000);
    S.mode = 'pause-clear'; S.balls = []; S.drops = []; S.shots = []; MUSIC.stop();
    setTimeout(() => { if (S && S.mode === 'pause-clear') nextLevel(); }, 1600);
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  // tło
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#081311'); bg.addColorStop(1, '#040908');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(233,229,221,.55)';
  for (const f of flakes) { ctx.globalAlpha = 0.25 + f.r / 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // zaspa na dole
  ctx.fillStyle = 'rgba(233,229,221,.06)'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 18 - Math.sin(x / 70) * 6); ctx.lineTo(W, H); ctx.fill();
  // pasek u góry
  ctx.fillStyle = 'rgba(233,229,221,.12)'; ctx.fillRect(0, TOP - 36, W, 1);
  if (!S) return;
  ctx.font = '400 12px "JetBrains Mono", monospace'; ctx.fillStyle = '#66746f'; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('WYNIK', SIDE, 26);
  ctx.textAlign = 'center'; ctx.fillText('MAGAZYN', W / 2, 26);
  ctx.textAlign = 'right'; ctx.fillText('SANIE', W - SIDE, 26);
  ctx.font = '500 24px Sterling, Inter, sans-serif'; ctx.fillStyle = '#E9E5DD';
  ctx.textAlign = 'left'; ctx.fillText(fmt(S.score), SIDE, 52);
  ctx.textAlign = 'center'; ctx.fillText(String(S.level), W / 2, 52);
  for (let i = 0; i < S.lives; i++) { ctx.fillStyle = '#FF6A39'; ctx.beginPath(); ctx.roundRect(W - SIDE - 22 - i * 28, 40, 22, 8, [4, 2, 2, 4]); ctx.fill(); ctx.fillStyle = '#E9E5DD'; ctx.fillRect(W - SIDE - 22 - i * 28 + 2, 50, 20, 1.6); }
  // aktywne wzmocnienia
  const act = [['E', S.wideT], ['C', S.slowT], ['P', S.laserT]].filter(([, t]) => t > 0);
  act.forEach(([k, t], i) => { drawPower(ctx, k, SIDE + 120 + i * 30, 44, 9); ctx.fillStyle = 'rgba(4,9,8,.6)'; ctx.beginPath(); ctx.moveTo(SIDE + 120 + i * 30, 44); ctx.arc(SIDE + 120 + i * 30, 44, 9, -Math.PI / 2, -Math.PI / 2 + (1 - t / (k === 'E' ? 12 : k === 'C' ? 10 : 8)) * Math.PI * 2); ctx.fill(); });

  for (const br of S.bricks) ctx.drawImage(spriteFor(br.type, br.hp), br.x, br.y, BW, BH);
  for (const d of S.drops) drawPower(ctx, d.type, d.x, d.y);
  ctx.fillStyle = '#FF6A39';
  for (const s of S.shots) { ctx.fillRect(s.x - 1.5, s.y, 3, 12); }
  for (const p of S.parts) { ctx.globalAlpha = Math.max(0, p.life * 1.4); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.r, p.r); }
  ctx.globalAlpha = 1;
  drawSled(ctx, S.px, PY, paddleW(), S.laserT > 0);
  for (const b of S.balls) {
    b.trail.forEach((p, i) => { ctx.globalAlpha = (i / b.trail.length) * 0.25; ctx.fillStyle = '#E9E5DD'; ctx.beginPath(); ctx.arc(p.x, p.y, BR * (i / b.trail.length), 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BR);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, S.slowT > 0 ? '#d8b48a' : '#b9c6c4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 7); ctx.fill();
  }
  ctx.textAlign = 'center';
  for (const f of S.floats) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = f.big ? '500 15px Sterling, Inter, sans-serif' : '400 12px "JetBrains Mono", monospace'; ctx.fillStyle = f.big ? '#FF6A39' : '#E9E5DD'; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1;
  if (S.mode === 'serve' && !overlayShown()) {
    ctx.font = '400 13px "JetBrains Mono", monospace'; ctx.fillStyle = '#a3aea9';
    ctx.fillText(touchUsed ? 'DOTKNIJ, ŻEBY WYPUŚCIĆ ŚNIEŻKĘ' : 'SPACJA: WYPUŚĆ ŚNIEŻKĘ', W / 2, PY - 60);
  }
  if (S.toast && performance.now() < S.toast.until) {
    ctx.font = '500 22px Sterling, Inter, sans-serif'; ctx.fillStyle = '#E9E5DD';
    ctx.fillText(S.toast.text, W / 2, 520);
  }
}

// ───────────── nakładki ─────────────
const over = $('#over');
const overlayShown = () => !over.hidden;
function showOverlay(html) { over.innerHTML = html; over.hidden = false; }
function hideOverlay() { over.hidden = true; }
function lockedScreen() {
  const back = token ? `./#misja=${encodeURIComponent(token)}` : './';
  const txt = LOCK === 'losuj'
    ? 'Sanie wydaję tylko agentom, którzy wylosowali swój cel. Wróć do misji, wylosuj osobę do obdarowania i wsiadaj.'
    : 'Do gry wchodzi się z osobistego linku z maila od „Świętego”. Bez przepustki nie wpuszczę cię do magazynów Dziada.';
  showOverlay(`<div class="rank">Wstęp tylko dla agentów</div><h1>Najpierw losowanie</h1><p>${txt}</p>
    ${LOCK === 'losuj' ? `<a class="btn" href="${back}">Wracam do misji <span class="arr" aria-hidden="true">→</span></a>` : ''}`);
}
function startScreen() {
  if (LOCK) return lockedScreen();
  const best = ME && ME.best ? `<p class="small">Twój rekord: ${fmt(ME.best)} pkt, stopień: ${esc(rankOf(ME.best))}.</p>` : '';
  if (NEWS) {
    const n = NEWS; NEWS = null;
    showOverlay(`<div class="rank">Pilny meldunek</div><h1>Prowadzenie przejęte</h1>
      <p>${fill(pick(TXT.dethroned), { kto: n.by, czas: dur(n.held), pkt: n.gap })}</p>${best}
      <button class="btn" id="go" type="button">${TXT.dethronedBtn} <span class="arr" aria-hidden="true">→</span></button>`);
    $('#go').onclick = () => { hideOverlay(); newGame(); };
    return;
  }
  const lead = LEAD ? `<p class="lead">${fill(pick(LEAD.gap == null ? TXT.leadKeepAlone : TXT.leadKeep), { czas: dur(Date.now() - LEAD.since), pkt: LEAD.gap })}</p>` : '';
  showOverlay(`<div class="rank">${LEAD ? `Lider tablicy · ${esc(TXT.title)}` : 'Operacja: Tajny Mikołaj'}</div><h1>${TXT.start.h}</h1><p>${TXT.start.p}</p>${lead}${best}
    <button class="btn" id="go" type="button">${TXT.start.btn} <span class="arr" aria-hidden="true">→</span></button>
    <div class="kbd">P albo Esc: pauza</div>`);
  $('#go').onclick = () => { hideOverlay(); newGame(); };
}
function pauseScreen() {
  if (!S || S.mode !== 'play') return;
  S.mode = 'paused';
  MUSIC.pause();
  showOverlay(`<h1>Pauza</h1><p>Dziad też musi czasem złapać oddech.</p><button class="btn" id="resume" type="button">Wracam do akcji</button>`);
  $('#resume').onclick = resume;
}
function resume() { if (S && S.mode === 'paused') { S.mode = 'play'; hideOverlay(); last = performance.now(); MUSIC.resume(); } }
async function gameOver() {
  S.mode = 'over';
  MUSIC.stop();
  const score = S.score, level = S.level;
  const rank = rankOf(score);
  showOverlay(`<h1>${TXT.over.h}</h1><div class="big">${fmt(score)}</div>
    <p>Twój wynik to ${fmt(score)} pkt, a twój stopień to ${esc(rank)}.</p>
    <p class="small" id="saved">${token ? 'Zapisuję wynik w aktach…' : 'Grasz bez osobistego linku, więc wynik nie trafi na tablicę.'}</p>
    <button class="btn" id="again" type="button">${TXT.over.btn} <span class="arr" aria-hidden="true">→</span></button>`);
  $('#again').onclick = () => { hideOverlay(); newGame(); };
  if (!token) return;
  const out = $('#saved');
  const sid = await S.sid;
  if (!sid) { out.textContent = 'Nie udało się połączyć z centralą. Wynik nie został zapisany.'; return; }
  try {
    const r = await call('game_score', { t: token, sid, score, level });
    if (ME) ME.best = r.best;
    out.innerHTML = `${r.record ? `<b style="color:var(--orange)">${TXT.record}</b><br>` : ''}Miejsce na tablicy: ${r.place} z ${r.players}. Twój rekord: ${fmt(r.best)} pkt.`;
    const L = r.lead;
    if (L) {
      let msg;
      if (L.fresh) msg = L.prev ? fill(pick(TXT.leadNew), { kto: L.prev.name, czas: dur(L.prev.held) }) : fill(pick(r.players > 1 ? TXT.leadNewNoPrev : TXT.leadFirst), {});
      else if (L.record) msg = fill(pick(L.gap == null ? TXT.leadKeepAlone : TXT.leadKeep), { czas: dur(Date.now() - L.since), pkt: L.gap });
      if (msg) out.insertAdjacentHTML('beforebegin', `<div class="rank">${L.fresh ? 'Nowy lider tablicy' : 'Lider tablicy'}</div><p class="lead">${msg}</p>`);
      LEAD = { since: L.fresh ? Date.now() : L.since, gap: L.gap };
      if (L.fresh) blip(880, 0.12, 'triangle', 0.06, 440);
    } else if (LEAD && r.place > 1) LEAD = null;
    renderBoard({ ...lastTop, top: r.top, players: r.players, leader: r.leader, open: true });
  } catch (e) {
    out.textContent = e.code === 'koniec' ? 'Tablica jest już zamknięta. Wynik zostaje tylko u ciebie.' : 'Nie udało się zapisać wyniku. Spróbuj jeszcze raz w kolejnej grze.';
  }
}

// ───────────── sterowanie ─────────────
const keys = { left: false, right: false };
let touchUsed = false;
function toLogical(e) { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; }
// Myszka nie steruje saniami: tylko klawiatura i palec na ekranie dotykowym.
cv.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') return; touchUsed = true; if (S) S.tx = toLogical(e); });
cv.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !S) return;
  touchUsed = true;
  S.tx = toLogical(e);
  try { cv.setPointerCapture(e.pointerId); } catch { /* bez przechwycenia */ }
  if (S.mode === 'serve') launch();
});
addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = true;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = true;
  if (e.key === ' ' || e.key === 'ArrowUp') { if (S && S.mode === 'serve' && !overlayShown()) { e.preventDefault(); launch(); } }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (S && S.mode === 'paused') resume(); else pauseScreen(); }
  if (e.key === ' ' && S && S.mode === 'play') e.preventDefault();
});
addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = false;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseScreen(); });
addEventListener('blur', pauseScreen);

// ───────────── pętla ─────────────
let last = performance.now();
function loop(t) {
  const dt = Math.min(1 / 30, (t - last) / 1000);
  last = t;
  if (S) step(dt); else for (const f of flakes) { f.y += f.v * dt; if (f.y > H) { f.y = -4; f.x = rand(0, W); } }
  render();
  requestAnimationFrame(loop);
}

// ───────────── legenda i start ─────────────
function legend() {
  const rows = Object.entries(TYPES).map(([k, t]) => {
    const pts = k === '#' ? '' : ` ${t.pts} pkt.`;
    return `<div class="row"><canvas data-k="${k}" width="92" height="44"></canvas><div><b>${t.name}.</b>${pts} ${t.desc}</div></div>`;
  }).join('') + Object.entries(POWERS).map(([k, p]) => `<div class="row"><canvas data-p="${k}" width="92" height="44"></canvas><div><b>${p.name}.</b> ${p.desc}</div></div>`).join('');
  $('#legend').innerHTML = rows;
  document.querySelectorAll('#legend canvas').forEach((c) => {
    const g = c.getContext('2d'); g.scale(2, 2);
    if (c.dataset.k) { g.scale(46 / BW, 22 / BH); drawPackage(g, c.dataset.k, TYPES[c.dataset.k].hp, BW, BH); }
    else drawPower(g, c.dataset.p, 11, 11, 10);
  });
}
legend();
if (token) {
  $('#back').href = `./#misja=${encodeURIComponent(token)}`;
}
(async () => {
  try { await document.fonts.ready; } catch { /* czcionki później */ }
  showOverlay('<p class="small">Sprawdzam przepustkę…</p>');
  requestAnimationFrame(loop);
  loadBoard();
  if (token) await newSession();
  startScreen();
  if (lastTop) renderBoard(lastTop);
})();
