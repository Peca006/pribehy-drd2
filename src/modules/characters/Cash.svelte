<script lang="ts">
  import { onDestroy } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import {
    addCoin,
    canSpend,
    formatCash,
    spendCoin,
    UNIT_LABEL,
    UNIT_ORDER,
    type Cash,
    type CashUnit,
  } from '../../core/character/cash'
  import type { Character } from '../../core/character/model'

  // Hotovost v přehledu postavy: dukáty, groše a haléře zvlášť, každé s ±. Nic se samo nepřevádí do vyššího řádu; při
  // čerpání pod nulu se rozmění mince z vyššího řádu (rozměnění dukátu se zeptá). Rychlá klepání se sloučí do jedné revize.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  const DELAY = 1200
  /** rozpracovaná hotovost (dosud nezapsaná do deníku); bez ní se ukazuje hotovost postavy */
  let work = $state<Cash | undefined>(undefined)
  let timer: ReturnType<typeof setTimeout> | undefined

  const cash = $derived(work ?? character.cash)

  function touch(next: Cash) {
    work = next
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY)
  }

  function plus(unit: CashUnit) {
    touch(addCoin(cash, unit))
  }

  async function minus(unit: CashUnit) {
    const r = spendCoin(cash, unit)
    if (!r) return
    if (
      r.brokeDucat &&
      !(await ask('Není z čeho ubrat, rozměnil by se dukát. Fikčně nemusí být snadné ho rozměnit.', {
        title: 'Rozměnit dukát?',
        ok: 'Rozměnit',
      }))
    )
      return
    touch(r.cash)
  }

  async function flush() {
    clearTimeout(timer)
    const next = work
    work = undefined
    if (!next || UNIT_ORDER.every((u) => next[u] === character.cash[u])) return
    await onchange({ ...character, cash: next }, `Hotovost: ${formatCash(character.cash)} → ${formatCash(next)}`)
  }

  // při opuštění stránky se čekající změna zapíše hned
  onDestroy(() => {
    if (work) void flush()
  })
</script>

<div class="cash" aria-label="Hotovost">
  <strong>Hotovost</strong>
  <div class="grid">
    {#each UNIT_ORDER as u}
      <div class="col">
        <small class="muted">{UNIT_LABEL[u]}</small>
        <div class="ctl">
          <button onclick={() => minus(u)} disabled={!canSpend(cash, u)} aria-label={`Ubrat: ${UNIT_LABEL[u]}`}>−</button>
          <span class="n" aria-label={UNIT_LABEL[u]}>{cash[u]}</span>
          <button onclick={() => plus(u)} aria-label={`Přidat: ${UNIT_LABEL[u]}`}>+</button>
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
