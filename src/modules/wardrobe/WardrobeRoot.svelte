<script lang="ts">
  import Svadlena from './Svadlena.svelte'
  import Wardrobe from './Wardrobe.svelte'

  // Šatník (`#/satnik`) a v něm Švadlena (`#/satnik/svadlena`, `#/satnik/svadlena/<id>`).
  let { params = [] }: { params?: string[] } = $props()
</script>

{#if params[0] === 'svadlena'}
  {#key params[1]}<Svadlena id={params[1]} />{/key}
{:else}
  <Wardrobe />
{/if}
