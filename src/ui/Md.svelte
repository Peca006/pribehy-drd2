<script lang="ts">
  // Text v mini-markdownu (odstavce, odrážky, zvýraznění, odkazy) – pro úryvky mimo kapitoly.
  import { parseInline } from '../core/markdown'
  import Inline from './Inline.svelte'

  let { text }: { text: string } = $props()
  const parts = $derived(
    text
      .split('\n\n')
      .filter(Boolean)
      .map((para) =>
        para.startsWith('- ')
          ? { list: para.split('\n').map((l) => l.replace(/^- /, '')) }
          : { p: para },
      ),
  )
</script>

{#each parts as part}
  {#if 'list' in part}
    <ul>
      {#each part.list as li}<li><Inline nodes={parseInline(li)} /></li>{/each}
    </ul>
  {:else}
    <p><Inline nodes={parseInline(part.p)} /></p>
  {/if}
{/each}
