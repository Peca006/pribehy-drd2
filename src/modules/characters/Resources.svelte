<script lang="ts">
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import type { Attribute } from '../../core/content/schema'
  import {
    adjust,
    effectiveAttributes,
    loadSpent,
    saveSpent,
    type Spent,
  } from '../../core/character/play'

  // Zdroje hrdiny během hry: čerpání a obnova po jednom. Jen v tomto zařízení (nejde do historie postavy).
  let {
    id,
    character,
    onscar,
  }: { id: string; character: Character; onscar: (a: Attribute) => void } = $props()

  const max = $derived(effectiveAttributes(character))
  // komponenta se pro každou postavu vytváří znovu (`{#key}` u volající stránky)
  // svelte-ignore state_referenced_locally
  let spent = $state<Spent>(loadSpent(id))
  // počet sloupců políček podle nejvyššího zdroje (po třech nad sebou), aby řádky i tlačítko Obnovit lícovaly
  const cols = $derived(
    Math.max(1, ...ATTRIBUTES.map((a) => Math.ceil(character.attributes[a] / 3))),
  )
  const left = (a: (typeof ATTRIBUTES)[number]) => Math.max(0, max[a] - spent[a])

  function change(a: (typeof ATTRIBUTES)[number], by: number) {
    spent = adjust(spent, max, a, by)
    saveSpent(id, spent)
  }
  function rest() {
    spent = { Tělo: 0, Duše: 0, Vliv: 0 }
    saveSpent(id, spent)
  }
</script>

<section class="panel" aria-label="Zdroje">
  <div class="inner" style:--cols={cols}>
    <div class="head">
      <strong>Zdroje</strong>
      <button onclick={rest}>Obnovit</button>
    </div>
    {#each ATTRIBUTES as a}
      {@const blocked = character.attributes[a] - max[a]}
      <div class="row">
        <span class="name">{a}</span>
        <button onclick={() => change(a, 1)} disabled={left(a) === 0} aria-label={`Čerpat ${a}`}
          >−</button
        >
        <button
          class="plain count"
          onclick={() => onscar(a)}
          aria-label={`${a}: ${left(a)} z ${max[a]}. Zasadit jizvu`}
          >{left(a)}<span class="muted"> / {max[a]}</span></button
        >
        <button onclick={() => change(a, -1)} disabled={spent[a] === 0} aria-label={`Obnovit ${a}`}
          >+</button
        >
        <button class="plain boxes" onclick={() => onscar(a)} aria-label={`Zasadit jizvu (${a})`}>
          {#each { length: max[a] } as _, i}<span class:used={i >= left(a)}></span>{/each}
          {#each { length: blocked } as _}<span class="blocked"></span>{/each}
        </button>
      </div>
    {/each}
  </div>
  {#if character.scars.length}
    <p class="muted">
      Zkřížená políčka jsou zablokovaná jizvami. Klepnutím na hodnotu nebo políčka zasadíte jizvu.
    </p>
  {:else}
    <p class="muted">Klepnutím na hodnotu nebo políčka zasadíte jizvu.</p>
  {/if}
</section>

<style>
  .inner {
    width: fit-content;
    max-width: 100%;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .row {
    display: grid;
    grid-template-columns: 2.9rem 2.4rem 3.2rem 2.4rem calc(
        var(--cols) * 0.8rem + (var(--cols) - 1) * 3px
      );
    gap: 0.25rem;
    align-items: center;
    margin: 0.35rem 0;
  }
  .row button:not(.plain) {
    padding: 0.2rem;
  }
  .plain {
    background: none;
    border: none;
    padding: 0;
    min-height: 44px;
    color: inherit;
  }
  .count {
    font-weight: bold;
    text-align: center;
  }
  .boxes {
    display: grid;
    grid-template-rows: repeat(3, 0.8rem);
    grid-auto-flow: column;
    grid-auto-columns: 0.8rem;
    gap: 3px;
    align-content: center;
    justify-content: start;
  }
  .boxes span {
    width: 0.8rem;
    height: 0.8rem;
    border: 1px solid var(--drd-accent);
    background: var(--drd-accent);
  }
  .boxes span.used {
    background: transparent;
  }
  .boxes span.blocked {
    background:
      linear-gradient(
        to top right,
        transparent calc(50% - 1px),
        var(--drd-muted) 50%,
        transparent calc(50% + 1px)
      ),
      linear-gradient(
        to bottom right,
        transparent calc(50% - 1px),
        var(--drd-muted) 50%,
        transparent calc(50% + 1px)
      );
    border-color: var(--drd-muted);
  }
</style>
