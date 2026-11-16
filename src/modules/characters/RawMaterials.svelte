<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { Character } from '../../core/character/model'
  import {
    adjustRaw,
    cleanCount,
    hasKinds,
    kindFull,
    kindLabel,
    kindsOf,
    rawCount,
    rawTotal,
    type KindRef,
  } from '../../core/character/rawMaterials'
  import RawMaterialKindsDialog from './RawMaterialKindsDialog.svelte'

  // Suroviny v přehledu postavy: jeden řádek s ±; evidují-li se druhy, řádek ukazuje součet a pod ním je řádek za každý druh.
  // Rychlá klepání se sloučí: změna se zapíše jako jedna revize až po chvilce klidu (ať se v historii nehromadí desítky záznamů).
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  const DELAY = 1200
  let pending = $state<Record<string, number>>({})
  let timer: ReturnType<typeof setTimeout> | undefined
  let editing = $state(false)

  const keyOf = (ref: KindRef) => ref ?? ''
  const delta = (ref: KindRef) => pending[keyOf(ref)] ?? 0
  /** Počet včetně ještě nezapsaných změn (nejméně 0). */
  const shown = (ref: KindRef) => cleanCount(rawCount(character, ref) + delta(ref))
  const kinds = $derived(kindsOf(character))
  const grouped = $derived(hasKinds(character))
  const total = $derived(
    cleanCount(rawTotal(character) + Object.keys(pending).reduce((n, k) => n + shownDelta(k), 0)),
  )

  /** Skutečná změna počtu po omezení na 0 (nedá se jít pod nulu). */
  function shownDelta(k: string): number {
    const ref = k === '' ? undefined : k
    return shown(ref) - rawCount(character, ref)
  }

  function bump(ref: KindRef, by: number) {
    if (shown(ref) + by < 0) return
    pending = { ...pending, [keyOf(ref)]: delta(ref) + by }
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY)
  }

  async function flush() {
    clearTimeout(timer)
    const todo = pending
    pending = {}
    let next = character
    const parts: string[] = []
    for (const [k, by] of Object.entries(todo)) {
      if (!by) continue
      const ref = k === '' ? undefined : k
      const label = ref === undefined ? 'bez druhu' : kindLabel(character.rawMaterialKinds[ref] ?? { mark: '', name: '?', count: 0 })
      next = adjustRaw(next, ref, by)
      parts.push(`${label} ${by > 0 ? '+' : '−'}${Math.abs(by)}`)
    }
    if (parts.length) await onchange(next, `Suroviny: ${parts.join(', ')}`)
  }

  // při opuštění stránky (a při zavření dialogu) se čekající změny zapíšou hned
  onDestroy(() => {
    if (Object.keys(pending).length) void flush()
  })
</script>

<div class="raw">
  <div class="line">
    <button class="icon" onclick={() => (editing = true)} aria-label="Upravit druhy Surovin" title="Druhy Surovin">✎</button>
    <strong>Suroviny</strong>
    {#if grouped}
      <span class="total" aria-label="Suroviny celkem">{total}</span>
    {:else}
      <button onclick={() => bump(undefined, -1)} disabled={shown(undefined) < 1} aria-label="Ubrat Surovinu">−</button>
      <span class="total">{shown(undefined)}</span>
      <button onclick={() => bump(undefined, 1)} aria-label="Přidat Surovinu">+</button>
    {/if}
  </div>
  {#if grouped}
    <ul class="kinds">
      {#each kinds as { id, kind } (id)}
        <li>
          <span class="mark" title={kindFull(kind)}>{kindLabel(kind)}</span>
          <button onclick={() => bump(id, -1)} disabled={shown(id) < 1} aria-label={`Ubrat: ${kindFull(kind)}`}>−</button>
          <span class="count">{shown(id)}</span>
          <button onclick={() => bump(id, 1)} aria-label={`Přidat: ${kindFull(kind)}`}>+</button>
        </li>
      {/each}
      <li>
        <span class="mark other" title="bez druhu">·</span>
        <button onclick={() => bump(undefined, -1)} disabled={shown(undefined) < 1} aria-label="Ubrat: bez druhu">−</button>
        <span class="count">{shown(undefined)}</span>
        <button onclick={() => bump(undefined, 1)} aria-label="Přidat: bez druhu">+</button>
      </li>
    </ul>
  {/if}
</div>

{#if editing}
  <RawMaterialKindsDialog
    {character}
    onsave={async (next, note) => {
      await flush()
      editing = false
      await onchange(next, note)
    }}
    onclose={() => (editing = false)}
  />
{/if}

<style>
  .raw {
    margin: 0.5rem 0;
  }
  .line,
  .kinds li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .kinds {
    list-style: none;
    margin: 0.25rem 0 0 2rem;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
  }
  .total,
  .count {
    min-width: 2ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .mark {
    min-width: 2ch;
    text-align: center;
  }
  .other {
    opacity: 0.6;
  }
  .icon {
    padding: 0 0.4rem;
  }
</style>
