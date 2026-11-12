<script lang="ts">
  import { applyUpdate, install, pwa } from '../core/pwa.svelte'

  // Pruhy nad navigací: nová verze ke stažení a nabídka instalace aplikace na plochu.
  let hideUpdate = $state(false)
  let hideInstall = $state(false)
  let busy = $state(false)
  const showInstall = $derived(pwa.installable && !pwa.installed && !hideInstall)

  async function update() {
    busy = true
    await applyUpdate()
  }
</script>

{#if pwa.needRefresh && !hideUpdate}
  <div class="bar" role="status">
    <span>Je dostupná nová verze aplikace. Rozepsané úpravy zůstanou uložené.</span>
    <button class="primary" disabled={busy} onclick={update}>Obnovit</button>
    <button onclick={() => (hideUpdate = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if showInstall}
  <div class="bar" role="status">
    <span>Aplikaci lze nainstalovat na plochu a používat jako běžnou aplikaci, i offline.</span>
    <button class="primary" onclick={install}>Nainstalovat</button>
    <button onclick={() => (hideInstall = true)} aria-label="Skrýt">✕</button>
  </div>
{/if}

<style>
  .bar {
    position: fixed;
    inset: auto 0 calc(56px + env(safe-area-inset-bottom)) 0;
    z-index: 50;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.6rem var(--drd-gap);
    background: var(--drd-surface);
    border-top: 2px solid var(--drd-accent);
  }
  .bar span {
    flex: 1 1 12rem;
    font-size: 0.9rem;
  }
</style>
