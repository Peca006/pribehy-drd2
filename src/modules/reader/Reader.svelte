<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import GetPacks from '../../ui/GetPacks.svelte'
  import {
    books,
    chapters,
    creatureKinds,
    library,
    packCreatures,
    professionBooks,
    termIndex,
    terms,
  } from '../../core/library.svelte'
  import { limitTermLinks } from '../../core/termLinks'
  import { back, go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import BlockView from '../../ui/BlockView.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
  import { shortBookName } from '../../core/books'
  import { buildIndex, search } from '../../core/search'
  import { readerSearch } from './state.svelte'
  import Rejstrik from './Rejstrik.svelte'
  import ProfessionView from './ProfessionView.svelte'

  // params: [ID kapitoly, kotva?] – bez parametrů se ukáže seznam kapitol
  let { params }: { params: string[] } = $props()
  const chapter = $derived(chapters().find((c) => c.id === params[0]))
  // předchozí a další kapitola jen v rámci stejné knihy
  const siblings = $derived(books().find((b) => b.chapters.some((c) => c.id === params[0]))?.chapters ?? [])
  const index = $derived(siblings.findIndex((c) => c.id === params[0]))
  const prev = $derived(index > 0 ? siblings[index - 1] : undefined)
  const next = $derived(index >= 0 ? siblings[index + 1] : undefined)
  const searchIndex = $derived(buildIndex(library.packs))
  const hits = $derived(search(searchIndex, readerSearch.query))
  const searching = $derived(readerSearch.query.trim().length >= 2)
  const KIND_LABEL = { kapitola: 'Kapitola', bytost: 'Bytost', pojem: 'Pojem' }
  const kindLink = $derived(
    chapter?.kind
      ? {
          id: chapter.kind,
          name: creatureKinds().find((k) => k.id === chapter.kind)?.name ?? chapter.kind,
          count: packCreatures().filter((c) => c.kind === chapter.kind).length,
        }
      : undefined,
  )
  // rozcestník: tlačítko pro každou sekci kromě první (ta je hned nahoře); posune stránku na nadpis sekce
  const sections = $derived([
    ...books().map((b) => ({ id: b.id, name: shortBookName(b.name) })),
    ...professionBooks().map((b) => ({ id: b.id, name: shortBookName(b.name) })),
  ])
  const jump = (id: string) =>
    document.getElementById('kniha-' + id)?.scrollIntoView({ block: 'start' })
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

{#if params[0] === 'rejstrik'}
  <Rejstrik />
{:else if params[0] === 'povolani'}
  <ProfessionView id={params[1] ?? ''} />
{:else if chapter}
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
  {#if chapters().length || professionBooks().length}
    <input
      type="search"
      placeholder="Hledat v knihách…"
      bind:value={readerSearch.query}
      aria-label="Hledat v knihách"
    />
    <p class="actions">
      <a class="btn" href="#/ctenar/rejstrik">Rejstřík <Arrow dir="right" /></a>
      {#if !searching}
        {#each sections.slice(1) as sec (sec.id)}
          <button onclick={() => jump(sec.id)}>{sec.name} <Arrow dir="down" /></button>
        {/each}
      {/if}
    </p>
  {/if}
  {#if searching}
    <p class="muted">
      {hits.length ? `Nalezeno: ${hits.length}${hits.length >= 60 ? '+' : ''}` : 'Nic nenalezeno.'}
    </p>
    <ul class="results">
      {#each hits as h (h.entry.href + h.entry.title)}
        <li>
          <a class="btn panel" href={h.entry.href}>
            <strong>{h.entry.title}</strong>
            <span class="muted where">{KIND_LABEL[h.entry.kind]} · {h.entry.where}</span>
            {#if h.snippet.length}
              <span class="snippet"
                >{#each h.snippet as part}{#if part.hit}<mark>{part.t}</mark>{:else}{part.t}{/if}{/each}</span
              >
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    {#each books() as book (book.id)}
      <section class="book">
        <h2 id={'kniha-' + book.id}>{book.name}</h2>
        <ul class="chapters">
          {#each book.chapters as c (c.id)}
            <li><a class="btn" href={'#/ctenar/' + c.id}>{c.title}</a></li>
          {/each}
        </ul>
      </section>
    {:else}
      {#if !professionBooks().length}
        <p class="muted">
          Není nainstalována žádná příručka. <GetPacks label="Stáhnout pravidla a Bestiář" />
        </p>
      {/if}
    {/each}
    {#each professionBooks() as book (book.id)}
      <section class="book">
        <h2 id={'kniha-' + book.id}>{book.name}</h2>
        <ul class="chapters">
          {#each book.professions as p (p.id)}
            <li><a class="btn" href={'#/ctenar/povolani/' + encodeURIComponent(p.id)}>{p.name}</a></li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
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
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .results {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .results a {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .where {
    font-size: 0.8rem;
  }
  .snippet {
    font-size: 0.9rem;
    font-weight: normal;
  }
  mark {
    background: color-mix(in srgb, var(--drd-accent) 35%, transparent);
    color: inherit;
    border-radius: 2px;
  }
  .chapters .btn {
    display: block;
  }
</style>
