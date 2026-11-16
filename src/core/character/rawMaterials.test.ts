import { describe, expect, it } from 'vitest'
import { sanitizeCharacter } from './drafts'
import { applyChange, characterOf, emptyCharacter, eventsFor, type CharacterLog } from './model'
import {
  addKind,
  adjustRaw,
  cleanMark,
  hasKinds,
  kindsFrom,
  kindsOf,
  markLength,
  rawTotal,
  removeKind,
  renameKind,
} from './rawMaterials'
import { buildRevisionBundle, sanitizeEvent } from './share'

const empty = () => emptyCharacter('a')
const ok = <T extends { character?: unknown; error?: string }>(r: T) => {
  expect(r.error).toBeUndefined()
  return r.character as ReturnType<typeof empty>
}

describe('Suroviny: počty a součet', () => {
  it('bez druhů se chovají jako jedno číslo a nejdou pod nulu', () => {
    let c = adjustRaw(empty(), undefined, 3)
    expect(c.rawMaterials).toBe(3)
    c = adjustRaw(c, undefined, -10)
    expect(c.rawMaterials).toBe(0)
    expect(hasKinds(c)).toBe(false)
  })

  it('součet je číslo bez druhu plus všechny druhy', () => {
    let c = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    c = ok(addKind(c, '⚙', 'kov', 'k2'))
    c = adjustRaw(adjustRaw(adjustRaw(c, 'k1', 4), 'k2', 2), undefined, 1)
    expect(rawTotal(c)).toBe(7)
    expect(kindsOf(c).map((k) => k.kind.mark)).toEqual(['🌿', '⚙'])
  })

  it('neznámý druh nic nezmění', () => {
    const c = empty()
    expect(adjustRaw(c, 'nic', 5)).toBe(c)
  })
})

describe('Suroviny: druhy', () => {
  it('značka má nejvýš 2 viditelné znaky, emotikona (i složená) se počítá za jeden', () => {
    expect(markLength('🌿')).toBe(1)
    expect(markLength('👨‍👩‍👧')).toBe(1)
    expect(cleanMark('🌿⚙')).toBe('🌿⚙')
    expect(cleanMark('abc')).toBe('')
    expect(cleanMark('  ✿ ')).toBe('✿')
  })

  it('druh jde přidat jen se značkou nebo názvem, bez duplicit', () => {
    expect('error' in addKind(empty(), '', '')).toBe(true)
    const c = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    expect('error' in addKind(c, '🌿', 'něco jiného', 'k2')).toBe(true)
    expect('error' in addKind(c, '🍄', 'Byliny', 'k2')).toBe(true)
    expect('error' in addKind(c, 'abc', 'x', 'k2')).toBe(true)
  })

  it('nelze smazat druh s nenulovým počtem, s nulou jde', () => {
    let c = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    c = adjustRaw(c, 'k1', 2)
    const bad = removeKind(c, 'k1')
    expect('error' in bad && bad.error).toMatch(/2 Surovin/)
    c = adjustRaw(c, 'k1', -2)
    expect(hasKinds(ok(removeKind(c, 'k1')))).toBe(false)
  })

  it('přejmenování zachová počet i ID', () => {
    let c = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    c = adjustRaw(c, 'k1', 3)
    c = ok(renameKind(c, 'k1', '🍃', 'léčivky'))
    expect(c.rawMaterialKinds.k1).toEqual({ mark: '🍃', name: 'léčivky', count: 3 })
  })
})

describe('Suroviny: deník revizí a přenos', () => {
  const log = (steps: ReturnType<typeof empty>[]): CharacterLog => {
    let cur = empty()
    const events = []
    let t = 0
    for (const next of steps) {
      events.push(...eventsFor(cur, next, 'Petr', 'x', new Date(2026, 0, 1, 0, t++).toISOString()))
      cur = next
    }
    return { id: 'a', events }
  }

  it('každý druh je vlastní cesta, takže úpravy různých druhů se nepřebíjejí', () => {
    const a = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    const b = ok(addKind(a, '⚙', 'kov', 'k2'))
    const ev = eventsFor(a, b, 'Petr', 'x')
    expect(ev.map((e) => e.path)).toEqual(['rawMaterialKinds.k2'])
    const changed = adjustRaw(b, 'k1', 2)
    expect(eventsFor(b, changed, 'Petr', 'x').map((e) => e.path)).toEqual(['rawMaterialKinds.k1'])
  })

  it('smazání druhu je změna bez hodnoty a stav se přepočítá', () => {
    const a = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    const l = log([a, ok(removeKind(a, 'k1'))])
    expect(characterOf(l).rawMaterialKinds).toEqual({})
    expect(characterOf({ id: 'a', events: l.events.slice(0, 1) }).rawMaterialKinds.k1.mark).toBe('🌿')
  })

  it('staré deníky bez Surovin se načtou s nulou a prázdnými druhy', () => {
    const c = characterOf({ id: 'a', events: [] })
    expect(c.rawMaterials).toBe(0)
    expect(c.rawMaterialKinds).toEqual({})
    const fromOld = sanitizeCharacter({ name: 'Stará', cash: 5 }, empty())
    expect(fromOld.rawMaterials).toBe(0)
    expect(fromOld.rawMaterialKinds).toEqual({})
  })

  it('přenosový balíček převede Suroviny i druhy a po přijetí souhlasí', () => {
    let c = ok(addKind(empty(), '🌿', 'byliny', 'k1'))
    c = adjustRaw(adjustRaw(c, 'k1', 4), undefined, 2)
    const bundle = buildRevisionBundle(log([c]), 'Jarik', null)
    const events = bundle.revisions.flatMap((r) => r.events)
    const rebuilt = events.reduce(
      (st, e) => applyChange(st, { id: e.id, at: '', by: '', path: e.path, value: e.value }),
      empty(),
    )
    expect(rebuilt.rawMaterials).toBe(2)
    expect(rebuilt.rawMaterialKinds.k1).toEqual({ mark: '🌿', name: 'byliny', count: 4 })
  })

  it('očištění přijatých změn: platné projdou, neplatné ne', () => {
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterials', value: 5 })).toEqual({ id: 'e', path: 'rawMaterials', value: 5 })
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterials', value: -1 })).toBeUndefined()
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterials', value: 99999 })?.value).toBe(9999)
    expect(
      sanitizeEvent({ id: 'e', path: 'rawMaterialKinds.k1', value: { mark: '🌿', name: 'byliny', count: 3 } }),
    ).toEqual({ id: 'e', path: 'rawMaterialKinds.k1', value: { mark: '🌿', name: 'byliny', count: 3 } })
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterialKinds.k1' })).toEqual({ id: 'e', path: 'rawMaterialKinds.k1' })
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterialKinds.k1', value: { mark: 'abcdef', name: '', count: 1 } })).toBeUndefined()
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterialKinds.k1.count', value: 3 })).toBeUndefined()
    expect(sanitizeEvent({ id: 'e', path: 'rawMaterialKinds.', value: { mark: 'x', name: '', count: 1 } })).toBeUndefined()
  })

  it('kindsFrom zahodí vadné druhy a omezí počet', () => {
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, { mark: 'x', name: '', count: 1 }]))
    expect(Object.keys(kindsFrom(many)).length).toBe(30)
    expect(kindsFrom({ a: { mark: '', name: '' }, b: 5, 'c.d': { mark: 'x', name: '', count: 1 } })).toEqual({})
    expect(kindsFrom([1, 2])).toEqual({})
  })
})
