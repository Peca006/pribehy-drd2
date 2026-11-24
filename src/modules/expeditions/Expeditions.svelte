<script lang="ts">
  import AdventureView from './AdventureView.svelte'
  import ExpeditionList from './ExpeditionList.svelte'
  import ExpeditionView from './ExpeditionView.svelte'
  import RunView from './RunView.svelte'

  // params: [] = přehled, ['dobrodruzstvi', id] = dobrodružství, ['vyprava', id] = příprava výpravy, ['vedeni', id] = vedení (Při hře)
  let { params }: { params: string[] } = $props()
</script>

{#if params[0] === 'dobrodruzstvi' && params[1]}
  {#key params[1]}<AdventureView id={params[1]} />{/key}
{:else if params[0] === 'vedeni' && params[1]}
  {#key params[1]}<RunView id={params[1]} />{/key}
{:else if params[0] === 'vyprava' && params[1]}
  {#key params[1]}<ExpeditionView id={params[1]} />{/key}
{:else}
  <ExpeditionList />
{/if}
