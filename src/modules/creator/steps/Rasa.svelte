<script lang="ts">
  import Md from '../../../ui/Md.svelte'
  import type { CreationData } from '../data'
  import { manualLink } from '../data'
  import type { Draft } from '../draft.svelte'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()

  function pick(id: string) {
    if (draft.raceId !== id) {
      draft.raceId = id
      draft.cultureId = undefined
      draft.raceAbility = ''
    }
  }
</script>

<h2>Rasa a kultura</h2>
<p class="muted">
  Vyberte rasu. Kulturu můžete zvolit také – určuje doporučenou rasovou schopnost.
</p>

{#each data.races as r}
  <div class="panel" class:sel={r.id === draft.raceId}>
    <button class="head" aria-pressed={r.id === draft.raceId} onclick={() => pick(r.id)}>
      <strong>{r.name}</strong>
    </button>
    {#if r.summary}<Md text={r.summary} />{/if}
    {#if r.id === draft.raceId}
      <fieldset>
        <legend>Kultura</legend>
        <label class="radio">
          <input
            type="radio"
            name="kultura"
            checked={!draft.cultureId}
            onchange={() => (draft.cultureId = undefined)}
          />
          bez kultury
        </label>
        {#each r.cultures as c}
          <label class="radio">
            <input
              type="radio"
              name="kultura"
              checked={draft.cultureId === c.id}
              onchange={() => (draft.cultureId = c.id)}
            />
            <span
              ><strong>{c.name}</strong>{#if c.alias}<span class="muted">
                  ({c.alias})</span
                >{/if}</span
            >
          </label>
          {#if draft.cultureId === c.id}<div class="culture"><Md text={c.text} /></div>{/if}
        {/each}
      </fieldset>
      {@const link = manualLink('24', r.name)}
      {#if link}<p>
          <a href={'#/ctenar/' + link.slice(8).replace('#', '/')}>Celý popis rasy v příručce →</a>
        </p>{/if}
    {/if}
  </div>
{/each}

<style>
  .sel {
    outline: 2px solid var(--drd-accent);
  }
  .head {
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    padding: 0;
    min-height: 32px;
  }
  .radio {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.35rem 0;
  }
  .culture {
    margin: 0 0 0.5rem 1.6rem;
    color: var(--drd-muted);
  }
  fieldset {
    border: 1px solid var(--drd-muted);
    border-radius: var(--drd-radius);
  }
</style>
