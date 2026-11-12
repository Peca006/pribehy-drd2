# Nápady a dolaďování

## Rejstřík pojmů: příliš mnoho odkazů (čtečka hotovo, zbývá Bestiář)

Ve čtečce kapitol má odkaz z pojmu (`***pojem***`) jen první výskyt v kapitole a žádný pojem, jehož vysvětlení
je v téže kapitole (`src/core/termLinks.ts`, značka `NO_LINK` v `parseInline`). Ostatní výskyty zůstávají tučnou
kurzívou bez odkazu. Zbývá:

- Stejné pravidlo pro text bytostí v Bestiáři (`Md` u karty bytosti), kde se pojmy opakují u každé bytosti.
- Případně volba v nastavení čtečky: *Odkazy u všech výskytů / jen u prvního / vůbec*.
- Zvážit, zda v dlouhé kapitole (31) nedávat odkaz i podruhé až za určitou vzdáleností od prvního výskytu.

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
