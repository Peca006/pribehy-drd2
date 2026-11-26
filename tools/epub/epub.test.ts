// @vitest-environment jsdom
// Kniha ePub z balíčků SRD: well-formed XHTML, všechny vnitřní odkazy a kotvy existují, soubory jsou v balíčku
// (manifest, spine, obsah) a rejstříky nejsou prázdné. Testuje se nad skutečnými veřejnými balíčky.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { writeZip, readZip } from '../../src/core/skin/zip.ts'
import { buildEpub, plain, slug } from './lib.mjs'

const pack = (f: string) => JSON.parse(readFileSync(`content-packs/srd/${f}`, 'utf8'))
const packs = [pack('drd2-pravidla-2.json'), pack('drd2-bestiar-2.json')]
const images = new Map<string, { path: string; type: string; data: Uint8Array }>()
for (const p of packs)
  for (const c of p.chapters)
    for (const b of c.blocks)
      if (b.type === 'image')
        images.set(b.src, {
          path: `img/${slug(b.alt)}.jpg`,
          type: 'image/jpeg',
          data: new Uint8Array([1, 2, 3]),
        })

const built = buildEpub({ packs, images, date: '2026-01-01T00:00:00Z' })
const dec = new TextDecoder()
const text = (name: string) => dec.decode(built.files.find((f) => f.name === name)!.data)
const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xhtml+xml')

describe('ePub ze SRD', () => {
  it('mimetype je první soubor a archiv jde přečíst zpět', async () => {
    expect(built.files[0]!.name).toBe('mimetype')
    expect(text('mimetype')).toBe('application/epub+zip')
    const zip = await writeZip(built.files)
    const back = await readZip(zip, { maxEntries: 500, maxEntryBytes: 20e6, maxTotalBytes: 100e6 })
    expect(back.length).toBe(built.files.length)
  })

  it('každý soubor XML je well-formed', () => {
    for (const f of built.files.filter((f) => /\.(xhtml|opf|ncx|xml)$/.test(f.name))) {
      const doc = xml(dec.decode(f.data))
      expect(doc.getElementsByTagName('parsererror').length, f.name).toBe(0)
    }
  })

  it('manifest obsahuje všechny soubory a spine ukazuje jen na ně', () => {
    const opf = xml(text('OEBPS/content.opf'))
    const hrefs = [...opf.getElementsByTagName('item')].map((i) => i.getAttribute('href')!)
    const have = built.files.map((f) => f.name.replace(/^OEBPS\//, ''))
    for (const h of hrefs) expect(have, h).toContain(h)
    const content = have.filter((n) => !/^(mimetype|META-INF)/.test(n) && n !== 'content.opf')
    for (const n of content) expect(hrefs, n).toContain(n)
    const ids = new Map([...opf.getElementsByTagName('item')].map((i) => [i.getAttribute('id'), i]))
    for (const r of opf.getElementsByTagName('itemref'))
      expect(ids.has(r.getAttribute('idref'))).toBe(true)
  })

  it('všechny relativní odkazy (kniha, obsah, rejstříky) vedou na existující soubor a kotvu', () => {
    const names = new Set(built.files.map((f) => f.name))
    const idsOf = new Map<string, Set<string>>()
    const docs = new Map<string, Document>()
    for (const f of built.files.filter((f) => f.name.endsWith('.xhtml'))) {
      const doc = xml(dec.decode(f.data))
      docs.set(f.name, doc)
      idsOf.set(
        f.name,
        new Set([...doc.querySelectorAll('[id]')].map((e) => e.getAttribute('id')!)),
      )
    }
    let checked = 0
    for (const [name, doc] of docs) {
      const dir = name.split('/').slice(0, -1)
      for (const a of doc.querySelectorAll('a[href]')) {
        const href = a.getAttribute('href')!
        const [path, frag] = href.split('#')
        const parts = path ? [...dir, ...path.split('/')] : name.split('/')
        const stack: string[] = []
        for (const p of parts) {
          if (p === '..') stack.pop()
          else stack.push(p)
        }
        const target = stack.join('/')
        expect(names.has(target), `${name} → ${href}`).toBe(true)
        if (frag) expect(idsOf.get(target)?.has(frag), `${name} → ${href}`).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(1500)
  })

  it('obsah (nav) odkazuje na existující soubory a obsahuje rejstříky', () => {
    const nav = text('OEBPS/nav.xhtml')
    const names = new Set(built.files.map((f) => f.name))
    for (const m of nav.matchAll(/href="([^"#]+)/g))
      expect(names.has('OEBPS/' + m[1]), m[1]).toBe(true)
    for (const t of [
      'Rejstřík pojmů',
      'Rejstřík bytostí',
      'Rejstřík povolání a schopností',
      'Rejstřík ras, kultur a rysů',
      'Rejstřík výbavy',
    ])
      expect(nav).toContain(t)
  })

  it('stránka Obsah je za titulní stranou a odkazuje na začátek každé kapitoly i rejstříku', () => {
    const opf = xml(text('OEBPS/content.opf'))
    const items = new Map(
      [...opf.getElementsByTagName('item')].map((i) => [
        i.getAttribute('id'),
        i.getAttribute('href'),
      ]),
    )
    const spine = [...opf.getElementsByTagName('itemref')].map((r) =>
      items.get(r.getAttribute('idref')),
    )
    expect(spine.slice(0, 3)).toEqual(['text/titulni-strana.xhtml', 'text/obsah.xhtml', spine[2]])
    const hrefs = [...xml(text('OEBPS/text/obsah.xhtml')).querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    )
    for (const s of spine.slice(2)) expect(hrefs, s!).toContain(s!.replace('text/', ''))
  })

  it('rejstříky nejsou prázdné a bytosti jsou v knize všechny', () => {
    expect(built.stats.creatures).toBe(packs[1].creatures.length)
    for (const n of Object.values(built.stats.indexes) as number[]) expect(n).toBeGreaterThan(30)
  })

  it('jediná upozornění jsou odkazy v SRD na neexistující místa', () => {
    expect(built.warnings.filter((w) => !w.startsWith('odkaz na neznámou'))).toEqual([])
  })

  it('plain a slug', () => {
    expect(plain('***Sudba*** a *[odkaz](chapter:x#y)*')).toBe('Sudba a odkaz')
    expect(slug('Černokněžník – Ďábel')).toBe('cernokneznik-dabel')
  })
})
