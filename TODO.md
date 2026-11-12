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

## Mapy a obrázky v balíčku

SRD má 4 obrázky (`Naložení`, `Radvanovo Panství`, `Vlci`, `Bílý hrad`, celkem asi 2,7 MB). Převodník
(`parse-chapter.mjs`) je už vypíše jako bloky `image` se zdrojovou adresou. Chybí jejich uložení do balíčku
a zobrazení ve čtečce (včetně přiblížení, mapy se při hře používají). Viz diskuse v historii session.

## Import z SRD přímo v aplikaci

Web SRD nepovoluje stahování z prohlížeče (nemá CORS hlavičky), takže přímé stažení v aplikaci nejde.
Viz diskuse; ověřit, zda existuje zdrojový markdown SRD na GitHubu (ten CORS má a bude stabilnější než HTML).
