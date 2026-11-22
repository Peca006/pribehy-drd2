# Kartotéky DrD2 – návrh taxonomie zdola (bod 2)

Vznikla z přečtení všech 206 ZS Příručky, 77 dovedností a bestiářových definic. Fafrinovy dials se nepoužily
(porovnání je bod 3). Počty jsou z pravidlového štítkování `taxonomie.mjs` (regex nad textem), takže jsou odhad
nad textem, ne ruční revize. Skript ukazuje i nepokryté zbytky.

## ZS (zvláštní schopnosti)

Nezávislé atributy:

| atribut | hodnoty | zdroj |
|---|---|---|
| `attribute` | body, soul, influence, none (Zloděj těl) | ze zdroje, 38 / 96 / 71 / 1 |
| `mechanism` (pole, 38 karet má víc než jeden) | viz tabulka níž | z textu |
| `activation-cost` (pole objektů `{resource, amount, note?}`) | prázdné (150), soul 1 (36), influence 1 (16), material 1 (6), material 3 (2), body 1, influence 3, body 2, material 12; 8 karet má víc aktivací | `(Aktivace …)` v textu; export zpět na „Duše: 1“ |
| `related-skill` (pole; id i název, vzájemná kontrola) | dovednost | kurzíva v textu odpovídá názvu dovednosti (109 z 206) |
| `target-kind` | people, animals, monsters, undead-fiends, constructs | z textu, jen když je výslovně uvedeno (43 z 206) |
| `mass` (příznak) | true / nic | „plošně“ (14) |
| `origin` | class-basic, class-advanced, race (+ `class` / `race` název) | ze zdroje |
| `quick-pick` | úroveň nebo kultura (rychlá volba) | ze zdroje, jen u části |

### Mechanismus (co schopnost mechanicky dělá)

| hodnota | počet | příklady |
|---|---|---|
| skill-proficiency (zběhlý v dovednosti) | 40 | Gladiátor, Silák, Skald |
| skill-mastery (bravurně) | 34 | Bohatýr, Šermíř, Veterán |
| free-maneuver (manévr zdarma) | 28 | Kruhový sek, Déšť střel, Pádný úder |
| narrative-authority (hráč určí skutečnost) | 23 | Přečtení soupeře, Labužník, Styky |
| scar-effect (Jizvy: Zdroj navíc, levnější léčení, nižší náročnost) | 14 | Hlava nehlava, Zarputilost, Berserk |
| craft (výroba posílená, nouzové Suroviny) | 13 | Něco z ničeho, Neobvyklé jedy |
| spell-enhance (posílené kouzlo, dlouho) | 13 | Paměť vody, Věčný žár |
| ward-sign (ochranný obrazec) | 11 | Znak salamandra, Čarovné stráže |
| aptitude (nadání, 2 manévry) | 9 | Cit pro zbraň, Dobrá muška |
| heal | 9 | Hojivý dotek, Síla osobnosti |
| grant-resources (poskytnout Zdroje jiné postavě) | 8 | Rameno na rameno, Moudrý rádce |
| companion (pomocník) | 8 | Cvičitel, Popularita |
| natural-protection (sleva na vyčerpání) | 7 | Pádný úder, Protřelý |
| defend-others (reaguje obranou za jiné) | 6 | Osobní strážce, Ostrý jazyk |
| unusual-sense | 5 | Noční oči, Netopýří sluch |
| gain-advantage | 4 | Skvělý taktik, Jako blesk |
| assess-abilities (odhad zvláštních schopností) | 4 | Lovčí, Znalec netvorů |
| stealth-evasion | 4 | Městské stíny, Kamufláž |
| mark-detect, dominate | 2 + 2 | Znamení Othala, Neviditelný loutkář |
| jednotlivé: improvised-gear, disguise, tracking, transform, spell-reflect, animate-construct | 1 každá | Plášť, Změna tváře, Ohař, Měnič podob, Znamení Berkano, Pán golemů |
| nezařazeno | 4 | Pán symbolů, Čarovné nápoje, Nouzové střely, Umělá duše |

168 z 206 karet má právě jeden mechanismus, ostatní dva a víc (typicky kombinace „zběhlý + posílení“ nebo
„zběhlý + aktivace“). Doporučení: slučovat jednotlivé hodnoty (1 záznam) do skupiny `special-effect` s poznámkou
a nezařazené 4 doplnit ručně; jemnější členění by dělalo z mechanismu jen jména karet.

## Dovednosti

| atribut | hodnoty | poznámka |
|---|---|---|
| `attribute` | body 13, soul 38, influence 25, none 1 (Používání elixírů) | ze zdroje |
| `area` | social-direct 12, movement-survival 11, magic-school 11, knowledge 9, craft-production 9, healing 4, social-network 4, craft-use 4, combat-melee 3, combat-ranged 3, leadership 3, combat-vs-kind 2, secrecy 1, nezařazeno 2 (Masti a běžné jedy, Umělý život) | z názvu, víc hodnot možných |
| `origin` | povolání (základní / pokročilé) | ze zdroje |

Text karty = odrážky `items` jako markdown (rozhodnuto). Počet odrážek 1–5.

## Bestiářové schopnosti (27 definic)

Většina jsou mechaniky „bytost má“: ochrany (`natural-protection`, sleva 2: Játra z křemene, Ocelová vůle,
Srdce gryfa, Nos na lumpárny), nadání (`aptitude`: Hrůza a děs, Diplomat, Bulíky na nos), reakce za jiné
(`defend-others`: Člen skupiny), manévry zdarma (`free-maneuver`: Nelidská rychlost, Ztělesněná zkáza, Masakr),
skupinová pravidla (Vůdce skupiny, Člen skupiny, Boj ve skupině, Dav, Živá vlna) a „proti bytosti“ (Nezranitelnost,
Zranitelnost, Neschopnost, Nezastavitelný, Nesmrtelný). Pro skupinová pravidla a „proti bytosti“ chybí v ZS
odpovídající mechanismus. Návrh: `group-rule` a `against-being` jako nové hodnoty mechanismu, příznak `monster`.

## Rozhodnutí (22. 11. 2026)

- `mechanism` je pole.
- `scope` jako enum se nezavádí (self / other-character / companion byl můj výmysl, ne Kostky ani pravidel DrD2;
  informaci nesou mechanismy `grant-resources`, `defend-others`, `companion`). Zůstává příznak `mass: true`.
  Případné `beneficiary` až bude potřeba.
- `related-skill` se ukládá jako id i název (kontrola); export mimo databázi používá název.
- `activation-cost` je strukturované pole `{resource, amount, note?}`; export na text „Duše: 1“.
- Klíč karty je `name` (v SRD jednoznačný napříč ZS, dovednostmi i bestiářem); `id` je stabilní slug názvu,
  uložený samostatně (při přejmenování se nemění); `source` rozlišuje `srd` / `fan`. Kolize názvů u cizí tvorby se
  řeší indexem u názvu.

## Porovnání s Fafrinovými dials (bod 3, 22. 11. 2026)

Skripty: `fafrin.mjs` (načte 86 karet a vypíše rozložení hodnot), `porovnani.mjs` (porovnání po kartách podle názvu).
Fafrinova sada má 86 karet = 60 základních povolání + 25 rasových + 1 společná; všechny se spárovaly s Příručkou.
Ve zdrojovém souboru chybí u karty „Zaříkávač koní“ uzavírací tag `</drd2-zs>` (parser to snáší).

| atribut | shoda | poznámka |
|---|---|---|
| `attribute` | 86 / 86 | |
| `level` ↔ základní povolání | 60 / 60 | Fafrin: „základní“ nebo prázdné; `class-advanced` a `class-expert` jsou zatím prázdné |
| `related-skill` | 29 / 30 | Fafrin vyplnil 30, já z textu (kurzíva) našel stejné; navíc nenašel nic. Neshoda: Odznaky hrdinství (Fafrin: Sebedůvěra, v textu jen „zastrašování“, tedy úsudek) |
| `activation-cost` | liší se jen zápisem u 22 | „Duše: 1“ vs „1 Duše“; 5 karet má „Bez aktivace, Duše: 1“ (část schopnosti je bez aktivace, část za cenu) |
| `effect` ↔ `mechanism` | 71 / 86 (podle mapování hodnot) | viz níž |

### Kde se liší `effect` (Fafrin) a `mechanism` (návrh)

- **Fafrin je jemnější u zdarma:** rozlišuje „Obrana zdarma“, „Rozsáhle zdarma“, „Přístupy zdarma“ a „Rozšířená obrana“
  (= moje `defend-others`). Já mám `free-maneuver` pro všechno vč. přístupů; přístupy zdarma mají být zvlášť.
- **Fafrin je hrubší u výroby a kouzel:** „Posílení dovednosti“ pokrývá výrobu, posílená kouzla, obrazce i změnu tváře;
  já je dělím na `craft`, `spell-enhance`, `ward-sign`, `disguise` atd.
- **„Zisk zdrojů“** použil u Něco z ničeho, Umění improvizace, Dar tvoření (výroba z nouzových Surovin zdarma), kde
  já mám `craft`. Je to rozdíl v pohledu: výsledek (Zdroje zdarma) vs. činnost (výroba).
- **„Jiný“** u Pádný úder a Plášť; já je řadím do `natural-protection` a `improvised-gear`.
- **Nekonzistentní zápis hodnot u Fafrina:** 34 zápisů `effect` se po sjednocení velikosti písmen zredukuje na 21
  („Zisk zdrojů“ / „Zisk Zdrojů“, „Silnější jizvy“ / „Silnější Jizvy“); `related-skill` je skloněný a s měkkým
  rozdělením slova („Orien­taci v divočině“, „Masti a jedy“ místo „Masti a běžné jedy“).
- **`purpose` (30 hodnot) mi chybí.** Míchá tři věci: oblast (Boj 20, Jednání 20, Skrývání 12, Znalosti 9, Magie 7,
  Léčení 7, Jizvy 8, Výroba 5, Pohyb 2), druh cíle (Lidé 7, Zvířata 6, Nemrtví, Běsi, Netvoři, Oživení) a předmět
  (Obrazce 5, Jedy 4, Pasti, Masti, Trofeje, Zřídla, Rituální předměty). Moje taxonomie má druh cíle (`target-kind`),
  ale pro ZS nemá oblast; u dovedností ji mám (`area`).

### Rozhodnutí po porovnání (22. 11. 2026)

1. ZS dostanou tři oddělená pole: `domain` (oblast: boj, jednání, skrývání, znalosti, magie, léčení, výroba, pohyb, …),
   `target-kind` (druh cíle) a `subject` (předmět: obrazce, jedy, pasti, masti, trofeje, zřídla, rituální předměty).
   „Jizvy“ není oblast, ale mechanismus (`scar-effect`). `domain` se odvozuje ze související dovednosti a z textu.
2. `free-maneuver` se dělí na `free-maneuver`, `free-defense` (obrana zdarma) a `free-approach` (přístup zdarma);
   `defend-others` zůstává zvlášť.
3. Něco z ničeho, Umění improvizace, Dar tvoření: `craft` + `gain-resources`.
4. **Aktivace:** prázdné pole `activation-cost` znamená „bez aktivace“; zvláštní příznak ani nulová cena se nezavádí.
   Karta s pasivní a aktivovanou částí (Lovčí, Čtení v duši, Síla osobnosti, Něco z ničeho, Umění improvizace) má
   jen cenu aktivované části; pasivní část vyplývá z mechanismu (např. `skill-proficiency`). Fafrinovo
   „Bez aktivace, Duše: 1“ u těchto 5 karet je pravděpodobně zmatení dvou atributů a v kontrole se hlásí jako
   rozpor. Při exportu pro Kostku se „Bez Aktivace“ vypíše jen když je pole prázdné.
5. Fafrin je reference a jeden z názorů. Kde se `effect` zdroje nehodí, mapují se hodnoty při exportu.
