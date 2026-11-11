<script lang="ts">
  import { onMount } from 'svelte'
  import type { ContentPack } from './core/content/schema'
  import { installPack, listPacks, removePack } from './core/content/store'
  import Reader from './ui/Reader.svelte'

  let packs = $state<ContentPack[]>([])
  let reading = $state<ContentPack | undefined>(undefined)
  let error = $state('')

  const refresh = async () => (packs = await listPacks())
  onMount(refresh)

  async function onfile(e: Event) {
    error = ''
    const input = e.currentTarget as HTMLInputElement
    try {
      for (const f of input.files ?? []) await installPack(await f.text())
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    input.value = ''
    await refresh()
  }

  async function remove(id: string) {
    await removePack(id)
    await refresh()
  }
</script>

<main>
  {#if reading}
    <Reader pack={reading} onback={() => (reading = undefined)} />
  {:else}
    <h1>Družina</h1>
    <p class="muted">
      Aplikace neobsahuje texty pravidel. Načtěte obsahový balíček (soubor <code>.json</code>),
      který jste získali zvlášť.
    </p>
    <label class="load">
      Načíst balíček…
      <input type="file" accept=".json,application/json" multiple onchange={onfile} hidden />
    </label>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <h2>Nainstalované balíčky</h2>
    {#each packs as p}
      <div class="pack">
        <div>
          <strong>{p.manifest.name}</strong>
          <div class="muted">
            {p.manifest.version} · {p.chapters?.length ?? 0} kapitol · {p.professions.length} povolání
          </div>
        </div>
        {#if p.chapters?.length}<button onclick={() => (reading = p)}>Číst</button>{/if}
        <button onclick={() => remove(p.manifest.id)}>Odebrat</button>
      </div>
    {:else}
      <p class="muted">Zatím žádný.</p>
    {/each}
  {/if}
</main>

<style>
  main {
    max-width: 44rem;
    margin: 0 auto;
    padding: var(--drd-gap);
  }
  h1,
  h2 {
    color: var(--drd-accent);
  }
  .muted {
    color: var(--drd-muted);
  }
  .error {
    color: #e66;
    white-space: pre-line;
  }
  .load,
  button {
    display: inline-block;
    font: inherit;
    color: var(--drd-text);
    background: var(--drd-surface);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    padding: 0.6rem 1rem;
    min-height: 44px;
    cursor: pointer;
  }
  .pack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    margin: 0.5rem 0;
    background: var(--drd-surface);
    border-radius: var(--drd-radius);
  }
</style>
