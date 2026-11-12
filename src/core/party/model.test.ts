import { describe, expect, it } from 'vitest'
import { emptyParty, sessionAward, type Member } from './model'

const m = (id: string): Member => ({ id, name: id.toUpperCase() })
const members = [m('a'), m('b'), m('c')]

describe('zkušenosti za sezení', () => {
  it('účast dává 4 body, odměna až 2 body navíc', () => {
    const r = sessionAward(members, new Set(['a', 'b', 'c']), { a: 2, b: 1 })
    expect(r.xp).toEqual({ a: 6, b: 5, c: 4 })
    expect(r.problems).toEqual([])
  })

  it('nepřítomný nedostane nic, ani odměnu', () => {
    const r = sessionAward(members, new Set(['a', 'b']), { c: 1 })
    expect(r.xp).toEqual({ a: 4, b: 4 })
    expect(r.problems.join()).toMatch(/nepřítomného/)
  })

  it('víc než 2 body odměny se ořízne a upozorní', () => {
    const r = sessionAward(members, new Set(['a', 'b', 'c']), { a: 5 })
    expect(r.xp.a).toBe(6)
    expect(r.problems.join()).toMatch(/nejvýš 2/)
  })

  it('odměn je nejvýš přítomní hráči + 1 (Průvodce); víc jen upozorní', () => {
    expect(sessionAward(members, new Set(['a', 'b']), { a: 2, b: 1 }).problems).toEqual([])
    const r = sessionAward(members, new Set(['a', 'b']), { a: 2, b: 2 })
    expect(r.problems.join()).toMatch(/Odměnových bodů je 4, rozdělit lze nejvýš 3/)
    expect(r.xp).toEqual({ a: 6, b: 6 })
  })

  it('volitelná základní odměna za účast', () => {
    expect(sessionAward(members, new Set(['a']), {}, 6).xp).toEqual({ a: 6 })
  })

  it('prázdná družina má jedinečné ID', () => {
    expect(emptyParty('X').id).not.toBe(emptyParty('X').id)
  })
})
