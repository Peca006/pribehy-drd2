<script lang="ts">
  import { onMount } from 'svelte'
  import { getLog } from '../../core/character/store'
  import type { CharacterLog } from '../../core/character/model'
  import { traits } from '../../core/library.svelte'
  import { hintsOf, QUESTIONS, type Hint } from '../../core/expedition/inspiration'
  import { ledParties } from '../../core/expedition/runs'
  import type { Party } from '../../core/party/model'

  // Inspirace pro přípravu (jen čtení): příběh a cíle postav družiny jsou podle pravidel první zdroj námětů pro příhody.
  let parties = $state.raw<Party[]>([])
  let chosen = $state('')
  let hints = $state.raw<Hint[]>([])
  let loaded = $state(false)

  onMount(async () => {
    parties = await ledParties()
  })

  async function pick() {
    const party = parties.find((p) => p.id === chosen)
    if (!party) {
      hints = []
      return
    }
    const logs = new Map<string, CharacterLog>()
    for (const m of party.members)
      if (m.characterId) {
        const l = await getLog(m.characterId)
        if (l) logs.set(m.characterId, l)
      }
    hints = hintsOf(party, logs)
    loaded = true
  }
  const traitName = (t: string) => traits().find((x) => x.id === t)?.name ?? t
</script>

<details class="panel">
  <summary><strong>Inspirace pro přípravu</strong></summary>
  <p class="muted">
    Prvním zdrojem námětů jsou hráči a jejich postavy: silné i slabé stránky, vztahy, jak se stali hrdiny a čeho chtějí dosáhnout. Připravte
    příhody tak, aby postavy mohly zazářit, nebo aby měly s čím zápasit.
  </p>
  {#if parties.length}
    <label>
      Postavy družiny
      <select bind:value={chosen} onchange={pick} aria-label="Družina pro inspiraci">
        <option value="">Vyberte družinu…</option>
        {#each parties as p}<option value={p.id}>{p.name}</option>{/each}
      </select>
    </label>
    {#each hints as h (h.memberName + h.name)}
      <div class="hint">
        <strong>{h.name}</strong>{#if h.concept}<span class="muted"> · {h.concept}</span>{/if}
        {#if h.trait}<p><strong>Povaha:</strong> {traitName(h.trait)}</p>{/if}
        {#if h.heroStory}<p class="text"><strong>Jak se stal hrdinou:</strong> {h.heroStory}</p>{/if}
        {#if h.scars.length}<p><strong>Jizvy:</strong> {h.scars.join('; ')}</p>{/if}
      </div>
    {:else}
      {#if loaded && chosen}<p class="muted">Postavy členů zatím nemají koncept ani příběh, nebo nejsou v tomto zařízení.</p>{/if}
    {/each}
  {:else}
    <p class="muted">Postavy družin, které vedete, se tu ukážou po založení družiny s členy.</p>
  {/if}

  <p><strong>Zeptejte se hráčů (nejlépe mezi sezeními):</strong></p>
  <ul>
    {#each QUESTIONS as q}<li>{q}</li>{/each}
  </ul>
  <p>
    <a href="#/ctenar/41-priprava-a-vedeni-hry/prubezna-priprava">Průběžná příprava</a> ·
    <a href="#/ctenar/42-inspirace-pro-dobrodruzstvi/zajimave-prekazky-a-jejich-prekonavani">Zajímavé překážky</a> ·
    <a href="#/bestiar">Bestiář</a>
  </p>
</details>

<style>
  label {
    display: block;
    margin: 0.5rem 0;
  }
  label select {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .hint {
    margin: 0.5rem 0;
    padding-left: 0.5rem;
    border-left: 3px solid var(--drd-border);
  }
  .hint p {
    margin: 0.25rem 0;
  }
</style>
