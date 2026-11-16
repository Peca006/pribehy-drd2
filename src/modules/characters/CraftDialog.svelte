<script lang="ts">
  import { untrack } from 'svelte'
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import type { Attribute } from '../../core/content/schema'
  import { MAX_SCAR_TEXT } from '../../core/character/potions'
  import {
    applyCraft,
    autoAlloc,
    checkCraft,
    craftNote,
    MAX_SEVERITY,
    sources,
    suggestCost,
    type Alloc,
    type CraftKind,
    type CraftResult,
  } from '../../core/character/crafting'
  import { kindLabel, kindsOf } from '../../core/character/rawMaterials'

  // Výroba a opravy: cena v Surovinách (návrh podle pravidel, jde přepsat), odečet po druzích Surovin a výsledek.
  // Mezi výpravami se výroba vyhodnocuje bez hodu (spotřebují se jen Suroviny); na výpravě hodíte zkoušku v panelu Hod
  // a tady zapíšete, jak dopadla (neúspěch zpravidla znamená propadlé Suroviny, přerušení nic).
  let {
    character,
    onsave,
    onclose,
  }: {
    character: Character
    onsave: (next: Character, note: string) => void | Promise<void>
    onclose: () => void
  } = $props()

  let kind = $state<CraftKind>('vyroba')
  let name = $state('')
  let price = $state(2) // cena předmětu v groších
  let severity = $state(1)
  let potAttr = $state<Attribute>('Tělo')
  let potScar = $state('')
  let cost = $state(1)
  let alloc = $state<Alloc>({})
  let onTrip = $state(false)
  let result = $state<CraftResult>('uspech')
  let addToEquipment = $state(true)
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  const src = $derived(sources(character))
  const hasKinds = $derived(kindsOf(character).length > 0)
  const labels = $derived<Record<string, string>>({
    '': 'bez druhu',
    ...Object.fromEntries(kindsOf(character).map(({ id, kind }) => [id, kindLabel(kind)])),
  })
  const input = $derived({
    kind,
    name,
    cost,
    alloc,
    result: onTrip ? result : ('uspech' as CraftResult),
    addToEquipment,
    potion: kind === 'lektvar' ? { attribute: potAttr, scar: potScar } : undefined,
  })
  const check = $derived(checkCraft(character, input))
  const free = $derived(kind === 'nouzovy' || (onTrip && result === 'preruseno'))

  /** Po změně druhu, ceny nebo závažnosti se cena i rozdělení navrhnou znovu (hráč je pak může upravit). */
  function suggest() {
    cost = suggestCost(kind, price, severity)
    alloc = untrack(() => autoAlloc(character, cost))
  }
  const setKind = (k: CraftKind) => {
    kind = k
    addToEquipment = k === 'vyroba' || k === 'nouzovy'
    suggest()
  }
  const setPrice = (n: number) => ((price = clamp(n, 0, 999)), suggest())
  const setSeverity = (n: number) => ((severity = clamp(n, 1, MAX_SEVERITY)), suggest())
  const setCost = (n: number) => {
    cost = clamp(n, 0, 9999)
    alloc = autoAlloc(character, cost)
  }
  const setAlloc = (key: string, n: number) => {
    const have = src.find((s) => s.key === key)?.have ?? 0
    alloc = { ...alloc, [key]: clamp(n, 0, have) }
  }

  // výchozí cena nově otevřeného dialogu
  untrack(suggest)

  function save() {
    if (check.error) return
    const next = applyCraft(character, input)
    void onsave(next, craftNote(character, input, (k) => labels[k] ?? k))
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Výroba a opravy">
  <h2>Výroba a opravy</h2>
  <div class="seg" role="group" aria-label="Druh">
    <button class:primary={kind === 'vyroba'} onclick={() => setKind('vyroba')}>Výroba</button>
    <button class:primary={kind === 'oprava'} onclick={() => setKind('oprava')}>Oprava</button>
    <button class:primary={kind === 'lektvar'} onclick={() => setKind('lektvar')}>Lektvar</button>
    <button class:primary={kind === 'nouzovy'} onclick={() => setKind('nouzovy')}>Nouzový předmět</button>
  </div>
  {#if kind === 'lektvar'}
    <div class="seg" role="group" aria-label="Vlastnost lektvaru">
      {#each ATTRIBUTES as a}
        <button class:primary={potAttr === a} onclick={() => (potAttr = a)}>{a}</button>
      {/each}
    </div>
    <input
      type="text"
      bind:value={potScar}
      maxlength={MAX_SCAR_TEXT}
      placeholder="Na jakou Jizvu (popálenina, fobie…)"
      aria-label="Druh Jizvy"
    />
  {:else}
    <input
      type="text"
      bind:value={name}
      maxlength="200"
      placeholder={kind === 'oprava' ? 'Co se opravuje (nepovinné)' : 'Název předmětu'}
      aria-label="Název předmětu"
    />
  {/if}

  {#if kind === 'vyroba'}
    <div class="row">
      <span>Cena předmětu (groše)</span>
      <button onclick={() => setPrice(price - 1)} disabled={price <= 0} aria-label="Levnější">−</button>
      <strong>{price}</strong>
      <button onclick={() => setPrice(price + 1)} aria-label="Dražší">+</button>
    </div>
  {:else if kind === 'oprava'}
    <div class="row">
      <span>Závažnost poškození</span>
      <button onclick={() => setSeverity(severity - 1)} disabled={severity <= 1} aria-label="Menší">−</button>
      <strong>{severity}</strong>
      <button onclick={() => setSeverity(severity + 1)} disabled={severity >= MAX_SEVERITY} aria-label="Větší">+</button>
    </div>
  {/if}

  {#if kind !== 'nouzovy'}
    <div class="row">
      <span>{kind === 'lektvar' ? 'Suroviny v lektvaru' : 'Cena v Surovinách'}</span>
      <button onclick={() => setCost(cost - 1)} disabled={cost <= 0} aria-label="Méně Surovin">−</button>
      <strong>{cost}</strong>
      <button onclick={() => setCost(cost + 1)} aria-label="Více Surovin">+</button>
    </div>
  {/if}

  <label class="check">
    <input type="checkbox" bind:checked={onTrip} />
    Na výpravě (zkouška)
  </label>
  {#if onTrip && kind !== 'nouzovy'}
    <div class="seg" role="group" aria-label="Výsledek">
      <button class:primary={result === 'uspech'} onclick={() => (result = 'uspech')}>Podařilo se</button>
      <button class:primary={result === 'neuspech'} onclick={() => (result = 'neuspech')}>Nepodařilo se</button>
      <button class:primary={result === 'preruseno'} onclick={() => (result = 'preruseno')}>Přerušeno</button>
    </div>
  {/if}

  {#if !free}
    <p>Spotřeba Surovin: <strong>{cost}</strong>{#if hasKinds}, rozdělte podle druhů:{/if}</p>
    {#if hasKinds}
      {#each src as s (s.key)}
        <div class="row">
          <span>{labels[s.key]} <small class="muted">(má {s.have})</small></span>
          <button onclick={() => setAlloc(s.key, (alloc[s.key] ?? 0) - 1)} disabled={(alloc[s.key] ?? 0) <= 0} aria-label={`Méně: ${labels[s.key]}`}>−</button>
          <strong>{alloc[s.key] ?? 0}</strong>
          <button onclick={() => setAlloc(s.key, (alloc[s.key] ?? 0) + 1)} disabled={(alloc[s.key] ?? 0) >= s.have} aria-label={`Více: ${labels[s.key]}`}>+</button>
        </div>
      {/each}
    {:else}
      <p class="muted">Postava má {src[0].have} Surovin.</p>
    {/if}
  {/if}

  {#if kind === 'vyroba' || kind === 'nouzovy'}
    <label class="check">
      <input type="checkbox" bind:checked={addToEquipment} />
      Přidat do výbavy{onTrip && result !== 'uspech' && kind === 'vyroba' ? ' (jen při úspěchu)' : ''}
    </label>
  {/if}

  {#if check.error}<p class="error" role="alert">{check.error}</p>{/if}
  <p class="actions">
    <button class="primary" onclick={save} disabled={!!check.error}>Uložit</button>
    <button onclick={() => dialog.close()}>Zrušit</button>
  </p>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(28rem, 94vw);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  h2 {
    margin-top: 0;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .row span {
    flex: 1;
  }
  .row strong {
    min-width: 2ch;
    text-align: center;
  }
  input[type='text'] {
    width: 100%;
    margin: 0.4rem 0;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    margin: 0.6rem 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
