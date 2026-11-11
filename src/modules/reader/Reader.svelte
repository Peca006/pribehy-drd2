<script lang="ts">
  import { chapters } from '../../core/library.svelte'
  import { back, go } from '../../core/router.svelte'
  import BlockView from '../../ui/BlockView.svelte'

  // params: [ID kapitoly, kotva?] – bez parametrů se ukáže seznam kapitol
  let { params }: { params: string[] } = $props()
  const chapter = $derived(chapters().find((c) => c.id === params[0]))

  $effect(() => {
    const anchor = params[1]
    const id = chapter?.id
    if (!id) return
    queueMicrotask(() =>
      (anchor ? document.getElementById(anchor) : document.body)?.scrollIntoView?.(),
    )
  })
</script>

{#if chapter}
  <nav>
    <button onclick={back}>← Zpět</button> <button onclick={() => go('ctenar')}>Kapitoly</button>
  </nav>
  <article>
    <h1>{chapter.title}</h1>
    <BlockView blocks={chapter.blocks} />
  </article>
{:else}
  <h1>Příručka</h1>
  <ul class="chapters">
    {#each chapters() as c}
      <li><a class="btn" href={'#/ctenar/' + c.id}>{c.title}</a></li>
    {:else}
      <p class="muted">Není nainstalována žádná příručka. Načtěte balíček v Knihovně.</p>
    {/each}
  </ul>
{/if}

<style>
  nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: var(--drd-gap);
  }
  .chapters {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .chapters .btn {
    display: block;
  }
</style>
