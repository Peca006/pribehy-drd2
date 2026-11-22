# Nápady a dolaďování

Značky: ✅ hotovo (jen stručná připomínka), 🚧 rozpracované, bez značky = otevřené. Podrobnosti hotových věcí jsou v `CHANGELOG.md`.

## Otevřené úkoly (stav k verzi 0.4.10, 22. 11. 2026)

### Další práce

- **Výpravy (další milník).** Sekce pro vypravěče: podklady pro tažení, výpravy a dobrodružství, vazba na družiny a žurnál,
  ukázkové dobrodružství a skupiny bytostí do ukázkových dat. Počká na reakce testerů a zkoušku 0.4.x na telefonu.
- **Kořist (11e).** Patří k Výpravám: vypravěč si kořist předdefinuje, při odhalení upřesní, zafixuje a rozdělí postavám
  (Peníze, Suroviny s druhem, výbava). Hráč zvláštní panel nepotřebuje. Trofeje jen název a poznámka.
- **Před první beta verzí.** Pole `schema` u uložených dat, řetězec `migrate`, celkový export a import `.json` (musí počítat
  s ilustracemi postav) a `FORMAT.md` (zatím neexistuje). Zásady formátu: `PLAN-POMUCKY.md`, část Formát dat.
- **Přenosy (pořadí).** Wi-Fi / WebRTC → QR na celou obrazovku a tisk → NFC. `file_handlers` se nedělají (jen počítač).
  Kód, soubor, QR (s odkazem do aplikace, zhuštění historie), zvuk a příjem sdíleného souboru jsou hotové.
- **Sdílení vypravěč → družina.** Průvodce posílá po sezení opakovaně od zvoleného bodu žurnálu (hotovo), dnes souborem
  zprávou či e-mailem. Hromadné odeslání všem jednou akcí (multi-cast) až s WebRTC. Zbývá sdílení členů s postavami
  (ID postav z jiných zařízení). Více Průvodců se nedělá.
- **Ilustrace postav (rozhodnutí).** Jen v souboru se sdílením, v celkovém exportu a později přes WebRTC. Do kódu, QR, zvuku
  a jiných malých přenosů nikdy.
- **Audiogram.** DSP (zúžení pásma, LDPC) a další zkoušky čekají na testery a zařízení; zkouška zvuku mezi dvěma zařízeními
  (0.4.6) je neověřená. Viz `AUDIOGRAM.md`.
- **Postava.** Povolání z Her mocných a mistrovská povolání (čeká na Altar), pomocníci (Pouto, Platba).
- **Hry mocných.** Jen pro vlastní interní účely (lokální balíček, větev `hry-mocnych`), do veřejných balíčků až po zařazení
  do SRD. Nechat až po všech milnících.
- **Balíčky ze SRD, obnova.** Data udržujeme sami; nový balíček jen při změně SRD (kontrola jednou za měsíc až rok) nebo
  formátu balíčků. Postup: build, `tools/srd/publish.mjs`, commit, nasazení `main`; při změně formátu zvýšit `PACK_BUILD`
  a `EXPECTED_BUILD`. Svolení Altaru: `content-packs/srd/SVOLENI.md` (Her mocných a Hotfixu se netýká).
- **K ověření na telefonu.** Dialogy (léčení, výroba, lektvary, nástrahy, kouzla), Hotovost, Grimoár, ilustrace, značka
  „změnil Průvodce“, volba „moje / jejich“ při importu, příjem souboru přes Sdílet (`share_target`, jen nainstalovaná PWA), přenos postavy s novými
  poli mezi zařízeními.
- **Drobnosti.** Jména testerů do O aplikace (až budou).
- **Nápad: skiny s obrázkovou mapou ovládacích prvků (později).** Prvky (tlačítko, popis, výstup) definované souřadnicemi
  na obrázku; pixelartová varianta (inspirace Truhlice) nebo klasická. Předpoklad: uklidit stránky a navigaci.

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
- ✅ **PWA:** aktualizace s pruhem „Obnovit“, instalace (Android, iOS návod), ikony.
- ✅ **Převod SRD v zařízení (bookmarklet):** UI odstraněno v 0.4.5, zbytky kódu a sestavení (`tools/srd/browser`, `vite.srd.config.ts`); balíčky se stahují hotové.
- ✅ **Tvorba postavy:** výbava bez balíčku, generátor jmen.
- ✅ **Nápověda napříč aplikací (0.4.9):** tlačítko „?“ s panelem pod prvkem u pomůcek, postavy a družiny, Příručky, Bestiáře a Více;
  registr témat `src/core/help.ts` (kroky, návody, odkazy do příručky nebo SRD, kotvy hlídá test); stránka Nápověda ve Více
  (úvod, hledání, všechna témata). Zbývá jen odkaz na konkrétní dovednost v SRD (v kostře je `srd` jen u povolání a schopností).
