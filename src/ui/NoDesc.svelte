<script lang="ts">
  import { canDownload } from '../core/content/downloads.svelte'
  import { srdUrl } from '../core/srd'

  // Krátká poznámka u chybějícího popisu. Tlačítko Stáhnout je jen jedno na stránce (nahoře v Tvorbě postavy,
  // v Příručce, v Bestiáři), tady je jen odkaz do Více; bez dostupného katalogu (offline) i odkaz do SRD.
  let { srd }: { srd?: string } = $props()
</script>

<span class="muted nodesc">
  Popis chybí: <a href="#/knihovna">stáhnout balíček</a>
  {#if !canDownload() && srd}
    / <a href={srdUrl(srd)} target="_blank" rel="noopener noreferrer">čti pravidla v SRD</a>
  {/if}
</span>

<style>
  .nodesc {
    font-size: 0.85rem;
  }
</style>
