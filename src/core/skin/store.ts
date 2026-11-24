// Úložiště nainstalovaných Hávů v IndexedDB. Samostatná databáze (ne `drd2-data`): vzhled není data uživatele
// a změna jeho schématu nesmí riskovat migraci postav a družin. Při čtení se každý Háv znovu zvaliduje
// (databázi může změnit starší či novější verze aplikace i ruční zásah); neplatný záznam se přeskočí.
import { connection } from '../idb'
import { readSkinFile, type AssetFile } from './file'
import { inspectImage } from './image'
import { validateSkin, type Skin, type SkinIssue, type ValidateOptions } from './skin'

const DB = 'drd2-wardrobe'
const VERSION = 1
const STORE = 'skins'
export const MAX_SKINS = 30

export interface StoredSkin {
  skin: Skin
  /** kdy byl Háv nainstalován (ms od epochy) */
  addedAt: number
}

interface Row {
  id: string
  skin: unknown
  addedAt: number
  /** obrázky podle názvu (bajty jako ArrayBuffer, v IndexedDB nejspolehlivější) */
  assets?: Record<string, { data: ArrayBuffer }>
}

const conn = connection(DB, VERSION, (req) => {
  const db = req.result
  if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
})

export const closeSkinDb = () => conn.close()

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function store(mode: IDBTransactionMode) {
  return (await conn.db()).transaction(STORE, mode).objectStore(STORE)
}

function toStored(row: Row): StoredSkin | null {
  const v = validateSkin(row.skin)
  return v.ok && v.skin && v.skin.id === row.id ? { skin: v.skin, addedAt: row.addedAt } : null
}

/** Nainstalované Háv podle názvu; neplatné záznamy se vynechají. */
export async function listSkins(): Promise<StoredSkin[]> {
  const rows = await wrap((await store('readonly')).getAll() as IDBRequest<Row[]>)
  return rows
    .map(toStored)
    .filter((s): s is StoredSkin => s !== null)
    .sort((a, b) => a.skin.name.localeCompare(b.skin.name, 'cs'))
}

export async function getSkin(id: string): Promise<StoredSkin | null> {
  const row = await wrap((await store('readonly')).get(id) as IDBRequest<Row | undefined>)
  return row ? toStored(row) : null
}

export async function deleteSkin(id: string): Promise<void> {
  await wrap((await store('readwrite')).delete(id))
}

/**
 * Obrázky nainstalovaného Hávu (zkontrolované znovu při čtení: databázi mohl změnit někdo jiný). Chybějící nebo
 * poškozený obrázek se vynechá, Háv se pak jen zobrazí bez něj.
 */
export async function getSkinAssets(id: string): Promise<AssetFile[]> {
  const row = await wrap((await store('readonly')).get(id) as IDBRequest<Row | undefined>)
  const stored = row ? toStored(row) : null
  if (!row || !stored) return []
  const out: AssetFile[] = []
  for (const name of Object.keys(stored.skin.assets)) {
    const data = row.assets?.[name]?.data
    if (!(data instanceof ArrayBuffer)) continue
    const bytes = new Uint8Array(data)
    const check = inspectImage(bytes)
    if (check.ok)
      out.push({
        name,
        type: check.info.type,
        bytes,
        width: check.info.width,
        height: check.info.height,
      })
  }
  return out
}

export interface PutResult {
  ok: boolean
  replaced: boolean
  issues: SkinIssue[]
}

/** Uloží (nebo přepíše podle `id`) Háv i s obrázky; před uložením Háv i obrázky znovu zvaliduje. */
export async function putSkin(
  skin: Skin,
  now = Date.now(),
  options: ValidateOptions = {},
  assets: readonly AssetFile[] = [],
): Promise<PutResult> {
  const v = validateSkin(skin, options)
  if (!v.ok || !v.skin) return { ok: false, replaced: false, issues: v.issues }
  const rowAssets: NonNullable<Row['assets']> = {}
  for (const name of Object.keys(v.skin.assets)) {
    const asset = assets.find((a) => a.name === name)
    const check = asset ? inspectImage(asset.bytes) : null
    if (!asset || !check?.ok) {
      return {
        ok: false,
        replaced: false,
        issues: [
          {
            level: 'error',
            path: `assets.${name}`,
            message: asset
              ? `neplatný obrázek: ${check && !check.ok ? check.error : ''}`
              : 'chybí obrázek',
          },
        ],
      }
    }
    rowAssets[name] = { data: asset.bytes.slice().buffer }
  }
  const existing = await getSkin(v.skin.id)
  if (!existing && (await listSkins()).length >= MAX_SKINS) {
    return {
      ok: false,
      replaced: false,
      issues: [
        { level: 'error', path: '', message: `nainstalováno může být nejvýše ${MAX_SKINS} Hávů` },
      ],
    }
  }
  const row: Row = {
    id: v.skin.id,
    skin: v.skin,
    addedAt: existing?.addedAt ?? now,
    assets: rowAssets,
  }
  await wrap((await store('readwrite')).put(row))
  return { ok: true, replaced: !!existing, issues: v.issues }
}

export interface InstallResult extends PutResult {
  skin: Skin | null
}

/** Nainstaluje soubor `.drdskin`: přečte, zvaliduje a uloží. Špatný vstup vrací jako problémy, nevyhazuje výjimku. */
export async function installSkinFile(
  bytes: Uint8Array,
  options: ValidateOptions = {},
  now = Date.now(),
): Promise<InstallResult> {
  const read = await readSkinFile(bytes, options)
  if (!read.ok || !read.skin) return { ok: false, replaced: false, issues: read.issues, skin: null }
  const put = await putSkin(read.skin, now, options, read.assets)
  // varování z čtení (ignorované soubory) i z uložení; shodné se nezdvojují
  const issues = [
    ...read.issues,
    ...put.issues.filter(
      (i) => !read.issues.some((r) => r.path === i.path && r.message === i.message),
    ),
  ]
  return { ...put, issues, skin: put.ok ? read.skin : null }
}
