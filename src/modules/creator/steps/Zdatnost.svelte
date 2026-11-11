<script lang="ts">
  import { ATTRIBUTES } from '../../../core/character/model'
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'
  import { pointsLeft } from '../rules'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()
  const left = $derived(pointsLeft(data.rules, draft.attributes))
  const weak = $derived(
    ATTRIBUTES.filter((k) => draft.attributes[k] < data.rules.attributeRecommendedMin),
  )

  function change(k: (typeof ATTRIBUTES)[number], d: number) {
    const v = draft.attributes[k] + d
    if (v < data.rules.attributeMin || (d > 0 && left <= 0)) return
    draft.attributes[k] = v
  }
</script>

<h2>Zdatnost</h2>
<p class="muted">
  Rozdělte {data.rules.attributePoints} bodů mezi Tělo, Duši a Vliv (každá vlastnost aspoň {data
    .rules.attributeMin}).
  <strong>Zbývá: {left}</strong>
</p>
{#each ATTRIBUTES as k}
  <div class="panel row">
    <strong>{k}</strong>
    <span class="stepper">
      <button
        aria-label="Snížit {k}"
        onclick={() => change(k, -1)}
        disabled={draft.attributes[k] <= data.rules.attributeMin}>−</button
      >
      <output>{draft.attributes[k]}</output>
      <button aria-label="Zvýšit {k}" onclick={() => change(k, 1)} disabled={left <= 0}>+</button>
    </span>
  </div>
{/each}
{#if weak.length}
  <p class="muted">
    Pozor: {weak.join(', ')}
    {weak.length > 1 ? 'mají' : 'má'} méně než {data.rules.attributeRecommendedMin} – hrdina bude v té
    oblasti velmi slabý.
  </p>
{/if}

<style>
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stepper {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  output {
    min-width: 2rem;
    text-align: center;
    font-weight: bold;
    font-size: 1.25rem;
  }
</style>
