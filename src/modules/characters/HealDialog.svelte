<script lang="ts">
  import { untrack } from 'svelte'
  import type { Character } from '../../core/character/model'
  import { ATTRIBUTES } from '../../core/character/model'
  import {
    applyHeal,
    COST_PER_STEP,
    MAX_STRENGTH,
    ownLeft,
    planHeal,
  } from '../../core/character/healing'
  import type { Spent } from '../../core/character/play'

  // Léčení Jizvy v magickém okamžiku: ošetřující (zkouška), síla okamžiku, kolik stupňů se uzdraví a platba Zdroji.
  // Lektvary a masti jen snižují platbu (zadají se jako „Zdroje navíc“), tedy mohou být i z cizí zásoby.
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
  let strength = $state(Math.min(MAX_STRENGTH, scar?.severity ?? 1))
  let steps = $state(scar?.severity ?? 1)
  let potion = $state(0)
  let healer = $state('')
  let self = $state(false)
  let success = $state(false)
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  const planned = $derived(planHeal(character, spent, scarId, { strength, steps, potion }))
  const error = $derived('error' in planned ? planned.error : '')
  const plan = $derived('plan' in planned ? planned.plan : undefined)
  const maxPotion = $derived(steps * COST_PER_STEP)
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

  const label = $derived(scar ? `${scar.attribute} ${scar.severity}${scar.note ? `: ${scar.note}` : ''}` : '')

  function save() {
    if (!plan || !scar || !success) return
    const r = applyHeal(character, spent, scarId, plan)
    const who = self ? 'léčí se sám/sama' : healer.trim() ? `ošetřuje ${healer.trim()}` : ''
    const parts = [
      `Léčení jizvy (${scar.attribute} ${scar.severity} → ${plan.after ? plan.after : 'zahojena'}${scar.note ? `: ${scar.note}` : ''})`,
      who,
      `okamžik síly ${strength}`,
      `${plan.cost} Zdrojů${plan.potion ? ` (z toho ${plan.potion} lektvar)` : ''}`,
    ].filter(Boolean)
    void onsave(r.character, r.spent, parts.join(', '))
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Léčení Jizvy">
  <h2>Léčení Jizvy</h2>
  {#if scar}
    <p><strong>{label}</strong></p>
    <div class="row">
      <span>Síla magického okamžiku</span>
      <button onclick={() => (strength = clamp(strength - 1, 1, MAX_STRENGTH))} aria-label="Slabší">−</button>
      <strong>{strength}</strong>
      <button onclick={() => (strength = clamp(strength + 1, 1, MAX_STRENGTH))} aria-label="Silnější">+</button>
    </div>
    <p class="muted">Léčit lze jen Jizvu této závažnosti nebo slabší (např. úplněk, zřídlo síly).</p>
    <div class="row">
      <span>Snížit o</span>
      <button onclick={() => ((steps = clamp(steps - 1, 1, scar.severity)), (potion = Math.min(potion, steps * COST_PER_STEP)))} aria-label="Méně">−</button>
      <strong>{steps}</strong>
      <button onclick={() => (steps = clamp(steps + 1, 1, scar.severity))} aria-label="Více">+</button>
    </div>
    <p class="muted">
      {#if steps >= scar.severity}Jizva se zahojí úplně.{:else}Jizva klesne na závažnost {scar.severity - steps}.{/if}
      Cena je {COST_PER_STEP} Zdrojů za stupeň, tedy {steps * COST_PER_STEP}.
    </p>
    <div class="row">
      <span>Zdroje navíc (lektvar, mast)</span>
      <button onclick={() => (potion = clamp(potion - 1, 0, maxPotion))} aria-label="Méně z lektvaru">−</button>
      <strong>{potion}</strong>
      <button onclick={() => (potion = clamp(potion + 1, 0, maxPotion))} aria-label="Více z lektvaru">+</button>
    </div>
    <p class="muted">
      Každá Surovina z lektvaru ušetří 1 Zdroj, nejvýš {maxPotion}. Lektvar může být i u jiné postavy; odepište si ho
      v jejím deníku (Suroviny, Hotovost).
    </p>

    <label class="check">
      <input type="checkbox" bind:checked={self} />
      Léčím se sám/sama (komplikace: při neúspěchu platí vyčerpání i Zdroje)
    </label>
    {#if !self}
      <input type="text" bind:value={healer} placeholder="Ošetřující (jméno, nepovinné)" aria-label="Ošetřující" />
    {/if}
    <label class="check">
      <input type="checkbox" bind:checked={success} />
      Zkouška ošetřujícího se podařila (hodem, nebo za cenu vyčerpání)
    </label>

    {#if plan}
      <p>
        Ošetřovaný platí <strong>{plan.own}</strong> Zdrojů:
        {#each ATTRIBUTES.filter((a) => plan.pay[a]) as a, i}{i ? ', ' : ''}{a} {plan.pay[a]} (zbývá {ownLeft(character, spent, a) - plan.pay[a]}){/each}{#if !plan.own}žádné{/if}.
      </p>
      <p class="muted">Výhodou ani zasazením jiné Jizvy se léčení platit nedá.</p>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <p class="actions">
      <button class="primary" onclick={save} disabled={!plan || !success}>Uzdravit</button>
      <button onclick={() => dialog.close()}>Zrušit</button>
    </p>
  {:else}
    <p class="muted">Jizva už neexistuje.</p>
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
  .check {
    display: flex;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
