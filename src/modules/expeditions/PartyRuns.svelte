<script lang="ts">
  import { onMount } from 'svelte'
  import type { Expedition } from '../../core/expedition/model'
  import { beginRun, runRows, type RunRow } from '../../core/expedition/runs'
  import { listExpeditions } from '../../core/expedition/store'
  import { go } from '../../core/router.svelte'
  import RunList from './RunList.svelte'

  // Rozehrané výpravy družiny (jen u družiny, kterou vedete): přehled a zahájení další výpravy z přípravy.
  let { partyId }: { partyId: string } = $props()

  let rows = $state.raw<RunRow[]>([])
  let expeditions = $state.raw<Expedition[]>([])
  let chosen = $state('')
  let error = $state('')

  onMount(async () => {
    rows = await runRows((r) => r.partyId === partyId)
    expeditions = (await listExpeditions()).sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  })

  async function begin() {
    error = ''
    try {
      const run = await beginRun(chosen, partyId)
      go('vypravy', 'vedeni', run.id)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }
</script>

<h2>Výpravy družiny</h2>
<RunList {rows} empty="Družina zatím nevede žádnou výpravu." />
{#if expeditions.length}
  <div class="row">
    <select bind:value={chosen} aria-label="Výprava k zahájení">
      <option value="">Začít výpravu…</option>
      {#each expeditions as e}<option value={e.id}>{e.name}</option>{/each}
    </select>
    <button class="primary" disabled={!chosen} onclick={begin}>Začít</button>
  </div>
{:else}
  <p class="muted">Výpravy se připravují ve <a href="#/vypravy">Výpravách</a>.</p>
{/if}
{#if error}<p class="error" role="alert">{error}</p>{/if}

<style>
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .row select {
    flex: 1;
  }
</style>
