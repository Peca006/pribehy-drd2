<script lang="ts">
  import { BASIC, linkOf, SITUATIONS } from './guide'

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
    <ol>{#each c.steps as s}<li>{s}</li>{/each}</ol>
    <p><a href={linkOf(c)}>V příručce →</a></p>
  {/each}
  {#if open === 'slozite'}
    {#each SITUATIONS as c (c.id)}
      <details>
        <summary>{c.title}</summary>
        <ul>{#each c.steps as s}<li>{s}</li>{/each}</ul>
        <p><a href={linkOf(c)}>V příručce →</a></p>
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
