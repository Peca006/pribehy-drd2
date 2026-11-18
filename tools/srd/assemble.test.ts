import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { assemble, imageRefs, inlineImages } from './assemble-lib.mjs'

const root = mkdtempSync(join(tmpdir(), 'asm-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const png = Buffer.from('obrazek')
const pack = (src: string) => ({
  manifest: { format: 1, id: 'p', name: 'P', version: '1.2.3', build: 4 },
  chapters: [{ id: 'k', blocks: [{ type: 'card', blocks: [{ type: 'image', alt: 'a', src }] }] }],
})

function fixture(name: string, p: unknown) {
  const dir = `${root}/${name}/`
  mkdirSync(`${dir}img`, { recursive: true })
  writeFileSync(`${dir}img/a.webp`, png)
  writeFileSync(`${dir}p.json`, JSON.stringify(p))
  return dir
}

describe('sestavení balíčku z odkazů na obrázky', () => {
  it('vloží obrázek (i vnořený) jako data URI a najde odkazy', () => {
    const dir = fixture('ok', pack('img/a.webp'))
    const p = JSON.parse(readFileSync(`${dir}p.json`, 'utf8'))
    expect(imageRefs(p)).toEqual(['a.webp'])
    const json = inlineImages(p, `${dir}img/`)
    expect(json).toContain(`data:image/webp;base64,${png.toString('base64')}`)
    expect(json).not.toContain('"img/')
  })

  it('chybějící obrázek a odkaz mimo složku jsou chyba', () => {
    const dir = fixture('chybi', pack('img/neni.webp'))
    expect(() => inlineImages(JSON.parse(readFileSync(`${dir}p.json`, 'utf8')), `${dir}img/`)).toThrow('chybí obrázek')
    for (const bad of ['img/../../tajne.webp', 'img/a.png', 'img/a b.webp'])
      expect(() => inlineImages(pack(bad), `${dir}img/`)).toThrow('neplatný odkaz')
  })

  it('obrázek bez odkazu (už vložený) se nechá být', () => {
    const json = inlineImages(pack('data:image/webp;base64,AAAA'), `${root}/nikde/`)
    expect(json).toContain('data:image/webp;base64,AAAA')
  })

  it('assemble zapíše balíček a katalog s kontrolním součtem; bez zdroje nezapíše nic', () => {
    const dir = fixture('asm', pack('img/a.webp'))
    const out = `${root}/out/`
    const cat = assemble(dir, out, ['p', 'neexistuje'])
    expect(cat.packs).toHaveLength(1)
    expect(cat.packs[0]).toMatchObject({ id: 'p', version: '1.2.3', build: 4, file: 'p.json' })
    expect(JSON.parse(readFileSync(`${out}index.json`, 'utf8')).packs[0].sha256).toBe(cat.packs[0].sha256)
    const empty = assemble(`${root}/prazdno/`, `${root}/out2/`, ['p'])
    expect(empty.packs).toEqual([])
  })
})
