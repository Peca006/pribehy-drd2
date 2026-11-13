<script lang="ts">
  // Text v mini-markdownu (odstavce, odrážky, zvýraznění, odkazy) – pro úryvky mimo kapitoly.
  import { parseInline } from '../core/markdown'
  import Inline from './Inline.svelte'
  import NoDesc from './NoDesc.svelte'

  // `hint`: u povinného textu (popis schopnosti, kultury, …) se při prázdném textu ukáže nápověda;
  // `srd` je cesta s kotvou do SRD, kam odkazuje slovo „pravidla“
  let { text, hint = false, srd }: { text: string; hint?: boolean; srd?: string } = $props()
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

{#if hint && !text.trim()}
  <p><NoDesc {srd} /></p>
{/if}

{#each parts as part}
  {#if 'list' in part}
    <ul>
      {#each part.list as li}<li><Inline nodes={parseInline(li)} /></li>{/each}
    </ul>
  {:else}
    <p><Inline nodes={parseInline(part.p)} /></p>
  {/if}
{/each}

<style>
  .nodesc {
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }
</style>
