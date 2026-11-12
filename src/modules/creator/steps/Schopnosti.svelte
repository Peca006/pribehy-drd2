<script lang="ts">
  import Md from '../../../ui/Md.svelte'
  import type { Ability } from '../../../core/content/schema'
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'
  import { abilitiesIn, quickAbilities, quickRaceAbility } from '../rules'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()
  const race = $derived(data.races.find((r) => r.id === draft.raceId))
  const cultureName = $derived(race?.cultures.find((c) => c.id === draft.cultureId)?.name)
  const quickRace = $derived(race && quickRaceAbility(race, cultureName))
  const raceChoices = $derived<Ability[]>([...(race?.abilities ?? []), ...data.commonAbilities])
  const weaponAbility = $derived(data.commonAbilities.some((a) => a.id === draft.raceAbility))
  const learning = $derived(data.professions.filter((p) => (draft.levels[p.id] ?? 0) > 0))

  function toggle(id: string) {
    draft.abilities = draft.abilities.includes(id)
      ? draft.abilities.filter((a) => a !== id)
      : [...draft.abilities, id]
  }

  function quickPick() {
    if (quickRace) draft.raceAbility = quickRace.id
    const chosen: string[] = []
    for (const p of learning) chosen.push(...quickAbilities(p, draft.levels[p.id]).map((a) => a.id))
    draft.abilities = chosen
  }
</script>

<h2>Zvláštní schopnosti</h2>
<p class="muted">
  Jednu rasovou schopnost (nebo Rodovou zbraň) a za každou úroveň povolání jednu schopnost tohoto
  povolání.
</p>
<button class="primary" onclick={quickPick}>Rychlá volba doporučených schopností</button>
<p class="muted">
  Přepíše současný výběr doporučenými schopnostmi; pak ho můžete libovolně upravit.
</p>

<h3>Rasová schopnost</h3>
{#if !race}
  <p class="muted">Nejdřív vyberte rasu.</p>
{:else}
  {#each raceChoices as a}
    <div class="panel" class:sel={draft.raceAbility === a.id}>
      <label class="radio">
        <input
          type="radio"
          name="rasova"
          checked={draft.raceAbility === a.id}
          onchange={() => (draft.raceAbility = a.id)}
        />
        <span>
          <strong>{a.name}</strong>
          {#if a.attribute}<span class="muted"> ({a.attribute})</span>{/if}
          {#if a.id === quickRace?.id}<span class="tag">doporučeno pro {cultureName}</span>{/if}
        </span>
      </label>
      <details>
        <summary>Popis</summary>
        {#if a.flavor}<Md text={a.flavor} />{/if}
        <Md text={a.text} hint />
      </details>
    </div>
  {/each}
  {#if weaponAbility}
    <label>
      Druh zbraně (např. krátké meče, luky)
      <input type="text" bind:value={draft.weaponKind} />
    </label>
  {/if}
{/if}

{#each learning as p}
  {@const lvl = draft.levels[p.id]}
  {@const n = abilitiesIn(p, draft.abilities)}
  <h3>{p.name} <span class="muted">– vybráno {n} z {lvl}</span></h3>
  {#each p.abilities as a}
    {@const on = draft.abilities.includes(a.id)}
    <div class="panel" class:sel={on}>
      <label class="radio">
        <input
          type="checkbox"
          checked={on}
          disabled={!on && n >= lvl}
          onchange={() => toggle(a.id)}
        />
        <span>
          <strong>{a.name}</strong>
          {#if a.attribute}<span class="muted"> ({a.attribute})</span>{/if}
          {#if a.quickPickLevel && a.quickPickLevel <= lvl}
            <span class="tag">doporučeno (úr. {a.quickPickLevel})</span>
          {/if}
        </span>
      </label>
      <details>
        <summary>Popis</summary>
        {#if a.flavor}<Md text={a.flavor} />{/if}
        <Md text={a.text} hint />
      </details>
    </div>
  {/each}
{/each}
{#if !learning.length}<p class="muted">Nejdřív rozdělte úrovně mezi povolání.</p>{/if}

<style>
  .sel {
    outline: 2px solid var(--drd-accent);
  }
  .radio {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }
  .radio input {
    width: auto;
    min-height: 0;
  }
  .tag {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: var(--drd-accent);
    border: 1px solid var(--drd-accent);
    border-radius: 1rem;
    padding: 0 0.5rem;
  }
</style>
