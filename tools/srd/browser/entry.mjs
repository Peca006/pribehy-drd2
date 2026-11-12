// Bookmarklet „Převést SRD“: běží na stránce drd2srd.d20.cz (stejná doména, takže stahování stránek nenarazí na CORS),
// stáhne stránky, převede je na balíčky stejným kódem jako Node nástroj a nabídne je ke stažení jako soubory .json.
// Žádný text SRD se nikam neposílá ani nehostuje, všechno se děje v prohlížeči uživatele.
import {
  BESTIAR_PAGES,
  RULES_PAGES,
  buildBestiarPack,
  buildRulesChapters,
  embedImagesWith,
  finishRulesPack,
} from '../pipeline.mjs'

const MAX_SIDE = 1600

/** Stránka SRD jako text HTML (relativně k doméně, na které skript běží). */
async function page(section, name) {
  const r = await fetch(`${location.origin}/${section}/${name}.html`, { credentials: 'omit' })
  if (!r.ok) throw new Error(`${section}/${name}: ${r.status}`)
  return r.text()
}

/** Názvy stránek z navigace (odkazy na stránce); když jich je méně než známých, platí pevný seznam. */
function discover(section, fallback) {
  const found = new Set()
  for (const a of document.querySelectorAll(`a[href*="/${section}/"]`)) {
    const m = a.getAttribute('href').match(new RegExp(`/${section}/(\d\d-[a-z0-9-]+)\.html`))
    if (m) found.add(m[1])
  }
  return found.size >= fallback.length ? [...found].sort() : fallback
}

/** Obrázek jako WebP data URI (zmenšený na MAX_SIDE) přes canvas. */
async function imageLoader(src) {
  const r = await fetch(new URL(src, location.origin), { credentials: 'omit' })
  if (!r.ok) throw new Error(`obrázek ${src}: ${r.status}`)
  const bmp = await createImageBitmap(await r.blob())
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.85))
  if (!blob || blob.type !== 'image/webp') throw new Error('Prohlížeč neumí WebP z canvasu.')
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result)
    fr.onerror = () => rej(fr.error)
    fr.readAsDataURL(blob)
  })
}

function panel() {
  document.getElementById('drd2-srd-import')?.remove()
  const el = document.createElement('div')
  el.id = 'drd2-srd-import'
  el.setAttribute(
    'style',
    'position:fixed;z-index:2147483647;left:50%;top:1rem;transform:translateX(-50%);width:min(30rem,92vw);' +
      'background:#1c1a17;color:#eee;border:2px solid #c9a15b;border-radius:10px;padding:1rem;font:16px/1.4 system-ui,sans-serif;' +
      'box-shadow:0 4px 24px #000a',
  )
  document.body.appendChild(el)
  const title = document.createElement('strong')
  title.textContent = 'Příběhy v Dračím doupěti: převod SRD'
  const status = document.createElement('p')
  const links = document.createElement('div')
  const close = document.createElement('button')
  close.textContent = 'Zavřít'
  close.onclick = () => el.remove()
  close.setAttribute('style', 'margin-top:.5rem;padding:.4rem .8rem')
  el.append(title, status, links, close)
  return {
    say: (t) => (status.textContent = t),
    file(name, json) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      a.download = name
      a.textContent = `Stáhnout ${name} (${Math.round(json.length / 1024)} kB)`
      a.setAttribute('style', 'display:block;margin:.4rem 0;color:#e8c27a')
      links.appendChild(a)
    },
  }
}

export async function run() {
  const ui = panel()
  try {
    if (!/drd2srd/.test(location.hostname))
      ui.say('Tuto záložku spusťte na stránce drd2srd.d20.cz.')
    else {
      const rules = discover('zakladni-prirucka', RULES_PAGES)
      const bestiar = BESTIAR_PAGES
      const total = rules.length + bestiar.length
      let n = 0
      const get = async (section, name) => {
        const html = await page(section, name)
        ui.say(`Stahuji stránky: ${++n} z ${total}…`)
        return html
      }
      const rulesPages = {}
      for (const name of rules) rulesPages[name] = await get('zakladni-prirucka', name)
      const bestiarPages = {}
      for (const name of bestiar) bestiarPages[name] = await get('bestiar', name)

      ui.say('Převádím pravidla…')
      const built = buildRulesChapters(rulesPages)
      let imgs = 0
      const count = await embedImagesWith(built.chapters, async (src) => {
        ui.say(`Převádím obrázky (${++imgs})…`)
        return imageLoader(src)
      })
      const r = finishRulesPack(built)
      ui.say('Převádím bestiář…')
      const b = buildBestiarPack(bestiarPages)
      const problems = [...r.problems, ...b.problems]
      ui.say(
        `Hotovo: ${built.chapters.length} kapitol, ${built.professions.length} povolání, ${b.pack.creatures.length} bytostí, ${count} obrázků.` +
          (problems.length ? ` Pozor: ${problems.join('; ')}` : ' Soubory nahrajte v aplikaci v Knihovně.'),
      )
      ui.file('drd2-pravidla-2.json', r.json)
      ui.file('drd2-bestiar-2.json', b.json)
    }
  } catch (e) {
    ui.say(`Převod se nepodařil: ${e instanceof Error ? e.message : e}`)
  }
}

run()
