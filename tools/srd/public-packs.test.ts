import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { assemble, imageRefs } from './assemble-lib.mjs'
import { PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

// Pojistky veřejné složky: jen balíčky ze SRD, zdroj bez vložených obrázků, každý odkaz má soubor a naopak.
describe('veřejné balíčky ze SRD (zdrojový tvar)', () => {
  const files: string[] = existsSync(PUBLIC_DIR) ? readdirSync(PUBLIC_DIR) : []
  const images: string[] = existsSync(`${PUBLIC_DIR}img`) ? readdirSync(`${PUBLIC_DIR}img`) : []
  const sources = PUBLIC_PACK_IDS.filter((id: string) => files.includes(`${id}.json`))

  it('jsou tu jen povolené soubory (žádný konečný balíček ani index)', () => {
    const allowed = new Set(['README.md', 'SVOLENI.md', 'img', ...PUBLIC_PACK_IDS.map((id: string) => `${id}.json`)])
    expect(files.filter((f) => !allowed.has(f))).toEqual([])
    expect(images.filter((f) => !/^[\w.-]+\.webp$/.test(f))).toEqual([])
  })

  it('zdrojový JSON nemá vložená data (obrázky jsou odkazy) a každý odkaz má soubor', () => {
    for (const id of sources) {
      const text = readFileSync(`${PUBLIC_DIR}${id}.json`, 'utf8')
      expect(text.includes('data:image/'), `${id}: vložený obrázek`).toBe(false)
      for (const ref of imageRefs(JSON.parse(text))) expect(images, `${id}: chybí img/${ref}`).toContain(ref)
    }
  })

  it('žádný obrázek není nepoužitý', () => {
    const used = new Set(sources.flatMap((id: string) => imageRefs(JSON.parse(readFileSync(`${PUBLIC_DIR}${id}.json`, 'utf8')))))
    expect(images.filter((f) => !used.has(f))).toEqual([])
  })
})

describe('sestavení konečných balíčků', () => {
  const out = mkdtempSync(join(tmpdir(), 'packs-'))
  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it('ze skutečného zdroje vzniknou balíčky s vloženými obrázky a katalog odpovídá souborům', () => {
    if (!existsSync(PUBLIC_DIR)) return
    const cat = assemble(PUBLIC_DIR, `${out}/`, PUBLIC_PACK_IDS)
    for (const p of cat.packs) {
      const buf = readFileSync(`${out}/${p.file}`)
      expect(buf.length).toBe(p.size)
      expect(createHash('sha256').update(buf).digest('hex')).toBe(p.sha256)
      expect(buf.toString('utf8').includes('"img/')).toBe(false)
    }
  })
})
