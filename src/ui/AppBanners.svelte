<script lang="ts">
  import { outdatedPacks } from '../core/content/builds'
  import { canDownload, download, downloads, loadCatalog, pending, sizeMb } from '../core/content/downloads.svelte'
  import { packState } from '../core/content/packState'
  import { library } from '../core/library.svelte'
  import { applyUpdate, install, pwa } from '../core/pwa.svelte'
  import { nextBanner } from './banners'

  // Pruhy nad navigací (jeden najednou, pořadí podle priority v `banners.ts`): nová verze aplikace,
  // zastaralé / novější / první stažení balíčků ze SRD a nabídka instalace aplikace na plochu.
  const PROMPT_KEY = 'drd2.packPromptDismissed'
  const read = (): boolean => {
    try {
      return localStorage.getItem(PROMPT_KEY) === '1'
    } catch {
      return false
    }
  }
  let hideInstall = $state(false)
  let hideOutdated = $state(false)
  let hideUpdate = $state(false)
  let hideFirst = $state(read())
  let busy = $state(false)
  function later() {
    hideFirst = true
    try {
      localStorage.setItem(PROMPT_KEY, '1')
    } catch {
      /* bez úložiště se nabídka ukáže znovu při dalším spuštění */
    }
  }
  loadCatalog()

  const outdated = $derived(library.loaded ? outdatedPacks(library.packs) : [])
  const states = $derived(
    (downloads.catalog ?? []).map((e) => ({
      entry: e,
      state: packState(
        e,
        library.packs.find((p) => p.manifest.id === e.id),
      ),
    })),
  )
  const updatable = $derived(library.loaded ? states.filter((s) => s.state === 'update').map((s) => s.entry) : [])
  const first = $derived(
    library.loaded && canDownload() && states.length > 0 && states.every((s) => s.state === 'missing'),
  )
  const todo = $derived(pending())

  const kind = $derived(
    nextBanner({
      appUpdate: pwa.needRefresh && !pwa.updateDismissed,
      outdated: outdated.length > 0 && !hideOutdated,
      update: updatable.length > 0 && !hideUpdate,
      first: first && !hideFirst,
      install: pwa.installable && !pwa.installed && !hideInstall,
    }),
  )

  async function update() {
    busy = true
    await applyUpdate()
  }
</script>

{#if kind === 'app-update'}
  <div class="bar" role="status">
    <span>Je dostupná nová verze aplikace. Rozepsané úpravy zůstanou uložené.</span>
    <button class="primary" disabled={busy} onclick={update}>Obnovit</button>
    <button onclick={() => (pwa.updateDismissed = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if kind === 'packs-outdated'}
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
      <a class="btn primary" href="#/knihovna/dilna">Dílna</a>
    {/if}
    <button onclick={() => (hideOutdated = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if kind === 'packs-update'}
  <div class="bar" role="status">
    <span>Je dostupná novější verze balíčků: {updatable.map((e) => `„${e.name}“`).join(', ')}.</span>
    <button class="primary" disabled={downloads.busy} onclick={() => download()}>
      {downloads.busy ? `Stahuji… ${downloads.percent} %` : 'Aktualizovat'}
    </button>
    <button onclick={() => (hideUpdate = true)} aria-label="Skrýt">Později</button>
  </div>
{:else if kind === 'packs-first'}
  <div class="bar" role="status">
    <span>
      Pravidla a Bestiář se dají stáhnout do aplikace ({sizeMb(todo)} MB, pak fungují i offline).
    </span>
    <button class="primary" disabled={downloads.busy} onclick={() => download()}>
      {downloads.busy ? `Stahuji… ${downloads.percent} %` : 'Stáhnout'}
    </button>
    <button onclick={later} aria-label="Skrýt">Později</button>
  </div>
{:else if kind === 'install'}
  <div class="bar" role="status">
    <span>Aplikaci lze nainstalovat na plochu a používat jako běžnou aplikaci, i offline.</span>
    <button class="primary" onclick={install}>Nainstalovat</button>
    <button onclick={() => (hideInstall = true)} aria-label="Skrýt">✕</button>
  </div>
{/if}

<style>
  .bar {
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
