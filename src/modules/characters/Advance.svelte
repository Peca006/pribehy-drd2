<script lang="ts">
  import { onMount } from 'svelte'
  import {
    advanceByAttribute,
    advanceByLevel,
    attributePool,
    describeAdvance,
    forgettable,
    levelChoices,
    professionPool,
    XP_PER_ADVANCEMENT,
    type AdvanceResult,
  } from '../../core/character/advance'
  import type { CheckContext } from '../../core/character/check'
  import { loadCharacterDraft, saveCharacterDraft } from '../../core/character/drafts'
  import {
    ATTRIBUTES,
    characterOf,
    type Character,
    type CharacterLog,
  } from '../../core/character/model'
  import { getLog } from '../../core/character/store'
  import type { Attribute } from '../../core/content/schema'
  import { commonRaceAbilities, creationRules, professions, races } from '../../core/library.svelte'
  import { go } from '../../core/router.svelte'

  // Průvodce zlepšením postavy (za 12 bodů zkušeností): úroveň povolání + schopnost, nebo zdatnost + schopnost.
  // Výsledek se zapíše do návrhu úpravy; zveřejní se v editoru jako běžná revize.
  let { id }: { id: string } = $props()

  let log = $state.raw<CharacterLog | undefined>(undefined)
  let start = $state.raw<Character | undefined>(undefined)
  let base = 0
  let path = $state<'uroven' | 'zdatnost'>('uroven')
  let professionId = $state('')
  let attribute = $state<Attribute>('Tělo')
  let abilityId = $state('')
  let forgetOn = $state(false)
  let forgetId = $state('')

  onMount(async () => {
    log = await getLog(id)
    if (!log) return
    const saved = loadCharacterDraft(id)
    start = saved ? saved.character : characterOf(log)
    base = saved ? saved.base : log.events.length
  })

  const ctx = $derived.by<CheckContext | undefined>(() => {
    const rules = creationRules()
    return rules
      ? {
          rules,
          professions: professions(),
          races: races(),
          commonAbilities: commonRaceAbilities(),
        }
      : undefined
  })

  const choices = $derived(start && ctx ? levelChoices(start, ctx) : [])
  const pool = $derived(
    !start || !ctx
      ? []
      : path === 'uroven'
        ? professionId
          ? professionPool(start, ctx, professionId)
          : []
        : attributePool(start, ctx),
  )
  const forgettables = $derived(
    !start || !ctx
      ? []
      : forgettable(start, ctx, path === 'uroven' ? professionId || undefined : undefined),
  )
  const result = $derived.by<AdvanceResult | undefined>(() => {
    if (!start || !ctx || !abilityId) return undefined
    const forget = forgetOn && forgetId ? forgetId : undefined
    if (path === 'uroven')
      return professionId ? advanceByLevel(start, ctx, professionId, abilityId, forget) : undefined
    return advanceByAttribute(start, ctx, attribute, abilityId, forget)
  })

  /** odkud schopnost je: povolání, jinak rasa */
  const source = (abilityId: string) =>
    ctx?.professions.find((p) => p.abilities.some((x) => x.id === abilityId))?.name ?? 'rasa'

  function pickPath(p: 'uroven' | 'zdatnost') {
    path = p
    abilityId = ''
    forgetId = ''
  }
  function apply() {
    if (!start || !ctx || !result || result.problems.length) return
    const note = describeAdvance(ctx, start, result.character, abilityId)
    saveCharacterDraft(id, base, $state.snapshot(result.character) as Character, note)
    go('postavy', id, 'uprav')
  }
</script>

<nav><a class="btn" href={'#/postavy/' + id}>← Zpět na postavu</a></nav>

{#if !log || !start || !ctx}
  <p class="muted">
    Načítání… Postava nebo pravidla nejsou k dispozici. <a href="#/postavy">Zpět na seznam</a>
  </p>
{:else}
  <h1>Postup postavy {start.name}</h1>
  <p>
    Body zkušeností: <strong>{start.xp}</strong>
    <span class="muted"> (jedno zlepšení stojí {XP_PER_ADVANCEMENT})</span>
  </p>
  {#if start.xp < XP_PER_ADVANCEMENT}
    <p class="muted">
      Bodů je méně než {XP_PER_ADVANCEMENT}. Zlepšení lze připravit i tak (např. po dohodě s
      vypravěčem).
    </p>
  {/if}

  <h2>1. Co si postava zlepší</h2>
  <label class="check">
    <input type="radio" checked={path === 'uroven'} onchange={() => pickPath('uroven')} />
    <span><strong>Úroveň povolání</strong> a jedna zvláštní schopnost tohoto povolání</span>
  </label>
  <label class="check">
    <input type="radio" checked={path === 'zdatnost'} onchange={() => pickPath('zdatnost')} />
    <span
      ><strong>Zdatnost o 1</strong> a zvláštní schopnost rasy nebo povolání, které postava ovládá</span
    >
  </label>

  {#if path === 'uroven'}
    <h2>2. Povolání</h2>
    {#each choices as { profession: p, problems }}
      <label class="check" class:off={problems.length > 0}>
        <input
          type="radio"
          name="povolani"
          disabled={problems.length > 0}
          checked={professionId === p.id}
          onchange={() => {
            professionId = p.id
            abilityId = ''
            forgetId = ''
          }}
        />
        <span>
          {p.name}
          <span class="muted">
            (úroveň {start.professions[p.id] ?? 0}{p.kind === 'pokrocile' ? ', pokročilé' : ''})
          </span>
          {#if problems.length}<div class="muted">{problems.join(' ')}</div>{/if}
        </span>
      </label>
    {/each}
  {:else}
    <h2>2. Zdatnost</h2>
    <div class="row">
      {#each ATTRIBUTES as a}
        <button class:primary={attribute === a} onclick={() => (attribute = a)}>
          {a}
          {start.attributes[a]} → {start.attributes[a] + 1}
        </button>
      {/each}
    </div>
  {/if}

  {#if path === 'zdatnost' || professionId}
    <h2>3. Zvláštní schopnost</h2>
    {#each pool as a (a.id)}
      <label class="check">
        <input
          type="radio"
          name="schopnost"
          checked={abilityId === a.id}
          onchange={() => (abilityId = a.id)}
        />
        <span>
          {a.name}{#if a.attribute}<span class="muted"> ({a.attribute})</span>{/if}
          {#if path === 'zdatnost'}<span class="muted"> – {source(a.id)}</span>{/if}
        </span>
      </label>
    {:else}
      <p class="muted">Postava už nemá z čeho vybírat.</p>
    {/each}

    {#if forgettables.length}
      <label class="check">
        <input type="checkbox" bind:checked={forgetOn} />
        <span>Zapomenout jednu schopnost místo toho (volitelné pravidlo)</span>
      </label>
      {#if forgetOn}
        <select bind:value={forgetId} aria-label="Zapomenutá schopnost">
          <option value="">Vyberte schopnost…</option>
          {#each forgettables as a}<option value={a.id}>{a.name}</option>{/each}
        </select>
      {/if}
    {/if}
  {/if}

  {#if result}
    <h2>Shrnutí</h2>
    <p>{describeAdvance(ctx, start, result.character, abilityId)}</p>
    {#each result.problems as p}<p class="error" role="alert">{p}</p>{/each}
    {#each result.warnings as w}<p class="muted">{w}</p>{/each}
    <p class="muted">
      Změny se zapíšou do návrhu úpravy, kde je zkontrolujete a zveřejníte (revize s popisem).
    </p>
    <button class="primary" disabled={result.problems.length > 0} onclick={apply}
      >Použít do návrhu úpravy</button
    >
  {/if}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin: 0.4rem 0;
  }
  .check input {
    width: auto;
    min-height: 0;
    margin-top: 0.3rem;
  }
  .off {
    opacity: 0.6;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
