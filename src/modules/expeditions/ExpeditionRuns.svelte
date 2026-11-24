<script lang="ts">
  import { onMount } from 'svelte'
  import type { Party } from '../../core/party/model'
  import { beginRun, ledParties, runRows, type RunRow } from '../../core/expedition/runs'
  import { go } from '../../core/router.svelte'
  import RunList from './RunList.svelte'

  // Vedení jedné výpravy: s kterými družinami se hraje, a zahájení s další družinou.
  let { expeditionId }: { expeditionId: string } = $props()

  let rows = $state.raw<RunRow[]>([])
  let parties = $state.raw<Party[]>([])
  let chosen = $state('')
  let error = $state('')

  onMount(async () => {
    rows = await runRows((r) => r.expeditionId === expeditionId)
    parties = await ledParties()
  })

  async function begin() {
    error = ''
    try {
      const run = await beginRun(expeditionId, chosen)
      go('vypravy', 'vedeni', run.id)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }
</script>

<h2>Vedení této výpravy</h2>
<p class="muted">Výpravu lze vést víc družinám zároveň, každá má vlastní stav příhod.</p>
<RunList {rows} empty="Zatím ji nevede žádná družina." />
{#if parties.length}
  <div class="row">
    <select bind:value={chosen} aria-label="Družina k zahájení">
      <option value="">Začít s družinou…</option>
      {#each parties as p}<option value={p.id}>{p.name}</option>{/each}
    </select>
    <button class="primary" disabled={!chosen} onclick={begin}>Začít</button>
  </div>
{:else}
  <p class="muted">Nejdřív založte družinu v <a href="#/druziny">Družinách</a>.</p>
{/if}
{#if error}<p class="error" role="alert">{error}</p>{/if}

<style>
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .row select {
    flex: 1;
  }
</style>
