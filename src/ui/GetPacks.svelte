<script lang="ts">
  import { canDownload, download, downloads, loadCatalog, pending, sizeMb } from '../core/content/downloads.svelte'

  // Tlačítko „Stáhnout pravidla a Bestiář“ pro místa, kde balíček chybí. Když katalog není dostupný
  // (offline, vývoj bez balíčků), ukáže odkaz do Více, kde jde balíček načíst ze souboru.
  let { label = 'Stáhnout pravidla a Bestiář' }: { label?: string } = $props()
  loadCatalog()
  const todo = $derived(pending())
</script>

{#if canDownload() && todo.length}
  <button class="primary" disabled={downloads.busy} onclick={() => download()}>
    {downloads.busy ? 'Stahuji…' : `${label} (${sizeMb(todo)} MB)`}
  </button>
  {#if downloads.error}<span class="error" role="alert">{downloads.error}</span>{/if}
{:else if !canDownload()}
  <a href="#/knihovna">Načíst balíček (Více)</a>
{/if}
