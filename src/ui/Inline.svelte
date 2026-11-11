<script lang="ts">
  import type { Inline } from '../core/markdown'
  import { isRef, openRef } from '../core/refs'
  import Self from './Inline.svelte'

  // odkazy na kapitoly a pojmy se otevírají samy (a tlačítko Zpět vrátí zpět); `onlink` je přepíše
  let { nodes, onlink = openRef }: { nodes: Inline[]; onlink?: (href: string) => void } = $props()
</script>

{#each nodes as n}
  {#if n.t === 'text'}{n.v}
  {:else if n.t === 'em'}<em><Self nodes={n.c} {onlink} /></em>
  {:else if n.t === 'strong'}<strong><Self nodes={n.c} {onlink} /></strong>
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
</style>
