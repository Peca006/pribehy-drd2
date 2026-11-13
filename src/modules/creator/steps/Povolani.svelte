<script lang="ts">
  import Md from '../../../ui/Md.svelte'
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'
  import { levelsLeft } from '../rules'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()
  const left = $derived(levelsLeft(data.rules, draft.levels))

  function change(id: string, d: number) {
    const v = (draft.levels[id] ?? 0) + d
    if (v < 0 || v > 5 || (d > 0 && left <= 0)) return
    draft.levels[id] = v
    // schopnosti povolání, které už nemá žádnou úroveň, zahodíme
    if (v === 0) {
      const p = data.professions.find((x) => x.id === id)
      draft.abilities = draft.abilities.filter((a) => !p?.abilities.some((x) => x.id === a))
    }
  }
</script>

<h2>Povolání</h2>
<p class="muted">
  Rozdělte {data.rules.startingLevels} úrovně mezi základní povolání – klidně všechny do jednoho, nebo
  každou do jiného.
  <strong>Zbývá: {left}</strong>
</p>

{#each data.professions as p}
  {@const lvl = draft.levels[p.id] ?? 0}
  <div class="panel" class:sel={lvl > 0}>
    <div class="row">
      <strong>{p.name}</strong>
      <span class="stepper">
        <button
          aria-label="Snížit úroveň {p.name}"
          onclick={() => change(p.id, -1)}
          disabled={lvl === 0}>−</button
        >
        <output>{lvl}</output>
        <button
          aria-label="Zvýšit úroveň {p.name}"
          onclick={() => change(p.id, 1)}
          disabled={left <= 0 || lvl >= 5}>+</button
        >
      </span>
    </div>
    <Md text={p.intro.split('\n\n')[0]} hint srd={p.srd} />
    <details>
      <summary>Dovednosti</summary>
      <ul>
        {#each p.skills as s}<li>
            <strong>{s.name}</strong>{#if s.attribute}
              <span class="muted">&nbsp;({s.attribute})</span>{/if}
          </li>{/each}
      </ul>
    </details>
  </div>
{/each}

<style>
  .sel {
    outline: 2px solid var(--drd-accent);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .stepper {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  output {
    min-width: 1.5rem;
    text-align: center;
    font-weight: bold;
  }
</style>
