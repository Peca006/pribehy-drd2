<script lang="ts">
  import { type Character } from '../../core/character/model'
  import { MAX_SCAR, inflictScar, type Inflicted } from '../../core/character/healing'
  import { effectiveAttributes } from '../../core/character/play'
  import { newId } from '../../core/character/model'
  import type { Attribute } from '../../core/content/schema'

  // Zasazení jizvy: vlastnost, závažnost, popis a původ (následek akce, nebo si ji hráč zasadí sám kvůli Zdrojům).
  let {
    character,
    attribute,
    onsave,
    onclose,
  }: {
    character: Character
    attribute: Attribute
    onsave: (c: Character, scarNote: string, gain: number, attribute: Attribute) => void
    onclose: () => void
  } = $props()

  const attr = attribute
  let severity = $state(1)
  let note = $state('')
  let self = $state(true)
  let dialog: HTMLDialogElement

  const left = $derived(effectiveAttributes(character)[attr])
  const result = $derived<Inflicted>(
    inflictScar(character, { attribute: attr, severity, note }, self, 'n'),
  )
  const error = $derived('error' in result ? result.error : '')

  $effect(() => {
    dialog.showModal()
  })

  function save() {
    const r = inflictScar(character, { attribute: attr, severity, note }, self, newId())
    if ('error' in r) return
    onsave(r.character, `${attr} ${severity}${note.trim() ? `: ${note.trim()}` : ''}`, r.gain, attr)
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Jizva">
  <h2>Jizva: {attr}</h2>
  <div class="row">
    <span>Závažnost</span>
    <button onclick={() => (severity = Math.max(1, severity - 1))} aria-label="Menší">−</button>
    <strong>{severity}</strong>
    <button onclick={() => (severity = Math.min(MAX_SCAR, severity + 1))} aria-label="Větší"
      >+</button
    >
  </div>
  <input
    type="text"
    bind:value={note}
    placeholder="Popis (např. vymknutý kotník)"
    aria-label="Popis jizvy"
  />
  <label class="check">
    <input type="checkbox" bind:checked={self} />
    Zasadit si sám/sama pro Zdroje (+{severity + 2}
    {attr}, nutno utratit v téže akci)
  </label>
  <p class="muted">
    Snižuje zdatnost ({attr}
    {character.attributes[attr]}, teď {left}) a blokuje obnovu Zdrojů. Omezené akce jsou o {severity}
    náročnější.
  </p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    <button class="primary" onclick={save} disabled={!!error}>Zasadit</button>
    <button onclick={() => dialog.close()}>Zrušit</button>
  </p>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(24rem, 92vw);
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
    margin-bottom: 0.75rem;
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
