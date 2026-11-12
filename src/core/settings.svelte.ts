// Nastavení aplikace (jen v tomto zařízení). Ukládá se do localStorage; když není dostupné
// (soukromé okno, zakázaná data webu), nastavení platí do zavření stránky.
import { isLinkMode, type LinkMode } from './termLinks'

const KEY = 'drd2-settings'

interface Settings {
  /** kolik odkazů z pojmů se v textu ponechá */
  termLinks: LinkMode
  /** jméno, kterým se podepisují změny postav (hráč nebo vypravěč) */
  author: string
}

function load(): Settings {
  const s: Settings = { termLinks: 'first', author: 'hráč' }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (isLinkMode(raw.termLinks)) s.termLinks = raw.termLinks
    if (typeof raw.author === 'string' && raw.author.trim()) s.author = raw.author.trim().slice(0, 60)
  } catch {
    /* výchozí hodnoty */
  }
  return s
}

export const settings = $state(load())

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ termLinks: settings.termLinks, author: settings.author }))
  } catch {
    /* nastavení platí aspoň do zavření stránky */
  }
}

export function setTermLinks(mode: LinkMode) {
  settings.termLinks = mode
  save()
}

export function setAuthor(name: string) {
  settings.author = name.trim().slice(0, 60) || 'hráč'
  save()
}
