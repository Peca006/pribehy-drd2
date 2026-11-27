# Nápady a dolaďování

Značky: ✅ hotovo (jen stručná připomínka), 🚧 rozpracované, bez značky = otevřené. Podrobnosti hotových věcí jsou v `CHANGELOG.md`.

## Otevřené úkoly (stav k verzi 0.6.2, 27. 11. 2026)

### Další práce

- ✅ **Výpravy (0.5.0).** Etapy 1 až 7 hotové (`PLAN-VYPRAVY.md`); export a import výprav souborem hotový (Zásilky, nevydáno); zbývá zkouška na telefonu.
- 🚧 **Vedení hry (plán `PLAN-VEDENI-HRY.md`).** Etapy 1 až 4 jsou hotové a vydané v 0.5.10 (stránka Hra u družiny: časomíra,
  spravedlivý prostor, plán podle délky sezení, krátký odpočet). Zbývá etapa 5 (pruh s aktivním hráčem v Při hře, odkaz z družiny,
  souhrn časů do poznámky zápisu), etapa 6 (nápověda „?“, `FORMAT.md`, vydání) a zkouška na telefonu (uspání, zvuk odpočtu).
- ✅ **Kořist (11e, 0.5.0).** Příprava u příhody, odhalení, upřesnění a rozdělení postavám.
- **Před první beta verzí.** Formát dat je připravený (`FORMAT.md`: `schema` a migrace u záznamů, záloha a obnova do `.json`
  včetně ilustrací). Zbývá projít migrace při první skutečné změně tvaru dat a ověřit zálohu a obnovu na telefonu (soubor přes
  e-mail na druhé zařízení). Každou změnu formátu zapisovat do `FORMAT.md` a `CHANGELOG.md`. Záloha nese jen vlastní data
  (včetně vlastních Hávů), ukázková data (`demo-…`) a vestavěné Hávy vynechává (nevydáno). Test migrací se skutečnou migrací:
  `src/core/migrace.test.ts` (PR 72, pokud je sloučený).
- **Systémové Zpět v Androidu (návrh).** Tlačítko Zpět telefonu vrací o krok v historii prohlížeče, uživatel čeká návrat o úroveň výš
  jako v aplikaci. Řešení vyžaduje strom stránek (nadřazená stránka každé adresy, `parentOf`), zachycení návratu přes Navigation API
  (`navigate` s `traverse` dozadu) a nahrazení cílem „o úroveň výš“ (v kořeni modulu nechat výchozí chování), aby se historie
  nezacyklila. Univerzální tlačítko „Zpět“ (`ui/BackButton.svelte`) už vrací na stránku, odkud se přišlo. Dělat po ověření na
  telefonu a až s pevným stromem stránek (a rozmyslet, co dělá Zpět na záložkách a v Při hře).
- **Přenosy (pořadí).** Wi-Fi / WebRTC → QR na celou obrazovku a tisk → NFC. `file_handlers` se nedělají (jen počítač).
  Plán WebRTC (sezení bez internetu, hotspot, rozeslání změn): `PLAN-WEBRTC.md`.
  Kód, soubor, QR (s odkazem do aplikace, zhuštění historie), zvuk a příjem sdíleného souboru jsou hotové.
- **Sdílení vypravěč → družina.** Průvodce posílá po sezení opakovaně od zvoleného bodu žurnálu (hotovo), dnes souborem
  zprávou či e-mailem. Hromadné odeslání všem jednou akcí (multi-cast) až s WebRTC. Zbývá sdílení členů s postavami
  (ID postav z jiných zařízení). Více Průvodců se nedělá.
- **Ilustrace postav (rozhodnutí).** Jen v souboru se sdílením, v celkovém exportu a později přes WebRTC. Do kódu, QR, zvuku
  a jiných malých přenosů nikdy.
- **Audiogram.** Na sezení 22. 11. 2026 prošlo několik přenosů blízko u sebe i za hovoru a ruchu (`AUDIOGRAM.md`, výsledky). DSP
  (zúžení pásma, LDPC) a další zkoušky (vzdálenost, jiná zařízení, naměřený odstup a zvolený režim) čekají na testery; zkouška zvuku
  mezi dvěma zařízeními (0.4.6) je neověřená.
- **Postava.** Povolání z Her mocných a mistrovská povolání (čeká na Altar), pomocníci (Pouto, Platba): plán `PLAN-POMOCNICI.md`.
- **Hry mocných.** Jen pro vlastní interní účely (lokální balíček, větev `hry-mocnych`), do veřejných balíčků až po zařazení
  do SRD. Nechat až po všech milnících.
- **Balíčky ze SRD, obnova.** Data udržujeme sami; nový balíček jen při změně SRD (kontrola jednou za měsíc až rok) nebo
  formátu balíčků. Postup: build, `tools/srd/publish.mjs`, commit, nasazení `main`; při změně formátu zvýšit `PACK_BUILD`
  a `EXPECTED_BUILD`. Svolení Altaru: `content-packs/srd/SVOLENI.md` (Her mocných a Hotfixu se netýká).
- **Chybné odkazy v SRD balíčku (příležitostně).** Dva odkazy v Příručce vedou na kapitolu `36-kouzla-nastahy-leceni`
  (`#trvani-kouzel`, `#nastrahy`), správné ID je `36-kouzla-nastrahy-leceni` (kotvy tam existují). Odkaz v aplikaci i v ePubu
  nefunguje. Oprava ve zdroji (`tools/srd`, ověřit proti SRD), pak `PACK_BUILD`/`EXPECTED_BUILD` a `publish.mjs`; hlídat testem,
  že každý odkaz `chapter:` v balíčcích vede na existující kapitolu a kotvu (`tools/epub/epub.test.ts` to dnes hlídá jen pro ePub).
- **Sjednotit tvary slov (kmeny).** Dnes jsou dvě implementace: `stemOf` v `tools/srd/derive.mjs` (první 4 písmena, z toho aliasy
  v `terms` balíčku pro odkazy, vyhledávání a rejstřík v aplikaci) a bohatší `tools/epub/forms.mjs` (kmen bez diakritiky a koncovky,
  střídání samohlásek, volba základního tvaru, tabulky `LEMMA` a `IRREGULAR`; ePub aliasy z balíčku respektuje a doplňuje). Cíl:
  jediný modul (např. `src/core/forms`), který použije `derive.mjs` i ePub. Změna aliasů mění balíček, takže zvýšit `PACK_BUILD`
  a `EXPECTED_BUILD`, znovu `publish.mjs` a ověřit, že odkazy v textu nezmizely (porovnat počet aliasů a odkazů před a po).
- **K ověření na telefonu.** Dialogy (léčení, výroba, lektvary, nástrahy, kouzla), Hotovost, Grimoár, ilustrace, značka
  „změnil Průvodce“, volba „moje / jejich“ při importu, příjem souboru přes Sdílet (`share_target`, jen nainstalovaná PWA), přenos postavy s novými
  poli mezi zařízeními.
- **Drobnosti.** Jména testerů do O aplikace (až budou).
- **Nápad: NFC žetony (později, jiná větev).** Štítky NTAG s odkazem na Bytost, postavu či předmět; klepnutí otevře záznam
  (iPhone bez aplikace, čtení v aplikaci jen Chrome na Androidu). Podrobnosti v `PLAN-WEBRTC.md` (NFC).
- **Nápad: skiny s obrázkovou mapou ovládacích prvků (později).** Prvky (tlačítko, popis, výstup) definované souřadnicemi
  na obrázku; pixelartová varianta (inspirace Truhlice) nebo klasická. Předpoklad: uklidit stránky a navigaci.

### Možné další kroky (návrh, 27. 11. 2026)

1. **Zkouška zálohy na telefonu** (jen vy): stáhnout zálohu s vlastním Hávem, přenést e-mailem na druhé zařízení, obnovit.
2. **Měsíční kontrola balíčků SRD** (rychlá, bez rizika).
3. **Zkrácení testů zvuku** (modems, probe, protocol, po ~20 s): méně režimů v round-trip, ale slabší hlídání DSP.
4. **Vedení hry, etapy 5 a 6** (jiná session, nesahat bez domluvy).
5. **Etapa 2 WebRTC (spojení 1:1)** až po zkouškách Test WebRTC na telefonech.
6. **Pomocníci postavy (Pouto, Platba)**: návrh milníku v `PLAN-POMOCNICI.md`, čeká na odsouhlasení.
7. **Systémové Zpět v Androidu**: až se stromem stránek a po ověření na telefonu.

### Rozpracováno jinde (jiné větve a worktrees, nesahat)

- Větev `kartoteky` (worktree `C:\gitRepos\pribehy-drd2-kartoteky`): rozpracováno, obsah neznám.
- Větve `generator-jmen`, `vybava-bez-balicku` a `radiogram` jsou už v `main`; `hry-mocnych` má jen interní převodní skripty.

## Hotovo (stručně)

- ✅ **Pomůcky (krok 11 plánu hodů):** Suroviny po druzích (0.3.0), léčení Jizvy (0.3.1), Hotovost (0.3.2), výroba a opravy
  (0.3.3), lektvary (0.3.4), nástrahy (0.3.5), kouzla a Grimoár (0.4.0), lektvary, nástrahy a výrobky jako předpisy (0.4.2),
  název a popis předpisů a ukázkové předpisy (0.4.5). Panel Hod se při výrobě, nástrahách a kouzlech předvyplní. Plán a rozhodnutí: `PLAN-POMUCKY.md`.
- ✅ **Hody, střety a konflikt (kroky 1 až 10):** panel Hod (2k6, fyzické kostky, vyčerpání, Ohrožení, Výhody, manévry,
  zkouška, výzva, střet), konflikt u družiny (iniciativa, kola, vyřazení, shrnutí do žurnálu), bytosti v konfliktu, panel
  Postup vyhodnocení. Zdroje ze sebezasazené Jizvy. Chybí jen následky úspěchu kromě Ohrožení −1 a zápis hodů do žurnálu.
  Jádro: `core/character/roll.ts`, `play.ts`, `core/party/conflict.ts`.
- ✅ **Sdílení postav:** deník revizí, návrh a Zveřejnit, kód / soubor / QR (díly po 500 znacích, odkaz do aplikace,
  čtečka kamerou ověřena na telefonu), zhuštění historie pro QR, `share_target`, odpověď vypravěče s vrácením zamítnutých
  změn, kontrola postavy při importu. Ruční slučování konfliktů při importu (volba „příchozí / ponechat moje“, 0.4.7).
- ✅ **Družiny:** členové, žurnál, sezení s rozdělením zkušeností, rychlost postupu, tajné odměny, role Průvodce / hráč,
  sdílení od zvoleného zápisu, návrhy hráčů, značka „změnil Průvodce“ (0.4.7). Slučování souběžných úprav zápisu odpadá
  (schválené zápisy mění jen Průvodce).
- ✅ **Úprava postavy podle pravidel:** Postup (úroveň, zdatnost, schopnosti), zkušenosti, Jizvy a jejich hojení, kontrola
  postavy bez balíčku (`skeleton.json`, `check.ts`), ilustrace postav v zařízení.
- ✅ **Audiogram:** přenos zvukem (QPSK 1200, BPSK 800, další režimy), společná zkouška zvuku (0.4.6).
- ✅ **Obsah:** kapitoly Příručky po částech, ikony prostředí a filtry Bestiáře (druh, prostředí), balíčky se stahují z webu aplikace, mapy a obrázky v balíčku (WebP, přiblížení), rejstřík pojmů, omezení
  počtu odkazů v textu (nastavení „Odkazy v textu“ ve Více), O aplikaci s poděkováním a licencemi (0.4.7).
- ✅ **Formát dat a záloha:** `FORMAT.md` (přehled úložišť, `schema` + migrace, přenosy, pravidla změn), záloha všech dat do jednoho
  `.json` s ilustracemi a místním stavem, obnova „doplnit / přepsat“ s očištěním vstupu (Více → Záloha a obnova dat).
- ✅ **PWA:** aktualizace s pruhem „Obnovit“, instalace (Android, iOS návod), ikony.
- ✅ **Převod SRD v zařízení (bookmarklet):** UI odstraněno v 0.4.5, kód a sestavení (`tools/srd/browser`, `vite.srd.config.ts`) uklizeny; balíčky se stahují hotové.
- ✅ **Tvorba postavy:** výbava bez balíčku, generátor jmen.
- ✅ **Nápověda napříč aplikací (0.4.9):** tlačítko „?“ s panelem pod prvkem u pomůcek, postavy a družiny, Příručky, Bestiáře a Více;
  registr témat `src/core/help.ts` (kroky, návody, odkazy do příručky nebo SRD, kotvy hlídá test); stránka Nápověda ve Více
  (úvod, hledání, všechna témata). Zbývá jen odkaz na konkrétní dovednost v SRD (v kostře je `srd` jen u povolání a schopností).
