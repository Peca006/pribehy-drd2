<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import { onMount } from 'svelte'
  import type { Creature } from '../../core/content/schema'
  import { exportBundle, newCreatureId, parseBundle } from '../../core/creatures/bundle'
  import { go } from '../../core/router.svelte'
  import { allCreatures, bestiary, refreshBestiary, saveCreature } from './state.svelte'

  // Import a export vlastních bytostí.
  let { selected = '' }: { selected?: string } = $props()
  onMount(refreshBestiary)

  let chosen = $state<Record<string, boolean>>({})
  $effect(() => {
    if (selected) chosen[selected] = true
  })
  const picked = $derived(bestiary.user.filter((c) => chosen[c.id]))

  function download() {
    const blob = new Blob([exportBundle(picked, 'Moje bytosti')], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'bestiar.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  let copied = $state(false)
  async function copy() {
    await navigator.clipboard.writeText(exportBundle(picked, 'Moje bytosti'))
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  // --- import ---
  let text = $state('')
  let incoming = $state<Creature[]>([])
  let errors = $state<string[]>([])
  let done = $state('')

  function check() {
    done = ''
    const r = parseBundle(text)
    incoming = r.creatures
    errors = r.errors
  }
  async function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    if (f) {
      text = await f.text()
      check()
    }
    input.value = ''
  }
  async function doImport() {
    const taken = new Set(allCreatures().map((c) => c.id))
    for (const c of incoming) {
      // cizí ID se nikdy nepřepisuje: při shodě vznikne nová bytost
      const id = taken.has(c.id) || !c.id ? newCreatureId(c.name, taken) : c.id
      taken.add(id)
      await saveCreature({ ...c, id })
    }
    done = `Importováno bytostí: ${incoming.length}.`
    incoming = []
    text = ''
  }
</script>

<nav><a class="btn" href="#/bestiar"><Arrow dir="left" /> Bestiář</a></nav>
<h1>Import a export</h1>

<h2>Export vlastních bytostí</h2>
{#if bestiary.user.length}
  {#each bestiary.user as c}
    <label class="check"><input type="checkbox" bind:checked={chosen[c.id]} /> {c.name}</label>
  {/each}
  <p class="actions">
    <button class="primary" disabled={!picked.length} onclick={download}>Stáhnout soubor</button>
    <button disabled={!picked.length} onclick={copy}
      >{copied ? 'Zkopírováno ✓' : 'Zkopírovat text'}</button
    >
  </p>
{:else}
  <p class="muted">Zatím nemáte žádné vlastní bytosti.</p>
{/if}

<h2>Import</h2>
<p class="muted">
  Vložte text balíčku bytostí (JSON) nebo vyberte soubor. Před uložením uvidíte, co se přidá.
</p>
<label class="btn">
  Vybrat soubor…
  <input type="file" accept=".json,application/json" onchange={onfile} hidden />
</label>
<textarea
  rows="5"
  bind:value={text}
  oninput={check}
  placeholder="Sem vložte JSON…"
  aria-label="Text k importu"
></textarea>
{#each errors as e}<p class="error" role="alert">{e}</p>{/each}
{#if incoming.length}
  <div class="panel">
    <strong>K importu ({incoming.length}):</strong>
    <ul>
      {#each incoming as c}<li>{c.name}</li>{/each}
    </ul>
    <button class="primary" onclick={doImport}>Přidat do bestiáře</button>
  </div>
{/if}
{#if done}<p role="status">
    {done} <button onclick={() => go('bestiar')}>Otevřít bestiář</button>
  </p>{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.3rem 0;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  textarea {
    margin-top: 0.5rem;
  }
</style>
