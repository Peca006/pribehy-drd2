<script lang="ts">
  import { ATTRIBUTES } from '../../../core/character/model'
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'
  import { generateName } from '../names'
  import { formatMoney, problems } from '../rules'

  let {
    draft,
    data,
    goto,
    finish,
  }: { draft: Draft; data: CreationData; goto: (step: string) => void; finish: () => void } =
    $props()

  const race = $derived(data.races.find((r) => r.id === draft.raceId))
  const culture = $derived(race?.cultures.find((c) => c.id === draft.cultureId))
  const todo = $derived(problems(data.rules, data.professions, draft))
  const names = (ids: string[]) =>
    ids
      .map(
        (id) =>
          [
            ...data.professions.flatMap((p) => p.abilities),
            ...(race?.abilities ?? []),
            ...data.commonAbilities,
          ].find((a) => a.id === id)?.name,
      )
      .filter(Boolean)
      .join(', ')
  const traitName = $derived(data.traits.find((t) => t.id === draft.trait)?.name ?? draft.trait)

  function randomName(label: string) {
    const n = race && generateName(race.names, Math.random, label)
    if (n) draft.name = n
  }
</script>

<h2>Jméno a shrnutí</h2>
<label>
  Jméno postavy
  <input type="text" bind:value={draft.name} placeholder="např. Jarik" />
</label>
{#if race?.names.length}
  <div class="row names">
    <span class="muted">Náhodné jméno:</span>
    {#each race.names as n}
      <button onclick={() => randomName(n.label)}>{race.names.length > 1 ? n.label : 'Vymyslet'}</button>
    {/each}
  </div>
  <details>
    <summary>Typická jména ({race.name})</summary>
    {#each race.names as n}<p><strong>{n.label}:</strong> {n.list.join(', ')}</p>{/each}
  </details>
{/if}

<h3>Shrnutí</h3>
<dl class="panel">
  <dt>Koncept</dt>
  <dd>{draft.concept || '—'}</dd>
  <dt>Rasa</dt>
  <dd>{race?.name ?? '—'}{culture ? ` (${culture.name})` : ''}</dd>
  <dt>Zdatnost</dt>
  <dd>{ATTRIBUTES.map((k) => `${k} ${draft.attributes[k]}`).join(' · ')}</dd>
  <dt>Povolání</dt>
  <dd>
    {Object.entries(draft.levels)
      .filter(([, v]) => v > 0)
      .map(([id, v]) => `${data.professions.find((p) => p.id === id)?.name} ${v}`)
      .join(' · ') || '—'}
  </dd>
  <dt>Schopnosti</dt>
  <dd>{names([draft.raceAbility, ...draft.abilities]) || '—'}</dd>
  <dt>Povahový rys</dt>
  <dd>{traitName || '—'}</dd>
  <dt>Výbava</dt>
  <dd>
    {#each draft.equipment as e}<div>{e}</div>{:else}—{/each}
    <div class="muted">Hotovost: {formatMoney(draft.cash)}</div>
  </dd>
</dl>

{#if todo.length}
  <div class="panel" role="alert">
    <strong>Ještě chybí:</strong>
    <ul>
      {#each todo as p}
        <li>{p.text} <button onclick={() => goto(p.step)}>Opravit</button></li>
      {/each}
    </ul>
  </div>
{/if}
<button class="primary" disabled={todo.length > 0 || !draft.name.trim()} onclick={finish}>
  Vytvořit postavu
</button>
{#if !draft.name.trim()}<p class="muted">Zadejte jméno postavy.</p>{/if}

<style>
  dt {
    font-weight: bold;
    color: var(--drd-accent);
    margin-top: 0.5rem;
  }
  dd {
    margin: 0;
  }
  li {
    margin: 0.25rem 0;
  }
  .names {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin: 0.4rem 0;
  }
</style>

