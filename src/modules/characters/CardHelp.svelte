<script lang="ts">
  // Kroky karty postupu, související dovednosti (z balíčku, jinak odkaz do SRD) a odkaz do příručky nebo SRD.
  import { hasChapter, hasProfessions, professions } from '../../core/library.svelte'
  import GetPacks from '../../ui/GetPacks.svelte'
  import { chapterOf, linkOf, skillsOf, srdOf, type Card } from './guide'

  let { card, ordered = true }: { card: Card; ordered?: boolean } = $props()
  const found = $derived(card.skills?.length && hasProfessions() ? skillsOf(card, professions()) : [])
</script>

{#if ordered}
  <ol>{#each card.steps as s}<li>{s}</li>{/each}</ol>
{:else}
  <ul>{#each card.steps as s}<li>{s}</li>{/each}</ul>
{/if}
{#if card.skills?.length}
  <p class="muted">
    {#if found.length}
      Související dovednosti: {#each found as f, i}{#if i}{'; '}{/if}{f.name} ({f.profession}{f.attribute
          ? ', ' + f.attribute
          : ''}){/each}.
    {:else}
      Související dovednosti jsou v příručce povolání{#if srdOf(card)}
        (<a href={srdOf(card)} target="_blank" rel="noopener noreferrer">SRD</a>){/if}.
    {/if}
  </p>
{/if}
<p>
  {#if hasChapter(chapterOf(card))}<a href={linkOf(card)}>V příručce →</a>
  {:else}
    <GetPacks label="Stáhnout příručku" />
    {#if srdOf(card)}
      <a href={srdOf(card)} target="_blank" rel="noopener noreferrer">V SRD →</a>
    {/if}
  {/if}
</p>

<style>
  ol,
  ul {
    margin: 0.4rem 0;
    padding-left: 1.2rem;
  }
</style>
