<script lang="ts">
  import { addNode, moveNode, removeNode } from '../../core/expedition/deck'
  import type { Expedition } from '../../core/expedition/model'

  // Uzlové body výpravy: příhody nebo události na určitém místě či čase (typicky zvrat krátce před koncem).
  let { exp = $bindable(), onstructure }: { exp: Expedition; onstructure: () => void } = $props()

  const snap = () => $state.snapshot(exp) as Expedition
  function apply(next: Expedition) {
    exp = next
    onstructure()
  }
  function setKind(id: string, value: string) {
    exp.nodes = exp.nodes.map((n) => {
      if (n.id !== id) return n
      const { kind: _k, ...rest } = n
      return value ? { ...rest, kind: value as 'zvrat' | 'odpocinek' } : rest
    })
    onstructure()
  }
</script>

<h2>Uzlové body</h2>
<p class="muted">
  Uzlový bod je příhoda nebo událost na určitém místě či čase, např. nečekaný zvrat krátce před koncem výpravy. Ostatní příhody se pak rozdělí
  podle toho, mezi které uzlové body patří. Příležitost k odpočinku pomáhá hlídat, aby hrdinům Zdroje vystačily „tak akorát“.
</p>
{#each exp.nodes as n, i (n.id)}
  <div class="panel node">
    <label>
      Uzlový bod {i + 1}
      <input bind:value={n.title} placeholder="např. Věci se komplikují" />
    </label>
    <label>
      Druh
      <select value={n.kind ?? ''} onchange={(e) => setKind(n.id, e.currentTarget.value)}>
        <option value="">událost</option>
        <option value="zvrat">zvrat</option>
        <option value="odpocinek">příležitost k odpočinku</option>
      </select>
    </label>
    <label>
      Co se stane
      <textarea rows="3" bind:value={n.text}></textarea>
    </label>
    <p class="btns">
      <button onclick={() => apply(moveNode(snap(), n.id, -1))} disabled={i === 0} aria-label={`Posunout uzlový bod ${i + 1} výše`}>↑</button>
      <button
        onclick={() => apply(moveNode(snap(), n.id, 1))}
        disabled={i === exp.nodes.length - 1}
        aria-label={`Posunout uzlový bod ${i + 1} níže`}>↓</button
      >
      <button onclick={() => apply(removeNode(snap(), n.id))} aria-label={`Odebrat uzlový bod ${i + 1}`}>Odebrat</button>
    </p>
  </div>
{:else}
  <p class="muted">Zatím žádný uzlový bod. Výprava může mít jen příhody.</p>
{/each}
<p><button onclick={() => apply(addNode(snap()))}>Přidat uzlový bod</button></p>

<style>
  label {
    display: block;
    margin: 0.5rem 0;
  }
  label input,
  label textarea,
  label select {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .btns {
    display: flex;
    gap: 0.25rem;
    margin: 0.5rem 0 0;
  }
</style>
