// Nastavení aplikace (jen v tomto zařízení). Ukládá se do localStorage; když není dostupné
// (soukromé okno, zakázaná data webu), nastavení platí do zavření stránky.
import { isLinkMode, type LinkMode } from './termLinks'

const KEY = 'drd2-settings'

function load(): { termLinks: LinkMode } {
  const s = { termLinks: 'first' as LinkMode }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (isLinkMode(raw.termLinks)) s.termLinks = raw.termLinks
  } catch {
    /* výchozí hodnoty */
  }
  return s
}

export const settings = $state(load())

export function setTermLinks(mode: LinkMode) {
  settings.termLinks = mode
  try {
    localStorage.setItem(KEY, JSON.stringify({ termLinks: mode }))
  } catch {
    /* nastavení platí aspoň do zavření stránky */
  }
}
