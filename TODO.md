# Nápady a dolaďování

## Rejstřík pojmů: příliš mnoho odkazů (dolaďování)

Odkazy z pojmů (`***pojem***` → vysvětlení) se tvoří u každého výskytu, a proto jsou v textu místy samé
odkazy a hůř se čte:

- V kapitole *Manévry* je v prvních třech odstavcích 7–8 odkazů na tutéž kapitolu.
- *Sudba*: z `43-bestiar/sudba` vede odkaz do `31-zakladni-pravidla/sudba`, kde je hned pod nadpisem dalších
  7 odkazů na sudbu. Ze základních pravidel vede (přes číslo strany) odkaz zpět do `43-bestiar/sudba`, kde je
  zase mnoho odkazů na sudbu.

Návrhy řešení (vybrat po vyzkoušení na čtečce):

1. Odkaz jen u **prvního výskytu pojmu v kapitole** (případně v sekci pod nadpisem 2. úrovně), další výskyty
   jen jako tučná kurzíva beze odkazu.
2. **Nikdy neodkazovat na kapitolu, ve které výskyt stojí** (a na sekci, ve které stojí). Odkaz na sebe sama
   nepřináší nic.
3. Odkazy mezi dvojicí kapitol (Sudba ↔ Sudba v Bestiáři) sloučit: pojem má jedno „hlavní“ vysvětlení
   (`termIndex` v `src/core/library.svelte.ts`), na ostatní místa se odkazuje jen z jeho prvního výskytu.
4. Případně volba v nastavení čtečky: *Odkazy u všech výskytů / jen u prvního / vůbec*.

Pozor na odkazy ze SRD (ručně vložené autory, `html-md.mjs`): ty se neomezují, jen odkazy tvořené slovníkem.

## Mapy a obrázky v balíčku (hotovo)

Obrázky ze SRD (4 ks) se při sestavení balíčku převedou na WebP a vloží do JSONu jako `data:image/webp`
(`tools/srd/images.mjs`, zdrojové PNG se stahují do `reference/srd/assets/`). Čtečka je zobrazí s možností
přiblížení (`src/ui/ZoomImage.svelte`). Možné vylepšení: ukládat obrázky z balíčku do IndexedDB jako soubory,
pokud by velikost JSONu v paměti vadila.

## Import z SRD přímo v zařízení uživatele (bookmarklet)

Web SRD nemá hlavičky CORS, takže aplikace ani stránka na `github.io` z něj stahovat nemůže (Google Disk se
zdroji je zastaralý a pro prohlížeč nepoužitelný). Řešení bez serveru je **bookmarklet**: uživatel otevře
`drd2srd.d20.cz`, klepne na záložku „Převést SRD“, kód běží na stránce SRD (stejná doména, CORS neplatí),
stáhne stránky podle navigace, převede je a nabídne ke stažení balíček (`.json`), který se nahraje v Knihovně.

- Text se nehostuje, bere se z webu SRD u uživatele, převodník zvládne vždy aktuální verzi SRD.
- Potřeba: převodník jako čisté funkce nad řetězci (bez `node:fs`), WebP přes canvas místo `sharp`,
  stránka s návodem (přetáhnout tlačítko do lišty záložek). Odhad 2–3 dny.
- Ověřit: web SRD nevysílá CSP (načtení skriptu z `github.io` by mělo projít).
- Mobil: iOS Safari a Firefox pro Android bookmarklety zvládají, Chrome pro Android ne spolehlivě. Alternativa:
  balíček sestavit na počítači a soubor přenést.
