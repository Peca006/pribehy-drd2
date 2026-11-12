<script lang="ts">
  import type { ChangeEvent, CharacterLog } from '../../core/character/model'
  import { groupRevisions, revertEvents, revisionChanges } from '../../core/character/revisions'
  import { settings } from '../../core/settings.svelte'
  import { describeChange, pathLabel } from './describe'

  // Historie změn postavy po revizích (nejnovější nahoře). Vrácení revize přidá novou revizi
  // s původními hodnotami, nic se nemaže.
  let { log, onrevert }: { log: CharacterLog; onrevert: (events: ChangeEvent[]) => void } = $props()

  const revisions = $derived(groupRevisions(log.events).reverse())
  const when = (iso: string) => new Date(iso).toLocaleString('cs-CZ')

  function revert(i: number) {
    const rev = revisions[i]
    const undo = revertEvents(log, rev, settings.author, `Vrácení: ${rev.note || 'změna'}`)
    if (!undo.length) return
    if (confirm(`Vrátit změnu „${rev.note || 'bez popisu'}“? Vznikne nová revize s původními hodnotami.`))
      onrevert(undo)
  }
</script>

<h2>Historie změn</h2>
<ul class="history">
  {#each revisions as rev, i (rev.id)}
    {@const changes = revisionChanges(log, rev)}
    {@const first = i === revisions.length - 1}
    <li class="panel">
      <details>
        <summary>
          <strong>{rev.note || 'Změna'}</strong>
          <span class="muted"> · {rev.by} · {when(rev.at)} · změn: {changes.length}</span>
        </summary>
        <ul class="changes">
          {#each changes as c}
            <li>
              <span class="muted">{pathLabel(c.path)}:</span>
              {#each describeChange(c) as line}<div>{line}</div>{/each}
            </li>
          {:else}
            <li class="muted">Beze změny proti stavu před revizí.</li>
          {/each}
        </ul>
        {#if !first}
          <button onclick={() => revert(i)}>Vrátit tuto změnu</button>
        {/if}
      </details>
    </li>
  {/each}
</ul>

<style>
  .history {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .history > li {
    margin: 0.4rem 0;
  }
  .changes {
    list-style: none;
    padding-left: 0.5rem;
    font-size: 0.9rem;
  }
  .changes li {
    margin: 0.25rem 0;
  }
  summary {
    cursor: pointer;
  }
</style>
