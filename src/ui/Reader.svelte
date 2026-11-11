<script lang="ts">
  import type { ContentPack } from '../core/content/schema'
  import BlockView from './BlockView.svelte'

  let { pack, onback }: { pack: ContentPack; onback: () => void } = $props()
  const chapters = $derived(pack.chapters ?? [])
  let current = $state<string | undefined>(undefined)
  const chapter = $derived(chapters.find((c) => c.id === current))

  function follow(href: string) {
    const [id, anchor] = href.slice('chapter:'.length).split('#')
    if (!chapters.some((c) => c.id === id)) return
    current = id
    queueMicrotask(() =>
      (anchor ? document.getElementById(anchor) : document.body)?.scrollIntoView?.(),
    )
  }
</script>

<nav>
  <button onclick={() => (chapter ? (current = undefined) : onback())}>
    ← {chapter ? 'Kapitoly' : 'Knihovna'}
  </button>
</nav>
{#if chapter}
  <article>
    <h1>{chapter.title}</h1>
    <BlockView blocks={chapter.blocks} onlink={follow} />
  </article>
{:else}
  <h1>{pack.manifest.name}</h1>
  <ul class="chapters">
    {#each chapters as c}<li><button onclick={() => (current = c.id)}>{c.title}</button></li>{/each}
  </ul>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  button {
    font: inherit;
    color: var(--drd-text);
    background: var(--drd-surface);
    border: 1px solid var(--drd-muted);
    border-radius: var(--drd-radius);
    padding: 0.6rem 1rem;
    min-height: 44px;
  }
  .chapters {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .chapters button {
    width: 100%;
    text-align: left;
  }
  h1 {
    color: var(--drd-accent);
  }
</style>
