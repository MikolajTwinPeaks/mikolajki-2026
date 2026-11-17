// Warstwa tekstowa — wersje robocze od ChatGPT (_gpt/teksty-gpt.txt), wybór i redakcja: Claude.
// Jeden plik dla strony i maili. Zmienne: {IMIE} {TERMIN} {START} {TERMIN_LOSOWANIA} {BUDZET} {DATA_WRECZENIA} {ODLICZANIE}
export const COPY = {
  operacja: 'Operacja: Tajny Mikołaj',
  nadawca: 'Święty', // nazwa nadawcy w skrzynce (adres zostaje organizatora: „Święty przejął skrzynkę”)
  stopka: 'SunHelp · Mikołajki 2026 · Dobra energia działa także pod przykrywką',

  boot: [
    'Nawiązywanie szyfrowanego połączenia…',
    'Weryfikacja sygnatury SunHelp…',
    'Synchronizacja z siecią centrali…',
    'Odsuwanie elfów z linii wzroku…',
    'Ładowanie akt agentów…',
    'Kanał bezpieczny.',
  ],

  intro: [
    'Tu „Święty”, tajna służba Świętego Mikołaja. Odbiór?',
    'Elfy to przykrywka. Szukam prawdziwych agentów.',
    'Działasz z biura czy zdalnie? Misja cię znajdzie.',
  ],

  rejestracja: {
    naglowek: 'Przyjmujesz misję?',
    podtytul: 'Biuro czy domowe centrum dowodzenia — każdy może zostać tajnym Mikołajem.',
    pola: { imie: 'Imię', nazwisko: 'Nazwisko', email: 'Służbowy e-mail' },
    placeholdery: { imie: 'Anna', nazwisko: 'Słoneczna', email: 'anna.sloneczna@sunhelp.pl' },
    przycisk: 'Przyjmuję misję',
    // Proza zamiast punktorów. {LICZNIK} i {AGENCI} podstawia strona na żywo.
    briefing: 'Zapisy zamykam za {LICZNIK}. {AGENCI_ZDANIE} {TERMIN_KROTKO} każdy agent dostanie ode mnie osobisty link do losowania. Prezent do {BUDZET}, pomysłowość bez limitu. Kogo wylosujesz, będziesz wiedzieć tylko ty.',
    zdanie: { a: 'Nazywam się', b: ', mój służbowy adres to', c: '.' },
    redakcja: 'Cel misji:',
    redakcjaPo: 'odtajnię {TERMIN_KROTKO}.',
    skanowanie: 'Skanowanie twarzy…',
    potwierdzone: 'Tożsamość potwierdzona.',
  },

  bledy: {
    domena: 'Centrala rozpoznaje tylko adresy {DOMENA}. Sprawdź e-mail.',
    juz: 'Ten adres ma już miejsce w ekipie. Link do losowania przyjdzie po zakończeniu zapisów.',
    zamknieta: 'Lista agentów zamknięta. Zapisy dobiegły końca.',
    puste: 'Puste miejsce w aktach. Uzupełnij wszystkie pola.',
    link: 'Nie udało się rozpoznać przepustki. Otwórz link z e-maila albo poproś centralę o nowy.',
    siec: 'Zakłócenia na łączach. Spróbuj ponownie za chwilę.',
    limit: 'Za dużo prób naraz. Odczekaj minutę.',
  },

  wGrze: {
    naglowek: 'Jesteś w grze!',
    tekst: 'Mam cię na liście. Zapisy trwają do {TERMIN}, a losowanie ruszy {START}. Wtedy wyślę ci osobisty link. Przyjdzie ze skrzynki Mikołaja z marketingu, ale to ja. On nic nie wie.',
    start: 'Losowanie rusza',
    powrot: 'Wróć do bazy',
  },

  oczekiwanie: {
    naglowek: 'Trwa odprawa przed misją',
    tekst: 'Lista agentów jest zamknięta. Losowanie ruszy {START}. Dostaniesz wtedy e-mail z osobistym linkiem.',
    zaMalo: 'Do startu misji potrzeba co najmniej trzech agentów. Centrala czeka na posiłki.',
  },

  trwa: {
    naglowek: 'Losowanie trwa',
    tekst: 'Twój osobisty link czeka w służbowej skrzynce. Wejdź przez niego i poznaj cel misji — masz czas do {TERMIN_LOSOWANIA}.',
  },

  koniec: {
    naglowek: 'Misja w toku',
    tekst: 'Losowanie zakończone, każdy agent ma swój cel. Przekazanie prezentów: {DATA_WRECZENIA}.',
  },

  przypomnij: {
    link: 'Nie masz linku?',
    naglowek: 'Nowa przepustka',
    tekst: 'Podaj służbowy e-mail. Jeśli jesteś na liście, centrala wyśle ci nowy link.',
    przycisk: 'Wyślij przepustkę',
    ok: 'Jeśli adres jest na liście, depesza jest już w drodze.',
  },

  losowanie: {
    naglowek: 'Poznaj cel swojej misji',
    tekst: 'Im wcześniej losujesz, tym większa pula. Siebie nie trafisz. Wynik zobaczysz tylko ty — zadbaj o dyskrecję.',
    pula: 'Agentów w puli',
    przycisk: 'Losuję',
    animacja: [
      'Nawiązywanie łączności z centralą…',
      'Omijanie laserów przy choince…',
      'Przemykanie obok strażnika pierników…',
      'Uruchamianie rezerw dobrej energii…',
      'Zdejmowanie pieczęci z dossier…',
    ],
    odsloniecie: 'Dossier odtajnione. Tylko dla twoich oczu.',
  },

  wynik: {
    naglowek: 'Ściśle świąteczne',
    cel: 'Cel misji: prezent dla',
    instrukcja: 'Przygotuj prezent w budżecie do {BUDZET}. Nie zdradzaj, kto jest w twoim dossier — tajemnica jest częścią zabawy. Przekazanie prezentu: {DATA_WRECZENIA}.',
    samozniszczenie: 'Ta wiadomość ulegnie samozniszczeniu za {ODLICZANIE}',
    zniszczone: 'Dossier zaszyfrowane. Wynik jest bezpieczny — odsłonisz go tym samym linkiem.',
    pokaz: 'Odsłoń dossier ponownie',
    juzLosowales: 'Misja ma już swojego adresata. Otwórz dossier i przypomnij sobie, komu przygotowujesz prezent.',
  },

  mail: {
    // Legenda (17.11): pisze agent „Święty” z tajnej służby Mikołaja; przejął skrzynkę organizatora, a ten „nic nie wie”.
    // Wersje robocze: _gpt/swiety-gpt.txt (ChatGPT), redakcja: Claude, akcept: Mikołaj.
    zaproszenie: {
      temat: 'Tu „Święty”. Mam dla ciebie misję',
      preheader: 'Ta skrzynka jest chwilowo moja. Mikołaj nic nie wie.',
      tresc: [
        'Cześć, {IMIE}!',
        'Mówią na mnie „Święty”. Jestem najlepszym agentem tajnej służby Świętego Mikołaja. Na potrzeby tej operacji przejąłem skrzynkę naszego Mikołaja z marketingu. On nic o tym nie wie i niech tak zostanie. Ani słowa przy kawie.',
        'Elfy? To przykrywka, sam ją wymyśliłem. Świat wierzy w elfy, a prezenty od lat dostarczają ludzie, których nikt nie podejrzewa.',
        'W tym roku rekrutuję cały SunHelp, z biura i spod domowego koca. Twoja misja: dostarczyć prezent wskazanej osobie tak, żeby nigdy nie odkryła, od kogo jest.',
        'Zgłoś się do {TERMIN}, wyłącznie adresem @sunhelp.pl. Losowanie rusza {START}, wtedy wyślę ci osobisty link. Kto wejdzie pierwszy, ma większą pulę. Siebie nie wylosujesz, a wynik zobaczysz tylko ty.',
        'Budżet: {BUDZET}. Wręczenie: {DATA_WRECZENIA}.',
      ],
      przycisk: 'Przyjmuję misję',
      dopisek: 'Jeśli Mikołaj zapyta, czemu ma w „Wysłanych” maile, których nie pisał, mów, że to pewnie elfy.',
    },
    potwierdzenie: {
      temat: 'Zgłoszenie przyjęte. Witaj w tajnej służbie',
      tresc: [
        'Cześć, {IMIE}!',
        'Tu „Święty”. Zgłoszenie przyjęte: masz miejsce w tajnej służbie Mikołaja.',
        'Zapisy zamykam {TERMIN}, a losowanie rusza {START}. Wtedy wyślę ci osobisty link i poznasz osobę, której przygotujesz prezent do {BUDZET}.',
        'Do tego czasu zachowuj się naturalnie. I ani słowa Mikołajowi z marketingu.',
      ],
    },
    czasLosowac: {
      temat: 'Zielone światło. Czas losować',
      preheader: 'Twój osobisty link czeka. Sprawdź, komu dostarczysz prezent.',
      tresc: [
        'Cześć, {IMIE}!',
        'Tu „Święty”. Zapisy zamknięte, drużyna skompletowana. Daję zielone światło: możesz wylosować osobę, której dostarczysz prezent.',
        'Losuj najpóźniej {TERMIN_LOSOWANIA}. Kto wejdzie pierwszy, ma większą pulę. Siebie nie wylosujesz, a wynik zobaczysz tylko ty.',
        'Link jest tylko twój i otwiera też twoje dossier. Nie przekazuj go dalej, nawet elfom.',
      ],
      przycisk: 'Przyjmuję misję',
      dopisek: 'Ta wiadomość nie ulegnie samozniszczeniu. Może spokojnie zostać w skrzynce.',
    },
    przypomnienie: {
      temat: 'Lont się pali. Zostały 24 godziny',
      tresc: [
        'Cześć, {IMIE}!',
        'Tu „Święty”. Twoja misja wciąż czeka na losowanie. Masz czas do {TERMIN_LOSOWANIA}. Potem sam przydzielę ci cel.',
      ],
      przycisk: 'Losuję teraz',
    },
    nowyLink: {
      temat: 'Twoja przepustka do misji',
      tresc: ['Cześć, {IMIE}!', 'Tu „Święty”. Oto twój osobisty link do misji. Nie przekazuj go nikomu.'],
      przycisk: 'Otwórz misję',
    },
    depesza: {
      temat: 'Tajna depesza: twój cel misji',
      tresc: [
        'Cześć, {IMIE}!',
        'Tu „Święty”. Dossier odtajnione. Twój cel: <b>{CEL}</b>.',
        'Przygotuj prezent do {BUDZET}. Przekazanie: {DATA_WRECZENIA}. Niech ta osoba poczuje radość, ale nigdy nie pozna twojej tożsamości.',
      ],
      auto: 'Termin losowania minął, więc przydzieliłem ci cel osobiście.',
      przycisk: 'Otwórz dossier',
    },
  },
};

export function fill(text, vars = {}) {
  return String(text).replace(/\{([A-Z_]+)\}/g, (m, k) => (vars[k] ?? m));
}
