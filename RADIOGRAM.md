# Radiogram: přenos kódu zvukem (experiment)

Větev `radiogram` (z `develop`, nesměřuje do `develop` ani `main`). Přenos kódu `DRD2:…` postavy nebo družiny
mezi dvěma zařízeními reproduktorem a mikrofonem, bez serveru. Texty v kódu jsou česky, `TODO.md` se nemění.

## Stav (co funguje)

Čisté DSP a protokol (`src/core/radiogram/`, vše ve vitestu se simulovaným kanálem):

| soubor | obsah |
| --- | --- |
| `crc.ts` | CRC-16/CCITT (rámec), CRC-32 (celá zpráva) |
| `frame.ts` | zprávy `Call`, `Ready`, `Data`, `Ack`; rámec na lince `[délka][obsah][CRC-16]`, dělení na kusy po 48 B, bitová mapa |
| `afsk.ts` | AFSK modulátor (spojitá fáze) a nekoherentní demodulátor, hledání rámců v nahrávce, odhad odstupu signálu |
| `modes.ts` | tabulka režimů, `chooseMode` (výběr podle odstupu signálu) |
| `protocol.ts` | `RadioSender` a `RadioReceiver`: handshake, dávky, ACK, opakování, zpomalení |
| `channel.ts` | simulovaný kanál: bílý šum, zpoždění, zesílení, výpadky; generátor řízený semínkem |
| `audio.ts` | Web Audio: přehrání, nahrávání (ScriptProcessor), detekce začátku/konce vysílání, `sendByAudio`, `receiveByAudio` |

UI: `src/ui/RadioSend.svelte` (tlačítko „Vysílat zvukem“ v `SharePanel` a `PartyShare`) a `src/ui/RadioReceive.svelte`
(tlačítko „Přijímat zvukem“ v `ImportPanel`; hotový text se vloží do pole importu a zkontroluje stejně jako vložený kód).

### Protokol (poloduplex, střídavě vysílá a poslouchá jedna strana)

1. Odesílatel pošle `CALL` v nejrobustnějším režimu (AFSK 300): velikost zprávy, počet rámců, CRC-32, nejvyšší podporovaný režim.
2. Příjemce změří odstup signálu na předzvuku a odpoví `READY` (naměřený odstup + doporučený režim).
3. Odesílatel posílá `DATA` po dávkách (12 rámců po 48 B), každý rámec má vlastní předzvuk, synchronizační slovo (CCSDS ASM), číslo a CRC-16.
4. Po dávce odpoví příjemce `ACK` s bitovou mapou všech přijatých rámců (hlas přijímače). Odesílatel znovu pošle jen chybějící.
5. Hotovo, když jsou potvrzeny všechny rámce; příjemce ověří CRC-32 celé zprávy.

Odpovědi příjemce jdou vždy režimem 0. Ztracené volání, `READY` i `ACK` se řeší opakováním (volání až 6×). Když dvě kola
za sebou nepřinesou pokrok, odesílatel zpomalí o jeden režim; příjemce při nezdaru zkouší demodulovat všemi režimy.
Po 6 marných kolech se odesílatel vzdá.

### Režimy a volba

AFSK 300 (1200/2100 Hz), 600 (1200/2400), 1200 (1200/2400), rozestup tónů je násobek baudové rychlosti (ortogonální v okně).
Výběr: odstup signálu v okně symbolu při 300 Bd klesá se změnou rychlosti nepřímo úměrně (−3 dB při 600, −6 dB při 1200).
Režim se zvolí, když predikovaný odstup − 2 dB rezerva ≥ 13 dB (naměřeno: pod ~12 dB v okně symbolu rámec 48 B často nedojde).

### Naměřeno v testech (bílý šum, amplituda signálu 0,7, rámec 48 B, 12 pokusů na bod)

| sigma šumu | AFSK 300 | AFSK 600 | AFSK 1200 |
| --- | --- | --- | --- |
| 0,2 | 100 % | 100 % | 100 % |
| 0,5 | 100 % | 100 % | 100 % |
| 1,0 | 92 % | 25 % | 0 % |
| 1,5 | 25 % | 0 % | 0 % |

Doba přenosu 960 B v čistém kanálu (včetně volání a potvrzení): AFSK 1200 ≈ 12 s, AFSK 300 ≈ 38 s. Typická postava (stlačený kód ~1–3 kB) tedy ~15–40 s v rychlém režimu.

## Co zůstalo nedodělané / neověřeno

- **Skutečný zvuk nebyl vyzkoušen.** Vše je ověřeno jen simulovaným kanálem (šum, zpoždění, zesílení, výpadky). Reproduktor a mikrofon
  mají nerovnou frekvenční odezvu, ozvěnu místnosti a AGC; mobilní prohlížeče mohou mikrofon předzpracovávat navzdory vypnutým volbám.
  Je třeba vyzkoušet na dvou telefonech (a ladit `minSnrDb`, amplitudu `AMPLITUDE`, délku ticha `LEAD`/`GAP`, `quiet` v `listenForBurst`).
- **PSK, QAM, OFDM nejsou.** Rozhraní režimu (`Mode`) je připravené na další druhy; chybí modulátory/demodulátory (BPSK/QPSK s
  koherentním příjmem a ekvalizací, QAM, OFDM s cyklickým prefixem a pilotními tóny) a rozšíření tabulky `MODES` a `chooseMode`
  o spektrální účinnost. Mezi AFSK 1200 a vyššími režimy je hlavně rozdíl v tom, že nekoherentní FSK využívá pásmo špatně.
- **Oprava chyb (FEC) není**, jen CRC + opakování rámců. Hammingův / Reedův-Solomonův kód by zvýšil dosah rychlých režimů.
- **Žádné sledování časování symbolů uvnitř rámce** (synchronizace jen na předzvuku). Rozdíl hodin zařízení ~100 ppm při rámci
  ≤ 0,5 s (AFSK 1200) nevadí; delší rámce by to vyžadovaly.
- **Odezva (RTT)** se neměří; časová okna jsou odvozena z doby vysílání + pevná rezerva 1,2 s. Pomalé zařízení (latence zvuku stovky ms)
  by mohlo potřebovat větší rezervu nebo měření z CALL→READY.
- Nahrávání přes `ScriptProcessorNode` (zastaralé). Náhrada: `AudioWorklet` (potřebuje samostatný modul, který Vite musí zabalit).
- Detekce konce vysílání v `listenForBurst` je podle hladiny (3× odhadovaný šum pozadí, ticho 0,9 s); v hlučném prostředí může selhat.
- UI není ladičsky vyzkoušeno v prohlížeči (jen `svelte-check` a testy jádra); chybí zvukový „ping“ pro kontrolu hlasitosti.
- Nezávislý kanál zpětný/dopředný jsou dvě různé cesty (reproduktor→mikrofon opačně); testy je simulují zvlášť.

## Rozhodnutí

- Poloduplex a odpovědi vždy režimem 0: vyhne se ozvěně vlastního vysílání a ACK je spolehlivý, i když data jedou rychle.
- Nekoherentní demodulátor s prefixovými součty (energie tónů v okně v konstantním čase): nepotřebuje fázi ani přesnou frekvenci.
- Synchronizace skóre hlavičky normalizovaná největší energií okna (jinak by částečně překrytý předzvuk skóroval 1,0).
- Za daty jsou 5 záchytných bitů, aby náběh a doběh amplitudy nezasáhly poslední datové symboly (nalezeno testem: chyba posledního bitu CRC).
