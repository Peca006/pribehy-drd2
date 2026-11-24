<script lang="ts">
  import { STATUS_LABEL, type RunRow } from '../../core/expedition/runs'

  // Seznam vedení (rozehraných výprav) s družinou, stavem a postupem.
  let { rows, empty = 'Zatím žádná rozehraná výprava.' }: { rows: RunRow[]; empty?: string } = $props()
</script>

{#each rows as r (r.run.id)}
  <a class="btn panel row" href={'#/vypravy/vedeni/' + r.run.id}>
    <strong>{r.expedition?.name ?? '(smazaná výprava)'} · {r.party?.name ?? '(smazaná družina)'}</strong>
    <span class="muted">{STATUS_LABEL[r.run.status]} · odehráno {r.played} z {r.total} příhod</span>
  </a>
{:else}
  <p class="muted">{empty}</p>
{/each}

<style>
  .row {
    display: flex;
    flex-direction: column;
    margin: 0.5rem 0;
  }
</style>
