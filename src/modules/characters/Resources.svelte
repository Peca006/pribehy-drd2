<script lang="ts">
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import {
    adjust,
    effectiveAttributes,
    loadSpent,
    saveSpent,
    type Spent,
  } from '../../core/character/play'

  // Zdroje hrdiny během hry: čerpání a obnova po jednom. Jen v tomto zařízení (nejde do historie postavy).
  let { id, character }: { id: string; character: Character } = $props()

  const max = $derived(effectiveAttributes(character))
  // komponenta se pro každou postavu vytváří znovu (`{#key}` u volající stránky)
  // svelte-ignore state_referenced_locally
  let spent = $state<Spent>(loadSpent(id))
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
  <div class="head">
    <strong>Zdroje</strong>
    <button onclick={rest}>Obnovit vše</button>
  </div>
  {#each ATTRIBUTES as a}
    <div class="row">
      <span class="name">{a}</span>
      <button onclick={() => change(a, 1)} disabled={left(a) === 0} aria-label={`Čerpat ${a}`}
        >−</button
      >
      <strong class="count" aria-label={`${a}: ${left(a)} z ${max[a]}`}
        >{left(a)}<span class="muted"> / {max[a]}</span></strong
      >
      <button onclick={() => change(a, -1)} disabled={spent[a] === 0} aria-label={`Obnovit ${a}`}
        >+</button
      >
      <span class="boxes" aria-hidden="true">
        {#each { length: max[a] } as _, i}<span class:used={i >= left(a)}></span>{/each}
      </span>
    </div>
  {/each}
  {#if character.scars.length}
    <p class="muted">
      Maximum Zdrojů je snížené jizvami (zdatnost {ATTRIBUTES.map(
        (a) => `${a} ${character.attributes[a]}`,
      ).join(', ')}).
    </p>
  {/if}
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.35rem 0;
  }
  .name {
    width: 3.5rem;
  }
  .count {
    min-width: 3.5rem;
    text-align: center;
  }
  .boxes {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
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
</style>
