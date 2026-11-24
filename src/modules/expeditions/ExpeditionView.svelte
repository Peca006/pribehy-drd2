<script lang="ts">
  import { onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { normalize } from '../../core/expedition/deck'
  import { STYLES, type Adventure, type Expedition } from '../../core/expedition/model'
  import { getExpedition, listAdventures, removeExpedition, saveExpeditionIn } from '../../core/expedition/store'
  import { go } from '../../core/router.svelte'
  import ExpeditionRuns from './ExpeditionRuns.svelte'
  import IncidentsEditor from './IncidentsEditor.svelte'
  import NodesEditor from './NodesEditor.svelte'

  // Příprava výpravy: téma, pozadí, zápletka, cíl, styl, uzlové body, příhody v balíčcích a rozuzlení.
  let { id }: { id: string } = $props()

  let exp = $state<Expedition | undefined>(undefined)
  let adventureId = $state('')
  let adventures = $state.raw<Adventure[]>([])
  let loaded = $state(false)
  let message = $state('')

  onMount(async () => {
    const loadedExp = await getExpedition(id)
    exp = loadedExp && normalize(loadedExp)
    adventures = (await listAdventures()).sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    adventureId = exp?.adventureId ?? ''
    loaded = true
  })

  // každá změna pole se uloží po opuštění pole (událost `change` se šíří z polí na obal)
  // uložení jde jedno po druhém a výsledek se do stavu nevrací (zápis by přepsal, co se mezitím napsalo)
  let queue: Promise<unknown> = Promise.resolve()
  function save() {
    if (!exp) return
    const snapshot = $state.snapshot(exp) as Expedition
    const target = adventureId || undefined
    queue = queue.then(() => saveExpeditionIn(snapshot, target))
  }

  async function remove() {
    if (!exp) return
    if (
      !(await ask('Příprava výpravy včetně příhod se smaže. Nejde to vrátit.', {
        title: `Smazat výpravu „${exp.name}“?`,
        ok: 'Smazat',
      }))
    )
      return
    await queue
    const r = await removeExpedition(id)
    if (r.deleted) go('vypravy')
    else message = `Výprava má rozehraná vedení (${r.runs}), nejdřív je smažte u družin.`
  }
</script>

<nav>
  {#if exp?.adventureId}
    <a class="btn" href={'#/vypravy/dobrodruzstvi/' + exp.adventureId}><Arrow dir="left" /> Dobrodružství</a>
  {:else}
    <a class="btn" href="#/vypravy"><Arrow dir="left" /> Výpravy</a>
  {/if}
</nav>

{#if !exp}
  {#if loaded}<p class="muted">Výprava nenalezena. <a href="#/vypravy">Zpět na přehled</a></p>{/if}
{:else}
  <HelpHeading level={1} title="Příprava výpravy" topic="vypravy" />
  <div onchange={save} role="group" aria-label="Údaje výpravy">
    <label>Název <input bind:value={exp.name} /></label>
    <label>
      Dobrodružství
      <select bind:value={adventureId}>
        <option value="">(samostatná výprava)</option>
        {#each adventures as a}<option value={a.id}>{a.name}</option>{/each}
      </select>
    </label>
    <label>Téma <input bind:value={exp.theme} placeholder="např. cena bohatství" /></label>
    <label>
      Příběhové pozadí (tajné)
      <textarea rows="5" bind:value={exp.background}></textarea>
    </label>
    <label>
      Zápletka pro postavy
      <span class="muted">Proč se hrdinové na výpravu vydají: zisk, pomsta, slib, dluh…</span>
      <textarea rows="4" bind:value={exp.hook}></textarea>
    </label>
    <label>
      Cíl výpravy
      <input bind:value={exp.goal} placeholder="kam dojít, co získat, co vykonat" />
    </label>

    <fieldset>
      <legend>Styl přípravy</legend>
      {#each STYLES as s}
        <label class="radio">
          <input type="radio" name="styl" value={s.id} bind:group={exp.style} />
          <span><strong>{s.label}</strong><br /><span class="muted">{s.hint}</span></span>
        </label>
      {/each}
    </fieldset>

    <NodesEditor bind:exp onstructure={save} />
    <IncidentsEditor bind:exp onstructure={save} />

    <label>
      Možné rozuzlení
      <span class="muted">Není jediné možné, hráči mohou přijít s jiným.</span>
      <textarea rows="4" bind:value={exp.resolution}></textarea>
    </label>
    <label>Poznámky <textarea rows="3" bind:value={exp.notes}></textarea></label>
  </div>

  <ExpeditionRuns expeditionId={id} />

  <p><button onclick={remove}>Smazat výpravu</button></p>
  {#if message}<p role="alert" class="error">{message}</p>{/if}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  label {
    display: block;
    margin: 0.6rem 0;
  }
  label input,
  label textarea,
  label select {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  label .muted {
    display: block;
    font-size: 0.85rem;
  }
  fieldset {
    margin: 0.75rem 0;
    border: 1px solid var(--drd-border);
    border-radius: 0.5rem;
  }
  .radio {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }
  .radio input {
    display: inline-block;
    width: auto;
    min-height: 0;
  }
</style>
