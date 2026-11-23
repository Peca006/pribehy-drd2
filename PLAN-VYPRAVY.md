# Výpravy: návrh (rešerše pravidel SRD a plán)

Stav (24. 11. 2026): **návrh k posouzení**, nic zatím není naprogramované. Větev `worktree-vypravy` (worktree `vypravy`), práce půjde po
etapách s vlastními commity a jedním PR na konci (nebo po etapách, podle domluvy). Navazuje na `TODO.md` (Výpravy, Kořist 11e) a
`PLAN-POMUCKY.md`. Odkazy v závorkách vedou do příručky (kapitola a kotva).

## 1. Co říkají pravidla (rešerše SRD)

Zdrojem je hlavně kapitola **Příprava a vedení hry** (`41-priprava-a-vedeni-hry`), pak Základní pravidla (`31`), Pomocníci (`34`), Používání
dovedností (`35`) a Inspirace pro dobrodružství (`42`).

### Tři úrovně příběhu (`#dobrodruzstvi-vypravy-a-prihody`)
- **Dobrodružství** je uzavřená kapitola ze života hrdinů s významným cílem, na konci se uzavřou (skoro) všechny linie. Může být povídka i román.
- **Výprava** je kratší dobrodružství nebo část většího s krátkodobým cílem (dojít někam, získat předmět či informaci, splnit úkol). Události se
  řetězí. Pro hru má zásadní význam: **na výpravě se skoro nedá kvalitně odpočívat, hráči musí hospodařit se Zdroji** (viz níže).
- **Příhoda** je nejmenší stavební kámen: jedno setkání, vyjednávání, překážka nebo úkol. Většina konfliktů a vyhodnocení se odehrává v příhodách.
  Každá příhoda musí nechat hráče něco udělat (nikdy „ne“ na otázku, jestli to postava může ovlivnit).
- **Zápletka** patří ke všemu (dobrodružství, výpravě i příhodě): uvedení do situace a **důvod, proč se postavy vydají** (zisk, pomsta, slib, dluh…).

### Tvorba výprav (`#tvorba-vyprav`)
Hotová zápletka a cíl už jsou dané, důležitá je cesta a příhody. Příhody se připravují jednotlivě a zapojují se do příběhu dvěma způsoby:
- **Kostky domina**: výprava jako cesta z místa na místo. Příhody nejsou v pevném pořadí, Průvodce je vybírá, jak zapadají. Vytyčí se
  **cíl, zápletka** a **uzlové body** (příhody nebo události na určitém místě či čase; typicky zvrat krátce před koncem). Ostatní příhody se
  rozdělí podle toho, zda záleží na čase a místě, a **mezi které uzlové body patří** (před zvratem / po něm). Plus **příhody „kdykoli“**.
  Příklad v SRD: *Perlík vzpoury* (pozadí, zápletka a úvodní příhoda, balík příhod, uzlový bod, balík příhod, rozuzlení).
- **Dílky puzzle**: volný pohyb po prostředí (průzkum, pátrání, podzemí). Příhody se **vážou na místa a cizí postavy** nebo se „spustí“, když
  nastanou předpoklady; třídí se podle časových úseků, mají uzlové body a pár příhod „kdykoli“. Příklad: *Tajemství černého vína*.
- Obě varianty mají v SRD stejnou kostru příkladu: **téma, příběhové pozadí, zápletka pro postavy, příhody, uzlový bod, příhody, rozuzlení**.
- Příprava je oporou, ne scénář: příhody se uvádějí podle splněných předpokladů a zájmu hráčů; nepoužité se šetří na příště.
  **Rozuzlení není jediné možné**, Průvodce má mít po ruce dost cizích postav pro improvizaci.

### Hrajete o Zdroje (`#hrajete-o-zdroje`)
Úspěch výpravy z velké části určuje, zda hrdinům **vystačí Zdroje „tak akorát“**.
- Domino: napětí se tvoří počtem příhod **mezi uzlovými body a příležitostmi k odpočinku**.
- Puzzle: hráči odpočívají a odkládají, napětí tvoří souběžné nebo časově omezené zápletky, připomenutí, že čas běží.
- Obtížnost se nemanipuluje: kdo ušetří Zdroje, nedostane za trest další příhody. Hraní neúspěchů je stejně zábavné jako hraní úspěchů.

### Stavba a příprava příhod (`#stavba-prihody`, `#priprava-pro-hru`)
- Příhoda má **víc vyústění** (úspěch, neúspěch, podle způsobu řešení), neúspěch musí příběh rozvíjet, **nikdy nezastavit**; případně
  **úspěch s výhradou**; Zdroje se nemají čerpat jen proto, že by neúspěch nikam nevedl.
- Ke každé příhodě **poznámka, kterou příhodou pokračovat** po úspěchu / neúspěchu / podle způsobu řešení.
- Příhody se píší na **lístečky** (s postavami v nich), třídí do **balíčků podle uzlových bodů** a samostatného balíčku „kdykoli“; při hře se balíčky střídají.

### Průběžná příprava a inspirace (`#prubezna-priprava`)
Zdroje námětů: **hráči a jejich postavy** (deníky: silné a slabé stránky, vztahy, jak se stali hrdiny, cíle; ptát se na ně mezi sezeními),
rozhovory hráčů po hře, knihy a filmy, **Bestiář** (nápady u každé bytosti) a **Inspirace pro dobrodružství** (`42`: 26 „zajímavých překážek“
a finty). Konce výprav a důležitá rozhodnutí směřovat ke konci sezení, aby byl čas na přípravu.

### Hra o výpravě a mezi výpravami (`31`)
- **Na výpravě:** utrácení Zdrojů převažuje nad obnovou, kostky a pravidla v plné šíři, jen běžný odpočinek, Jizvy se léčí jen léčením.
- **Mezi výpravami:** události se jen odvyprávějí bez kostek, utrácí se jen Peníze a Suroviny, **kvalitní odpočinek** doplní Zdroje, Jizvy se hojí časem.
- Kořist a odměny: vybavení z výprav jako kořist, **kouzelné předměty a artefakty** jako odměna za řadu výprav (`33`); Peníze a Suroviny z odměn a pokladů.

## 2. Co už aplikace má a čeho se tato práce týká

| je hotové | využití u Výprav |
| --- | --- |
| Družiny: role Průvodce, členové, žurnál, sezení s rozdělením zkušeností | Výprava patří družině; zápis do žurnálu po výpravě |
| Konflikt družiny (iniciativa, kola, bytosti) | Příhoda může „spustit konflikt“ s předvyplněnými bytostmi |
| Bestiář s vlastními bytostmi a ilustracemi | Cizí postavy a protivníci v příhodách (odkaz na bytost) |
| Peníze, Suroviny s druhy, výbava, předpisy v Grimoáru | Kořist (11e): přidělení postavám |
| Odkazy do příručky, rejstřík, nápověda „?“ | Odkazy na kapitoly o výpravách, nápověda ke stránce Výprav |
| Záloha dat a `schema`, migrace | Nové úložiště se zálohuje a migruje stejně |
| Role: sdílení vypravěč → družina | Vypravěčské tajemství zůstává jen u Průvodce |

Chybí všechno okolo **přípravy a vedení** výpravy: nikde nejde zapsat výpravu, příhody a uzlové body, ani sledovat, co už se odehrálo.

## 3. Návrh

### Zásady
1. **Podle pravidel, ne místo nich.** Aplikace drží přípravu tak, jak ji SRD popisuje (zápletka, cíl, uzlové body, příhody v balíčcích, „kdykoli“), a při hře ukazuje, co je na řadě.
2. **Soukromé u Průvodce.** Pozadí, tajemství a příhody se nesdílejí hráčům. Sdílení „zápletky“ a výsledků až později.
3. **Příprava je opora, ne vlak:** žádné vynucené pořadí, příhody jdou nasadit kdykoli; nepoužité zůstávají k dispozici.
4. **Nic nehodnotí hráče.** Ukazatel Zdrojů a tempa je jen pomůcka pro Průvodce, žádná „obtížnost“.
5. Vlastní text jen ten, který napíše uživatel nebo my; příklady SRD se neopisují do aplikace, jen se na ně odkazuje.

### Data (nové úložiště `expeditions`, schéma 1)
```
Expedition { id, name, theme, background /*tajné*/, hook /*zápletka pro postavy*/, goal,
             style: 'domino' | 'puzzle', status: 'priprava' | 'probiha' | 'hotova' | 'odlozena',
             partyId?, nodes: Node[], incidents: Incident[], resolution, notes, created, updated }
Node       { id, title, text, kind?: 'zvrat' | 'odpocinek' }          // uzlový bod, pořadí = pole
Incident   { id, title, text, stage: '' | nodeId | 'kdykoli',          // před prvním uzlem / po uzlu / kdykoli
             place?, cast: [{ creatureId? , name }], conditions, ifSuccess, ifFailure,
             state: 'priprava' | 'nasazena' | 'odehrana' | 'odlozena', outcome?: 'uspech'|'neuspech'|'jinak', result, loot: Loot[] }
Loot       { id, kind: 'penize'|'suroviny'|'vybava'|'trofej', label, amount?, state: 'ukryta'|'odhalena'|'rozdelena', to? }
```
`stage` vyjadřuje balíčky ze SRD: příhody po uzlu *n* patří do „balíčku n“, `kdykoli` je samostatný balíček. Pozn.: pole kořisti (`loot`)
se přidá až v etapě Kořist; zapíše se bez zvýšení čísla schématu (volitelné pole). Záloha a `FORMAT.md` se doplní s úložištěm.

### Obrazovky
1. **Seznam výprav** (modul Výpravy, jen pro družiny s rolí Průvodce, nebo i bez družiny jako příprava): název, družina, stav, počet příhod odehraných / celkem.
2. **Příprava výpravy** (jedna stránka se sbalitelnými částmi podle kostry SRD): Téma a pozadí, Zápletka pro postavy, Cíl, Styl (domino / puzzle s vysvětlením a „?“), Uzlové body, Příhody v balíčcích (před prvním uzlem, po uzlech, kdykoli), Rozuzlení a poznámky.
   Editace příhody: název, text, místo (puzzle), cizí postavy (výběr z Bestiáře nebo text), předpoklady, „když uspějí / když neuspějí“, kořist.
3. **Při hře**: balíčky jako lístky, aktuální balíček podle dosaženého uzlového bodu, tlačítka *Nasadit*, *Odehráno* (výsledek úspěch / neúspěch / jinak + poznámka), *Odložit*; *Uzlový bod nastal* posune balíček; vedle toho stručné pozadí a zápletka, **počet příhod do dalšího uzlu / odpočinku**
   (ukazatel „Hrajete o Zdroje“ s odkazem na pravidlo). Příhoda může **spustit konflikt** (bytosti předvyplněné) a otevřít odkaz do příručky.
4. **Uzavření výpravy**: shrnutí z odehraných příhod jako **návrh zápisu do žurnálu družiny** (Průvodce upraví a schválí), přepnutí „Mezi výpravami“; kořist k rozdělení.
5. **Inspirace v přípravě** (jen čtení): u družiny koncept, „jak se stali hrdiny“ a cíle místních postav (přípravná pomůcka dle `#prubezna-priprava`), odkazy na kapitolu Inspirace pro dobrodružství a Bestiář.

### Kořist (11e) v rámci Výprav
Kořist je u příhody (nebo výpravy) předdefinovaná jako seznam; při odhalení se upřesní, zafixuje a **rozdělí**. Peníze a Suroviny (i s druhem) a výbava se zapíšou
postavám na tomto zařízení jako změna postavy s poznámkou „Kořist: …“ (stejný mechanismus jako postup); u postav z jiných zařízení vznikne **zápis do žurnálu**
a později přenos (kandidát na budoucí typ přenosu). Trofeje: jen název a poznámka. Hráč zvláštní panel nepotřebuje.

## 4. Etapy (každá vlastní commit/y, po etapě zelené testy)

| etapa | obsah | ověření |
| --- | --- | --- |
| 1 | Model, úložiště `expeditions` (DB v8), zálohování, `FORMAT.md`; seznam výprav a základ přípravy (pozadí, zápletka, cíl, styl) | unit testy, E2E vytvoření a uložení |
| 2 | Uzlové body a příhody v balíčcích (`stage`), úprava příhody, pořadí | unit testy řazení, E2E |
| 3 | Při hře: nasazení, odehráno, výsledek, posun uzlového bodu, ukazatel tempa; odkaz na konflikt a příručku | unit testy stavů, E2E |
| 4 | Uzavření: návrh zápisu do žurnálu, přepnutí „Mezi výpravami“, vazba na družinu | E2E |
| 5 | Kořist (11e) a zápis postavám | unit testy, E2E |
| 6 | Inspirace z postav družiny, vlastní ukázková výprava v ukázkových datech (vlastní text), nápověda „?“, odkazy, `CHANGELOG.md`, vydání | E2E, ověření na telefonu |

## 5. Otevřené otázky (potřebuji rozhodnutí po prostudování pravidel)

1. **Kde Výpravy bydlí:** samostatný oddíl v hlavní navigaci, nebo uvnitř Družiny (u družiny záložka „Výpravy“)? Navrhuji **uvnitř družiny** (výprava vždy patří družině, Průvodce ji tam otevře) a jen odkaz z přehledu.
2. **Hráči:** má hráč v družině vidět aspoň „zápletku“ a výsledky odehraných příhod (tj. sdílení)? Navrhuji **zatím ne**, jen zápis do žurnálu.
3. **Uzlový bod „odpočinek“** (příležitost k odpočinku): je to dobrý způsob, jak do tempa zapojit Zdroje, nebo to stačí jako poznámka?
4. **Kořist u postav z jiných zařízení:** stačí zápis do žurnálu, nebo chcete hned nový typ přenosu „odměna“?
5. **Dobrodružství** (nadřazené výpravám) zatím neděláme: výprava je samostatná, dobrodružství je jen volný štítek (název kampaně). Souhlas?
6. **Příklady SRD** (*Perlík vzpoury*, *Tajemství černého vína*) nechat jen jako odkazy do příručky; ukázkovou výpravu v aplikaci napsat vlastní. Souhlas?
