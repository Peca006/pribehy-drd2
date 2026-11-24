<script lang="ts">
  import { onMount } from 'svelte'
  import { addNpc, groupNames } from '../../core/expedition/cast'
  import type { Npc } from '../../core/expedition/model'
  import { allCreatures, bestiary, refreshBestiary } from '../bestiar/state.svelte'

  // Editor cizích postav (CP): jméno, vzhled a povaha, jednání a vztahy, vědomosti, motivace, skupina, bytost z Bestiáře.
  // Změny polí uloží nadřazený obal (událost `change` se šíří nahoru); přidání a odebrání volají `onsave` a `onremove`.
  let {
    npcs = $bindable(),
    uses,
    onsave,
    onremove,
  }: {
    npcs: Npc[]
    /** kde se postava používá (text za jménem), nepovinné */
    uses?: (id: string) => string
    onsave: () => void
    onremove: (npc: Npc) => void
  } = $props()

  let newName = $state('')
  const listId = 'skupiny-' + Math.random().toString(36).slice(2)
  const groups = $derived(groupNames(npcs))
  const creatures = $derived([...allCreatures()].sort((a, b) => a.name.localeCompare(b.name, 'cs')))

  onMount(() => {
    if (!bestiary.loaded) void refreshBestiary()
  })

  function add() {
    if (!newName.trim()) return
    npcs = addNpc(npcs, newName)
    newName = ''
    onsave()
  }
</script>

<datalist id={listId}>{#each groups as g}<option value={g}></option>{/each}</datalist>

{#each npcs as n (n.id)}
  <details class="panel">
    <summary>
      <strong>{n.name || '(bez jména)'}</strong>
      {#if n.group}<span class="badge">{n.group}</span>{/if}
      {#if n.motive}<span class="muted"> · {n.motive}</span>{/if}
      {#if uses}<span class="muted"> · {uses(n.id)}</span>{/if}
    </summary>
    <label>Jméno <input bind:value={n.name} aria-label={`Jméno: ${n.name}`} /></label>
    <label>
      Skupina
      <input bind:value={n.group} list={listId} placeholder="frakce, rod, cech…" aria-label={`Skupina: ${n.name}`} />
    </label>
    <label>
      Motivace
      <input bind:value={n.motive} placeholder="co chce a proč" aria-label={`Motivace: ${n.name}`} />
    </label>
    <label>Vzhled a povaha <textarea rows="2" bind:value={n.look}></textarea></label>
    <label>Jednání a vztahy <textarea rows="2" bind:value={n.conduct}></textarea></label>
    <label>Vědomosti <textarea rows="2" bind:value={n.knowledge}></textarea></label>
    {#if creatures.length}
      <label>
        Bytost z Bestiáře
        <select
          value={n.creatureId ?? ''}
          onchange={(e) => (n.creatureId = e.currentTarget.value || undefined)}
          aria-label={`Bytost z Bestiáře: ${n.name}`}
        >
          <option value="">(bez bytosti)</option>
          {#each creatures as c}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
    {/if}
    <label>Poznámky <textarea rows="2" bind:value={n.notes}></textarea></label>
    <p><button onclick={() => onremove(n)} aria-label={`Smazat cizí postavu ${n.name}`}>Smazat cizí postavu</button></p>
  </details>
{:else}
  <p class="muted">Zatím žádné cizí postavy.</p>
{/each}
<div class="row">
  <input
    bind:value={newName}
    placeholder="Jméno nové cizí postavy"
    aria-label="Jméno nové cizí postavy"
    onkeydown={(e) => e.key === 'Enter' && add()}
  />
  <button onclick={add}>Přidat cizí postavu</button>
</div>

<style>
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
  summary {
    cursor: pointer;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .row input {
    flex: 1;
  }
</style>
