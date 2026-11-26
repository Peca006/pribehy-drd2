# Formát dat

Popis toho, co aplikace ukládá a posílá, a pravidla, jak se formát mění. Kód je zdroj pravdy; tady jsou souvislosti, tabulka verzí
a ukázky. **Každou změnu formátu zapište sem i do `CHANGELOG.md`.**

## Přehled

| Co | Kde | Číslo formátu | Kód |
| --- | --- | --- | --- |
| Postavy, družiny, bytosti, předpisy, dobrodružství, výpravy, vedení, sezení | IndexedDB `drd2-data` | `schema` u každého záznamu | `src/core/db.ts` |
| Ilustrace postav a bytostí | IndexedDB `drd2-data` (`characterImages`, `creatureImages`) | bez čísla (binární data) | `src/core/character/images.ts`, `creatures/images.ts` |
| Obsahové balíčky (pravidla, bestiář) | IndexedDB `drd2-content` | `PACK_BUILD`, `manifest.format` | `src/core/content/` |
| Místní stav (zdroje, hrozba, návrhy…) | `localStorage` | bez čísla, čte se opatrně | viz „Místní stav“ |
| Sdílení postavy | text `DRD2:…`, soubor, QR, zvuk | `SHARE_VERSION` = 1 | `src/core/character/share.ts` |
| Sdílení družiny | stejně | `PARTY_SHARE_VERSION` = 1 | `src/core/party/share.ts` |
| Záloha všech dat | soubor `.json` | `BACKUP_VERSION` = 1 | `src/core/backup.ts` |

Čísla jsou na sobě nezávislá: `schema` se zvyšuje při změně tvaru záznamu v úložišti, číslo přenosu při změně obálky přenosu, číslo
zálohy při změně struktury souboru zálohy.

## Záznamy v úložišti a `schema`

Každý záznam (postava, družina, bytost, předpis) se ukládá s polem `schema`; bez něj je to schéma 1. Aktuální schéma úložiště je
počet jeho migrací + 1 (dnes 1 u všech osmi úložišť). Při čtení se záznam převede řetězcem migrací (`MIGRATIONS[úložiště][i]` převádí schéma
`i+1` na `i+2`) a pole `schema` se odstraní, takže ven z úložiště (sdílení, export) nikdy nejde. Při změně tvaru se přidá migrace a
zvýší `VERSION` databáze; při upgradu se převedou všechny záznamy v jedné transakci. Záznam s vyšším schématem, než aplikace zná, se
nemění (a import ze zálohy ho přeskočí).

### Postava (`characters`)

Postava je **deník změn**, ne objekt: `{ id, events: ChangeEvent[] }`. Stav vznikne složením změn od prázdné postavy
(`characterOf`). Změna:

```json
{ "id": "m3x…", "at": "2026-11-22T10:00:00.000Z", "by": "Petr", "path": "attributes.Tělo", "value": 6,
  "note": "Tvorba postavy", "rev": "m3y…" }
```

- `path` je tečkou dělená cesta v `Character` (`name`, `professions.<id>`, `cash.dukaty`, `rawMaterialKinds.<id>`, `recipeLinks.<id>`…).
  `value` chybí = smazání položky v mapě.
- `rev` seskupuje změny zveřejněné společně (jedna revize); starší záznamy ho nemají.
- Co je v `Character`, určuje `src/core/character/model.ts`. Přidání pole s výchozí hodnotou (`emptyCharacter`) formát nemění.
- Lektvary a nástrahy se do deníku zapisují jako odkazy na předpisy (`recipeLinks`), ne samostatně.

### Družina (`parties`)

`{ id, role?, name, notes, members[], journal[], rejected?, baseXp?, lastSent?, updated }`. Zápis žurnálu: `{ id, at, edited?, by, title,
text, status?, session?, changed? }`; `status` je `navrh` nebo `zamitnuto`, chybí = schválený. `changed` je jen místní značka.

### Dobrodružství, výprava a vedení (`adventures`, `expeditions`, `runs`)

Tři vrstvy (návrh: `PLAN-VYPRAVY.md`), vše jen u Průvodce, nikam se nesdílí:
- **Dobrodružství** `{ id, name, theme, background, notes, expeditionIds[], created, updated }`: lehký kontejner, `expeditionIds` je doporučené pořadí výprav.
- **Výprava** `{ id, name, adventureId?, theme, background, hook, goal, style, nodes[], incidents[], resolution, notes, created, updated }`:
  příprava bez stavu a bez družiny. `style` je `domino` nebo `puzzle`. Uzlový bod `{ id, title, text, kind? }`, příhoda `{ id, title, text, stage,
  place?, cast[], conditions, ifSuccess, ifFailure, loot? }`, kde `stage` je `''` (před prvním uzlem), ID uzlu (po něm) nebo `kdykoli`.
  Výprava patří nejvýš jednomu dobrodružství; `adventureId` a `expeditionIds` se drží ve shodě (`saveExpeditionIn`).
- **Cizí postavy** (volitelná pole, bez zvýšení `schema`): `Adventure.cast[]` je zásoba postav dobrodružství, `Expedition.castIds[]` výběr z ní a `Expedition.cast[]` vlastní
  postavy výpravy (samostatné výpravy). Postava `{ id, name, look, conduct, knowledge, motive, group, creatureId?, notes }`; příhoda na ni odkazuje volitelným
  `cast[].npcId` (jméno zůstává jako text, takže po smazání postavy příhoda jméno neztratí). Smazání postavy dobrodružství uklidí odkazy (`removeAdventureNpc`).
- **Vedení** `{ id, name, partyId, expeditionId, status, reachedNodes[], incidents{}, extra[], loot{}, notes, started, updated }`: rozehraná hra
  jedné družiny s jednou výpravou, odkazuje na přípravu živě podle `id`. Výprava s vedením se nemaže.

### Sezení (`sittings`)

Časomíra Vedení hry (`PLAN-VEDENI-HRY.md`), jen u Průvodce, nikam se nesdílí: `{ id, partyId, runId?, status, started, ended?, spans[], current?, absent?, planned?, countdown?, note?, updated }` (`countdown`: `{ total, end }` v ms, krátký odpočet).
`status` je `bezi`, `pauza` nebo `hotovo`; `spans[]` jsou úseky `{ memberId, from, to? }` v ms (poslední bez `to` běží). Součty se počítají z razítek, nic se neukládá
jako uplynulý čas. Při smazání družiny se smažou i její sezení.

### Bytost (`creatures`) a předpis (`recipes`)

Vlastní bytosti (`id` začíná `vlastni:`) a předpisy z Grimoáru (`kind`, `name`, `description`, `params`, `contentHash`, `updatedAt`).
Otisk `contentHash` se při uložení přepočítá a slouží ke shodě předpisů mezi zařízeními.

## Místní stav (`localStorage`)

Menší stav, který není součástí deníku postavy. Čtení je vždy obranné (chybný nebo chybějící údaj = výchozí hodnota).

| Klíč | Obsah |
| --- | --- |
| `drd2-settings` | jméno autora, režim odkazů v textu |
| `drd2-char-play:<id>`, `-bonus:`, `-threat:`, `-adv:` | utracené Zdroje, bonusy, Ohrožení, Výhody postavy |
| `drd2-char-reviews:<id>` | stav odeslaných revizí a odpovědí vypravěče |
| `drd2-char-draft:<id>` | rozpracovaná úprava postavy |
| `drd2-creator-draft` | rozpracovaná tvorba postavy (`v` = 1) |
| `drd2-conflict:<družina>` | rozjetý konflikt družiny |
| `drd2-nav`, `drd2-qr-parts`, `drd2-demo-seeded`, `drd2.packPromptDismissed` | jen tohle zařízení (navigace, díly QR, příznaky); do zálohy nejdou |

## Přenos postavy a družiny

Obálka `{ v, type, … }` stlačená deflate a zakódovaná base64url s předponou `DRD2:`; ve formě souboru (`*.drd2.txt`) je to týž text
nebo holý JSON. Soubor se ve Sdílet pojmenuje podle jména (`postava-brokan.drd2.txt`). Příjemce data vždy **očistí** (`sanitizeBundle`,
`sanitizePartyBundle`): neznámé cesty, špatné typy a přehnané délky se vyřadí. Obálka s vyšším `v`, než aplikace zná, se odmítne
srozumitelnou hláškou. Ilustrace postavy nese jen soubor (`images`, base64, nejvýše 12), kód, QR ani zvuk nikdy.

Typy: `revize` (revize postavy, volitelně zhuštěná historie `compact` a použité předpisy `recipes`), `odpoved` (odpověď vypravěče),
`druzina`, `predpisy`.

## Zásilky obsahu (výprava, dobrodružství, cizí postavy)

Obálka `{ v: 1, type: 'obsah', kind, … }` ve stejné podobě jako přenos postavy (kód `DRD2:` nebo holý JSON, soubor `*.drd2.txt`).
Druhy (`kind`): `vyprava` (`expedition`; cizí postavy z dobrodružství jsou přiložené v `cast`, `castIds` a `adventureId` odpadají),
`dobrodruzstvi` (`adventure` a `expeditions` v pořadí dobrodružství), `cizi-postava` (`npcs`) a `zprava` (`from`, `title`, `text` do 5000 znaků; nikam se neukládá). Příjemce vše očistí
(`sanitizeContent`: typy, délky, počty, neznámá pole se zahodí), při uložení přidělí **nová ID** (výpravy, dobrodružství, postavy,
příhody, kořist) a překládá odkazy mezi nimi; uzlové body si ID ponechají. Stav vedení (`Run`) se nikdy nepřenáší. Pozadí a příhody jsou
součástí zásilky: posílá je vypravěč jinému vypravěči. Rozpoznání příchozí zásilky (včetně bestiáře, Hávu a balíčků postav) dělá
`core/exchange/detect.ts`. Obálka bude nosičem i pro WebRTC (`PLAN-WEBRTC.md`).

## Záloha všech dat

Soubor `drd2-zaloha-RRRR-MM-DD.json` (Více → Záloha a obnova dat):

```json
{
  "format": "drd2-zaloha", "v": 1, "created": "2026-11-22T10:00:00.000Z", "app": "0.4.11",
  "schemas": { "characters": 1, "parties": 1, "creatures": 1, "recipes": 1, "adventures": 1, "expeditions": 1, "runs": 1, "sittings": 1 },
  "characters": [ { "id": "…", "schema": 1, "events": [ … ] } ],
  "parties": [ … ], "creatures": [ … ], "recipes": [ … ],
  "adventures": [ … ], "expeditions": [ … ], "runs": [ … ], "sittings": [ … ],
  "images": { "characters": [ { "id": "…", "owner": "<id postavy>", "added": 0, "mime": "image/webp", "data": "<base64>" } ],
              "creatures": [ … ] },
  "local": { "drd2-settings": "{…}", "drd2-char-play:<id>": "{…}" }
}
```

- Záznamy jsou **tak, jak jsou uložené, i s `schema`**; import je převede aktuálním řetězcem migrací. Záloha tak přežije změny
  tvaru záznamů.
- Při čtení se vše očistí jako u přenosu: změny postavy přes `sanitizeEvent`, obrázky jen `webp`/`png`/`jpeg` s platným base64,
  klíče `local` jen ze seznamu výše. Záznamy s vyšším `schema` a soubory s vyšším `v` se nepřevezmou.
- **Doplnit** přidá jen záznamy s neznámým ID (nic nepřepíše, ani místní klíče); **Přepsat** nahradí záznamy se stejným ID.
- Nezálohuje se: obsahové balíčky (stáhnou se znovu), nastavení specifická pro zařízení.
- Soubor je čitelný text; ilustrace tvoří většinu velikosti, proto jdou při záloze vypnout.

## Pravidla změn formátu

1. **Přidání volitelného pole** (u postavy v `emptyCharacter`, u družiny jako nepovinné): bez změny čísel. Chybějící = výchozí hodnota;
   starší aplikace pole ignoruje.
2. **Změna významu nebo odstranění pole v záznamu**: přidat migraci do `MIGRATIONS` daného úložiště, zvýšit `VERSION` databáze
   (`db.ts`), doplnit test a řádek do tabulky níže.
3. **Změna obálky přenosu**: zvýšit `SHARE_VERSION` / `PARTY_SHARE_VERSION`; starší aplikace import srozumitelně odmítne.
4. **Změna struktury souboru zálohy**: zvýšit `BACKUP_VERSION`; starší aplikace soubor odmítne s výzvou k obnově aplikace.
   Starší soubory musí nová aplikace číst dál (nebo převést).
5. Vždy aktualizovat tento dokument a `CHANGELOG.md`.

## Historie formátu

| Verze aplikace | Změna |
| --- | --- |
| před 0.4 | Postava jako deník změn, družiny, sdílení `SHARE_VERSION` 1, `schema` u záznamů a řetězec migrací (zatím prázdný) |
| 0.4.0 | Úložiště předpisů (Grimoár), `recipeLinks` v postavě, předpisy v přenosu |
| 0.4.x | Ilustrace postav (`characterImages`), přenos jen v souboru |
| 0.4.11 | Záloha všech dat, `BACKUP_VERSION` 1 |
| 0.5.0 | Úložiště `adventures`, `expeditions`, `runs` (DB v8, schéma 1); záloha je nese jako volitelné seznamy (`BACKUP_VERSION` zůstává 1, starší soubory je nemají) |
| 0.5.x (rozpracováno) | Úložiště `sittings` (DB v9, schéma 1); záloha je nese jako volitelný seznam (`BACKUP_VERSION` zůstává 1) |
