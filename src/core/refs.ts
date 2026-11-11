// Odkazy mezi obsahem: `chapter:ID#kotva` (kapitola), `term:ID` (herní pojem se svým vysvětlením).
// Cíl odkazu se vyřeší na modul + parametry; modul čtečky pak ukáže správné místo. Díky tomu lze
// z libovolného modulu (deník, tvorba postavy, …) kliknout na pojem a vrátit se tlačítkem Zpět.
import { terms } from './library.svelte'
import { go } from './router.svelte'

export const isRef = (href: string) => /^(chapter|term):/.test(href)

export function openRef(href: string) {
  let target = href
  if (href.startsWith('term:')) {
    const t = terms().find((x) => x.id === `pojem:${href.slice(5)}` || x.id === href.slice(5))
    if (!t) return
    target = t.target
  }
  if (target.startsWith('chapter:')) {
    const [id, anchor] = target.slice('chapter:'.length).split('#')
    go('ctenar', id, ...(anchor ? [anchor] : []))
  }
}
