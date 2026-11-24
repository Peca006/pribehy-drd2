<script lang="ts">
  import { onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import {
    emptyExpedition,
    expeditionsOf,
    move,
    standalone,
    type Adventure,
    type Expedition,
  } from '../../core/expedition/model'
  import {
    getAdventure,
    listAdventures,
    listExpeditions,
    removeAdventure,
    removeAdventureNpc,
    saveAdventure,
    saveExpeditionIn,
  } from '../../core/expedition/store'
  import { go } from '../../core/router.svelte'
  import { usage } from '../../core/expedition/cast'
  import type { Npc } from '../../core/expedition/model'
  import NpcEditor from './NpcEditor.svelte'

  // Dobrodružství: lehký kontejner (téma, pozadí, poznámky) a výpravy v doporučeném pořadí.
  let { id }: { id: string } = $props()

  let adventure = $state<Adventure | undefined>(undefined)
  let loaded = $state(false)
  let all = $state.raw<Expedition[]>([])
  let others = $state.raw<Adventure[]>([])
  let adding = $state('')
  let newName = $state('')

  async function load() {
    adventure = await getAdventure(id)
    if (adventure) adventure.cast ??= []
    all = await listExpeditions()
    others = await listAdventures()
    loaded = true
  }
  onMount(load)

  const mine = $derived(adventure ? expeditionsOf(adventure, all) : [])
  const free = $derived(standalone(all, others))

  // uložení jde jedno po druhém (rychlé změny by si jinak mohly zápisy přeskočit)
  let queue: Promise<unknown> = Promise.resolve()
  function save() {
    if (!adventure) return
    const snapshot = $state.snapshot(adventure) as Adventure
    queue = queue.then(() => saveAdventure(snapshot))
    return queue
  }

  async function reorder(index: number, dir: -1 | 1) {
    if (!adventure) return
    adventure.expeditionIds = move(adventure.expeditionIds, index, dir)
    await save()
  }
  async function detach(e: Expedition) {
    await queue
    await saveExpeditionIn(e, undefined)
    await load()
  }
  async function attach() {
    const e = all.find((x) => x.id === adding)
    if (!e) return
    await queue
    await saveExpeditionIn(e, id)
    adding = ''
    await load()
  }
  async function create() {
    const e = emptyExpedition(newName.trim() || 'Nová výprava', id)
    await queue
    await saveExpeditionIn(e, id)
    go('vypravy', 'vyprava', e.id)
  }
  const npcUses = (npcId: string) => {
    const u = usage(npcId, mine)
    return u.expeditions ? `výprav: ${u.expeditions}, příhod: ${u.incidents}` : 'zatím v žádné výpravě'
  }
  async function removeNpc(npc: Npc) {
    if (!adventure) return
    const u = usage(npc.id, mine)
    const where = u.expeditions ? ` Odebere se i z výprav (${u.expeditions}) a z příhod (${u.incidents}); v příhodách zůstane jen jméno.` : ''
    if (!(await ask(`Cizí postava se smaže.${where}`, { title: `Smazat cizí postavu „${npc.name}“?`, ok: 'Smazat' }))) return
    await queue
    await removeAdventureNpc(id, npc.id)
    adventure.cast = (adventure.cast ?? []).filter((n) => n.id !== npc.id)
    all = await listExpeditions()
  }
  async function remove() {
    if (!adventure) return
    if (
      !(await ask('Dobrodružství se smaže, jeho výpravy zůstanou jako samostatné.', {
        title: `Smazat dobrodružství „${adventure.name}“?`,
        ok: 'Smazat',
      }))
    )
      return
    await queue
    await removeAdventure(id)
    go('vypravy')
  }
</script>

<nav><a class="btn" href="#/vypravy"><Arrow dir="left" /> Výpravy</a></nav>

{#if !adventure}
  {#if loaded}<p class="muted">Dobrodružství nenalezeno. <a href="#/vypravy">Zpět na přehled</a></p>{/if}
{:else}
  <HelpHeading level={1} title="Dobrodružství" topic="vypravy" />
  <div onchange={save} role="group" aria-label="Údaje dobrodružství">
    <label>Název <input bind:value={adventure.name} /></label>
    <label>Téma <input bind:value={adventure.theme} placeholder="např. cena bohatství, útisk jiných ras" /></label>
    <label>
      Příběhové pozadí (tajné)
      <textarea rows="5" bind:value={adventure.background}></textarea>
    </label>
    <label>
      Poznámky k propojení výprav
      <textarea rows="3" bind:value={adventure.notes}></textarea>
    </label>

    <h2>Cizí postavy</h2>
    <p class="muted">
      Postavy, které družina v dobrodružství potkává. Výprava si z nich vybírá, kdo v ní vystupuje, a příhody na ně odkazují. Jsou tajné, vidí je jen
      Průvodce.
    </p>
    {#if adventure.cast}
      <NpcEditor bind:npcs={adventure.cast} uses={npcUses} onsave={save} onremove={removeNpc} />
    {/if}
  </div>

  <h2>Výpravy</h2>
  <p class="muted">Doporučené pořadí. Družina si cestu a pořadí výprav stejně určí sama.</p>
  {#each mine as e, i (e.id)}
    <div class="panel exp">
      <a href={'#/vypravy/vyprava/' + e.id}><strong>{e.name}</strong></a>
      <span class="muted">příhod: {e.incidents.length}</span>
      <span class="btns">
        <button onclick={() => reorder(i, -1)} disabled={i === 0} aria-label={`Posunout výše: ${e.name}`}>↑</button>
        <button onclick={() => reorder(i, 1)} disabled={i === mine.length - 1} aria-label={`Posunout níže: ${e.name}`}>↓</button>
        <button onclick={() => detach(e)} aria-label={`Vyřadit z dobrodružství: ${e.name}`}>Vyřadit</button>
      </span>
    </div>
  {:else}
    <p class="muted">Zatím žádná výprava.</p>
  {/each}
  <div class="row">
    <input bind:value={newName} placeholder="Název nové výpravy" aria-label="Název nové výpravy" onkeydown={(e) => e.key === 'Enter' && create()} />
    <button class="primary" onclick={create}>Nová výprava</button>
  </div>
  {#if free.length}
    <div class="row">
      <select bind:value={adding} aria-label="Přidat existující výpravu">
        <option value="">Přidat existující výpravu…</option>
        {#each free as e}<option value={e.id}>{e.name}</option>{/each}
      </select>
      <button disabled={!adding} onclick={attach}>Přidat</button>
    </div>
  {/if}

  <p><button onclick={remove}>Smazat dobrodružství</button></p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  label {
    display: block;
    margin: 0.6rem 0;
  }
  div[role='group'] label input,
  div[role='group'] label textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .exp {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .btns {
    margin-left: auto;
    display: flex;
    gap: 0.25rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .row input,
  .row select {
    flex: 1;
  }
</style>
