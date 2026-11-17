<script lang="ts">
  import CardHelp from './CardHelp.svelte'
  import { BASIC, SITUATIONS } from './guide'

  // Stručná připomínka postupu vyhodnocení (jen kroky). Hráči si hody řeší u sebe v aplikaci nebo na kostky.
  let open = $state<string>('zkouska')
</script>

<details class="guide">
  <summary>Postup vyhodnocení</summary>
  <div class="chips" role="group" aria-label="Situace">
    {#each BASIC as c}
      <button class:primary={open === c.id} onclick={() => (open = c.id)}>{c.title}</button>
    {/each}
    <button class:primary={open === 'slozite'} onclick={() => (open = 'slozite')}>Složitější</button>
  </div>
  {#each BASIC.filter((c) => c.id === open) as c (c.id)}
    <CardHelp card={c} />
  {/each}
  {#if open === 'slozite'}
    {#each SITUATIONS as c (c.id)}
      <details>
        <summary>{c.title}</summary>
        <CardHelp card={c} ordered={false} />
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
</style>
