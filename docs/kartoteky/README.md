# Kartotéky DrD2: karty ZS a dovedností

Karty zvláštních schopností (ZS) a dovedností z Příručky a Bestiáře Dračího doupěte 2 (SRD), ve formátu navazujícím na Kartotéky Kostky.
Obsah: 206 ZS Příručky, 44 ZS Bestiáře, 77 dovedností.

## Soubory

| Soubor | Co obsahuje |
|---|---|
| `drd2-zs-kostka.md`, `drd2-skill-kostka.md` | Varianta pro Kostku: atributy přeložené na hodnoty, které Kostka zná (`effect`, `purpose`, `activation-cost`, `related-skill`, …), ve stejném formátu jako Fafrinova sada. |
| `drd2-zs-plne.md`, `drd2-skill-plne.md` | Plná varianta: všechny naše atributy se samostatnými poli (`mechanism`, `domain`, `subject`, `target-kind`, `parts`, …). |
| `kartoteky.json` | Totéž strojově: stabilní anglická `id` hodnot, strukturované ceny, díly karty. |
| `README.md` | Tento popis a slovník hodnot. |

## Rozdíl proti Kostce

Kostka má pro účinek jednu hodnotu (`effect`) a pro „účel“ směs oblasti, předmětu a cíle (`purpose`: Boj, Jedy, Zvířata, Jizvy…). Naše taxonomie to dělí:

- **mechanism**: co schopnost dělá (Nadání, Zběhlost, Manévr zdarma, Přirozená ochrana…). Jedna karta jich může mít víc.
- **domain**: v jaké oblasti hry se projeví (Boj, Jednání, Skrývání, Znalosti, Magie, Léčení, Výroba, Pohyb, Pomocníci, Odhad). Tentýž slovník se používá u dovedností jako `domain` (v Kostce `type`).
- **subject**: čeho se týká (Obrazce, Jedy, Pasti, Masti, Substance, Trofeje, Zřídla, Rituální předměty).
- **target-kind**: na koho působí (Lidé, Zvířata, Netvoři, Nemrtví a neživí, Běsi, Oživení). U ZS s navázanou dovedností se dědí z dovednosti, pokud není u karty ručně určen.
- **parts a activation-cost**: karta se skládá z částí (odstavců zdroje). Každá část má vlastní mechanismy a cenu aktivace; části se oddělují středníkem a pozice odpovídá pozici v `effect` i `activation-cost` ve variantě pro Kostku. Cena „Bez Aktivace“ znamená, že část nic nestojí. Poznámka u části (`parts`, hranaté závorky) je platba, která není Aktivací.
- **mass**: ano = schopnost působí plošně nebo na více cílů.
- **labels**: `ruční revize` = hodnoty domain, subject, target-kind prošel člověk; `automaticky` = odvozeno z textu a z navázané dovednosti.
- **supplemented**: pole doplněná, protože chybí ve zdroji (zatím jen Zloději těl: atribut Duše a aktivace 1 Duše, na doporučení komunity).
- Jizvy jsou u nás mechanismus (`scar-effect`, „Účinek na Jizvy“); do pole `purpose` pro Kostku se přidávají při exportu.
- Zdroj je vždy `SRD` (rulebook Příručka nebo Bestiář). Název karty je klíč, `id` je stabilní slug.
- **quick-pick**: číslo „rychlého výběru“ ze zdroje (úroveň povolání, u ras kultura). **monster**: ano = schopnost z Bestiáře.
- **bestiary-kind** a **used-by**: u záznamů z řádků statistik tvorů v Bestiáři. „talent“ je podmíněná zběhlost nebo bravura (každá podmínka je samostatná část v `parts`, v závorce), „neobvyklý smysl“ je neobvyklý smysl (Duše). `used-by` jsou tvorové, kteří záznam mají. Rasová ZS Noční oči se u tvorů znovu nevytváří.

## Slovník hodnot

### Zdroje a atributy
Atributy: `body` = Tělo, `soul` = Duše, `influence` = Vliv.
Zdroje v cenách: `body` = Tělo, `soul` = Duše, `influence` = Vliv, `material` = Suroviny.

### Mechanismus (mechanism)
| id | Česky | Hodnota v Kostce |
|---|---|---|
| `skill-proficiency` | Zběhlost v dovednosti | Zběhlost |
| `skill-mastery` | Bravurní ovládání dovednosti | Bravura |
| `aptitude` | Nadání | Nadání |
| `free-maneuver` | Manévr zdarma (rozsáhle ap.) | Rozsáhle zdarma |
| `free-defense` | Obrana zdarma | Obrana zdarma |
| `free-approach` | Přístup zdarma | Přístupy zdarma |
| `defend-others` | Obrana za jiné | Rozšířená obrana |
| `grant-resources` | Poskytnutí Zdrojů jiné postavě | Sdílení zdrojů |
| `natural-protection` | Přirozená ochrana (sleva na vyčerpání) | Přirozená ochrana |
| `scar-effect` | Účinek na Jizvy | Silnější Jizvy |
| `narrative-authority` | Obsahová pravomoc | Obsahová pravomoc |
| `craft` | Posílená výroba | Posílení dovednosti |
| `spell-enhance` | Posílené kouzlo | Posílení dovednosti |
| `ward-sign` | Ochranný obrazec | Posílení dovednosti |
| `unusual-sense` | Neobvyklý smysl | Neobvyklý smysl |
| `gain-advantage` | Zisk Výhod | Zisk zdrojů |
| `gain-resources` | Zisk Zdrojů | Zisk zdrojů |
| `assess-abilities` | Odhad zvláštních schopností | Posílení dovednosti |
| `heal` | Léčení | Posílené léčení |
| `companion` | Pomocník | Jiný |
| `stealth-evasion` | Ukrytí a únik | Posílení dovednosti |
| `mark-detect` | Označení či odhalení | Jiný |
| `dominate` | Ovládnutí | Posílení dovednosti |
| `special-effect` | Zvláštní účinek (jednotlivé případy) | Jiný |
| `group-rule` | Skupinové pravidlo bytostí | Jiný |
| `against-being` | Pravidlo „proti bytosti“ | Jiný |

Počty karet: skill-proficiency 48, skill-mastery 47, aptitude 12, free-maneuver 18, free-defense 8, free-approach 2, defend-others 6, grant-resources 8, natural-protection 11, scar-effect 14, narrative-authority 23, craft 13, spell-enhance 13, ward-sign 11, unusual-sense 8, gain-advantage 4, gain-resources 5, assess-abilities 4, heal 9, companion 8, stealth-evasion 4, mark-detect 2, dominate 2, special-effect 15, group-rule 6, against-being 5.

### Doména (domain)
| id | Česky | Hodnota v Kostce |
|---|---|---|
| `combat` | Boj | Boj |
| `social` | Jednání | Jednání |
| `stealth` | Skrývání | Skrývání |
| `knowledge` | Znalosti | Znalosti |
| `magic` | Magie | Magie |
| `healing` | Léčení | Léčení |
| `craft` | Výroba | Výroba |
| `movement` | Pohyb | Pohyb |
| `companions` | Pomocníci | Pomocníci |
| `assessment` | Odhad | Odhad |

### Předmět (subject)
| id | Česky | Hodnota v Kostce |
|---|---|---|
| `wards` | Obrazce | Obrazce |
| `poisons` | Jedy | Jedy |
| `traps` | Pasti | Pasti |
| `salves` | Masti | Masti |
| `substances` | Substance | Substance |
| `trophies` | Trofeje | Trofeje |
| `springs` | Zřídla | Zřídla |
| `ritual-items` | Rituální předměty | Rituální předměty |

### Druh cíle (target-kind)
| id | Česky | Hodnota v Kostce |
|---|---|---|
| `people` | Lidé | Lidé |
| `animals` | Zvířata | Zvířata |
| `monsters` | Netvoři | Netvoři |
| `undead` | Nemrtví a neživí | Nemrtví a neživí / Nemrtví / Neživí |
| `fiends` | Běsi | Běsi |
| `constructs` | Oživení | Oživení |

### Prostředí dovedností (environment)
Divočina, Město.

### Původ (origin-kind)
`class-basic` = základní povolání, `class-advanced` = pokročilé povolání, `race` = rasa, `bestiary` = Bestiář.

## Jak to používat pro filtrování

V Kostce lze filtrovat podle `domain`, `subject` a `target-kind` zvlášť (například doména Magie a cíl Lidé) bez míchání do jednoho pole `purpose`. Hodnoty varianty „plné“ jsou česky, shodné se slovníkem výše; `kartoteky.json` obsahuje stabilní `id`.

## Zdroj dat a vznik

Skripty jsou ve složce `tools/kartoteky` (inventář, taxonomie, slovník, export, ověření), rozhodnutí v `PLAN.md`, `TAXONOMIE.md` a `DOVEDNOSTI-NAVRH.md`. Texty pocházejí z veřejného balíčku SRD. Hodnoty `domain`, `subject` a `target-kind` u ZS Příručky byly ručně revidovány (viz `rucni-stitky.json`), cíle dovedností a prostředí jsou odvozeny pravidly. Kontrola proti Fafrinově sadě 86 karet (atribut, úroveň, povolání, rasa, kniha 86/86, related-skill 83/86, activation-cost 84/86).
