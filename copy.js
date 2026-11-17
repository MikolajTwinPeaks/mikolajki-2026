// Warstwa tekstowa — wersje robocze od ChatGPT (_gpt/teksty-gpt.txt), wybór i redakcja: Claude.
// Jeden plik dla strony i maili. Zmienne: {IMIE} {TERMIN} {START} {TERMIN_LOSOWANIA} {BUDZET} {DATA_WRECZENIA} {ODLICZANIE}
export const COPY = {
  operacja: 'Operacja: Tajny Mikołaj',
  stopka: 'SunHelp · Mikołajki 2026 · Dobra energia działa także pod przykrywką',

  boot: [
    'Nawiązywanie szyfrowanego połączenia…',
    'Weryfikacja sygnatury SunHelp…',
    'Synchronizacja z siecią centrali…',
    'Kalibracja laserów przy choince…',
    'Ładowanie akt agentów…',
    'Kanał bezpieczny.',
  ],

  intro: [
    'Tu centrala SunHelp. Odbiór?',
    'Centrala kompletuje załogę tajnych Mikołajów.',
    'Działasz z biura czy zdalnie? Misja cię znajdzie.',
  ],

  rejestracja: {
    naglowek: 'Przyjmujesz misję?',
    podtytul: 'Biuro czy domowe centrum dowodzenia — każdy może zostać tajnym Mikołajem.',
    pola: { imie: 'Imię', nazwisko: 'Nazwisko', email: 'Służbowy e-mail' },
    placeholdery: { imie: 'Anna', nazwisko: 'Słoneczna', email: 'anna.sloneczna@sunhelp.pl' },
    przycisk: 'Przyjmuję misję',
    // Proza zamiast punktorów. {LICZNIK} i {AGENCI} podstawia strona na żywo.
    briefing: 'Zapisy zamykamy za {LICZNIK}. {AGENCI_ZDANIE} {TERMIN_KROTKO} każdy agent dostanie mailem osobisty link do losowania. Prezent do {BUDZET}, pomysłowość bez limitu. Kogo wylosujesz, będziesz wiedzieć tylko ty.',
    zdanie: { a: 'Nazywam się', b: ', mój służbowy adres to', c: '.' },
    redakcja: 'Cel misji:',
    redakcjaPo: 'odtajnimy {TERMIN_KROTKO}.',
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
    tekst: 'Zgłoszenie dotarło do centrali. Zapisy trwają do {TERMIN}, a losowanie ruszy {START}. Wtedy wyślemy ci osobisty link. Wypatruj wiadomości w służbowej skrzynce.',
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
    // Zaproszenie do zapisów — wysyła organizator do całej firmy (warianty: _gpt/zaproszenie-gpt.txt, wybór A + zdanie z B).
    zaproszenie: {
      temat: 'Mikołajki 2026 w SunHelp: czas na tajną misję',
      preheader: 'Dołącz do świątecznej operacji. Zapisy trwają do {TERMIN}.',
      tresc: [
        'Cześć, {IMIE}!',
        'W SunHelp rusza świąteczna tajna misja: Mikołajki 2026. Biuro czy praca zdalna, zapraszamy cały zespół. Zapisz się do {TERMIN} służbowym adresem @sunhelp.pl.',
        'Losowanie ruszy {START}. Każda osoba dostanie wtedy mailem osobisty link. Im wcześniej losujesz, tym większa pula. Siebie nie wylosujesz, a wynik zobaczysz tylko ty.',
        'Prezent do {BUDZET}, wręczenie w {DATA_WRECZENIA}. Przyda się odrobina pomysłowości i dyskrecji. Ciemne okulary możesz zostawić w szufladzie.',
      ],
      przycisk: 'Dołącz do misji',
      dopisek: 'Ta wiadomość ulegnie samozniszczeniu, gdy pierniki nauczą się zacierać ślady.',
    },
    potwierdzenie: {
      temat: 'Misja przyjęta. Jesteś w grze!',
      tresc: [
        'Cześć, {IMIE}!',
        'Centrala SunHelp potwierdza twoje zgłoszenie na Mikołajki 2026.',
        'Zapisy zamykamy {TERMIN}, a losowanie ruszy {START}. Wtedy dostaniesz osobisty link i poznasz osobę, dla której przygotujesz prezent w budżecie do {BUDZET}.',
        'Biuro czy zdalnie — jesteś częścią ekipy. Wypatruj kolejnej transmisji!',
      ],
    },
    czasLosowac: {
      temat: 'Centrala do agenta: czas losować',
      preheader: 'Twój osobisty link czeka. Odkryj, komu przygotujesz prezent.',
      tresc: [
        'Cześć, {IMIE}!',
        'Rekrutacja zakończona. Centrala daje zielone światło: możesz już wylosować osobę, której sprawisz mikołajkową radość.',
        'Wylosuj najpóźniej {TERMIN_LOSOWANIA}. Kto wejdzie wcześniej, losuje z większej puli. Siebie nie wylosujesz, a wynik zobaczysz tylko ty.',
        'Nie przekazuj nikomu linku — to także klucz do ponownego podglądu wyniku.',
      ],
      przycisk: 'Przyjmuję misję',
      dopisek: 'Ta wiadomość ulegnie samozniszczeniu… wyłącznie w filmowej wyobraźni. W skrzynce może spokojnie zostać.',
    },
    przypomnienie: {
      temat: 'Agencie, lont się pali — zostały 24 godziny',
      tresc: [
        'Cześć, {IMIE}!',
        'Twoja misja wciąż czeka na losowanie. Masz czas do {TERMIN_LOSOWANIA}. Potem centrala przydzieli cel automatycznie.',
      ],
      przycisk: 'Losuję teraz',
    },
    nowyLink: {
      temat: 'Nowa przepustka do misji',
      tresc: ['Cześć, {IMIE}!', 'Oto twój osobisty link do misji. Nie przekazuj go nikomu.'],
      przycisk: 'Otwórz misję',
    },
    depesza: {
      temat: 'Tajna depesza: twój cel misji',
      tresc: [
        'Cześć, {IMIE}!',
        'Dossier zostało odtajnione. Twój cel misji: <b>{CEL}</b>.',
        'Przygotuj prezent w budżecie do {BUDZET}. Przekazanie: {DATA_WRECZENIA}. Zachowaj tajemnicę.',
      ],
      auto: 'Termin losowania minął, więc centrala przydzieliła ci cel automatycznie.',
      przycisk: 'Otwórz dossier',
    },
  },
};

export function fill(text, vars = {}) {
  return String(text).replace(/\{([A-Z_]+)\}/g, (m, k) => (vars[k] ?? m));
}
