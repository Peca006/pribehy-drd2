<script lang="ts">
  import { onMount } from 'svelte'
  import {
    addCast,
    addIncident,
    decks,
    moveIncident,
    removeCast,
    removeIncident,
    setStage,
    stageLabels,
  } from '../../core/expedition/deck'
  import { castNpc, resolveCast } from '../../core/expedition/cast'
  import { UNIT_LABEL, UNIT_ORDER } from '../../core/character/cash'
  import { LOOT_KINDS, emptyLoot } from '../../core/expedition/loot'
  import type { Expedition, Incident, LootKind, Npc } from '../../core/expedition/model'
  import { allCreatures, bestiary, refreshBestiary } from '../bestiar/state.svelte'

  // Příhody výpravy v balíčcích podle uzlových bodů. Příhoda má víc vyústění: neúspěch příběh rozvíjí, nikdy nezastaví.
  let { exp = $bindable(), npcs = [], onstructure }: { exp: Expedition; npcs?: Npc[]; onstructure: () => void } = $props()

  // nově přidané příhody se při vzniku rozbalí a už se samy nezavírají (neřízená množina: čte se jen při vykreslení)
  const opened = new Set<string>()
  let castName = $state<Record<string, string>>({})

  onMount(() => {
    if (!bestiary.loaded) void refreshBestiary()
  })

  const snap = () => $state.snapshot(exp) as Expedition
  const labels = $derived(stageLabels(exp))
  const decksOf = $derived(decks(exp))
  const creatures = $derived([...allCreatures()].sort((a, b) => a.name.localeCompare(b.name, 'cs')))

  function apply(next: Expedition) {
    exp = next
    onstructure()
  }
  function add(stage: string) {
    const r = addIncident(snap(), stage)
    opened.add(r.incident.id)
    apply(r.expedition)
  }
  function patch(id: string, fn: (i: Incident) => Incident) {
    exp.incidents = exp.incidents.map((i) => (i.id === id ? fn($state.snapshot(i) as Incident) : i))
    onstructure()
  }
  function pushCast(i: Incident, name: string, creatureId?: string) {
    patch(i.id, (x) => addCast(x, name, creatureId))
    castName[i.id] = ''
  }
  function addLoot(i: Incident) {
    patch(i.id, (x) => ({ ...x, loot: [...(x.loot ?? []), emptyLoot()] }))
  }
  function removeLoot(i: Incident, lootId: string) {
    patch(i.id, (x) => ({ ...x, loot: (x.loot ?? []).filter((l) => l.id !== lootId) }))
  }
  /** změna druhu kořisti: zbytek hodnot se nastaví podle nového druhu (ID zůstane) */
  function changeKind(i: Incident, lootId: string, kind: LootKind) {
    patch(i.id, (x) => ({
      ...x,
      loot: (x.loot ?? []).map((l) => (l.id === lootId ? { ...emptyLoot(kind), id: l.id } : l)),
    }))
  }
  function pickNpc(i: Incident, id: string) {
    const n = npcs.find((x) => x.id === id)
    if (n) patch(i.id, (x) => castNpc(x, n))
  }
  function pickCreature(i: Incident, id: string) {
    const c = creatures.find((x) => x.id === id)
    if (c) pushCast(i, c.name, c.id)
  }
</script>

<h2>Příhody</h2>
<p class="muted">
  Příhoda je jedno setkání, vyjednávání nebo překážka. Připravte u ní, co se stane při úspěchu a při neúspěchu: neúspěch má příběh rozvinout, ne
  zastavit. Příhody v balíčku „Kdykoli“ použijete, když se hra zadrhne.
</p>

{#each decksOf as d (d.key)}
  <h3>{d.title} <span class="muted">({d.incidents.length})</span></h3>
  {#each d.incidents as i, idx (i.id)}
    <details class="panel incident" open={opened.has(i.id)}>
      <summary><strong>{i.title || '(bez názvu)'}</strong>{#if i.cast.length}<span class="muted"> · {resolveCast(i, npcs).map((c) => c.name).join(', ')}</span>{/if}</summary>
      <label>Název <input bind:value={i.title} aria-label="Název příhody" /></label>
      <label>
        Co se děje
        <textarea rows="4" bind:value={i.text}></textarea>
      </label>
      {#if exp.style === 'puzzle'}
        <label>Místo <input bind:value={i.place} placeholder="kde se příhoda odehrává" /></label>
      {/if}
      <label>
        Předpoklady
        <input bind:value={i.conditions} placeholder="kdy ji lze uvést (např. po návštěvě hostince)" />
      </label>
      <label>
        Když hrdinové uspějí
        <textarea rows="2" bind:value={i.ifSuccess}></textarea>
      </label>
      <label>
        Když neuspějí
        <textarea rows="2" bind:value={i.ifFailure}></textarea>
      </label>

      <fieldset>
        <legend>Cizí postavy a protivníci</legend>
        {#each resolveCast(i, npcs) as c, ci}
          <span class="chip">{c.name}{#if c.npc} <span class="muted">(CP)</span>{/if}{#if c.creatureId} <span class="muted">(Bestiář)</span>{/if}
            <button onclick={() => patch(i.id, (x) => removeCast(x, ci))} aria-label={`Odebrat ${c.name}`}>✕</button></span>
        {/each}
        <div class="row">
          <input
            bind:value={castName[i.id]}
            placeholder="Jméno cizí postavy"
            aria-label="Jméno cizí postavy"
            onkeydown={(e) => e.key === 'Enter' && pushCast(i, castName[i.id] ?? '')}
          />
          <button onclick={() => pushCast(i, castName[i.id] ?? '')}>Přidat</button>
        </div>
        {#if npcs.some((n) => !i.cast.some((c) => c.npcId === n.id))}
          <select value="" onchange={(e) => { pickNpc(i, e.currentTarget.value); e.currentTarget.value = '' }} aria-label="Přidat cizí postavu z přípravy">
            <option value="">Přidat cizí postavu z přípravy…</option>
            {#each npcs.filter((n) => !i.cast.some((c) => c.npcId === n.id)) as n}<option value={n.id}>{n.name}</option>{/each}
          </select>
        {/if}
        {#if creatures.length}
          <select value="" onchange={(e) => { pickCreature(i, e.currentTarget.value); e.currentTarget.value = '' }} aria-label="Přidat bytost z Bestiáře">
            <option value="">Přidat bytost z Bestiáře…</option>
            {#each creatures as c}<option value={c.id}>{c.name}</option>{/each}
          </select>
        {/if}
      </fieldset>

      <fieldset>
        <legend>Kořist</legend>
        {#each i.loot ?? [] as l (l.id)}
          <div class="loot">
            <select value={l.kind} onchange={(e) => changeKind(i, l.id, e.currentTarget.value as LootKind)} aria-label="Druh kořisti">
              {#each LOOT_KINDS as k}<option value={k.id}>{k.label}</option>{/each}
            </select>
            {#if l.kind === 'penize' || l.kind === 'suroviny'}
              <input type="number" min="1" bind:value={l.amount} aria-label="Množství kořisti" class="narrow" />
            {/if}
            {#if l.kind === 'penize'}
              <select bind:value={l.unit} aria-label="Jednotka">
                {#each UNIT_ORDER as u}<option value={u}>{UNIT_LABEL[u]}</option>{/each}
              </select>
            {/if}
            {#if l.kind === 'suroviny'}<input bind:value={l.mark} maxlength="4" placeholder="značka" aria-label="Značka druhu Surovin" class="narrow" />{/if}
            <input
              bind:value={l.label}
              placeholder={l.kind === 'penize' ? 'odkud (nepovinné)' : l.kind === 'suroviny' ? 'název druhu (nepovinné)' : l.kind === 'vybava' ? 'položka' : 'název trofeje'}
              aria-label="Popis kořisti"
            />
            <input
              bind:value={l.note}
              placeholder={l.kind === 'trofej' ? 'poznámka' : 'poznámka pro Průvodce (podmínky, kde platí…)'}
              aria-label="Poznámka ke kořisti"
            />
            <button onclick={() => removeLoot(i, l.id)} aria-label="Odebrat kořist">✕</button>
          </div>
        {/each}
        <button onclick={() => addLoot(i)} aria-label={`Přidat kořist k příhodě ${i.title}`}>Přidat kořist</button>
      </fieldset>

      <label>
        Balíček
        <select value={i.stage} onchange={(e) => apply(setStage(snap(), i.id, e.currentTarget.value))}>
          {#each labels as l}<option value={l.key}>{l.label}</option>{/each}
        </select>
      </label>
      <p class="btns">
        <button onclick={() => apply(moveIncident(snap(), i.id, -1))} disabled={idx === 0} aria-label={`Posunout výše: ${i.title}`}>↑</button>
        <button
          onclick={() => apply(moveIncident(snap(), i.id, 1))}
          disabled={idx === d.incidents.length - 1}
          aria-label={`Posunout níže: ${i.title}`}>↓</button
        >
        <button onclick={() => apply(removeIncident(snap(), i.id))} aria-label={`Smazat příhodu ${i.title}`}>Smazat</button>
      </p>
    </details>
  {:else}
    <p class="muted">Zatím žádná příhoda.</p>
  {/each}
  <p><button onclick={() => add(d.key)} aria-label={`Přidat příhodu: ${d.title}`}>Přidat příhodu</button></p>
{/each}

<style>
  label {
    display: block;
    margin: 0.5rem 0;
  }
  label input,
  label textarea,
  label select {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  fieldset {
    margin: 0.75rem 0;
    border: 1px solid var(--drd-border);
    border-radius: 0.5rem;
  }
  .chip {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    margin: 0 0.35rem 0.35rem 0;
    padding: 0.1rem 0.6rem;
    border: 1px solid var(--drd-border);
    border-radius: 1rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.35rem 0;
  }
  .row input {
    flex: 1;
    display: block;
    width: auto;
  }
  .loot {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
    margin: 0.35rem 0;
  }
  .loot input {
    flex: 1 1 8rem;
    display: block;
    width: auto;
  }
  .loot .narrow {
    flex: 0 0 5rem;
  }
  .btns {
    display: flex;
    gap: 0.25rem;
  }
</style>
