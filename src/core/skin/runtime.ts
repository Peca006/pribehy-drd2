// Napojení vzhledu na okno: načte nainstalované Háv, použije zvolený a přepočítá ho při změně viewportu
// (otočení telefonu, změna velikosti okna) nebo systémového schématu. Zbytek logiky je v `active.ts`.
// Obrázky Hávu (role, ikony) se jen pro právě používaný Háv převedou na adresy `blob:`; při přepnutí se zrušují.
import { settings } from '../settings.svelte'
import { applyTheme } from '../theme'
import { BUILTIN_ASSETS } from '../../themes/havy'
import {
  effectiveViewport,
  findSkin,
  pickTheme,
  previewChoiceFromSearch,
  type SystemScheme,
} from './active'
import { appearance } from './appearance.svelte'
import type { AssetFile } from './file'
import { classifyViewport, type Skin, type Viewport } from './skin'
import { getSkinAssets, listSkins } from './store'

/** Aplikace běží jako náhled v rámečku zařízení (Šatník): volba z adresy má přednost před uloženou. */
export const previewChoice: string | null =
  typeof location === 'undefined' ? null : previewChoiceFromSearch(location.search)

interface LoadedAssets {
  skinId: string
  /** název obrázku → adresa `blob:` */
  urls: Record<string, string>
}

let installed: Skin[] = []
let assets: LoadedAssets | null = null
let lastViewport: Viewport | null = null
let started = false

const choice = () => previewChoice ?? settings.skin

const sameViewport = (a: Viewport | null, b: Viewport) =>
  !!a && a.width === b.width && a.orientation === b.orientation && a.low === b.low

const systemScheme = (): SystemScheme =>
  matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

function isTyping(): boolean {
  const el = document.activeElement
  return !!el && (el.matches('input, textarea, select') || (el as HTMLElement).isContentEditable)
}

/** Adresy obrázků, které patří právě zvolenému Hávu (po přepnutí z jiného Hávu jsou prázdné, dokud se nenačtou). */
function currentUrls(skin: Skin | null): Record<string, string> {
  return skin && assets?.skinId === skin.id ? assets.urls : {}
}

function apply(force = false) {
  const viewport = effectiveViewport(
    classifyViewport(window.innerWidth, window.innerHeight),
    lastViewport,
    isTyping(),
  )
  if (!force && sameViewport(lastViewport, viewport)) return
  lastViewport = viewport
  const skin = findSkin(choice(), installed)
  const urls = currentUrls(skin)
  applyTheme(pickTheme(choice(), installed, systemScheme(), viewport, urls))
  // ikony záložek (jen když je Háv se svými obrázky skutečně použit)
  appearance.icons = skin
    ? Object.fromEntries(
        Object.entries(skin.icons).flatMap(([m, a]) => (urls[a] ? [[m, urls[a]]] : [])),
      )
    : {}
  appearance.pixelatedIcons = !!skin?.iconStyle?.pixelated
}

const revoke = (a: LoadedAssets | null) => {
  if (a) for (const url of Object.values(a.urls)) URL.revokeObjectURL(url)
}

async function loadFiles(skin: Skin): Promise<readonly AssetFile[]> {
  return BUILTIN_ASSETS[skin.id] ?? (await getSkinAssets(skin.id))
}

/** Načte obrázky zvoleného Hávu (pokud nějaké má) a použije ho; staré adresy se zruší až po použití nových. */
async function syncAssets(): Promise<void> {
  const wanted = choice()
  const skin = findSkin(wanted, installed)
  let next: LoadedAssets | null = null
  if (skin && Object.keys(skin.assets).length) {
    const urls: Record<string, string> = {}
    try {
      for (const f of await loadFiles(skin))
        urls[f.name] = URL.createObjectURL(
          new Blob([f.bytes as Uint8Array<ArrayBuffer>], { type: f.type }),
        )
    } catch (e) {
      console.error('Obrázky Hávu se nepodařilo načíst, použijí se jen barvy', e)
    }
    next = { skinId: skin.id, urls }
  }
  // mezitím se volba mohla změnit: neplatné adresy se hned zruší
  if (choice() !== wanted) return revoke(next)
  const previous = assets
  assets = next
  apply(true)
  if (previous !== next) revoke(previous)
}

/** Znovu načte nainstalované Háv z úložiště a použije zvolený (po instalaci, smazání nebo změně volby). */
export async function refreshInstalledSkins(): Promise<void> {
  installed = (await listSkins()).map((s) => s.skin)
  // Háv se mohl přepsat novou verzí: obrázky se načtou znovu
  const previous = assets
  assets = null
  apply(true)
  revoke(previous)
  await syncAssets()
}

/** Použije aktuální volbu z nastavení (po `setSkin`). */
export function reapplyTheme(): Promise<void> {
  apply(true) // hned barvy, obrázky se doplní po načtení
  return syncAssets()
}

export async function startSkinRuntime(): Promise<void> {
  if (started) return
  started = true
  apply(true) // hned, ať se nemigotá výchozí vzhled; Háv se doplní po načtení úložiště
  // `orientationchange` (a někdy i `resize`) přijde dřív, než se přepočítají rozměry okna: po krátké prodlevě
  // se proto zkontrolují znovu, jinak by vzhled zůstal podle starých rozměrů
  let recheck: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    apply()
    clearTimeout(recheck)
    recheck = setTimeout(() => apply(), 250)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  document.addEventListener('focusout', onResize)
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => apply(true))
  await refreshInstalledSkins().catch((e) => console.error('Háv se nepodařilo načíst', e))
}
