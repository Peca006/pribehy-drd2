<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import { chapters, library, termIndex, terms } from '../../core/library.svelte'
  import { limitTermLinks } from '../../core/termLinks'
  import { back, go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import BlockView from '../../ui/BlockView.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'

  // params: [ID kapitoly, kotva?] – bez parametrů se ukáže seznam kapitol
  let { params }: { params: string[] } = $props()
  const chapter = $derived(chapters().find((c) => c.id === params[0]))
  const index = $derived(chapters().findIndex((c) => c.id === params[0]))
  const prev = $derived(index > 0 ? chapters()[index - 1] : undefined)
  const next = $derived(index >= 0 ? chapters()[index + 1] : undefined)
  let query = $state('')
  const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const shown = $derived(chapters().filter((c) => norm(c.title).includes(norm(query.trim()))))
  const hasCreatures = $derived(library.packs.some((p) => p.creatures?.length))
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
    <button onclick={back}><Arrow dir="left" /> Zpět</button>
    <button onclick={() => go('ctenar')}>Kapitoly</button>
    <LinkModeSelect />
  </nav>
  <article>
    <h1>{chapter.title}</h1>
    <BlockView {blocks} />
  </article>
  <nav class="pager">
    {#if prev}<a class="btn" href={'#/ctenar/' + prev.id}><Arrow dir="left" /> {prev.title}</a>{/if}
    {#if next}<a class="btn" href={'#/ctenar/' + next.id}>{next.title} <Arrow dir="right" /></a
      >{/if}
  </nav>
{:else}
  <h1>Příručka</h1>
  {#if chapters().length}
    <input
      type="search"
      placeholder="Hledat kapitolu…"
      bind:value={query}
      aria-label="Hledat kapitolu"
    />
    {#if hasCreatures}
      <p><a class="btn" href="#/bestiar">Bestiář <Arrow dir="right" /></a></p>
    {/if}
  {/if}
  <ul class="chapters">
    {#each shown as c}
      <li><a class="btn" href={'#/ctenar/' + c.id}>{c.title}</a></li>
    {:else}
      <p class="muted">
        {chapters().length
          ? 'Žádná kapitola neodpovídá hledání.'
          : 'Není nainstalována žádná příručka. Načtěte balíček v části Více.'}
      </p>
    {/each}
  </ul>
{/if}

<style>
  nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: var(--drd-gap);
  }
  .pager {
    justify-content: space-between;
    margin: var(--drd-gap) 0 0;
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
