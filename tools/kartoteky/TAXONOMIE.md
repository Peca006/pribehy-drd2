# Kartotéky DrD2 – návrh taxonomie zdola (bod 2)

Vznikla z přečtení všech 206 ZS Příručky, 77 dovedností a bestiářových definic. Fafrinovy dials se nepoužily
(porovnání je bod 3). Počty jsou z pravidlového štítkování `taxonomie.mjs` (regex nad textem), takže jsou odhad
nad textem, ne ruční revize. Skript ukazuje i nepokryté zbytky.

## ZS (zvláštní schopnosti)

Nezávislé atributy:

| atribut | hodnoty | zdroj |
|---|---|---|
| `attribute` | body, soul, influence, none (Zloděj těl) | ze zdroje, 38 / 96 / 71 / 1 |
| `mechanism` (víc hodnot) | viz tabulka níž | z textu |
| `activation-cost` | none (150), 1 soul (36), 1 influence (16), 1 material (6), 3 material (2), 1 body, 3 influence, 2 body, 12 material | `(Aktivace …)` v textu, přesná hodnota |
| `related-skill` | id dovednosti, víc hodnot | kurzíva v textu odpovídá názvu dovednosti (109 z 206) |
| `target-kind` | people, animals, monsters, undead-fiends, constructs | z textu, jen když je výslovně uvedeno (43 z 206) |
| `scope` | self, other-character, companion, area | odvozeno z mechanismu; `area` = „plošně“ (14) |
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

## Otevřené otázky pro bod 3

- Je `mechanism` jedna hodnota nebo víc (u Kostky je víc)?
- Je `scope` samostatný atribut, nebo jen odvozený?
- `related-skill` jako id dovednosti, nebo jako název?
- `activation-cost`: pole `{amount, resource}` nebo text („Duše: 1“ jako u Kostky)?
