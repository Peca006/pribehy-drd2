<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { untrack } from 'svelte'
  import type { Character } from '../../core/character/model'
  import {
    addKind,
    kindFull,
    kindsOf,
    MAX_MARK,
    MAX_NAME,
    removeKind,
    renameKind,
  } from '../../core/character/rawMaterials'

  // Druhy Surovin: značka (1 až 2 znaky, i emotikona) a název v jednom řádku. Druh se smí smazat jen s nulovým počtem.
  let {
    character,
    onsave,
    onclose,
  }: {
    character: Character
    onsave: (next: Character, note: string) => void | Promise<void>
    onclose: () => void
  } = $props()

  interface Row {
    id: string
    mark: string
    name: string
    count: number
    removed: boolean
  }
  let rows = $state<Row[]>(
    untrack(() => kindsOf(character)).map(({ id, kind }) => ({ id, ...kind, removed: false })),
  )
  let newMark = $state('')
  let newName = $state('')
  let added = $state<Row[]>([])
  let error = $state('')
  let dialog: HTMLDialogElement
  let seq = 0

  $effect(() => {
    dialog.showModal()
  })

  function addRow() {
    if (!newMark.trim() && !newName.trim()) return
    added.push({ id: `new${seq++}`, mark: newMark, name: newName, count: 0, removed: false })
    newMark = ''
    newName = ''
  }

  function save() {
    error = ''
    if (newMark.trim() || newName.trim()) addRow()
    let next = character
    const notes: string[] = []
    for (const r of rows) {
      const was = character.rawMaterialKinds[r.id]
      if (r.removed) {
        const e = removeKind(next, r.id)
        if ('error' in e) return void (error = e.error)
        next = e.character
        notes.push(`− ${kindFull(was)}`)
      } else if (was.mark !== r.mark.trim() || was.name !== r.name.trim()) {
        const e = renameKind(next, r.id, r.mark, r.name)
        if ('error' in e) return void (error = e.error)
        next = e.character
        notes.push(`${kindFull(was)} → ${kindFull(e.character.rawMaterialKinds[r.id])}`)
      }
    }
    for (const r of added) {
      const e = addKind(next, r.mark, r.name)
      if ('error' in e) return void (error = e.error)
      next = e.character
      notes.push(`+ ${[r.mark.trim(), r.name.trim()].filter(Boolean).join(' ')}`)
    }
    if (!notes.length) return dialog.close()
    void onsave(next, `Druhy Surovin: ${notes.join(', ')}`)
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Druhy Surovin">
  <HelpHeading flush title="Druhy Surovin" topic="suroviny" />
  <p class="muted">
    Druhy jsou volitelné: značka (stačí emotikona nebo písmeno) a název. Slouží k tomu, aby šlo vysvětlit, odkud
    Suroviny jsou (bylinky z cest, hřebíky z kovárny). Smazat jde jen druh bez Surovin.
  </p>
  {#each rows as r (r.id)}
    {#if !r.removed}
      <div class="row">
        <input class="mark" bind:value={r.mark} aria-label="Značka" placeholder="🌿" size="3" />
        <input bind:value={r.name} aria-label="Název druhu" maxlength={MAX_NAME} placeholder="Název" />
        <span class="count" title="Suroviny tohoto druhu">{r.count}</span>
        <button
          onclick={() => (r.removed = true)}
          disabled={r.count > 0}
          title={r.count > 0 ? 'Druh má ještě Suroviny' : 'Smazat druh'}
          aria-label={`Smazat druh ${kindFull(r)}`}>🗑</button
        >
      </div>
    {/if}
  {/each}
  {#each added as r (r.id)}
    <div class="row">
      <input class="mark" bind:value={r.mark} aria-label="Značka" size="3" />
      <input bind:value={r.name} aria-label="Název druhu" maxlength={MAX_NAME} />
      <span class="count">0</span>
      <button onclick={() => (added = added.filter((x) => x.id !== r.id))} aria-label="Zrušit nový druh">🗑</button>
    </div>
  {/each}
  <div class="row new">
    <input class="mark" bind:value={newMark} aria-label="Značka nového druhu" placeholder="🌿" size="3" />
    <input
      bind:value={newName}
      aria-label="Název nového druhu"
      maxlength={MAX_NAME}
      placeholder="Nový druh…"
      onkeydown={(e) => e.key === 'Enter' && addRow()}
    />
    <button onclick={addRow}>Přidat</button>
  </div>
  <p class="muted">Značka: nejvýš {MAX_MARK} znaky.</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    <button class="primary" onclick={save}>Uložit</button>
    <button onclick={() => dialog.close()}>Zrušit</button>
  </p>
</dialog>

<style>
  .row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  .row input:not(.mark) {
    flex: 1;
    min-width: 0;
  }
  .mark {
    width: 3.2rem;
    text-align: center;
  }
  .count {
    min-width: 2ch;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
