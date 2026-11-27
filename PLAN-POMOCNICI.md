# Pomocníci postav: Pouto, Sudba a Platba (milník)

Stav (27. 11. 2026): návrh k odsouhlasení, nic neimplementováno. Navazuje na `PLAN-POMUCKY.md` (krok 11c, léčení Jizev: „Pomocníci (Pouto, Platba) zatím nejsou“).
Zdroj pravidel: SRD, kapitola „Pomocníci a sítě“ (část o sítích zatím nezpracována, viz otevřené otázky). Práce po etapách s vlastními commity a PR po etapách.

## Pravidla stručně (vlastními slovy, podrobně v SRD)

- **Pomocník** je jakákoli bytost, která hrdinu doprovází a slouží mu (pes, vlk, žoldnéř, panoš, kostlivec, duch, probuzený strom, běs, golem…). Popisuje se
  jako každá jiná bytost: hranice (Tělo, Duše, Vliv), charakteristika, zvláštní schopnosti, přirozené zbraně a zbroje.
- **Liší se jen prací se Zdroji.** Každý pomocník má k hrdinovi **Pouto**: zdatnost 1 až 5 (1 = donucený zajatec, 3 = spravedlivý obchod, 5 = oddanost z přesvědčení)
  a aktuální počet Pouta. Pouto se chová jako hranice vlastnosti: lze z něj čerpat Zdroje na akce pomocníka a lze mu zasadit **Jizvu**
  (hráč pak získá Zdroje o 2 víc než závažnost Jizvy). Jizva na Poutu je dočasné oslabení vztahu či zranění pomocníka.
- **Pouto se samo neobnovuje ani nehojí.** Obnovuje se a Jizvy se léčí **Platbou**, kterou musí postava vynaložit. Zdatnost Pouta se může trvale měnit
  (dohoda, příběhová událost, odměna za hraní vztahu), nejvýš na 5. Klesne-li na 0 nebo se Pouto zruší, pomocníka přebírá Průvodce.
  Pomocník, který měl Pouto k jinému hrdinovi, ho musí nejdřív celé spotřebovat na odpor, teprve pak vznikne nové.
- **Sudba je společná** pro všechny pomocníky v blízkosti hrdiny: maximum = nejvyšší Sudba jednoho z pomocníků + 1 za každého dalšího. Hráč u pomocníka
  v blízkosti volí mezi společnou Sudbou a Poutem; vzdálený pomocník čerpá jen z Pouta a maximum Sudby se sníží. Sudba se obnovuje odpočinkem naráz pro všechny.
  Najednou lze vyčerpat nejvýš tolik, kolik činí hranice příslušné vlastnosti pomocníka.
- **Platba** (cena za udržení) vychází z charakteristiky pomocníka a zvyšuje se u silných či neobvyklých. Druhy: lidé a zvířata groše (zvířata i jídlo), oživení suroviny,
  netvoři, nemrtví a běsi **Jizvy** (netvoři na Těle, nemrtví a běsi spíš na Duši či Vlivu; jedna Platba = Jizva této závažnosti). Platba není pravidelný žold.
  Jizva na Poutu se léčí za **pětinásobek Platby** (viz `PLAN-POMUCKY.md`).
- **Získání pomocníka**: vyhledání, připoutání (střet či konflikt, vzniká Pouto a Platba), určení Platby. Rozhoduje Průvodce; aplikace to jen zapisuje.

## Rozhodnutí (27. 11. 2026, zadání uživatele)

- **Pomocník je samostatný záznam** (jako cizí postava), ne součást jedné postavy. Může to být člověk, zvíře, netvor, oživený či nemrtvý tvor, běs, golem…
- **Knihovna pomocníků** (sada); u postavy se vybírá ze sady. Pomocník je v praxi „vybavení“ postavy, ale žije vlastním životem (lze ho přenést jinam).
- **Deník pomocníka** podle tištěné karty (Deník pomocníka): Tělo, Duše, Vliv (hranice), Sudba, Pouto (eviduje se jako Tělo u postavy), Platba (druh a hodnota),
  „Bonusy / Postihy / Jizvy“ (zatím společný text), Charakteristika (text), Přirozené zbraně a zbroje (text, později odkazy na kartičky), Zvláštní schopnosti
  (text, po zavedení kartiček z kartotéky odkazy na konkrétní kartičky).
- **Platba je strukturovaná** (druh a hodnota): peníze (groše), suroviny, Jizva (na Těle, Duši či Vliv se závažností), případně jiné s poznámkou. Aplikace jí tak umí platit
  z Hotovosti a surovin postavy nebo zasadit Jizvu (rozhodnuto 27. 11. 2026). Výchozí hodnotu navrhne podle charakteristiky a druhu pomocníka.
- **Jizvy na Poutu** se evidují strukturovaně až ve 3. etapě (s léčením). V 2. etapě stačí zdatnost a aktuální Pouto; do té doby jsou Jizvy jen v textovém poli.
- **Pomocník se sdílí v balíčku s postavou** (přenos postavy nese i její pomocníky; změna obálky `SHARE_VERSION`). Samostatné posílání pomocníka zásilkou je doplněk.
- Ostatní pole jsou nejdřív textová; strukturované kartičky a odkazy až s kartotékami (větev `kartoteky`).

## Model (návrh)

```
Helper { id, name, kind: 'clovek' | 'zvire' | 'netvor' | 'ozivly' | 'nemrtvy' | 'bes' | 'jiny',
         creatureId?,                                   // původ v Bestiáři (kopie dat, ne živý odkaz)
         limits: { body, soul, influence },             // hranice (Tělo, Duše, Vliv)
         fate,                                          // Sudba bytosti (základ pro společnou Sudbu)
         characteristic: number,
         payment: { kind: 'groše' | 'suroviny' | 'jizva' | 'jiné', amount: number, note?: string },
                                                        // Platba: druh a hodnota (suroviny: druh surovin; jizva: vlastnost a závažnost)
         notes: string,                                 // Bonusy / Postihy / Jizvy (společný text)
         weapons: string, abilities: string,            // přirozené zbraně a zbroje, zvláštní schopnosti (text)
         image?, created, updated }                     // ilustrace jen v souboru, viz „Sdílení obrázků“
Poutání (u postavy, v deníku změn):  helpers.<helperId> = { bond: 1..5, ... }   // zdatnost; Jizvy Pouta jako u Těla
```

- **Pouto patří dvojici** (pomocník, postava), ne pomocníkovi: proto jeho zdatnost a Jizvy žijí v deníku změn postavy (`helpers.<id>.*`), nikoli v záznamu pomocníka.
  Pomocník je připoután nejvýš k jedné postavě na zařízení.
- Úložiště `helpers` (DB v10, schéma 1; přidat do `DATA_STORES`, zálohy a testu `migrace.test.ts`). Záloha ho nese jako volitelný seznam (`BACKUP_VERSION` zůstává 1).
  Ukázková data: případně 1 až 2 ukázkoví pomocníci s ID `demo-…` (do zálohy nejdou).

## Etapy

| etapa | obsah | ověření |
| --- | --- | --- |
| 1 | Model a úložiště `helpers` (DB v10), záloha, `FORMAT.md` a testy migrací; stránka **Pomocníci** v knihovně: seznam, deník pomocníka podle karty (úprava, smazání), vytvoření z bytosti v Bestiáři (kopie hranic, Sudby, charakteristiky a schopností) | unit testy, E2E |
| 2 | Vazba na postavu: výběr z knihovny („Přidat pomocníka“), Pouto (zdatnost 1 až 5, aktuální počet, trvalá změna zdatnosti), strukturovaná Platba (druh a hodnota), přetržení při 0 (předání Průvodci, upozornění), jeden pán na pomocníka | unit testy, E2E |
| 3 | Zdroje: společná Sudba (výpočet maxima, blízko / daleko), čerpání v Při hře z Pouta nebo Sudby, **Jizvy na Poutu** (strukturovaně: zasazení, Zdroje o 2 víc než závažnost, hojení), obnova Pouta Platbou (peníze z Hotovosti, suroviny, Jizva), léčení Jizev na Poutu (5× Platba) v dialogu Léčit z kroku 11c | unit testy, E2E |
| 4 | Sdílení: pomocníci jdou **v balíčku s postavou** (`SHARE_VERSION` +1, očištění, starší aplikace odmítne srozumitelně), volitelně samostatná zásilka `pomocnik` v obálce `obsah`; cizí postava ↔ pomocník (převod) | unit testy, E2E |
| 5 | Nápověda „?“, `CHANGELOG.md`, `FORMAT.md`, ověření na telefonu, vydání | |
| později | Kartičky z kartotéky místo textu (schopnosti, zbraně, zbroje), pomocníci v konfliktu a v Při hře (akce z obrany), sítě | |

## Otevřené otázky

1. **Sítě.** Kapitola se jmenuje „Pomocníci a sítě“; část o sítích (kontakty, vazby) je mimo tento plán a čeká na přečtení.
2. **Nastavení Pouta u Průvodce.** Má Průvodce vidět pomocníky svých hráčů a převzít je při přetržení Pouta (cizí postavy u výpravy)?
3. **Bestiář a licence.** Kopie z Bestiáře jen z veřejného SRD; Hry mocných a mistrovská povolání čekají na Altar.
4. **Ilustrace.** Řídí se rozhodnutím o sdílení obrázků: jen v souboru a v celkovém exportu.
