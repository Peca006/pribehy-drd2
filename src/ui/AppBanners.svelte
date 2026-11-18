<script lang="ts">
  import { outdatedPacks } from '../core/content/builds'
  import { canDownload, download, downloads, loadCatalog, pending, sizeMb } from '../core/content/downloads.svelte'
  import { library } from '../core/library.svelte'
  import { applyUpdate, install, pwa } from '../core/pwa.svelte'

  // Pruhy nad navigací: nová verze ke stažení a nabídka instalace aplikace na plochu.
  let hideInstall = $state(false)
  let busy = $state(false)
  let hideOutdated = $state(false)
  const outdated = $derived(library.loaded ? outdatedPacks(library.packs) : [])

  // balíčky ze SRD ke stažení z webu aplikace: nabídka při prvním spuštění a aktualizace
  const PROMPT_KEY = 'drd2.packPromptDismissed'
  let hideFirst = $state(read())
  function read(): boolean {
    try {
      return localStorage.getItem(PROMPT_KEY) === '1'
    } catch {
      return false
    }
  }
  function later() {
    hideFirst = true
    try {
      localStorage.setItem(PROMPT_KEY, '1')
    } catch {
      /* bez úložiště se nabídka ukáže znovu při dalším spuštění */
    }
  }
  loadCatalog()
  const todo = $derived(pending())
  const have = (id: string) => library.packs.some((p) => p.manifest.id === id)
  const first = $derived(
    library.loaded && canDownload() && !hideFirst && (downloads.catalog ?? []).every((e) => !have(e.id)),
  )
  const updatable = $derived(library.loaded ? todo.filter((e) => have(e.id)) : [])
  let hideUpdate = $state(false)
  const showInstall = $derived(pwa.installable && !pwa.installed && !hideInstall)

  async function update() {
    busy = true
    await applyUpdate()
  }
</script>

{#if pwa.needRefresh && !pwa.updateDismissed}
  <div class="bar" role="status">
    <span>Je dostupná nová verze aplikace. Rozepsané úpravy zůstanou uložené.</span>
    <button class="primary" disabled={busy} onclick={update}>Obnovit</button>
    <button onclick={() => (pwa.updateDismissed = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if outdated.length && !hideOutdated}
  <div class="bar" role="status">
    <span>
      {outdated.length === 1 ? 'Balíček' : 'Balíčky'}
      {outdated.map((p) => `„${p.manifest.name}“`).join(', ')}
      {outdated.length === 1 ? 'je' : 'jsou'} ve starší podobě, než aplikace potřebuje.
    </span>
    {#if canDownload()}
      <button class="primary" disabled={downloads.busy} onclick={() => download()}>
        {downloads.busy ? `Stahuji… ${downloads.percent} %` : 'Aktualizovat'}
      </button>
    {:else}
      <a class="btn primary" href="#/knihovna">Více</a>
    {/if}
    <button onclick={() => (hideOutdated = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if updatable.length && !hideUpdate}
  <div class="bar" role="status">
    <span>Je dostupná novější verze balíčků: {updatable.map((e) => `„${e.name}“`).join(', ')}.</span>
    <button class="primary" disabled={downloads.busy} onclick={() => download()}>
      {downloads.busy ? `Stahuji… ${downloads.percent} %` : 'Aktualizovat'}
    </button>
    <button onclick={() => (hideUpdate = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if first}
  <div class="bar" role="status">
    <span>
      Pravidla a Bestiář se dají stáhnout do aplikace ({sizeMb(todo)} MB, pak fungují i offline).
    </span>
    <button class="primary" disabled={downloads.busy} onclick={() => download()}>
      {downloads.busy ? `Stahuji… ${downloads.percent} %` : 'Stáhnout'}
    </button>
    <button onclick={later} aria-label="Skrýt">Později</button>
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
