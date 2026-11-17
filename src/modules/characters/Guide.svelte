<script lang="ts">
  import { hasRulesPack, professions } from '../../core/library.svelte'
  import { BASIC, linkOf, SITUATIONS, skillsOf, srdOf, type Card } from './guide'

  // Stručná připomínka postupu vyhodnocení (jen kroky). Hráči si hody řeší u sebe v aplikaci nebo na kostky.
  let open = $state<string>('zkouska')
</script>

{#snippet skills(c: Card)}
  {#if c.skills?.length}
    {@const found = hasRulesPack() ? skillsOf(c, professions()) : []}
    <p class="muted">
      {#if found.length}
        Související dovednosti: {#each found as f, i}{#if i}{'; '}{/if}{f.name} ({f.profession}{f.attribute
            ? ', ' + f.attribute
            : ''}){/each}.
      {:else}
        Související dovednosti jsou v příručce povolání{#if srdOf(c)}
          (<a href={srdOf(c)} target="_blank" rel="noopener noreferrer">SRD</a>){/if}.
      {/if}
    </p>
  {/if}
{/snippet}

{#snippet more(c: Card)}
  <p>
    {#if hasRulesPack()}<a href={linkOf(c)}>V příručce →</a>
    {:else if srdOf(c)}<a href={srdOf(c)} target="_blank" rel="noopener noreferrer">V SRD →</a>{/if}
  </p>
{/snippet}

<details class="guide">
  <summary>Postup vyhodnocení</summary>
  <div class="chips" role="group" aria-label="Situace">
    {#each BASIC as c}
      <button class:primary={open === c.id} onclick={() => (open = c.id)}>{c.title}</button>
    {/each}
    <button class:primary={open === 'slozite'} onclick={() => (open = 'slozite')}>Složitější</button>
  </div>
  {#each BASIC.filter((c) => c.id === open) as c (c.id)}
    <ol>{#each c.steps as s}<li>{s}</li>{/each}</ol>
    {@render skills(c)}
    {@render more(c)}
  {/each}
  {#if open === 'slozite'}
    {#each SITUATIONS as c (c.id)}
      <details>
        <summary>{c.title}</summary>
        <ul>{#each c.steps as s}<li>{s}</li>{/each}</ul>
        {@render more(c)}
      </details>
    {/each}
  {/if}
</details>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0 0;
  }
  .guide {
    margin-top: 0.75rem;
  }
  ol,
  ul {
    margin: 0.4rem 0;
    padding-left: 1.2rem;
  }
</style>
