<script lang="ts">
  import Dilna from './Dilna.svelte'
  import HelpPage from './HelpPage.svelte'
  import Sluj from './Sluj.svelte'

  // Sluj (`#/knihovna`): rozcestník ke čtení a hledání. `#/knihovna/dilna` je Dílna (nastavení a data),
  // `#/knihovna/napoveda` stránka Nápověda. Technické `id` modulu zůstává `knihovna` (adresy, uložená lišta, ikony Hávů).
  let { params = [] }: { params?: string[] } = $props()
</script>

{#if params[0] === 'napoveda'}
  <HelpPage />
{:else if params[0] === 'dilna'}
  <Dilna />
{:else}
  <Sluj />
{/if}
