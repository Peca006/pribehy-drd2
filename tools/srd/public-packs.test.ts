import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error – JS modul bez typů
import { PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

// Pojistka: ve veřejné složce smí být jen balíčky ze SRD a katalog musí odpovídat souborům.
describe('veřejné balíčky ze SRD', () => {
  const files: string[] = existsSync(PUBLIC_DIR) ? readdirSync(PUBLIC_DIR) : []

  it('jsou tu jen povolené balíčky', () => {
    const allowed = new Set([
      'README.md',
      'SVOLENI.md',
      'index.json',
      ...PUBLIC_PACK_IDS.map((id: string) => `${id}.json`),
    ])
    expect(files.filter((f) => !allowed.has(f))).toEqual([])
  })

  it('katalog odpovídá souborům (velikost a SHA-256)', () => {
    if (!files.includes('index.json')) return
    const cat = JSON.parse(readFileSync(`${PUBLIC_DIR}index.json`, 'utf8'))
    for (const p of cat.packs) {
      expect(PUBLIC_PACK_IDS).toContain(p.id)
      const buf = readFileSync(`${PUBLIC_DIR}${p.file}`)
      expect(buf.length).toBe(p.size)
      expect(createHash('sha256').update(buf).digest('hex')).toBe(p.sha256)
    }
  })
})
