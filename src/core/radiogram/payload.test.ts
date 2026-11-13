import { describe, expect, it } from 'vitest'
import { emptyCharacter, eventsFor, type CharacterLog } from '../character/model'
import { buildRevisionBundle, encodeBundle } from '../character/share'
import { packMessage, unpackMessage } from './payload'

function sampleLog(): CharacterLog {
  const a = emptyCharacter('a')
  const b = {
    ...a,
    name: 'Jarik Zelený',
    concept: 'Zvědavý švec, který hledá ztracenou botu své babičky',
    attributes: { Tělo: 6, Duše: 5, Vliv: 4 },
    cash: 600,
    notes: 'Poznámky z hraní: potkali jsme trpaslíka u mostu, dluží nám pivo. '.repeat(3),
  }
  return { id: 'a', events: eventsFor(a, b, 'Petr', 'Vytvoření', '2026-01-01T00:00:00.000Z') }
}

describe('příprava zprávy k vysílání', () => {
  it('kód DRD2: se vysílá jako bajty (o čtvrtinu méně) a po příjmu je beze změny', async () => {
    const code = await encodeBundle(buildRevisionBundle(sampleLog(), 'Jarik', null))
    const packed = await packMessage(code)
    const saved = 1 - packed.length / code.length
    console.log(`kód ${code.length} znaků → ${packed.length} B (úspora ${(saved * 100).toFixed(0)} %)`)
    expect(packed.length).toBeLessThanOrEqual(Math.ceil(((code.length - 5) * 3) / 4) + 1)
    expect(saved).toBeGreaterThan(0.2)
    expect(await unpackMessage(packed)).toBe(code)
  })

  it('deflate se použije jen tam, kde šetří (prostý text ano, stlačená data ne)', async () => {
    const text = 'Dračí doupě, dračí doupě. '.repeat(40)
    const p = await packMessage(text)
    expect(p.length).toBeLessThan(text.length / 4)
    expect(await unpackMessage(p)).toBe(text)
    const code = await encodeBundle(buildRevisionBundle(sampleLog(), 'Jarik', null))
    const q = await packMessage(code)
    expect(q[0] & 2).toBe(0) // druhé stlačení by už nic neušetřilo
  })

  it('nekanonický nebo neplatný kód se přenese jako text', async () => {
    for (const t of ['DRD2:abc$', 'DRD2:A', 'Ahoj světe', '', 'DRD2:']) {
      expect(await unpackMessage(await packMessage(t))).toBe(t)
    }
  })
})
