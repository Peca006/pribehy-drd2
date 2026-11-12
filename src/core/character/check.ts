// Kontrola postavy proti pravidlům: upozorní na pravděpodobné chyby a překlepy (neznámé ID, počet schopností
// na úrovni povolání, chybějící jméno, …). Upozornění nic neblokují: vypravěč může udělit výjimku.
import type { Ability, CreationRules, Profession, Race } from '../content/schema'
import { ATTRIBUTES, type Character } from './model'

export interface CharacterCheck {
  /** `chyba` = skoro jistě omyl, `upozornění` = zkontrolovat */
  level: 'chyba' | 'upozornění'
  text: string
}

export interface CheckContext {
  rules: CreationRules
  professions: Profession[]
  races: Race[]
  /** rasové schopnosti dostupné každé rase (Rodová zbraň) */
  commonAbilities: Ability[]
}

const MAX_LEVEL = 5
const MAX_SCAR = 5

export function checkCharacter(c: Character, ctx: CheckContext): CharacterCheck[] {
  const out: CharacterCheck[] = []
  const err = (text: string) => out.push({ level: 'chyba', text })
  const warn = (text: string) => out.push({ level: 'upozornění', text })
  const { rules } = ctx

  if (!c.name.trim()) warn('Postava nemá jméno.')

  // rasa a kultura
  const race = ctx.races.find((r) => r.id === c.raceId)
  if (!c.raceId) warn('Není vybrána rasa.')
  else if (!race) err(`Neznámá rasa „${c.raceId}“ (překlep, nebo jiná verze balíčku).`)
  else if (c.cultureId && !race.cultures.some((k) => k.id === c.cultureId))
    err(`Kultura „${c.cultureId}“ nepatří k rase ${race.name}.`)

  // zdatnost
  for (const a of ATTRIBUTES) {
    const v = c.attributes[a]
    if (!Number.isInteger(v)) err(`Zdatnost ${a} není celé číslo.`)
    else if (v < rules.attributeMin)
      warn(`Zdatnost ${a} je ${v}, pravidla vyžadují alespoň ${rules.attributeMin}.`)
  }

  // povolání
  const known = new Map(ctx.professions.map((p) => [p.id, p]))
  let totalLevels = 0
  for (const [id, lvl] of Object.entries(c.professions)) {
    const p = known.get(id)
    if (!p) err(`Neznámé povolání „${id}“ (překlep, nebo jiná verze balíčku).`)
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > MAX_LEVEL)
      err(`${p?.name ?? id}: úroveň ${lvl} je mimo rozsah 1 až ${MAX_LEVEL}.`)
    else totalLevels += lvl
  }
  if (totalLevels < rules.startingLevels)
    warn(
      `Úrovní povolání je ${totalLevels}, postava má mít na začátku alespoň ${rules.startingLevels}.`,
    )

  // schopnosti
  const owner = new Map<string, Profession>()
  for (const p of ctx.professions) for (const a of p.abilities) owner.set(a.id, p)
  const raceIds = new Set([...(race?.abilities ?? []), ...ctx.commonAbilities].map((a) => a.id))
  const allKnown = new Set([
    ...owner.keys(),
    ...ctx.races.flatMap((r) => r.abilities.map((a) => a.id)),
    ...ctx.commonAbilities.map((a) => a.id),
  ])

  const dup = c.abilities.filter((a, i) => c.abilities.indexOf(a) !== i)
  for (const d of new Set(dup)) err(`Schopnost „${d}“ je uvedena víckrát.`)

  const perProfession = new Map<string, number>()
  let raceCount = 0
  for (const id of new Set(c.abilities)) {
    if (!allKnown.has(id)) {
      err(`Neznámá schopnost „${id}“ (překlep, nebo jiná verze balíčku).`)
      continue
    }
    const p = owner.get(id)
    if (p) {
      perProfession.set(p.id, (perProfession.get(p.id) ?? 0) + 1)
      if (!(c.professions[p.id] > 0)) warn(`Schopnost z povolání ${p.name}, které postava nemá.`)
    } else if (raceIds.has(id)) raceCount++
    else warn(`Rasová schopnost „${id}“ nepatří k rase postavy.`)
  }
  // zlepšení zdatnosti (o 1 nad body z tvorby postavy) dává jednu schopnost rasy nebo povolání navíc
  const attrSum = ATTRIBUTES.reduce(
    (s, a) => s + (Number.isFinite(c.attributes[a]) ? c.attributes[a] : 0),
    0,
  )
  const extra = Math.max(0, attrSum - rules.attributePoints)
  const extraNote = extra ? ` (a ${extra} navíc za zlepšení zdatnosti)` : ''
  for (const [pid, n] of perProfession) {
    const p = known.get(pid)!
    const lvl = c.professions[pid] ?? 0
    const allowed = lvl * rules.abilitiesPerLevel
    if (n > allowed + extra)
      err(`${p.name}: ${n} schopností, úroveň ${lvl} jich dovoluje ${allowed}${extraNote}.`)
    else if (n < allowed) warn(`${p.name}: ${n} schopností, úroveň ${lvl} jich má ${allowed}.`)
  }
  for (const [pid, lvl] of Object.entries(c.professions)) {
    const p = known.get(pid)
    if (p && lvl > 0 && !perProfession.has(pid) && rules.abilitiesPerLevel > 0)
      warn(`${p.name}: žádná schopnost, úroveň ${lvl} jich má ${lvl * rules.abilitiesPerLevel}.`)
  }
  const levelsTotal = Object.values(c.professions).reduce(
    (s, l) => s + (Number.isFinite(l) ? l : 0),
    0,
  )
  const abilitiesAllowed = rules.raceAbilities + levelsTotal * rules.abilitiesPerLevel + extra
  const abilitiesHave = new Set(c.abilities.filter((a) => allKnown.has(a))).size
  if (abilitiesHave > abilitiesAllowed)
    err(
      `Schopností je celkem ${abilitiesHave}, pravidla dovolují ${abilitiesAllowed}${extra ? ' (včetně zlepšení zdatnosti)' : ''}.`,
    )
  if (race && raceCount > rules.raceAbilities + extra)
    err(
      `Rasových schopností je ${raceCount}, pravidla dovolují ${rules.raceAbilities}${extraNote}.`,
    )
  else if (race && raceCount < rules.raceAbilities)
    warn('Chybí rasová schopnost (nebo Rodová zbraň).')
  if (c.abilities.some((a) => a.endsWith('rodova-zbran')) && !c.weaponKind.trim())
    warn('Rodová zbraň: chybí druh zbraně.')

  // pokročilá povolání vyžadují 6 úrovní ve dvou základních povoláních, ze kterých vycházejí (min. 1 z každého)
  for (const [pid, lvl] of Object.entries(c.professions)) {
    const p = known.get(pid)
    if (!p?.requires?.length || !(lvl > 0)) continue
    const have = p.requires.map((r) => c.professions[r] ?? 0)
    if (have.some((l) => l < 1) || have.reduce((s, l) => s + l, 0) < 6)
      warn(
        `${p.name}: pokročilé povolání vyžaduje alespoň 6 úrovní v povoláních ${p.requires
          .map((r) => known.get(r)?.name ?? r)
          .join(' a ')} (po jedné z každého).`,
      )
  }

  // zkušenosti a jizvy
  if (!Number.isInteger(c.xp) || c.xp < 0) err('Body zkušeností musí být nezáporné celé číslo.')
  for (const s of c.scars) {
    if (!ATTRIBUTES.includes(s.attribute)) err(`Jizva „${s.note}“: neplatná vlastnost.`)
    else if (!Number.isInteger(s.severity) || s.severity < 1 || s.severity > MAX_SCAR)
      err(`Jizva (${s.attribute}): závažnost ${s.severity} je mimo rozsah 1 až ${MAX_SCAR}.`)
  }

  // výbava a peníze
  if (!Number.isInteger(c.cash) || c.cash < 0)
    err('Hotovost musí být nezáporné celé číslo (v haléřích).')
  const items = c.equipment.map((e) => e.trim().toLowerCase())
  if (items.some((e) => !e)) warn('Ve výbavě je prázdná položka.')
  const dupItems = items.filter((e, i) => e && items.indexOf(e) !== i)
  if (dupItems.length) warn(`Ve výbavě se opakuje: ${[...new Set(dupItems)].join(', ')}.`)

  return out
}
