<script lang="ts">
  import type { Creature } from '../../core/content/schema'
  import { blankCreature, newCreatureId } from '../../core/creatures/bundle'
  import { go } from '../../core/router.svelte'
  import { allCreatures, kinds, saveCreature } from './state.svelte'

  let { initial }: { initial?: Creature } = $props()

  // pracovní kopie (formulář pracuje s textovými poli, ukládá se až na konci)
  // svelte-ignore state_referenced_locally
  const src = initial ?? blankCreature()
  let name = $state(src.name)
  let kind = $state(src.kind)
  let chMin = $state(src.characteristic?.min?.toString() ?? '')
  let chMax = $state(src.characteristic?.max?.toString() ?? '')
  let chNote = $state(src.characteristic?.note ?? '')
  let fate = $state(src.fate?.toString() ?? '')
  let tel = $state(src.limits?.Tělo?.toString() ?? '')
  let dus = $state(src.limits?.Duše?.toString() ?? '')
  let vli = $state(src.limits?.Vliv?.toString() ?? '')
  let stats = $state(src.stats.map((s) => ({ ...s })))
  let description = $state(src.description)
  let sections = $state(src.sections.map((s) => ({ ...s })))
  let error = $state('')

  // číselná pole vrací číslo (Svelte u type=number), prázdné pole jako null/''
  const n = (v: unknown) =>
    v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v)

  async function save() {
    error = ''
    if (!name.trim()) {
      error = 'Zadejte název bytosti.'
      return
    }
    const c: Creature = {
      ...src,
      id:
        initial?.id && initial.source === 'user'
          ? initial.id
          : newCreatureId(
              name,
              allCreatures().map((x) => x.id),
            ),
      name: name.trim(),
      kind: kind || 'vlastni',
      stats: stats
        .filter((s) => s.label.trim())
        .map((s) => ({ label: s.label.trim(), value: s.value })),
      description,
      sections: sections.filter((s) => s.title.trim()).map((s) => ({ ...s, id: s.id || s.title })),
      source: 'user',
      ...(initial && initial.source !== 'user' ? { copiedFrom: initial.id } : {}),
    }
    const lo = n(chMin)
    const hi = n(chMax) ?? lo
    if (lo !== undefined && hi !== undefined)
      c.characteristic = { min: lo, max: hi, ...(chNote.trim() ? { note: chNote.trim() } : {}) }
    else delete c.characteristic
    if (n(fate) !== undefined) c.fate = n(fate)
    else delete c.fate
    const limits = { Tělo: n(tel), Duše: n(dus), Vliv: n(vli) }
    const set = Object.fromEntries(Object.entries(limits).filter(([, v]) => v !== undefined))
    if (Object.keys(set).length) c.limits = set
    else delete c.limits
    await saveCreature(c)
    go('bestiar', c.id)
  }
</script>

<h1>
  {initial?.source === 'user'
    ? 'Upravit bytost'
    : initial
      ? 'Vlastní kopie bytosti'
      : 'Nová bytost'}
</h1>
{#if initial && initial.source !== 'user'}
  <p class="muted">Vznikne vaše vlastní kopie; původní bytost z balíčku zůstane beze změny.</p>
{/if}

<label>Název <input type="text" bind:value={name} /></label>
<label>
  Druh
  <select bind:value={kind}>
    {#each kinds() as k}<option value={k.id}>{k.name}</option>{/each}
  </select>
</label>

<div class="grid">
  <label>Charakteristika od <input type="number" min="0" bind:value={chMin} /></label>
  <label>do <input type="number" min="0" bind:value={chMax} /></label>
  <label>Sudba <input type="number" min="0" bind:value={fate} /></label>
</div>
<label>Poznámka k charakteristice <input type="text" bind:value={chNote} /></label>
<div class="grid">
  <label>Hranice Tělo <input type="number" min="0" bind:value={tel} /></label>
  <label>Duše <input type="number" min="0" bind:value={dus} /></label>
  <label>Vliv <input type="number" min="0" bind:value={vli} /></label>
</div>

<h2>Další údaje</h2>
<p class="muted">
  Např. Talenty, Zvláštní schopnosti, Přirozené zbraně. Hodnota může obsahovat *kurzívu*.
</p>
{#each stats as s, i}
  <div class="row">
    <input type="text" placeholder="Název" bind:value={s.label} aria-label="Název údaje" />
    <input type="text" placeholder="Hodnota" bind:value={s.value} aria-label="Hodnota údaje" />
    <button aria-label="Odebrat údaj" onclick={() => stats.splice(i, 1)}>✕</button>
  </div>
{/each}
<button onclick={() => stats.push({ label: '', value: '' })}>+ Přidat údaj</button>

<h2>Popis</h2>
<textarea rows="5" bind:value={description} aria-label="Popis"></textarea>

<h2>Oddíly</h2>
{#each sections as s, i}
  <div class="panel">
    <div class="row">
      <input
        type="text"
        placeholder="Nadpis (např. Jak bojuje)"
        bind:value={s.title}
        aria-label="Nadpis oddílu"
      />
      <button aria-label="Odebrat oddíl" onclick={() => sections.splice(i, 1)}>✕</button>
    </div>
    <textarea rows="4" bind:value={s.text} aria-label="Text oddílu"></textarea>
  </div>
{/each}
<button onclick={() => sections.push({ id: '', title: '', text: '' })}>+ Přidat oddíl</button>

{#if error}<p class="error" role="alert">{error}</p>{/if}
<p class="actions">
  <button class="primary" onclick={save}>Uložit</button>
  <button onclick={() => history.back()}>Zrušit</button>
</p>

<style>
  label {
    display: block;
    margin: 0.5rem 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.5rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.4rem 0;
  }
  .row button {
    flex: none;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    margin: 1.5rem 0;
  }
</style>
