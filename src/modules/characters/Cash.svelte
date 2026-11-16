<script lang="ts">
  import { onDestroy } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import {
    breaksDucat,
    canChange,
    formatDelta,
    splitCash,
    UNIT,
    UNIT_LABEL,
    UNIT_ORDER,
    type CashUnit,
  } from '../../core/character/cash'
  import type { Character } from '../../core/character/model'

  // Hotovost v přehledu postavy: dukáty, groše a haléře zvlášť, každé s ±. Plus na 9 přeteče do vyššího řádu, mínus na 0
  // si půjčí z vyššího (nižší řád se při změně vyššího nemění). Rychlá klepání se sloučí do jedné revize po chvilce klidu.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  const DELAY = 1200
  let pending = $state(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  const cash = $derived(Math.max(0, character.cash + pending))
  const parts = $derived(splitCash(cash))

  async function bump(unit: CashUnit, sign: 1 | -1) {
    const delta = sign * UNIT[unit]
    if (!canChange(cash, delta)) return
    if (
      breaksDucat(cash, unit, sign) &&
      !(await ask('Půjčí se z dukátu, který bude potřeba rozměnit. Fikčně nemusí být snadné ho rozměnit.', {
        title: 'Rozměnit dukát?',
        ok: 'Rozměnit',
      }))
    )
      return
    pending += delta
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY)
  }

  async function flush() {
    clearTimeout(timer)
    const delta = pending
    pending = 0
    if (!delta) return
    await onchange({ ...character, cash: Math.max(0, character.cash + delta) }, `Hotovost: ${formatDelta(delta)}`)
  }

  // při opuštění stránky se čekající změna zapíše hned
  onDestroy(() => {
    if (pending) void flush()
  })
</script>

<div class="cash" aria-label="Hotovost">
  <strong>Hotovost</strong>
  <div class="grid">
    {#each UNIT_ORDER as u}
      <div class="col">
        <small class="muted">{UNIT_LABEL[u]}</small>
        <div class="ctl">
          <button onclick={() => bump(u, -1)} disabled={!canChange(cash, -UNIT[u])} aria-label={`Ubrat: ${UNIT_LABEL[u]}`}>−</button>
          <span class="n" aria-label={UNIT_LABEL[u]}>{parts[u]}</span>
          <button onclick={() => bump(u, 1)} aria-label={`Přidat: ${UNIT_LABEL[u]}`}>+</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .cash {
    margin: 0.5rem 0;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin-top: 0.15rem;
  }
  .col {
    display: flex;
    flex-direction: column;
  }
  .ctl {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .n {
    min-width: 2ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
