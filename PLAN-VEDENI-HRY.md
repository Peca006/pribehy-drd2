# Vedení hry: čas a spravedlivý prostor (milník po Výpravách)

Stav (25. 11. 2026): návrh schválen, rozpracována etapa 1. Navazuje na poznámku v `PLAN-VYPRAVY.md` (sekce „Další milník: vedení hry“).
Větev `worktree-vedeni-hry`. Práce po etapách s vlastními commity a PR po etapách.

## Rozhodnutí (25. 11. 2026)

- **Umístění:** samostatná stránka **Hra** u družiny (`#/druziny/<id>/hra`) pro celé sezení, nezávislá na výpravě (jde použít i bez ní). Z Při hře vede odkaz
  a malý pruh s aktivním hráčem. Nová stránka je jen u družiny, kterou vedete (Průvodce).
- **Soukromí:** časy vidí jen Průvodce. Běží jen na jeho zařízení, nesdílejí se s družinou. Po sezení lze jedním klepnutím uložit jen **souhrn** jako poznámku
  k zápisu do žurnálu (volitelně).
- **Hráči = členové družiny** (`Member`), ne postavy. Člen bez postavy na zařízení se počítá stejně.
- **Čas z časových razítek, ne z tikání:** součty se počítají z začátků a konců úseků (`Date.now()`), takže přežijí uspání telefonu, přepnutí aplikace
  i obnovení stránky. Odpočet je stejně z koncového okamžiku.

## Model

```
Sitting { id, partyId, runId?, status: 'bezi' | 'pauza' | 'hotovo', started, ended?,
          spans: [{ memberId, from, to? }],            // úseky, kdy byl aktivní člen; poslední bez `to` běží
          current?: memberId,                          // naposledy aktivní (pro „Pokračovat“ po pauze)
          absent?: memberId[],                         // mimo hru (etapa 3)
          planned?: minuty, note?, updated }           // plán a poznámka (etapy 4 a 6)
```

Úložiště `sittings` (DB v9, schéma 1), záloha je nese jako volitelný seznam (`BACKUP_VERSION` zůstává 1). Při smazání družiny se smažou i její sezení.

## Etapy

| etapa | obsah | ověření |
| --- | --- | --- |
| ✅ 1 | Model, úložiště a záloha, čistá logika časomíry (`core/game/clock.ts`), stránka **Hra**: začít, klepnutím přepnout aktivního hráče, pauza a pokračování, ukončit, pruhy času ve stejném měřítku, čas celkem | unit testy, E2E |
| 2 | Spravedlivý prostor: spravedlivý díl, upozornění, kdo je pozadu (po prahu času), členové „mimo hru“ se nezapočítávají | unit testy, E2E |
| 3 | Plán podle délky sezení: plánovaná délka, zbývá celkem a na jednoho, odhad příhod podle odehraných příhod vedení | unit testy, E2E |
| 4 | Krátký odpočet pro rychlé reakce (přednastavení, vlastní čas, zvuk a vibrace na konci), nezávislý na hlavní časomíře | unit testy, E2E |
| 5 | Vazba na vedení: pruh s aktivním hráčem v Při hře, odkaz z družiny; souhrn časů do poznámky zápisu žurnálu | E2E |
| 6 | Nápověda „?“, `CHANGELOG.md`, `FORMAT.md`, ověření na telefonu (nezhasínání displeje), vydání | |

## Otevřené otázky

1. Kolik času má být „pozadu“, aby se ukázalo upozornění (návrh: pod 70 % spravedlivého dílu, nejdřív po 10 minutách hry)?
2. Má se mezi hráči jednat o čas, nebo i o počet příhod, kterých se účastnili (zatím jen čas)?
3. Má odpočet běžet jen na stránce Hra, nebo i jako plovoucí pruh v Při hře?
