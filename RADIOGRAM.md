# Radiogram: přenos kódu zvukem (experiment)

Větev `radiogram` (z `develop`, nesměřuje do `develop` ani `main`). Přenos kódu `DRD2:…` postavy nebo družiny
mezi dvěma zařízeními reproduktorem a mikrofonem, bez serveru. Texty v kódu jsou česky, `TODO.md` se nemění.

## Stav (co funguje)

Čisté DSP a protokol (`src/core/radiogram/`, vše ve vitestu se simulovaným kanálem):

| soubor | obsah |
| --- | --- |
| `crc.ts` | CRC-16/CCITT (rámec), CRC-32 (celá zpráva) |
| `rs.ts` | Reed–Solomon nad GF(256): kódování, dekódování (Berlekamp–Massey, Chien, Forney) |
| `frame.ts` | zprávy `Call`, `Ready`, `Data`, `Ack`; rámec na lince `[délka][~délka][obsah+CRC-16][RS]`, skládání rámce z bitů (`FrameAssembler`), dělení na kusy po 48 B |
| `modem.ts` | rozhraní `Modem` (modulate / demodulate / airtime) a společné pomůcky |
| `afsk.ts` | AFSK: spojitá fáze, nekoherentní demodulátor, odhad odstupu signálu |
| `linear.ts` | BPSK, QPSK, 8-PSK, 16-QAM na nosné; společná synchronizace (korelace 63 symbolů PN), odhad zesílení a frekvence, smyčka fáze |
| `ofdm.ts` | OFDM: FFT 512, prefix 64, 36 podnosných (6 pilotních), ekvalizace z trénovacích symbolů + pilotní doladění fáze |
| `modes.ts` | tabulka 9 režimů, `chooseMode`, `esn0` |
| `payload.ts` | příprava textu k vysílání (base64url → bajty, volitelně deflate) |
| `protocol.ts` | `RadioSender` a `RadioReceiver`: handshake, dávky, ACK, opakování, zpomalení, vynucený režim |
| `channel.ts` | simulovaný kanál: bílý šum, zpoždění, zesílení, výpadky; generátor řízený semínkem |
| `audio.ts` | Web Audio: přehrání, nahrávání (ScriptProcessor), detekce začátku/konce vysílání, `sendByAudio`, `receiveByAudio` |

UI: `src/ui/RadioSend.svelte` (tlačítko „Vysílat zvukem“ v `SharePanel` a `PartyShare`, výběr režimu) a
`src/ui/RadioReceive.svelte` (tlačítko „Přijímat zvukem“ v `ImportPanel`; hotový text se vloží do pole importu
a zkontroluje stejně jako vložený kód).

### Protokol (poloduplex, střídavě vysílá a poslouchá jedna strana)

1. Odesílatel pošle `CALL` v nejrobustnějším režimu (AFSK 300): velikost zprávy, počet rámců, CRC-32, nejvyšší povolený režim a případně vynucený režim.
2. Příjemce změří odstup signálu na předzvuku a odpoví `READY` (naměřený odstup + zvolený režim; při vynuceném režimu ho jen zopakuje).
3. Odesílatel posílá `DATA` po dávkách (12 rámců po 48 B); každý rámec má vlastní synchronizaci, číslo a CRC-16 a Reed–Solomon.
4. Po dávce odpoví příjemce `ACK` s bitovou mapou všech přijatých rámců (hlas přijímače). Odesílatel znovu pošle jen chybějící.
5. Hotovo, když jsou potvrzeny všechny rámce; příjemce ověří CRC-32 celé zprávy.

Odpovědi příjemce jdou vždy režimem 0. Ztracené volání, `READY` i `ACK` se řeší opakováním (volání až 6×). Když dvě kola
za sebou nepřinesou pokrok, odesílatel zpomalí o jeden režim (jen v automatickém režimu); příjemce při nezdaru zkouší
demodulovat všemi režimy. Po 6 marných kolech se odesílatel vzdá.

### 1. Oprava chyb: Reed–Solomon (rozhodnutí)

Zvoleno **Reed–Solomon RS(n, n−16) po rámcích** (16 kontrolních bajtů, zkrácený kód, opraví až 8 chybných bajtů v rámci),
vedle CRC-16 uvnitř zakódovaného slova (chrání před chybnou „opravou“). Délka rámce je zvlášť, zdvojená s doplňkem
(`len`, `len ^ 0xFF`), protože demodulátor musí znát délku dřív, než může dekódovat.

Proč RS a ne konvoluční kód s Viterbim: každé zařízení se na lince chová jako bitový kanál s nezávislými chybami (šum)
nebo s krátkými shluky (ztracené symboly, výpadek zvuku); RS pracuje s bajty, takže jedna bitová chyba stojí jen jeden bajt a shluk
do 8 bajtů se opraví celý. Dekodér je bez měkkých rozhodnutí jednoduchý, rychlý (stovky bajtů) a deterministicky ověřitelný
testy (opraví přesně do 8 chyb, nad to rámec zahodí; náhodná falešná „oprava“ je s CRC-16 vzácná). Konvoluční kód
s Viterbim by dal víc (zisk 2–3 dB navíc proti RS při měkkém rozhodování), ale vyžaduje měkké výstupy ze všech demodulátorů;
to zůstává jako možné rozšíření (viz níže). Cena: 16 B navíc na rámec 52 B obsahu (rámec 52 → 72 B na lince, tedy ~27 % režie).

Naměřené zlepšení (AFSK 300, rámec 48 B, 16 pokusů na bod; odstup = energie symbolu ku šumu, viz `esn0` v `modes.ts`):

| odstup [dB] | jen CRC | CRC + RS(16) |
| --- | --- | --- |
| 14 | 100 % | 100 % |
| 13 | 100 % | 100 % |
| 11 | 63 % | 100 % |
| 10 | 13 % | 100 % |
| 9 | 0 % | 81 % |

Zisk je asi **3–4 dB** odstupu (každý režim má v tabulce `MODES` práh změřený už s RS).

### 2. Komprese při přenosu (`payload.ts`)

Kód `DRD2:` už obsahuje deflate (`CompressionStream('deflate-raw')`) zakódovaný jako base64url. Proto se vysílá **binárně**:
`DRD2:` + base64url se před vysíláním dekóduje na bajty a po příjmu zakóduje zpět (jen když se text z bajtů vrátí přesně
shodný, jinak se pošle jako text). První bajt zprávy je druh (bit 0 = kód převedený na bajty, bit 1 = deflate). Zkouší se i deflate,
ale použije se jen když zprávu zmenší: u kódu `DRD2:` nešetří (už je stlačený), u prostého textu ano.

Naměřeno (testovací postava s poznámkami): kód 523 znaků → **389 B, úspora 26 %** (čistě odpadá base64; teoreticky 25 %).
Delší kódy ušetří stejný podíl. Čas přenosu klesne ve stejném poměru.

### 3. Režimy

Tabulka je seřazená podle hrubé rychlosti; id je pořadí. Výchozí a režim pro handshake je 0. Všechny režimy mají stejné rámcování
a RS(16); jednotné rozhraní `Modem` (`modulate`, `demodulate`, `airtime`).

| id | režim | hrubá rychlost | popis |
| --- | --- | --- | --- |
| 0 | AFSK 300 | 300 b/s | tóny 1200/2100 Hz, nekoherentní příjem |
| 1 | AFSK 600 | 600 b/s | 1200/2400 Hz |
| 2 | BPSK 800 | 800 b/s | nosná 3200 Hz, koherentní |
| 3 | AFSK 1200 | 1200 b/s | 1200/2400 Hz |
| 4 | QPSK 1200 | 2 400 b/s | nosná 3000 Hz, 1200 Bd |
| 5 | 8-PSK 1200 | 3 600 b/s | |
| 6 | 16-QAM 1200 | 4 800 b/s | |
| 7 | OFDM QPSK | 5 000 b/s | 30 datových podnosných po 2 bity, symbol 12 ms |
| 8 | OFDM 16-QAM | 10 000 b/s | po 4 bity |

Jednonosné režimy: trénovací posloupnost (63 symbolů BPSK, PN) dává začátek rámce (korelace), komplexní zesílení kanálu
(fáze i amplituda, nutné pro QAM) a rozdíl frekvencí zařízení; v datech doladí fázi smyčka řízená rozhodnutím.
Symboly se vzorkují integrací přes symbol (přizpůsobený filtr pro obdélníkový impulz). OFDM používá stejnou synchronizaci;
odezvu kanálu na každé podnosné dá dvojice trénovacích symbolů, pilotní podnosné dolaďují společnou fázi a sklon (zpoždění) v každém
symbolu. Efektivní hodnota OFDM je nižší (0,18 oproti 0,49), aby špičky nepřesáhly rozsah reproduktoru, a prahy to zahrnují.

**Volba režimu.** Příjemce změří odstup signálu na předzvuku volání (AFSK 300, energie symbolu ku šumu, odhad z energií tónů).
`minSnrDb` každého režimu je odstup naměřený v tomto smyslu, při kterém režim spolehlivě projde (změřeno níže). `chooseMode`
vybere režim s nejvyšší rychlostí, jehož práh se vejde s rezervou 2 dB. Test ověřuje, že odhad z handshake souhlasí s modelem šumu na ±3 dB.

**Naměřená úspěšnost rámce 48 B podle odstupu** (10 pokusů, bílý šum; řádky = režimy, sloupce = odstup v dB):

| odstup [dB] | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 | 34 | 36 | 38 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AFSK 300 | 20 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| AFSK 600 | 0 | 0 | 70 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| BPSK 800 | 20 | 90 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| AFSK 1200 | 0 | 0 | 0 | 10 | 90 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| QPSK 1200 | 0 | 0 | 0 | 70 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 8-PSK 1200 | 0 | 0 | 0 | 0 | 0 | 60 | 90 | 90 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 16-QAM 1200 | 0 | 0 | 0 | 0 | 0 | 0 | 30 | 90 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| OFDM QPSK | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20 | 90 | 100 | 100 | 100 | 100 |
| OFDM 16-QAM | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 | 100 |

Prahy v tabulce `MODES` (`minSnrDb`): 0, 14, 11, 17, 16, 22, 22, 30,5 a 39 dB. Testy hlídají, že každý režim s rezervou +2 dB nad prahem
projde (≥ 85 %) a 7 dB pod prahem ne (≤ 40 %). Čas přenosu 300 B při vynuceném režimu (včetně handshake a potvrzení, obě strany):
AFSK 300 18,1 s, AFSK 600 11,1 s, BPSK 800 9,3 s, AFSK 1200 7,5 s, QPSK 6,0 s, 8-PSK 5,4 s, 16-QAM 5,2 s, OFDM QPSK 5,4 s, OFDM 16-QAM 5,0 s;
u krátkých zpráv dominuje pevná režie (ticho, handshake, rezervy), rozdíl se projeví až u delších zpráv (960 B: 8,7 s OFDM 16-QAM, 48,7 s AFSK 300).

Test odolnosti proti rozdílu taktu: nahrávka o 100 ppm rychlejší (lineární převzorkování) projde u AFSK 300, AFSK 1200, QPSK, 16-QAM i OFDM.

### 4. Ruční volba režimu v UI

V panelu „Vysílat zvukem“ je výběr **Režim**: výchozí „Automaticky podle handshake“, nebo libovolný řádek tabulky.
Volba se přenese ve volání, příjemce ji převezme (nezpomaluje a při volání neměří) a oba displeje ukazují
„Režim: … (vybraný ručně / automaticky / vybral odesílatel)“. Vynucený režim se při potížích **nezpomaluje**, pouze skončí po
6 marných kolech; to je záměr pro porovnání režimů.

## Jak testovat na dvou telefonech

1. Aplikace musí běžet na `https` nebo `localhost` (mikrofon). Například `npm run dev -- --host` a tunel/https, nebo nasazená verze z větve.
2. Na obou zařízeních povolit mikrofon. Hlasitost reproduktorů na ~70 %, telefony proti sobě reproduktorem k mikrofonu ve vzdálenosti 5–30 cm, v klidné místnosti.
3. Příjemce: Postavy → Import → **Přijímat zvukem** → *Začít poslouchat*. Odesílatel: Sdílet postavu (nebo družinu) → **Vysílat zvukem** → vybrat režim → *Začít vysílat*.
4. Postup ladění: začít AFSK 300 (musí vždy projít), pak BPSK 800, AFSK 1200, QPSK, 8-PSK, 16-QAM, OFDM; poznamenat, který ještě projde a po kolika kolech.
   Automatický režim ukáže u příjemce naměřený odstup signálu: porovnat s prahy v tabulce a případně opravit `minSnrDb` v `modes.ts` (reálný kanál bude horší než bílý šum).
5. Při selhání zkusit: větší hlasitost, menší vzdálenost, vypnout zvukové efekty/„zesílení hlasu“ telefonu, zakrýt okolní hluk.

## Co zůstalo nedodělané / neověřeno

- **Skutečný zvuk stále nebyl vyzkoušen.** Vše je ověřeno jen simulovaným kanálem (bílý šum, zpoždění, zesílení, výpadky, rozdíl taktu). Reproduktor a mikrofon
  mají nerovnou frekvenční odezvu, ozvěnu místnosti (vícecestné šíření), AGC; mobilní prohlížeče mohou mikrofon předzpracovávat navzdory vypnutým volbám.
  Prahy v `modes.ts` jsou z bílého šumu a budou u skutečných zařízení horší, hlavně u 8-PSK, 16-QAM a OFDM (citlivé na ozvěnu a nerovnou odezvu).
  Je třeba ladit `minSnrDb`, amplitudu `AMPLITUDE` (OFDM `OFDM_RMS`), délku ticha `LEAD`/`GAP`, `quiet` v `listenForBurst`.
- **Žádná ekvalizace vícecestného šíření u jednonosných režimů** (jen jednokoeficientová: zesílení a fáze). Při silné ozvěně selžou 8-PSK/16-QAM dřív než OFDM, který má prefix a ekvalizér na podnosnou
  (ten je ale odhadnutý jen z trénovacích symbolů na začátku rámce).
- **Bez měkkého rozhodování a bez konvolučního kódu / Viterbiho.** Měkká rozhodnutí z demodulátorů (LLR) a konvoluční kód nebo LDPC by přidaly další 2–3 dB.
- **Bez prokládání (interleaving)** uvnitř rámce; shluk chyb delší než 8 bajtů rámec zničí (opraví se opakováním).
- **Žádné sledování časování symbolů uvnitř rámce.** Rozdíl hodin ~100 ppm projde (test), víc by vyžadovalo sledování časování (hlavně OFDM a 16-QAM u dlouhých rámců).
- **Odezva (RTT)** se neměří; časová okna jsou odvozena z doby vysílání + pevná rezerva 1,2 s. Pomalé zařízení (latence zvuku stovky ms) by mohlo potřebovat větší rezervu.
- Odesílatel i příjemce posílají odpovědi režimem 0, takže zpětný kanál je vždy pomalý (u 960 B tvoří čas potvrzování zhruba třetinu přenosu u nejrychlejších režimů).
  Delší dávky nebo méně častá potvrzení by to zlepšily.
- Nahrávání přes `ScriptProcessorNode` (zastaralé). Náhrada: `AudioWorklet` (potřebuje samostatný modul, který Vite musí zabalit).
- Detekce konce vysílání v `listenForBurst` je podle hladiny (3× odhadovaný šum pozadí, ticho 0,9 s); v hlučném prostředí může selhat.
- Mapa potvrzení `ACK` je omezena na jeden rámec (≤ 255 B): nejdelší přenosná zpráva je kolem 90 kB (v praxi kódy jsou kolem jednotek kB).
- UI není ladičsky vyzkoušeno v prohlížeči (jen `svelte-check` a testy jádra); chybí zvukový „ping“ pro kontrolu hlasitosti.

## Rozhodnutí

- Poloduplex a odpovědi vždy režimem 0: vyhne se ozvěně vlastního vysílání a ACK je spolehlivý, i když data jedou rychle.
- Nekoherentní demodulátor AFSK s prefixovými součty (energie tónů v okně v konstantním čase): nepotřebuje fázi ani přesnou frekvenci.
- Synchronizace AFSK: skóre hlavičky normalizované největší energií okna (jinak by částečně překrytý předzvuk skóroval 1,0).
- Za daty jsou záchytné symboly, aby náběh a doběh amplitudy nezasáhly poslední datové symboly (nalezeno testem: chyba posledního bitu CRC).
- Společné rámcování a RS pro všechny modemy (`FrameAssembler` čte bity po jednom a sám pozná konec), takže nový režim je jen mapování bitů na zvuk.
- Nosná jednonosných režimů je násobek baud/2, aby se člen dvojnásobné frekvence při integraci symbolu přesně vyrušil.
- Práh režimu je vyjádřen jako odstup naměřený v režimu 0 (ne jako vlastní odstup režimu): jedna veličina z handshake stačí k volbě a zahrnuje rozdíly výkonu (OFDM) i konstelace.
