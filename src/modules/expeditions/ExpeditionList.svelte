<script lang="ts">
  import { onMount } from 'svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import {
    emptyAdventure,
    emptyExpedition,
    expeditionsOf,
    standalone,
    type Adventure,
    type Expedition,
  } from '../../core/expedition/model'
  import { listAdventures, listExpeditions, saveAdventure, saveExpedition } from '../../core/expedition/store'
  import { go } from '../../core/router.svelte'

  // Přehled příprav: dobrodružství s výpravami a výpravy bez dobrodružství.
  let adventures = $state.raw<Adventure[]>([])
  let expeditions = $state.raw<Expedition[]>([])
  let adventureName = $state('')
  let expeditionName = $state('')
  let loaded = $state(false)

  const load = async () => {
    adventures = (await listAdventures()).sort((a, b) => b.updated.localeCompare(a.updated))
    expeditions = await listExpeditions()
    loaded = true
  }
  onMount(load)

  const loose = $derived(standalone(expeditions, adventures).sort((a, b) => b.updated.localeCompare(a.updated)))

  async function newAdventure() {
    const a = emptyAdventure(adventureName.trim() || 'Nové dobrodružství')
    await saveAdventure(a)
    go('vypravy', 'dobrodruzstvi', a.id)
  }
  async function newExpedition() {
    const e = emptyExpedition(expeditionName.trim() || 'Nová výprava')
    await saveExpedition(e)
    go('vypravy', 'vyprava', e.id)
  }
</script>

<HelpHeading level={1} title="Výpravy" topic="vypravy" />
<p class="muted">
  Příprava pro Průvodce: dobrodružství sdružují výpravy, výprava má zápletku, uzlové body a příhody. Vše je jen vaše, hráčům se nic
  nesdílí.
</p>

<h2>Dobrodružství</h2>
{#each adventures as a (a.id)}
  <a class="btn panel row" href={'#/vypravy/dobrodruzstvi/' + a.id}>
    <strong>{a.name}</strong>
    <span class="muted">{a.theme ? a.theme + ' · ' : ''}výprav: {expeditionsOf(a, expeditions).length}</span>
  </a>
{:else}
  {#if loaded}<p class="muted">Zatím žádné dobrodružství.</p>{/if}
{/each}
<div class="new">
  <input
    bind:value={adventureName}
    placeholder="Název nového dobrodružství"
    aria-label="Název nového dobrodružství"
    onkeydown={(e) => e.key === 'Enter' && newAdventure()}
  />
  <button class="primary" onclick={newAdventure}>Nové dobrodružství</button>
</div>

<h2>Výpravy</h2>
<p class="muted">Výpravy bez dobrodružství. Výpravy v dobrodružstvích najdete u nich.</p>
{#each loose as e (e.id)}
  <a class="btn panel row" href={'#/vypravy/vyprava/' + e.id}>
    <strong>{e.name}</strong>
    <span class="muted">{e.theme ? e.theme + ' · ' : ''}příhod: {e.incidents.length}</span>
  </a>
{:else}
  {#if loaded}<p class="muted">Zatím žádná samostatná výprava.</p>{/if}
{/each}
<div class="new">
  <input
    bind:value={expeditionName}
    placeholder="Název nové výpravy"
    aria-label="Název nové výpravy"
    onkeydown={(e) => e.key === 'Enter' && newExpedition()}
  />
  <button class="primary" onclick={newExpedition}>Nová výprava</button>
</div>

<style>
  .row {
    display: flex;
    flex-direction: column;
    margin: 0.5rem 0;
  }
  .new {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .new input {
    flex: 1;
  }
</style>
