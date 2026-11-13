<script lang="ts">
  import { chapters, termIndex, terms } from '../../core/library.svelte'
  import { limitTermLinks } from '../../core/termLinks'
  import { back, go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import BlockView from '../../ui/BlockView.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'

  // params: [ID kapitoly, kotva?] – bez parametrů se ukáže seznam kapitol
  let { params }: { params: string[] } = $props()
  const chapter = $derived(chapters().find((c) => c.id === params[0]))
  // počet odkazů z pojmů podle nastavení (výchozí: jen první výskyt v kapitole)
  const blocks = $derived.by(() => {
    if (!chapter) return []
    const home = new Map(
      terms().map((t) => {
        const m = /^chapter:([^#]+)(?:#(.+))?$/.exec(t.target)
        return [t.id, m ? { chapter: m[1], anchor: m[2] } : undefined] as const
      }),
    )
    return limitTermLinks(chapter.blocks, {
      mode: settings.termLinks,
      index: termIndex(),
      home: (id) => home.get(id),
      chapterId: chapter.id,
    })
  })

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
    <LinkModeSelect />
  </nav>
  <article>
    <h1>{chapter.title}</h1>
    <BlockView {blocks} />
  </article>
{:else}
  <h1>Příručka</h1>
  <ul class="chapters">
    {#each chapters() as c}
      <li><a class="btn" href={'#/ctenar/' + c.id}>{c.title}</a></li>
    {:else}
      <p class="muted">Není nainstalována žádná příručka. Načtěte balíček v části Více.</p>
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
