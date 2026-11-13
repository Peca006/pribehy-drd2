<script lang="ts">
  import Md from '../../../ui/Md.svelte'
  import NoDesc from '../../../ui/NoDesc.svelte'
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
  <!-- klepnutí kamkoli do rasy (mimo odkazy a volby kultury) ji vybere -->
  <div
    class="panel"
    class:sel={r.id === draft.raceId}
    role="presentation"
    onclick={(e) => {
      if (!(e.target as HTMLElement).closest('a,input,label,fieldset')) pick(r.id)
    }}
  >
    <label class="head">
      <input type="radio" name="rasa" checked={r.id === draft.raceId} onchange={() => pick(r.id)} />
      <strong>{r.name}</strong>
      {#if !r.summary}<NoDesc srd={r.srd} />{/if}
    </label>
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
          {#if draft.cultureId === c.id}<div class="culture">
              <Md text={c.text} hint srd={c.srd} />
            </div>{/if}
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
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    min-height: 32px;
    cursor: pointer;
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
