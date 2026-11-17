<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import {
    books,
    chapters,
    creatureKinds,
    library,
    packCreatures,
    termIndex,
    terms,
  } from '../../core/library.svelte'
  import { limitTermLinks } from '../../core/termLinks'
  import { back, go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import BlockView from '../../ui/BlockView.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'

  // params: [ID kapitoly, kotva?] – bez parametrů se ukáže seznam kapitol
  let { params }: { params: string[] } = $props()
  const chapter = $derived(chapters().find((c) => c.id === params[0]))
  // předchozí a další kapitola jen v rámci stejné knihy
  const siblings = $derived(books().find((b) => b.chapters.some((c) => c.id === params[0]))?.chapters ?? [])
  const index = $derived(siblings.findIndex((c) => c.id === params[0]))
  const prev = $derived(index > 0 ? siblings[index - 1] : undefined)
  const next = $derived(index >= 0 ? siblings[index + 1] : undefined)
  let query = $state('')
  const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const shown = $derived(
    books()
      .map((b) => ({ ...b, chapters: b.chapters.filter((c) => norm(c.title).includes(norm(query.trim()))) }))
      .filter((b) => b.chapters.length),
  )
  const kindLink = $derived(
    chapter?.kind
      ? {
          id: chapter.kind,
          name: creatureKinds().find((k) => k.id === chapter.kind)?.name ?? chapter.kind,
          count: packCreatures().filter((c) => c.kind === chapter.kind).length,
        }
      : undefined,
  )
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
  {#if kindLink}
    <p>
      <a class="btn primary" href={'#/bestiar/druh/' + kindLink.id}
        >{kindLink.name} v Bestiáři ({kindLink.count}) <Arrow dir="right" /></a
      >
    </p>
  {/if}
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
  {#each shown as book (book.id)}
    <section class="book">
      <h2>{book.name}</h2>
      <ul class="chapters">
        {#each book.chapters as c}
          <li><a class="btn" href={'#/ctenar/' + c.id}>{c.title}</a></li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="muted">
      {chapters().length
        ? 'Žádná kapitola neodpovídá hledání.'
        : 'Není nainstalována žádná příručka. Načtěte balíček v části Více.'}
    </p>
  {/each}
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
  .book h2 {
    font-size: 1.1rem;
    margin: 1.25rem 0 0.5rem;
  }
  .chapters .btn {
    display: block;
  }
</style>
