import { describe, expect, it } from 'vitest'
import { buildCompactBundle, fitForQr } from './compact'
import { characterOf, emptyCharacter, eventsFor, type CharacterLog } from './model'
import { QR_CHUNK } from './qr'
import { groupRevisions } from './revisions'
import { analyzeImport, applyRevisions, decodeBundle, encodeBundle, stateHash } from './share'

// postava s dlouhou historií: každá revize přepíše poznámky jiným (nestlačitelným) textem
const rnd = (n: number) =>
  Array.from({ length: n }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)),
  ).join('')

function longLog(revisions = 12): CharacterLog {
  let cur = {
    ...emptyCharacter('c'),
    name: 'Dlouhá',
    attributes: { Tělo: 6, Duše: 5, Vliv: 4 },
    cash: 600,
  }
  const events = [
    ...eventsFor(emptyCharacter('c'), cur, 'Pavel', 'Tvorba', new Date(2026, 0, 1).toISOString()),
  ]
  for (let i = 1; i < revisions; i++) {
    const next = { ...cur, notes: rnd(250), cash: cur.cash - 10 }
    events.push(
      ...eventsFor(cur, next, 'Pavel', `Revize ${i}`, new Date(2026, 0, 1, 0, i).toISOString()),
    )
    cur = next
  }
  return { id: 'c', events }
}

describe('zhuštění historie', () => {
  const log = longLog()
  const revs = groupRevisions(log.events)

  it('zhuštěný balíček dá novému příjemci stejný stav postavy', async () => {
    const b = buildCompactBundle(log, 'Dlouhá', 3)
    expect(b.revisions).toHaveLength(1 + 3)
    expect(b.compact?.upTo).toBe(revs[revs.length - 4].id)
    const after = applyRevisions(undefined, b, new Set(b.revisions.map((r) => r.id)))
    expect(characterOf(after)).toEqual(characterOf(log))
    // přežije kód i očištění
    const dec = await decodeBundle(await encodeBundle(b))
    expect(dec.errors).toEqual([])
    expect((dec.bundle as typeof b).compact).toEqual(b.compact)
  })

  it('příjemce s plnou historií starší revize vynechá a přijme jen novější', () => {
    const b = buildCompactBundle(log, 'Dlouhá', 3)
    const gm: CharacterLog = {
      id: 'c',
      events: log.events.filter((e) => revs.slice(0, 10).some((r) => r.id === e.rev)),
    }
    const a = analyzeImport(gm, b)
    expect(a.kind).toBe('navazuje')
    expect(a.fresh.map((r) => r.note)).toEqual(['Revize 10', 'Revize 11'].slice(0, a.fresh.length))
    expect(a.note).toMatch(/souhlasí/)
    const done = applyRevisions(gm, b, new Set(a.fresh.map((r) => r.id)))
    expect(characterOf(done)).toEqual(characterOf(log))
  })

  it('rozdílný stav nebo neznámý základ se pozná podle otisku', () => {
    const b = buildCompactBundle(log, 'Dlouhá', 3)
    // jiná historie se stejnými ID revizí, ale jiným obsahem
    const tampered: CharacterLog = {
      id: 'c',
      events: log.events.map((e) =>
        e.path === 'name' && e.rev === revs[0].id ? { ...e, value: 1 } : e,
      ),
    }
    expect(analyzeImport(tampered, b).kind).toBe('neznamy-zaklad')
    expect(analyzeImport(tampered, b).note).toMatch(/liší/)
    const young: CharacterLog = { id: 'c', events: log.events.filter((e) => e.rev === revs[0].id) }
    const a = analyzeImport(young, b)
    expect(a.kind).toBe('neznamy-zaklad')
    expect(a.note).toMatch(/není/)
  })

  it('otisk stavu nezávisí na pořadí klíčů', () => {
    const c = characterOf(log)
    const reverse = (o: unknown): unknown =>
      Array.isArray(o)
        ? o.map(reverse)
        : o && typeof o === 'object'
          ? Object.fromEntries(
              Object.entries(o)
                .reverse()
                .map(([k, v]) => [k, reverse(v)]),
            )
          : o
    const shuffled = reverse(c) as typeof c
    expect(stateHash(shuffled)).toBe(stateHash(c))
    expect(stateHash({ ...c, cash: c.cash + 1 })).not.toBe(stateHash(c))
  })

  it('fitForQr zhustí jen tolik, kolik je potřeba', async () => {
    const full = await encodeBundle((await fitForQr(log, 'D', 99)).bundle)
    expect(full.length).toBeGreaterThan(QR_CHUNK) // celá historie by potřebovala víc QR
    const f1 = await fitForQr(log, 'D', 1)
    expect(f1.fits).toBe(true)
    expect(f1.qrCount).toBe(1)
    expect(f1.merged).toBeGreaterThan(1)
    expect(
      characterOf(
        applyRevisions(undefined, f1.bundle, new Set(f1.bundle.revisions.map((r) => r.id))),
      ),
    ).toEqual(characterOf(log))
    // povolíme-li víc QR, zachová se víc historie
    const f3 = await fitForQr(log, 'D', 3)
    expect(f3.merged).toBeLessThan(f1.merged)
    const none = await fitForQr(log, 'D', 99)
    expect(none.merged).toBe(0)
  })

  it('jedna revize se nezhušťuje', async () => {
    const one = longLog(1)
    const f = await fitForQr(one, 'x', 1)
    expect(f.merged).toBe(0)
    expect(f.bundle.compact).toBeUndefined()
  })
})
