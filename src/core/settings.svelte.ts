// Nastavení aplikace (jen v tomto zařízení). Ukládá se do localStorage; když není dostupné
// (soukromé okno, zakázaná data webu), nastavení platí do zavření stránky.
import { defaultTabbar, parseTabbar, type TabbarConfig } from './tabbar'
import { isLinkMode, type LinkMode } from './termLinks'

const KEY = 'drd2-settings'

interface Settings {
  /** kolik odkazů z pojmů se v textu ponechá */
  termLinks: LinkMode
  /** jméno, kterým se podepisují změny postav (hráč nebo vypravěč) */
  author: string
  /** zvolený vzhled: `system`, výchozí skin, nebo `id` nainstalovaného Hávu */
  skin: string
  /** spodní lišta: pořadí, skryté a přišpendlené záložky */
  tabbar: TabbarConfig
}

const SKIN_ID = /^[a-z0-9-]{1,40}$/
/** Výchozí vzhled, dokud si uživatel žádný nezvolí: vestavěný Háv „Podzemí“ (retro RPG). Uložená volba (i „Podle systému“) má vždy přednost. */
export const DEFAULT_SKIN = 'podzemi'

function load(): Settings {
  const s: Settings = { termLinks: 'first', author: 'hráč', skin: DEFAULT_SKIN, tabbar: defaultTabbar() }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (isLinkMode(raw.termLinks)) s.termLinks = raw.termLinks
    if (typeof raw.author === 'string' && raw.author.trim())
      s.author = raw.author.trim().slice(0, 60)
    if (typeof raw.skin === 'string' && SKIN_ID.test(raw.skin)) s.skin = raw.skin
    s.tabbar = parseTabbar(raw.tabbar)
  } catch {
    /* výchozí hodnoty */
  }
  return s
}

export const settings = $state(load())

function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        termLinks: settings.termLinks,
        author: settings.author,
        skin: settings.skin,
        tabbar: settings.tabbar,
      }),
    )
  } catch {
    /* nastavení platí aspoň do zavření stránky */
  }
}

export function setTermLinks(mode: LinkMode) {
  settings.termLinks = mode
  save()
}

export function setSkin(id: string) {
  settings.skin = SKIN_ID.test(id) ? id : 'system'
  save()
}

export function setAuthor(name: string) {
  settings.author = name.trim().slice(0, 60) || 'hráč'
  save()
}

export function setTabbar(cfg: TabbarConfig) {
  settings.tabbar = parseTabbar(cfg)
  save()
}
