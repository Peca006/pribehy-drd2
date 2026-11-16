<script lang="ts">
  import { untrack } from 'svelte'
  import type { Character } from '../../core/character/model'
  import { ATTRIBUTES } from '../../core/character/model'
  import {
    autoPay,
    checkHeal,
    COST_PER_STEP,
    healCost,
    maxSteps,
    ownLeft,
    applyHeal,
    type Pay,
  } from '../../core/character/healing'
  import type { Spent } from '../../core/character/play'

  // Zmírnění Jizvy léčením: Jizva se rovnou sníží o 1, dá se upravit popis a závažnost (nejníž na 1, nejvýš o 1 méně než dosud).
  // Ukáže celkové snížení (k porovnání se silou magického okamžiku) a cenu 5 Zdrojů za stupeň. Zdroje z lektvaru se odečtou
  // a zbytek si hráč rozdělí mezi své Zdroje. Úplné zahojení je samostatné tlačítko „Zahojeno“.
  let {
    character,
    spent,
    scarId,
    onsave,
    onclose,
  }: {
    character: Character
    spent: Spent
    scarId: string
    onsave: (next: Character, spent: Spent, note: string) => void | Promise<void>
    onclose: () => void
  } = $props()

  const scar = untrack(() => character.scars.find((s) => s.id === scarId))
  const limit = scar ? maxSteps(scar.severity) : 0
  let steps = $state(1)
  let potion = $state(0)
  let note = $state(scar?.note ?? '')
  let healer = $state('')
  let pay = $state<Pay>(untrack(() => autoPay(character, spent, scarId, healCost(1))))
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  const input = $derived({ steps, potion, pay, note })
  const check = $derived(checkHeal(character, spent, scarId, input))
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  const cost = $derived(healCost(steps))

  /** Po změně ceny nebo lektvaru se platba navrhne znovu (hráč ji pak může upravit). */
  const reflow = () => (pay = autoPay(character, spent, scarId, healCost(steps) - Math.min(potion, healCost(steps))))
  const setSteps = (n: number) => {
    steps = clamp(n, 1, limit)
    potion = Math.min(potion, healCost(steps))
    reflow()
  }
  const setPotion = (n: number) => {
    potion = clamp(n, 0, cost)
    reflow()
  }
  const setPay = (a: keyof Pay, n: number) => (pay = { ...pay, [a]: clamp(n, 0, ownLeft(character, spent, a)) })

  function save() {
    if (!scar || check.error) return
    const r = applyHeal(character, spent, scarId, input)
    const text = note.trim()
    const parts = [
      `Zmírnění jizvy (${scar.attribute} ${scar.severity} → ${check.after}${text ? `: ${text}` : ''})`,
      healer.trim() ? `ošetřuje ${healer.trim()}` : '',
      `${check.cost} Zdrojů${check.potion ? ` (z toho ${check.potion} z lektvaru)` : ''}`,
    ].filter(Boolean)
    void onsave(r.character, r.spent, parts.join(', '))
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Zmírnění Jizvy">
  <h2>Zmírnit Jizvu</h2>
  {#if scar && limit >= 1}
    <p><strong>{scar.attribute}</strong>, dosud závažnost {scar.severity}</p>
    <input type="text" bind:value={note} maxlength="300" placeholder="Popis Jizvy" aria-label="Popis Jizvy" />
    <div class="row">
      <span>Závažnost po léčení</span>
      <button onclick={() => setSteps(steps + 1)} disabled={steps >= limit} aria-label="Zmírnit víc">−</button>
      <strong>{scar.severity - steps}</strong>
      <button onclick={() => setSteps(steps - 1)} disabled={steps <= 1} aria-label="Zmírnit míň">+</button>
    </div>
    <p>
      Celkové snížení: <strong>{steps}</strong> (k porovnání se silou magického okamžiku). Potřeba Zdrojů:
      <strong>{cost}</strong> ({COST_PER_STEP} × {steps}).
    </p>
    <div class="row">
      <span>Zdroje z lektvaru, masti</span>
      <button onclick={() => setPotion(potion - 1)} disabled={potion <= 0} aria-label="Méně z lektvaru">−</button>
      <strong>{potion}</strong>
      <button onclick={() => setPotion(potion + 1)} disabled={potion >= cost} aria-label="Více z lektvaru">+</button>
    </div>
    <p class="muted">Nejvýš {cost}. Lektvar může být i z cizí zásoby; odepište si ho v jejím deníku.</p>

    <p>Ostatní zaplatí ošetřovaný ze svých Zdrojů (<strong>{check.own}</strong>), rozdělte je:</p>
    {#each ATTRIBUTES as a}
      <div class="row">
        <span>{a} <small class="muted">(zbývá {ownLeft(character, spent, a)})</small></span>
        <button onclick={() => setPay(a, pay[a] - 1)} disabled={pay[a] <= 0} aria-label={`Méně: ${a}`}>−</button>
        <strong>{pay[a]}</strong>
        <button
          onclick={() => setPay(a, pay[a] + 1)}
          disabled={pay[a] >= ownLeft(character, spent, a)}
          aria-label={`Více: ${a}`}>+</button
        >
      </div>
    {/each}
    <p class="muted">Výhodou ani zasazením jiné Jizvy se léčení platit nedá.</p>
    <input type="text" bind:value={healer} placeholder="Ošetřující (nepovinné)" aria-label="Ošetřující" />
    {#if check.error}<p class="error" role="alert">{check.error}</p>{/if}
    <p class="actions">
      <button class="primary" onclick={save} disabled={!!check.error}>Uložit</button>
      <button onclick={() => dialog.close()}>Zrušit</button>
    </p>
  {:else}
    <p class="muted">Jizvu se závažností 1 už lze jen zahojit.</p>
    <p class="actions"><button onclick={() => dialog.close()}>Zavřít</button></p>
  {/if}
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
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
