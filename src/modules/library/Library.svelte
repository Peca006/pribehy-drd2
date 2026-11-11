<script lang="ts">
  import { installPack, removePack } from '../../core/content/store'
  import { library, refreshLibrary } from '../../core/library.svelte'

  let error = $state('')

  async function onfile(e: Event) {
    error = ''
    const input = e.currentTarget as HTMLInputElement
    try {
      for (const f of input.files ?? []) await installPack(await f.text())
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    input.value = ''
    await refreshLibrary()
  }

  async function remove(id: string) {
    await removePack(id)
    await refreshLibrary()
  }
</script>

<h1>Knihovna</h1>
<p class="muted">
  Aplikace neobsahuje texty pravidel. Načtěte obsahový balíček (soubor <code>.json</code>), který
  jste získali zvlášť.
</p>
<label class="btn primary">
  Načíst balíček…
  <input type="file" accept=".json,application/json" multiple onchange={onfile} hidden />
</label>
{#if error}<p class="error" role="alert">{error}</p>{/if}

<h2>Nainstalované balíčky</h2>
{#each library.packs as p}
  <div class="panel pack">
    <div>
      <strong>{p.manifest.name}</strong>
      <div class="muted">
        {p.manifest.version} · {p.chapters?.length ?? 0} kapitol · {p.professions.length} povolání{#if p.races?.length}
          · {p.races.length} ras{/if}
      </div>
    </div>
    <button onclick={() => remove(p.manifest.id)}>Odebrat</button>
  </div>
{:else}
  <p class="muted">Zatím žádný.</p>
{/each}

<style>
  .pack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
</style>
