# Balíčky ze SRD (veřejná složka, zdrojový tvar)

Sem patří **jen** balíčky vyrobené z veřejného SRD Dračího doupěte II (drd2srd.d20.cz), na jejichž zveřejnění
má projekt svolení nakladatelství Altar v rozsahu SRD (viz `SVOLENI.md`):

- `drd2-pravidla-N.json` – Základní příručka (pravidla), **zdrojový tvar**
- `drd2-bestiar-N.json` – Bestiář, zdrojový tvar
- `img/*.webp` – obrázky, na které zdrojový JSON odkazuje (`"src": "img/NAZEV.webp"`)

**Nepatří sem** nic mimo SRD: Hry mocných, Hotfix, texty z tištěných knih ani ze `reference/`.
Ty zůstávají jen v gitignorované složce `content-packs/local/`.

## Proč zdrojový tvar

Zdrojový JSON je čistý text (diffy změn textu jsou čitelné) a obrázky jsou samostatné binární soubory, které
git uloží jen jednou. **Konečný balíček** (JSON s obrázky vloženými jako `data:image/webp;base64,…`) a katalog
`index.json` (verze, sestavení, velikost, SHA-256) vznikají až při sestavení aplikace:

```
node tools/srd/assemble.mjs        # content-packs/srd -> public/packs (gitignorováno)
```

Spouští se samo před `npm run dev` a `npm run build` (`predev`/`prebuild`); výsledek jde do `dist/packs/`,
tedy na stejnou adresu jako aplikace (`…/packs/index.json`). Aplikace balíčky stahuje za běhu (Více, Příručka),
v Service Workeru se nepředcachují, takže aktualizace balíčku nevyžaduje novou verzi aplikace a naopak.

## Jak vznikají a jak se publikují

```
node tools/srd/build.mjs            # pravidla  -> content-packs/local/ (konečný) a local/src/ (zdrojový + img/)
node tools/srd/build-bestiar.mjs    # bestiář   -> totéž
node tools/srd/publish.mjs --check  # co se liší od zveřejněného
node tools/srd/publish.mjs          # zkopíruje zdrojový tvar z local/src do této složky
```

- Obrázky se při sestavení znovu **nevytvářejí**, pokud už existují (stabilní bajty, git je neukládá znovu).
  Změnil-li se zdrojový obrázek, spusťte `node tools/srd/build.mjs --force-images`.
- `publish.mjs` přepisuje jen soubory, které se změnily. **Publikujte jen při skutečné změně obsahu nebo formátu**
  (každá verze textu zůstává v historii gitu; git ukládá rozdíly, ~40–70 kB na verzi).
- Test `tools/srd/public-packs.test.ts` hlídá: jen povolené soubory, žádný vložený obrázek ve zdroji,
  každý odkaz má soubor, každý soubor je použitý a sestavení se povede.
