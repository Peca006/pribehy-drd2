<script lang="ts">
  // Krátká nápověda, když chybí popis: instalace balíčku, nebo pravidla v SRD.
  let { srd }: { srd?: string } = $props()
  const SRD_BASE = 'https://drd2srd.d20.cz/'
</script>

<span class="muted nodesc">
  <a href="#/knihovna">Instaluj balíček</a> /
  {#if srd}<a href={SRD_BASE + srd} target="_blank" rel="noopener noreferrer">čti pravidla</a
    >{:else}čti pravidla{/if}
</span>
