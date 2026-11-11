<script lang="ts">
  import type { Block, ListItem } from '../core/content/schema'
  import { parseInline } from '../core/markdown'
  import Inline from './Inline.svelte'
  import Self from './BlockView.svelte'

  let { blocks, onlink }: { blocks: Block[]; onlink?: (href: string) => void } = $props()
</script>

{#snippet items(list: ListItem[])}
  <ul>
    {#each list as li}
      <li>
        {#each li.text.split('\n\n') as para}<p>
            <Inline nodes={parseInline(para)} {onlink} />
          </p>{/each}
        {#if li.items}{@render items(li.items)}{/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#each blocks as b}
  {#if b.type === 'heading'}
    {#if b.level === 2}<h2 id={b.id}>{b.text}</h2>
    {:else if b.level === 3}<h3 id={b.id}>{b.text}</h3>
    {:else}<h4 id={b.id}>{b.text}</h4>{/if}
  {:else if b.type === 'p'}
    <p><Inline nodes={parseInline(b.text)} {onlink} /></p>
  {:else if b.type === 'list'}
    {@render items(b.items)}
  {:else if b.type === 'quote'}
    <blockquote><Self blocks={b.blocks} {onlink} /></blockquote>
  {:else if b.type === 'card'}
    <aside class="card">
      {#if b.title}<p class="card-title">{b.title}</p>{/if}
      <Self blocks={b.blocks} {onlink} />
    </aside>
  {:else if b.type === 'table'}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            {#each b.header as h, i}<th style:text-align={b.align[i]}
                ><Inline nodes={parseInline(h)} /></th
              >{/each}
          </tr>
        </thead>
        <tbody>
          {#each b.rows as row}
            <tr>
              {#each row as cell, i}<td style:text-align={b.align[i]}
                  ><Inline nodes={parseInline(cell)} /></td
                >{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if b.type === 'image'}
    <p class="image-note">[obrázek: {b.alt}]</p>
  {:else if b.type === 'rule'}
    <hr />
  {/if}
{/each}

<style>
  blockquote {
    margin: 1rem 0;
    padding: 0.25rem 1rem;
    border-left: 4px solid var(--drd-accent);
    background: var(--drd-surface);
    border-radius: var(--drd-radius);
  }
  .card {
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: var(--drd-surface);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
  }
  .card-title {
    font-weight: 700;
    color: var(--drd-accent);
  }
  .table-wrap {
    overflow-x: auto;
    margin: 1rem 0;
  }
  table {
    border-collapse: collapse;
    min-width: 100%;
  }
  th,
  td {
    padding: 0.35rem 0.6rem;
    border-bottom: 1px solid var(--drd-muted);
  }
  .image-note {
    color: var(--drd-muted);
    font-style: italic;
  }
  h2,
  h3,
  h4 {
    color: var(--drd-accent);
  }
</style>
