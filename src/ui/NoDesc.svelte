<script lang="ts">
  import { canDownload } from '../core/content/downloads.svelte'
  import GetPacks from './GetPacks.svelte'

  // Krátká nápověda, když chybí popis: stažení balíčku; bez dostupného katalogu (offline) odkaz do SRD.
  let { srd }: { srd?: string } = $props()
  const SRD_BASE = 'https://drd2srd.d20.cz/'
</script>

<span class="muted nodesc">
  <GetPacks label="Stáhnout popisy" />
  {#if !canDownload() && srd}
    / <a href={SRD_BASE + srd} target="_blank" rel="noopener noreferrer">čti pravidla v SRD</a>
  {/if}
</span>
