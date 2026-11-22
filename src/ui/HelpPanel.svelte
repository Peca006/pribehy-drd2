<script lang="ts">
  // Panel nápovědy pod prvkem: úvod, kroky, související dovednosti (z balíčku, jinak odkaz do SRD) a odkaz do příručky nebo SRD.
  // Téma se bere z registru `core/help.ts`. Zobrazuje se tlačítkem `HelpButton`.
  import { hasChapter, hasProfessions, professions } from '../core/library.svelte'
  import { chapterOf, helpTopic, linkOf, skillsOf, srdOf } from '../core/help'
  import GetPacks from './GetPacks.svelte'

  let { topic, open = true, ordered = true }: { topic: string; open?: boolean; ordered?: boolean } = $props()
  const card = $derived(helpTopic(topic))
  const found = $derived(card?.skills?.length && hasProfessions() ? skillsOf(card, professions()) : [])
</script>

{#if open && card}
  <div class="help" role="region" aria-label={`Nápověda: ${card.title}`}>
    {#if card.text}<p>{card.text}</p>{/if}
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
    {#if card.link}
      <p>
        {#if hasChapter(chapterOf(card))}<a href={linkOf(card)}>V příručce →</a>
        {:else}
          <GetPacks label="Stáhnout příručku" />
          {#if srdOf(card)}
            <a href={srdOf(card)} target="_blank" rel="noopener noreferrer">V SRD →</a>
          {/if}
        {/if}
      </p>
    {/if}
  </div>
{/if}

<style>
  .help {
    border: 1px solid var(--drd-muted);
    border-radius: var(--drd-radius);
    padding: 0.25rem 0.75rem;
    margin: 0.4rem 0 0.5rem;
    font-size: 0.9rem;
  }
  .help p {
    margin: 0.35rem 0;
  }
  ol,
  ul {
    margin: 0.4rem 0;
    padding-left: 1.2rem;
  }
</style>
