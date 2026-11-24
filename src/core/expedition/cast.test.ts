import { describe, expect, it } from 'vitest'
import { addNpc, byGroup, castNpc, castOf, dropNpc, groupNames, resolveCast, togglePick, updateNpc, usage } from './cast'
import { addIncident } from './deck'
import { emptyAdventure, emptyExpedition, type Expedition } from './model'

const setup = () => {
  let adv = emptyAdventure('Hrad')
  adv = { ...adv, cast: addNpc(addNpc(addNpc(adv.cast, 'Hubert'), 'Jarka'), 'Ondřej') }
  const [hubert, jarka, ondrej] = adv.cast!
  adv.cast = updateNpc(adv.cast, { ...hubert, group: 'Celnice', creatureId: 'b1' })
  adv.cast = updateNpc(adv.cast, { ...jarka, group: 'celnice' })
  let e = emptyExpedition('Cesta', adv.id)
  e = { ...e, cast: addNpc(undefined, 'Poutník') }
  return { adv, e, hubert: adv.cast![0], jarka, ondrej }
}

describe('cizí postavy', () => {
  it('prázdné jméno nic nepřidá a nová postava má prázdné údaje', () => {
    expect(addNpc(undefined, '  ')).toEqual([])
    const [n] = addNpc([], ' Hubert ')
    expect(n).toMatchObject({ name: 'Hubert', motive: '', group: '', look: '' })
  })

  it('výprava vidí vybrané postavy dobrodružství a své vlastní', () => {
    const { adv, e, hubert, ondrej } = setup()
    expect(castOf(e, adv).map((n) => n.name)).toEqual(['Poutník'])
    const picked = togglePick(togglePick(e, ondrej.id), hubert.id)
    expect(castOf(picked, adv).map((n) => n.name)).toEqual(['Hubert', 'Ondřej', 'Poutník'])
    expect(castOf(togglePick(picked, ondrej.id), adv).map((n) => n.name)).toEqual(['Hubert', 'Poutník'])
    // výprava bez dobrodružství nezná cizí ID
    expect(castOf({ ...e, castIds: ['x'] }).map((n) => n.name)).toEqual(['Poutník'])
  })

  it('skupiny se slučují bez ohledu na velikost písmen, bez skupiny na konci', () => {
    const { adv } = setup()
    const groups = byGroup(adv.cast!)
    expect(groups.map((g) => [g.group, g.members.map((m) => m.name)])).toEqual([
      ['Celnice', ['Hubert', 'Jarka']],
      ['', ['Ondřej']],
    ])
    expect(groupNames(adv.cast!)).toEqual(['Celnice'])
  })

  it('příhoda si bere postavu z přípravy jednou a jméno i bytost drží živě', () => {
    const { adv, e, hubert } = setup()
    const r = addIncident(e, 'kdykoli')
    let i = castNpc(r.incident, hubert)
    i = castNpc(i, hubert)
    expect(i.cast).toEqual([{ name: 'Hubert', npcId: hubert.id, creatureId: 'b1' }])
    const renamed = adv.cast!.map((n) => (n.id === hubert.id ? { ...n, name: 'Hubert II', creatureId: undefined } : n))
    expect(resolveCast(i, renamed)[0]).toMatchObject({ name: 'Hubert II', creatureId: 'b1' })
    // smazaná postava: zůstane uložené jméno
    expect(resolveCast(i, [])[0]).toEqual({ name: 'Hubert', creatureId: 'b1' })
  })

  it('smazání postavy uklidí výběr, vlastní postavy a odkazy v příhodách (jméno zůstane)', () => {
    const { adv, e, hubert } = setup()
    const r = addIncident(togglePick(e, hubert.id), 'kdykoli')
    const withInc: Expedition = { ...r.expedition, incidents: [castNpc(r.incident, hubert)] }
    expect(usage(hubert.id, [withInc])).toEqual({ expeditions: 1, incidents: 1 })
    const cleaned = dropNpc(withInc, hubert.id)
    expect(cleaned.castIds).toEqual([])
    expect(cleaned.incidents[0].cast).toEqual([{ name: 'Hubert', creatureId: 'b1' }])
    expect(usage(hubert.id, [cleaned])).toEqual({ expeditions: 0, incidents: 0 })
    // nedotčená výprava zůstane týmž objektem
    expect(dropNpc(e, 'neznama')).toBe(e)
    expect(adv.cast).toHaveLength(3)
  })
})
