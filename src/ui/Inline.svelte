<script lang="ts">
  import type { Inline } from '../core/markdown'
  import { termIndex } from '../core/library.svelte'
  import { isRef, openRef } from '../core/refs'
  import Self from './Inline.svelte'

  // odkazy na kapitoly a pojmy se otevírají samy (a tlačítko Zpět vrátí zpět); `onlink` je přepíše
  let { nodes, onlink = openRef }: { nodes: Inline[]; onlink?: (href: string) => void } = $props()

  const plain = (ns: Inline[]): string =>
    ns.map((x) => (x.t === 'text' ? x.v : plain(x.c))).join('')
  const index = $derived(termIndex())
  const termId = (ns: Inline[]) => index.get(plain(ns).trim().toLowerCase())
</script>

{#each nodes as n}
  {#if n.t === 'text'}{n.v}
  {:else if n.t === 'em'}<em><Self nodes={n.c} {onlink} /></em>
  {:else if n.t === 'strong'}<strong><Self nodes={n.c} {onlink} /></strong>
  {:else if n.t === 'term' && !n.plain && termId(n.c)}<a
      class="term"
      href={'#/ctenar'}
      onclick={(e) => {
        e.preventDefault()
        openRef('term:' + termId(n.c))
      }}><strong><em><Self nodes={n.c} {onlink} /></em></strong></a
    >
  {:else if n.t === 'term'}<strong><em><Self nodes={n.c} {onlink} /></em></strong>
  {:else if n.t === 'link'}<a
      href={n.href}
      onclick={(e) => {
        if (isRef(n.href)) {
          e.preventDefault()
          onlink(n.href)
        }
      }}><Self nodes={n.c} {onlink} /></a
    >
  {/if}
{/each}

<style>
  a {
    color: var(--drd-accent);
  }
  a.term {
    color: inherit;
    text-decoration: underline dotted var(--drd-accent);
    text-underline-offset: 0.2em;
  }
</style>
