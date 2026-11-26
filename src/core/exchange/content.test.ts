import { describe, expect, it } from 'vitest'
import { decodeJson, encodeJson } from '../character/share'
import { castNpc, emptyNpc } from '../expedition/cast'
import { emptyAdventure, emptyExpedition, type Expedition, type Incident } from '../expedition/model'
import {
  addNpcsTo,
  buildAdventureContent,
  buildExpeditionContent,
  buildNpcContent,
  describeContent,
  planAdventure,
  planExpedition,
  sanitizeContent,
  type AdventureContent,
  type ExpeditionContent,
} from './content'
import { detectIncoming } from './detect'

function sample() {
  const adv = { ...emptyAdventure('Stíny nad Kopcem'), background: 'tajné', cast: [emptyNpc('Marta'), emptyNpc('Radim')] }
  const hlidka: Incident = {
    id: 'i1',
    title: 'Hlídka',
    text: 'Stráž',
    stage: 'n1',
    cast: [],
    conditions: '',
    ifSuccess: '',
    ifFailure: '',
    loot: [{ id: 'l1', kind: 'penize', label: 'Měšec', amount: 5, unit: 'grose' }],
  }
  const e1: Expedition = {
    ...emptyExpedition('První', adv.id),
    nodes: [{ id: 'n1', title: 'Brána', text: 'Zavřená' }],
    castIds: [adv.cast![0].id],
    cast: [emptyNpc('Strážný')],
    incidents: [castNpc(hlidka, adv.cast![0])],
  }
  const e2 = emptyExpedition('Druhá', adv.id)
  adv.expeditionIds = [e1.id, e2.id]
  return { adv, e1, e2 }
}

describe('zásilky obsahu', () => {
  it('výprava je soběstačná: cizí postavy z dobrodružství se přiloží a odkaz na dobrodružství odpadne', () => {
    const { adv, e1 } = sample()
    const c = buildExpeditionContent(e1, adv)
    expect(c.expedition.adventureId).toBeUndefined()
    expect(c.expedition.castIds).toBeUndefined()
    expect(c.expedition.cast!.map((n) => n.name)).toEqual(['Marta', 'Strážný'])
  })

  it('kód prošel kolečkem a po očištění je shodný; import dá nová ID a zachová odkazy', async () => {
    const { adv, e1 } = sample()
    const code = await encodeJson(buildExpeditionContent(e1, adv))
    const r = sanitizeContent(await decodeJson(code))
    expect(r.errors).toEqual([])
    const content = r.content as ExpeditionContent
    const { expedition: x } = planExpedition(content)
    expect(x.id).not.toBe(e1.id)
    expect(x.incidents[0].id).not.toBe('i1')
    expect(x.nodes[0].id).toBe('n1')
    expect(x.incidents[0].stage).toBe('n1')
    const marta = x.cast!.find((n) => n.name === 'Marta')!
    expect(marta.id).not.toBe(adv.cast![0].id)
    expect(x.incidents[0].cast[0].npcId).toBe(marta.id)
    expect(x.incidents[0].loot![0].id).not.toBe('l1')
    // druhý import vytvoří další kopii s jinými ID
    expect(planExpedition(content).expedition.id).not.toBe(x.id)
  })

  it('dobrodružství: výpravy ve správném pořadí, vazby na dobrodružství a cizí postavy přeložené', () => {
    const { adv, e1, e2 } = sample()
    const c = buildAdventureContent(adv, [e2, e1])
    expect(c.expeditions.map((e) => e.name)).toEqual(['První', 'Druhá'])
    const sane = sanitizeContent(JSON.parse(JSON.stringify(c))).content as AdventureContent
    const p = planAdventure(sane)
    expect(p.adventure.id).not.toBe(adv.id)
    expect(p.adventure.expeditionIds).toEqual(p.expeditions.map((e) => e.id))
    expect(p.expeditions.every((e) => e.adventureId === p.adventure.id)).toBe(true)
    const newMarta = p.adventure.cast!.find((n) => n.name === 'Marta')!
    expect(newMarta.id).not.toBe(adv.cast![0].id)
    expect(p.expeditions[0].castIds).toEqual([newMarta.id])
    expect(p.expeditions[0].incidents[0].cast[0].npcId).toBe(newMarta.id)
  })

  it('cizí postavy se přidají k cíli s novými ID', () => {
    const npcs = [emptyNpc('A'), emptyNpc('B')]
    const target = emptyExpedition('X')
    const out = addNpcsTo(target, npcs)
    expect(out.cast!.map((n) => n.name)).toEqual(['A', 'B'])
    expect(out.cast![0].id).not.toBe(npcs[0].id)
  })

  it('očištění: špatné typy, přehnané délky, neznámá pole a neplatný druh', () => {
    const bad = sanitizeContent({
      v: 1,
      type: 'obsah',
      kind: 'vyprava',
      expedition: {
        name: 'N'.repeat(500),
        style: '<script>',
        hook: 5,
        evil: 'x',
        nodes: [{ title: 1 }, 'x', null],
        incidents: [{ title: 'ok', loot: [{ kind: 'zlato' }, { kind: 'penize', amount: -3, unit: 'nic' }], cast: [{ name: '' }, { name: 'B', npcId: 7 }] }],
      },
    })
    const e = (bad.content as ExpeditionContent).expedition
    expect(e.name).toHaveLength(200)
    expect(e.style).toBe('domino')
    expect(e.hook).toBe('')
    expect('evil' in e).toBe(false)
    expect(e.nodes).toEqual([])
    expect(e.incidents[0].loot).toEqual([{ id: expect.any(String), kind: 'penize', label: '' }])
    expect(e.incidents[0].cast).toEqual([{ name: 'B' }])
    expect(sanitizeContent({ v: 1, type: 'obsah', kind: 'jine' }).errors).toHaveLength(1)
    expect(sanitizeContent({ v: 2, type: 'obsah', kind: 'vyprava' }).errors[0]).toMatch(/verze/)
    expect(sanitizeContent({ v: 1, type: 'obsah', kind: 'cizi-postava', npcs: [{ name: ' ' }] }).content).toBeUndefined()
  })

  it('popis pro potvrzení', () => {
    const { adv, e1 } = sample()
    expect(describeContent(buildExpeditionContent(e1, adv)).title).toBe('Výprava První')
    expect(describeContent(buildNpcContent(adv.cast!)).lines).toEqual(['• Marta', '• Radim'])
  })
})

describe('rozpoznání zásilky', () => {
  it('rozpozná obsah v kódu i v holém JSONu', async () => {
    const { adv, e1 } = sample()
    const content = buildExpeditionContent(e1, adv)
    const a = await detectIncoming(await encodeJson(content))
    expect(a.incoming?.kind).toBe('obsah')
    const b = await detectIncoming(JSON.stringify(content))
    expect(b.incoming?.kind).toBe('obsah')
  })

  it('rozpozná bestiář, balíček postavy, zip Hávu a odmítne ostatní', async () => {
    const bestiar = await detectIncoming(JSON.stringify({ format: 1, type: 'bestiar', creatures: [{ name: 'Vlk' }] }))
    expect(bestiar.incoming).toMatchObject({ kind: 'bestiar', creatures: [{ name: 'Vlk' }] })
    const predpisy = await detectIncoming(
      await encodeJson({ v: 1, type: 'predpisy', recipes: [{ id: 'r1', kind: 'lektvar', name: 'Léčivý' }] }),
    )
    expect(predpisy.incoming?.kind).toBe('postava')
    expect((await detectIncoming(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]))).incoming?.kind).toBe('hav')
    expect((await detectIncoming('DRD2:@@@')).errors).toHaveLength(1)
    expect((await detectIncoming('{"a":1}')).incoming).toBeUndefined()
    expect(await detectIncoming('   ')).toEqual({ errors: [] })
    expect((await detectIncoming(new Uint8Array([0xff, 0xfe, 0xfd, 0xfc, 0xfb]))).incoming).toBeUndefined()
  })
})
