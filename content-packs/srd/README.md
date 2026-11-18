# Balíčky ze SRD (veřejná složka)

Sem patří **jen** balíčky vyrobené z veřejného SRD Dračího doupěte II (drd2srd.d20.cz), na jejichž zveřejnění
má projekt svolení nakladatelství Altar v rozsahu SRD:

- `drd2-pravidla-N.json` – Základní příručka (pravidla)
- `drd2-bestiar-N.json` – Bestiář
- `index.json` – katalog balíčků (id, verze, číslo sestavení, velikost, kontrolní součet, název souboru)

**Nepatří sem** nic mimo SRD: Hry mocných, Hotfix, texty z tištěných knih ani ze `reference/`.
Ty zůstávají jen v gitignorované složce `content-packs/local/`.

## Jak vzniká

```
node tools/srd/build.mjs            # pravidla  -> content-packs/local/
node tools/srd/build-bestiar.mjs    # bestiář   -> content-packs/local/
```

Hotové balíčky se po kontrole zkopírují sem a do `index.json` se zapíše nová verze.
(Plánovaný skript `tools/srd/publish.mjs` to udělá sám, včetně kontrolního součtu.)

## Jak se publikují

Nasazovací workflow zkopíruje tuto složku do `dist/packs/`, takže balíčky leží na stejné adrese jako aplikace
(`…/packs/index.json`). Aplikace je stahuje za běhu (tlačítko v Příručce / Více), v Service Workeru se
nepředcachují a stahují se přes síť přednostně, takže aktualizace balíčku nevyžaduje novou verzi aplikace
a naopak.

Rozhodnutí o publikování jsou v `PLAN-POMUCKY.md`.
