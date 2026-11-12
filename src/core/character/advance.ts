// Zlepšování postavy podle pravidel (kapitola o zkušenostech): za každých 12 bodů zkušeností hráč zvolí
// buď (A) úroveň jednoho povolání a jednu zvláštní schopnost tohoto povolání, nebo (B) zvýšení jedné zdatnosti
// o 1 a zvláštní schopnost rasy či povolání, které postava ovládá. Nejvyšší úroveň povolání je 5; k první úrovni
// pokročilého povolání je třeba 6 úrovní ve dvou základních povoláních, z nichž vychází (po jedné z každého).
// Volitelné pravidlo „zapomínání“: při postupu lze jednu schopnost (téhož povolání / rasy) zapomenout a získat jinou.
import type { Ability, Attribute } from '../content/schema'
import type { CheckContext } from './check'
import type { Character } from './model'

export const XP_PER_ADVANCEMENT = 12
export const MAX_PROFESSION_LEVEL = 5

export interface AdvanceResult {
  /** postava po postupu (i když jsou `problems`, pro náhled) */
  character: Character
  /** porušení pravidel, kvůli kterým postup nejde provést */
  problems: string[]
  /** upozornění, která postup neblokují (např. málo bodů zkušeností) */
  warnings: string[]
}

const ownedAbilityIds = (c: Character) => new Set(c.abilities)

/** Proč postava nemůže získat další úroveň povolání (prázdné pole = může). */
export function levelProblems(c: Character, ctx: CheckContext, professionId: string): string[] {
  const p = ctx.professions.find((x) => x.id === professionId)
  if (!p) return [`Neznámé povolání „${professionId}“.`]
  const lvl = c.professions[professionId] ?? 0
  const out: string[] = []
  if (lvl >= MAX_PROFESSION_LEVEL)
    out.push(`${p.name}: nejvyšší úroveň povolání je ${MAX_PROFESSION_LEVEL}.`)
  if (lvl === 0 && p.requires?.length) {
    const have = p.requires.map((r) => c.professions[r] ?? 0)
    const names = p.requires
      .map((r) => ctx.professions.find((x) => x.id === r)?.name ?? r)
      .join(' a ')
    if (have.some((l) => l < 1) || have.reduce((s, l) => s + l, 0) < 6)
      out.push(
        `${p.name}: k pokročilému povolání je třeba alespoň 6 úrovní v povoláních ${names} (po jedné z každého).`,
      )
  }
  return out
}

/** Povolání, ve kterých může postava získat úroveň, a důvod u těch, kde ne. */
export function levelChoices(c: Character, ctx: CheckContext) {
  return ctx.professions.map((p) => ({ profession: p, problems: levelProblems(c, ctx, p.id) }))
}

/** Schopnosti rasy postavy (včetně společných, např. Rodové zbraně), které ještě nemá. */
export function racePool(c: Character, ctx: CheckContext): Ability[] {
  const race = ctx.races.find((r) => r.id === c.raceId)
  const have = ownedAbilityIds(c)
  return [...(race?.abilities ?? []), ...ctx.commonAbilities].filter((a) => !have.has(a.id))
}

/** Schopnosti jednoho povolání, které postava ještě nemá. */
export function professionPool(c: Character, ctx: CheckContext, professionId: string): Ability[] {
  const have = ownedAbilityIds(c)
  return (ctx.professions.find((p) => p.id === professionId)?.abilities ?? []).filter(
    (a) => !have.has(a.id),
  )
}

/** Schopnosti, které lze získat zlepšením zdatnosti: rasové a z povolání, které postava ovládá. */
export function attributePool(c: Character, ctx: CheckContext): Ability[] {
  const out = [...racePool(c, ctx)]
  for (const p of ctx.professions)
    if ((c.professions[p.id] ?? 0) > 0) out.push(...professionPool(c, ctx, p.id))
  return out
}

/** Schopnosti, které postava může zapomenout při postupu (jen ze stejného zdroje jako nová). */
export function forgettable(c: Character, ctx: CheckContext, professionId?: string): Ability[] {
  const mine = ownedAbilityIds(c)
  const pools = professionId
    ? [ctx.professions.find((p) => p.id === professionId)?.abilities ?? []]
    : [
        ctx.races.find((r) => r.id === c.raceId)?.abilities ?? [],
        ctx.commonAbilities,
        ...ctx.professions.filter((p) => (c.professions[p.id] ?? 0) > 0).map((p) => p.abilities),
      ]
  return pools.flat().filter((a) => mine.has(a.id))
}

function finish(c: Character, next: Character, problems: string[]): AdvanceResult {
  const warnings: string[] = []
  if (c.xp < XP_PER_ADVANCEMENT)
    warnings.push(
      `K zlepšení je potřeba ${XP_PER_ADVANCEMENT} bodů zkušeností, postava jich má ${c.xp}. Body se odečtou (zůstanou záporné).`,
    )
  return { character: next, problems, warnings }
}

function withAbility(c: Character, add: string, forget?: string) {
  const abilities = c.abilities.filter((a) => a !== forget)
  return [...abilities, add]
}

/** (A) úroveň povolání + zvláštní schopnost tohoto povolání (volitelně se zapomene jiná téhož povolání). */
export function advanceByLevel(
  c: Character,
  ctx: CheckContext,
  professionId: string,
  abilityId: string,
  forget?: string,
): AdvanceResult {
  const problems = levelProblems(c, ctx, professionId)
  const pool = professionPool(c, ctx, professionId)
  if (!pool.some((a) => a.id === abilityId))
    problems.push('Vybraná schopnost není ze seznamu tohoto povolání, nebo ji postava už má.')
  if (forget && !forgettable(c, ctx, professionId).some((a) => a.id === forget))
    problems.push('Zapomenout lze jen schopnost téhož povolání, kterou postava má.')
  const next: Character = {
    ...c,
    professions: { ...c.professions, [professionId]: (c.professions[professionId] ?? 0) + 1 },
    abilities: withAbility(c, abilityId, forget),
    xp: c.xp - XP_PER_ADVANCEMENT,
  }
  return finish(c, next, problems)
}

/** (B) zdatnost o 1 + zvláštní schopnost rasy nebo ovládaného povolání (volitelně se zapomene jiná). */
export function advanceByAttribute(
  c: Character,
  ctx: CheckContext,
  attribute: Attribute,
  abilityId: string,
  forget?: string,
): AdvanceResult {
  const problems: string[] = []
  if (!attributePool(c, ctx).some((a) => a.id === abilityId))
    problems.push(
      'Vybraná schopnost není rasová ani z povolání, které postava ovládá, nebo ji už má.',
    )
  if (forget && !forgettable(c, ctx).some((a) => a.id === forget))
    problems.push(
      'Zapomenout lze jen schopnost, kterou postava má (rasovou nebo z ovládaného povolání).',
    )
  const next: Character = {
    ...c,
    attributes: { ...c.attributes, [attribute]: c.attributes[attribute] + 1 },
    abilities: withAbility(c, abilityId, forget),
    xp: c.xp - XP_PER_ADVANCEMENT,
  }
  return finish(c, next, problems)
}

/** Krátký popis zlepšení do poznámky revize. */
export function describeAdvance(
  ctx: CheckContext,
  before: Character,
  after: Character,
  abilityId: string,
): string {
  const abilityName =
    [
      ...ctx.professions.flatMap((p) => p.abilities),
      ...ctx.races.flatMap((r) => r.abilities),
      ...ctx.commonAbilities,
    ].find((a) => a.id === abilityId)?.name ?? abilityId
  for (const p of ctx.professions) {
    if ((after.professions[p.id] ?? 0) > (before.professions[p.id] ?? 0))
      return `Postup: ${p.name} ${after.professions[p.id]}, schopnost ${abilityName}`
  }
  const attr = (['Tělo', 'Duše', 'Vliv'] as const).find(
    (a) => after.attributes[a] > before.attributes[a],
  )
  return `Postup: ${attr ?? 'zdatnost'} ${attr ? after.attributes[attr] : ''}, schopnost ${abilityName}`.replace(
    '  ',
    ' ',
  )
}
