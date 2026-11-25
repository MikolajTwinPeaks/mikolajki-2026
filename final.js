// Wielki finał 7.12: strona gracza (#a=… / #b=…), sztabu (#sztab=…), podglądu (bez znacznika) i tryb na jednym komputerze (#lokalnie).
import { W, H, fmt, esc, pick, MUSIC, blip, setSound, setMusic, isSound, isMusic, store } from './final-core.js';
import { Board, Mirror, decide, drawBoard, stepFlakes, ROUND_MS } from './final-board.js';

const $ = (s) => document.querySelector(s);
const COUNT_MS = 4000;
const WINS = 2;
const hash = new URLSearchParams(location.hash.slice(1));
const ROLE = hash.has('a') ? 'a' : hash.has('b') ? 'b' : hash.has('sztab') ? 'sztab' : hash.has('lokalnie') ? 'lokalnie' : 'widz';
const SECRET = hash.get(ROLE) || '';
const OPP = { a: 'b', b: 'a' };
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
document.body.dataset.role = ROLE;

// ───────────── teksty ─────────────
const T = {
  title: 'Wielki finał · Śnieżka kontra Dziad',
  lobby: { h: 'Czekamy na sygnał', p: 'Święty zaraz odpali odliczanie. Ręce na strzałkach.' },
  lobbyView: 'Finał zaraz się zacznie. Na planszach pojawią się agenci z dwóch pierwszych miejsc tablicy.',
  rules: 'Strzałki ← → sterują saniami, spacja wypuszcza śnieżkę. Mur Dziada zjeżdża coraz szybciej. Trzy rozbite paczki w jednym odbiciu albo złapane wzmocnienie dorzucają rywalowi rząd. Kto straci wszystkie sanie, przegrywa rundę. Po 3 minutach wygrywa wyższy wynik.',
  attack: [
    '{A} dorzuca rząd na planszę {B}!',
    '{A} wysyła paczkę od Dziada prosto do {B}.',
    'Mur {B} rośnie. To robota {A}.',
    '{A} nie bierze jeńców. {B} dostaje rząd.',
  ],
  hit: ['{A} dorzuca ci rząd!', 'Paczka od Dziada. Nadawca: {A}.', '{A} dokłada cegiełkę do twojego muru.'],
  roundWin: ['Rundę wygrywa {A}', 'Ta runda dla {A}'],
  draw: 'Remis. Runda do powtórki.',
  champion: 'Pogromca Dziada 2026',
};
const put = (t, v) => t.replace(/\{A\}/g, v.A || '').replace(/\{B\}/g, v.B || '');

// ───────────── stan wspólny ─────────────
let C = { state: 'lobby', round: 0, wins: { a: 0, b: 0 }, names: { a: 'Agent A', b: 'Agent B' }, tempo: 'normalnie' };
const name = (s) => (C.names && C.names[s]) || (s === 'a' ? 'Agent A' : 'Agent B');
let off = 0;
const now = () => Date.now() + off;
const elapsed = () => now() - (C.startAt || 0);
let feed = [];
function say(text, hot) { feed.unshift({ text, hot, at: performance.now() }); feed = feed.slice(0, 5); renderFeed(); }

// ───────────── dźwięk ─────────────
function soundButtons() {
  const sync = () => {
    $('#sound span').textContent = isSound() ? 'wł.' : 'wył.'; $('#sound').setAttribute('aria-pressed', String(isSound()));
    $('#music span').textContent = isMusic() ? 'wł.' : 'wył.'; $('#music').setAttribute('aria-pressed', String(isMusic()));
  };
  $('#sound').onclick = () => { setSound(!isSound()); store.set('gra-dzwiek', isSound() ? '1' : '0'); sync(); };
  $('#music').onclick = () => { setMusic(!isMusic()); store.set('gra-muzyka', isMusic() ? '1' : '0'); sync(); if (isMusic() && playing()) MUSIC.start(1); };
  sync();
}
const playing = () => C.state === 'play' && now() >= C.startAt && elapsed() < ROUND_MS;
function musicTick() {
  if (!isMusic()) return;
  if (playing()) { if (!MUSIC.playing) MUSIC.start(1); MUSIC.level = 1 + Math.floor(elapsed() / 30000); }
  else if (MUSIC.playing) MUSIC.stop();
}

// ───────────── sterowanie ─────────────
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function pad(i) {
  const p = (navigator.getGamepads ? navigator.getGamepads() : [])[i];
  if (!p) return {};
  const ax = Math.abs(p.axes[0]) > 0.2 ? p.axes[0] : 0;
  return { axis: ax, left: p.buttons[14] && p.buttons[14].pressed, right: p.buttons[15] && p.buttons[15].pressed, launch: p.buttons[0] && p.buttons[0].pressed };
}
const merge = (...xs) => xs.reduce((o, x) => ({ left: o.left || x.left, right: o.right || x.right, launch: o.launch || x.launch, axis: o.axis || x.axis || 0 }), {});
const inputOne = () => merge({ left: keys.ArrowLeft || keys.KeyA, right: keys.ArrowRight || keys.KeyD, launch: keys.Space || keys.ArrowUp }, pad(0));
const inputLeft = () => merge({ left: keys.KeyA, right: keys.KeyD, launch: keys.KeyW || keys.Space }, pad(0));
const inputRight = () => merge({ left: keys.ArrowLeft, right: keys.ArrowRight, launch: keys.ArrowUp || keys.Enter }, pad(1));

// ───────────── układ strony ─────────────
function canvasIn(el) {
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; el.prepend(c);
  const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); return g;
}
function layout() {
  const stage = $('#stage');
  if (ROLE === 'a' || ROLE === 'b') {
    stage.innerHTML = `
      <section class="f-own"><div class="g-frame f-frame" id="own"><div class="g-over" id="over" hidden></div></div></section>
      <aside class="f-side">
        <div class="f-clock" id="clock">3:00</div>
        <div class="f-score" id="score"></div>
        <div class="f-opp"><div class="f-label">Rywal na żywo</div><div class="f-mini" id="opp"></div></div>
        <ol class="f-feed" id="feed"></ol>
      </aside>`;
  } else {
    stage.innerHTML = `
      <section class="f-col"><div class="g-frame f-frame" id="bA"></div></section>
      <section class="f-mid">
        <div class="f-round" id="round">Finał</div>
        <div class="f-clock" id="clock">3:00</div>
        <div class="f-score" id="score"></div>
        <div class="f-bar"><span id="barA"></span><span id="barB"></span></div>
        <ol class="f-feed" id="feed"></ol>
        <div class="f-watch" id="watch"></div>
        <div class="g-over f-over" id="over" hidden></div>
      </section>
      <section class="f-col"><div class="g-frame f-frame" id="bB"></div></section>`;
  }
}
function renderFeed() {
  const el = $('#feed'); if (!el) return;
  el.innerHTML = feed.map((f) => `<li class="${f.hot ? 'hot' : ''}">${esc(f.text)}</li>`).join('');
}
function clockText() {
  if (C.state === 'lobby' || !C.startAt) return '3:00';
  const el = (C.state === 'end' || C.state === 'final') && C.endAt ? C.endAt - C.startAt : elapsed();
  const left = Math.max(0, Math.min(ROUND_MS, ROUND_MS - el));
  const s = Math.ceil(left / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function scoreHTML(sa, sb) {
  const dots = (n) => Array.from({ length: WINS }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  const w = C.wins || { a: 0, b: 0 };
  return `<div class="f-p"><b>${esc(name('a'))}</b><span class="f-dots">${dots(w.a)}</span><span class="f-pts">${fmt(sa)}</span></div>
    <div class="f-vs">kontra</div>
    <div class="f-p"><b>${esc(name('b'))}</b><span class="f-dots">${dots(w.b)}</span><span class="f-pts">${fmt(sb)}</span></div>`;
}
function countText() {
  if (C.state !== 'play' || !C.startAt) return '';
  const t = C.startAt - now();
  if (t > 0) return String(Math.ceil(t / 1000));
  if (t > -700) return 'Start!';
  return '';
}
function bannerFor(slot) {
  if (C.state === 'end' || C.state === 'final') {
    if (!C.winner) return { h: 'Remis', p: 'Runda do powtórki' };
    return C.winner === slot ? { h: C.state === 'final' ? T.champion : 'Runda wygrana', hot: true, p: C.state === 'final' ? 'Złote Sanie zostają u ciebie' : '' } : { h: 'Runda przegrana', p: C.state === 'final' ? 'Dziad i tak jest pod wrażeniem' : '' };
  }
  return null;
}
function overlay(html) { const o = $('#over'); if (!o) return; if (html) { o.innerHTML = html; o.hidden = false; } else o.hidden = true; }

// ───────────── Firebase ─────────────
let F = null;
async function connect() {
  const [{ initializeApp }, D, A] = await Promise.all([import(`${SDK}firebase-app.js`), import(`${SDK}firebase-database.js`), import(`${SDK}firebase-auth.js`)]);
  const app = initializeApp(window.FINAL_FIREBASE);
  const auth = A.getAuth(app);
  await A.signInAnonymously(auth);
  const db = D.getDatabase(app);
  const uid = auth.currentUser.uid;
  if (SECRET) await D.set(D.ref(db, `claims/${uid}`), SECRET);
  D.onValue(D.ref(db, '.info/serverTimeOffset'), (s) => { off = s.val() || 0; });
  const r = (p) => D.ref(db, `m/final/${p}`);
  F = { D, db, uid, r };
  // widzowie: licznik oglądających
  const w = r(`watch/${uid}`);
  D.onValue(D.ref(db, '.info/connected'), (s) => { if (s.val()) { D.onDisconnect(w).remove(); D.set(w, true); } });
  D.onValue(r('watch'), (s) => { const n = s.size; const el = $('#watch'); if (el) el.textContent = n ? `Ogląda: ${n}` : ''; });
  return F;
}

// ───────────── gracz ─────────────
function player(slot) {
  const opp = OPP[slot];
  const g = canvasIn($('#own'));
  const gm = canvasIn($('#opp'));
  let B = null, round = 0, resSent = false, lastNet = 0, lastWall = -1;
  const M = new Mirror();
  const seen = new Set();
  overlay(`<div class="rank">Wielki finał</div><h1>Łączę z centralą…</h1>`);
  connect().then(({ D, r }) => {
    const on = r(`on/${slot}`);
    D.onValue(D.ref(F.db, '.info/connected'), (s) => { if (s.val()) { D.onDisconnect(on).remove(); D.set(on, true); } });
    D.onValue(r('ctl'), (s) => {
      C = { ...C, ...(s.val() || {}) };
      if (C.state === 'play' && C.round !== round) {
        round = C.round; resSent = false; lastWall = -1; seen.clear(); feed = []; renderFeed();
        B = new Board(C.seed, C.tempo, {
          onAttack: (n) => D.push(r(`atk/${opp}`), { round, n, by: slot }),
          onEnd: () => sendRes(),
        });
      }
      if (C.state === 'lobby') { B = null; round = 0; }
      if ((C.state === 'end' || C.state === 'final') && B) { if (!B.dead) B.finish(); sendRes(); }
      screen();
    });
    D.onValue(r(`st/${opp}`), (s) => M.apply(s.val()));
    D.onChildAdded(r(`atk/${slot}`), (s) => {
      const v = s.val();
      if (!v || v.round !== round || seen.has(s.key) || !B) return;
      seen.add(s.key); B.receive(v.n || 1);
      say(put(pick(T.hit), { A: name(opp) }), true);
    });
    D.onChildAdded(r(`atk/${opp}`), (s) => { const v = s.val(); if (v && v.round === round && B) say(`Twój atak doleciał. ${name(opp)} dostaje rząd.`); });
    function sendRes() {
      if (resSent || !B) return;
      resSent = true;
      D.set(r(`res/${slot}`), { round, score: B.score, dead: B.dead, at: Math.round(B.diedAt) });
    }
    F.sendRes = sendRes;
    F.pushState = (force) => {
      if (!B) return;
      const t = performance.now();
      if (!force && t - lastNet < 66) return;
      lastNet = t;
      const payload = { m: B.snap() };
      if (B.wallVer !== lastWall) { payload.w = B.wallStr(); lastWall = B.wallVer; }
      D.update(r(`st/${slot}`), payload);
    };
  }).catch((e) => { console.error(e); overlay(`<h1>Brak łączności</h1><p>Nie mogę połączyć się z centralą finału. Odśwież stronę albo sprawdź internet.</p>`); });

  function screen() {
    if (C.state === 'lobby') overlay(`<div class="rank">Wielki finał · ${esc(name(slot))}</div><h1>${T.lobby.h}</h1><p>${T.lobby.p}</p><p class="small">${T.rules}</p>`);
    else if (C.state === 'final') overlay(`<div class="rank">Koniec finału</div><h1>${C.champion === slot ? T.champion : 'Srebrne Sanie'}</h1><p>${C.champion === slot ? 'Wygrywasz finał. Złote Sanie zostają u ciebie.' : `Finał wygrywa ${esc(name(C.champion))}. Dziad i tak jest pod wrażeniem.`}</p>`);
    else overlay(null);
  }
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(1 / 30, (t - last) / 1000); last = t;
    stepFlakes(dt);
    if (B) {
      if (playing()) { B.step(dt, inputOne(), elapsed()); }
      else { B.stepFx(dt); if (C.state === 'play' && elapsed() >= ROUND_MS && !B.done && !B.dead) { B.finish(); } }
      if (F && F.pushState) F.pushState(B.dead || B.done);
    }
    M.step(dt);
    drawBoard(g, B, { name: name(slot), count: countText(), banner: bannerFor(slot) });
    drawBoard(gm, M.seen ? M : null, { name: name(opp), banner: bannerFor(opp) });
    $('#clock').textContent = clockText();
    $('#score').innerHTML = slot === 'a' ? scoreHTML(B ? B.score : 0, M.score) : scoreHTML(M.score, B ? B.score : 0);
    musicTick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ───────────── podgląd i sztab ─────────────
function viewer(admin) {
  const gA = canvasIn($('#bA')), gB = canvasIn($('#bB'));
  const MA = new Mirror(), MB = new Mirror();
  const res = { a: null, b: null };
  const on = { a: false, b: false };
  let round = 0, deciding = false;
  connect().then(({ D, r }) => {
    D.onValue(r('ctl'), (s) => {
      const prev = C.state;
      C = { ...C, ...(s.val() || {}) };
      if (C.round !== round) { round = C.round; feed = []; renderFeed(); }
      if (prev !== C.state && (C.state === 'end' || C.state === 'final')) {
        if (C.winner) { say(put(pick(T.roundWin), { A: name(C.winner) }), true); blip(880, 0.3, 'triangle', 0.07, 440); }
        else say(T.draw, true);
      }
      screen(); if (admin) panel();
    });
    D.onValue(r('st/a'), (s) => MA.apply(s.val()));
    D.onValue(r('st/b'), (s) => MB.apply(s.val()));
    D.onValue(r('res/a'), (s) => { res.a = s.val(); referee(); });
    D.onValue(r('res/b'), (s) => { res.b = s.val(); referee(); });
    D.onValue(r('on/a'), (s) => { on.a = !!s.val(); if (admin) panel(); });
    D.onValue(r('on/b'), (s) => { on.b = !!s.val(); if (admin) panel(); });
    for (const slot of ['a', 'b']) D.onChildAdded(r(`atk/${slot}`), (s) => {
      const v = s.val(); if (!v || v.round !== round) return;
      say(put(pick(T.attack), { A: name(OPP[slot]), B: name(slot) }), true);
      blip(200, 0.25, 'sawtooth', 0.04, -80);
    });
    if (admin) setInterval(referee, 1000);
  }).catch((e) => { console.error(e); overlay('<h1>Brak łączności</h1><p>Odśwież stronę.</p>'); });

  // Sędzia działa w przeglądarce sztabu.
  function referee() {
    if (!admin || !F || C.state !== 'play' || deciding) return;
    const ra = res.a && res.a.round === C.round ? res.a : null, rb = res.b && res.b.round === C.round ? res.b : null;
    const late = elapsed() > ROUND_MS + 6000;
    if ((ra && rb) || (ra && ra.dead) || (rb && rb.dead) || late) {
      const A = ra || { score: MA.score, dead: MA.dead, at: MA.diedAt }, B = rb || { score: MB.score, dead: MB.dead, at: MB.diedAt };
      finishRound(decide(A, B));
    }
  }
  async function finishRound(w) {
    deciding = true;
    const wins = { a: (C.wins && C.wins.a) || 0, b: (C.wins && C.wins.b) || 0 };
    if (w) wins[w]++;
    const champ = w && wins[w] >= WINS ? w : null;
    await F.D.update(F.r('ctl'), { state: champ ? 'final' : 'end', winner: w || null, wins, champion: champ, endAt: now() });
    deciding = false;
  }
  async function startRound() {
    const { D, r } = F;
    await Promise.all([D.remove(r('atk')), D.remove(r('res'))]);
    await D.update(r('ctl'), { state: 'play', round: (C.round || 0) + 1, startAt: now() + COUNT_MS, seed: Math.floor(Math.random() * 2 ** 31), tempo: $('#tempo').value, winner: null, champion: null, endAt: null });
  }
  async function newMatch() {
    const { D, r } = F;
    await Promise.all([D.remove(r('atk')), D.remove(r('res')), D.remove(r('st'))]);
    await D.set(r('ctl'), { state: 'lobby', round: 0, wins: { a: 0, b: 0 }, names: { a: $('#nA').value.trim() || 'Agent A', b: $('#nB').value.trim() || 'Agent B' }, tempo: $('#tempo').value });
  }
  function panel() {
    const p = $('#panel'); if (!p) return;
    if (!p.dataset.ready) {
      p.dataset.ready = '1';
      p.innerHTML = `
        <label>Gracz A <input id="nA" maxlength="24"></label>
        <label>Gracz B <input id="nB" maxlength="24"></label>
        <label>Tempo <select id="tempo"><option value="spokojnie">spokojnie</option><option value="normalnie">normalnie</option><option value="ostro">ostro</option></select></label>
        <button class="btn" id="bNames" type="button">Zapisz imiona</button>
        <button class="btn" id="bStart" type="button">Start rundy</button>
        <button class="btn ghost" id="bStop" type="button">Zakończ rundę teraz</button>
        <button class="btn ghost" id="bNew" type="button">Nowy mecz</button>
        <span class="f-status" id="status"></span>
        <span class="f-hint">H ukrywa panel</span>`;
      $('#nA').value = name('a'); $('#nB').value = name('b'); $('#tempo').value = C.tempo || 'normalnie';
      $('#bNames').onclick = () => F.D.update(F.r('ctl/names'), { a: $('#nA').value.trim() || 'Agent A', b: $('#nB').value.trim() || 'Agent B' });
      $('#bStart').onclick = startRound;
      $('#bStop').onclick = () => { if (C.state === 'play') { const A = res.a && res.a.round === C.round ? res.a : { score: MA.score, dead: MA.dead, at: MA.diedAt }; const B = res.b && res.b.round === C.round ? res.b : { score: MB.score, dead: MB.dead, at: MB.diedAt }; finishRound(decide(A, B)); } };
      $('#bNew').onclick = () => { if (confirmNew()) newMatch(); };
      addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !/INPUT|SELECT/.test(document.activeElement.tagName)) p.classList.toggle('hide'); });
    }
    $('#bStart').disabled = C.state === 'play' || C.state === 'final';
    $('#bStop').disabled = C.state !== 'play';
    $('#status').textContent = `A: ${on.a ? 'połączony' : 'brak'} · B: ${on.b ? 'połączony' : 'brak'} · stan: ${C.state}, runda ${C.round || 0}, wygrane ${(C.wins && C.wins.a) || 0}:${(C.wins && C.wins.b) || 0}`;
  }
  // Drugie kliknięcie w ciągu 3 s potwierdza (bez okienek przeglądarki).
  let armed = 0;
  function confirmNew() { const t = performance.now(); if (t - armed < 3000) { armed = 0; $('#bNew').textContent = 'Nowy mecz'; return true; } armed = t; $('#bNew').textContent = 'Kliknij jeszcze raz'; setTimeout(() => { if (armed === t) $('#bNew').textContent = 'Nowy mecz'; }, 3000); return false; }

  function screen() {
    if (C.state === 'lobby') overlay(`<div class="rank">Wielki finał</div><h1>${esc(name('a'))} kontra ${esc(name('b'))}</h1><p>${T.lobbyView}</p><p class="small">${T.rules}</p>`);
    else if (C.state === 'final') overlay(`<div class="rank">${T.champion}</div><h1>${esc(name(C.champion))}</h1><p>Wygrywa finał ${C.wins.a}:${C.wins.b} i zabiera Złote Sanie Świętego.</p>`);
    else overlay(null);
  }
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(1 / 30, (t - last) / 1000); last = t;
    stepFlakes(dt); MA.step(dt); MB.step(dt);
    const cnt = countText();
    drawBoard(gA, MA.seen || C.state === 'play' ? MA : null, { name: name('a'), count: cnt, banner: bannerFor('a') });
    drawBoard(gB, MB.seen || C.state === 'play' ? MB : null, { name: name('b'), count: cnt, banner: bannerFor('b') });
    $('#clock').textContent = clockText();
    $('#score').innerHTML = scoreHTML(MA.score, MB.score);
    const tot = MA.score + MB.score || 1;
    $('#barA').style.width = `${(MA.score / tot) * 100}%`; $('#barB').style.width = `${(MB.score / tot) * 100}%`;
    $('#round').textContent = C.state === 'lobby' ? 'Wielki finał' : `Runda ${C.round}${C.state === 'play' ? '' : ' zakończona'}`;
    musicTick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  if (!admin) {
    // Przeglądarka nie gra dźwięku bez kliknięcia: jedno kliknięcie w stronę włącza muzykę i efekty.
    const unlock = () => { blip(1, 0.01, 'sine', 0.0001); removeEventListener('pointerdown', unlock); };
    addEventListener('pointerdown', unlock);
  }
}

// ───────────── jeden komputer, dwie plansze ─────────────
function local() {
  const gA = canvasIn($('#bA')), gB = canvasIn($('#bB'));
  C = { ...C, names: { a: store.get('final-nA') || 'Lewy', b: store.get('final-nB') || 'Prawy' } };
  let A = null, B = null;
  const p = $('#panel');
  p.innerHTML = `
    <label>Lewy (A/D, W) <input id="nA" maxlength="24"></label>
    <label>Prawy (← →, ↑) <input id="nB" maxlength="24"></label>
    <label>Tempo <select id="tempo"><option>spokojnie</option><option selected>normalnie</option><option>ostro</option></select></label>
    <button class="btn" id="bStart" type="button">Start rundy</button>
    <button class="btn ghost" id="bNew" type="button">Nowy mecz</button>
    <span class="f-hint">Pady: pierwszy steruje lewą planszą, drugi prawą. H ukrywa panel.</span>`;
  $('#nA').value = C.names.a; $('#nB').value = C.names.b;
  const names = () => { C.names = { a: $('#nA').value.trim() || 'Lewy', b: $('#nB').value.trim() || 'Prawy' }; store.set('final-nA', C.names.a); store.set('final-nB', C.names.b); };
  $('#nA').oninput = $('#nB').oninput = names;
  addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !/INPUT|SELECT/.test(document.activeElement.tagName)) p.classList.toggle('hide'); });
  $('#bStart').onclick = () => {
    names(); document.activeElement.blur();
    const seed = Math.floor(Math.random() * 2 ** 31), tempo = $('#tempo').value, round = (C.round || 0) + 1;
    C = { ...C, state: 'play', round, startAt: now() + COUNT_MS, seed, tempo, winner: null };
    const end = () => {
      if (C.state !== 'play') return;
      if (A.dead || B.dead || (A.done && B.done)) {
        const w = decide({ score: A.score, dead: A.dead, at: A.diedAt }, { score: B.score, dead: B.dead, at: B.diedAt });
        if (w) C.wins[w]++;
        C.endAt = now(); C.winner = w; C.state = w && C.wins[w] >= WINS ? 'final' : 'end'; C.champion = C.state === 'final' ? w : null;
        if (!A.dead) A.finish(); if (!B.dead) B.finish();
        say(w ? put(pick(T.roundWin), { A: name(w) }) : T.draw, true);
        $('#bStart').disabled = C.state === 'final';
      }
    };
    A = new Board(seed, tempo, { onAttack: (n) => { B.receive(n); say(put(pick(T.attack), { A: name('a'), B: name('b') }), true); }, onEnd: end });
    B = new Board(seed, tempo, { onAttack: (n) => { A.receive(n); say(put(pick(T.attack), { A: name('b'), B: name('a') }), true); }, onEnd: end });
    $('#bStart').disabled = true;
    overlay(null);
  };
  $('#bNew').onclick = () => { C = { ...C, state: 'lobby', round: 0, wins: { a: 0, b: 0 } }; A = B = null; $('#bStart').disabled = false; feed = []; renderFeed(); lobby(); };
  function lobby() { overlay(`<div class="rank">Finał na jednym komputerze</div><h1>Lewy kontra prawy</h1><p class="small">${T.rules.replace('Strzałki ← → sterują saniami, spacja wypuszcza śnieżkę.', 'Lewa plansza: A i D, W wypuszcza śnieżkę. Prawa: strzałki, ↑ wypuszcza śnieżkę.')}</p>`); }
  lobby();
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(1 / 30, (t - last) / 1000); last = t;
    stepFlakes(dt);
    if (A && B) {
      if (playing()) { A.step(dt, inputLeft(), elapsed()); B.step(dt, inputRight(), elapsed()); }
      else {
        A.stepFx(dt); B.stepFx(dt);
        if (C.state === 'play' && elapsed() >= ROUND_MS) { A.finish(); B.finish(); }
      }
    }
    const cnt = countText();
    drawBoard(gA, A, { name: name('a'), count: cnt, banner: bannerFor('a') });
    drawBoard(gB, B, { name: name('b'), count: cnt, banner: bannerFor('b') });
    $('#clock').textContent = clockText();
    $('#score').innerHTML = scoreHTML(A ? A.score : 0, B ? B.score : 0);
    const sa = A ? A.score : 0, sb = B ? B.score : 0, tot = sa + sb || 1;
    $('#barA').style.width = `${(sa / tot) * 100}%`; $('#barB').style.width = `${(sb / tot) * 100}%`;
    $('#round').textContent = C.state === 'lobby' ? 'Wielki finał' : `Runda ${C.round}${C.state === 'play' ? '' : ' zakończona'}`;
    if (C.state === 'final') overlay(`<div class="rank">${T.champion}</div><h1>${esc(name(C.champion))}</h1><p>Wygrywa finał ${C.wins.a}:${C.wins.b}.</p>`);
    musicTick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ───────────── start ─────────────
document.title = `${ROLE === 'a' || ROLE === 'b' ? 'Finał: gracz' : ROLE === 'sztab' ? 'Finał: sztab' : 'Wielki finał'} · SunHelp`;
layout();
soundButtons();
if (ROLE === 'a' || ROLE === 'b') player(ROLE);
else if (ROLE === 'lokalnie') local();
else viewer(ROLE === 'sztab');
