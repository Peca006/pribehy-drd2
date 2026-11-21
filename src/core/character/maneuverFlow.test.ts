import { describe, expect, it } from 'vitest'
import {
  initialManeuver,
  initiativeAction,
  newActionManeuver,
  payManeuver,
  pickManeuver,
  toggleInaccurate,
} from './maneuverFlow'

const base = initialManeuver()

describe('volba manévru', () => {
  it('výběr a zrušení téhož manévru; změna manévru zahodí třetí kostku, když není Přesně', () => {
    const a = pickManeuver({ ...base, extra: 4 }, 'mocne')
    expect(a).toMatchObject({ man: 'mocne', extra: 0, manMsg: '' })
    expect(pickManeuver(a, 'mocne').man).toBeUndefined()
  })
  it('Přesně vypne postih a třetí kostku ponechá', () => {
    const s = pickManeuver({ ...base, inaccurate: true, extra: 5 }, 'presne')
    expect(s).toMatchObject({ man: 'presne', inaccurate: false, extra: 5 })
  })
  it('zaplacený manévr se nemění', () => {
    const paid = { ...base, man: 'mocne' as const, manPaid: true }
    expect(pickManeuver(paid, 'lstive')).toBe(paid)
  })
})

describe('postih Nepřesně', () => {
  it('zapnutí vypne Přesně; vypnutí bez Přesně zahodí třetí kostku', () => {
    const on = toggleInaccurate({ ...base, man: 'presne', extra: 3 })
    expect(on).toMatchObject({ inaccurate: true, man: undefined, extra: 3 })
    expect(toggleInaccurate(on)).toMatchObject({ inaccurate: false, extra: 0 })
  })
  it('zapnutí s jiným manévrem ho ponechá', () => {
    expect(toggleInaccurate({ ...base, man: 'mocne' })).toMatchObject({ inaccurate: true, man: 'mocne' })
  })
})

describe('platba manévru', () => {
  const ok = () => true
  const no = () => false
  it('bez manévru nebo už zaplacený se neplatí', () => {
    expect(payManeuver(base, 'Tělo', no)).toEqual({ state: base, ok: true })
    const paid = { ...base, man: 'mocne' as const, manPaid: true }
    expect(payManeuver(paid, 'Tělo', no)).toEqual({ state: paid, ok: true })
  })
  it('zaplatí jednou 1 Zdroj', () => {
    const calls: [string, number][] = []
    const r = payManeuver({ ...base, man: 'mocne' }, 'Duše', (a, n) => (calls.push([a, n]), true))
    expect(r.ok).toBe(true)
    expect(r.state).toMatchObject({ manPaid: true, manMsg: 'Manévr zaplacen (1 Duše).' })
    expect(calls).toEqual([['Duše', 1]])
    payManeuver(r.state, 'Duše', ok)
  })
  it('bez Zdroje platba selže a nic se nezaplatí', () => {
    const r = payManeuver({ ...base, man: 'mocne' }, 'Vliv', no)
    expect(r.ok).toBe(false)
    expect(r.state).toMatchObject({ manPaid: false, manMsg: 'Na manévr nemáte Zdroj (Vliv).' })
  })
})

describe('nová akce a iniciativa', () => {
  it('nová akce zruší zaplacení a třetí kostku, volbu manévru nechá', () => {
    expect(newActionManeuver({ man: 'mocne', manPaid: true, manMsg: 'x', extra: 4, inaccurate: true })).toEqual({
      man: 'mocne',
      manPaid: false,
      manMsg: '',
      extra: 0,
      inaccurate: true,
    })
  })
  it('běžná iniciativa je zdarma, rychle či pomalu stojí Duši', () => {
    const rng = () => 0.5
    const free = initiativeAction('normal', () => false, rng)
    expect(free).toMatchObject({ ok: true, flash: '' })
    expect(free.text).toMatch(/^Iniciativa \d+/)
    expect(initiativeAction('best', () => true, rng)).toMatchObject({ ok: true, flash: '−1 Duše' })
    expect(initiativeAction('worst', () => false, rng)).toEqual({ ok: false, flash: 'Chybí Duše na přístup.', text: '' })
  })
})
