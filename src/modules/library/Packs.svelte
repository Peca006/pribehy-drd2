<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { installPack, removePack } from '../../core/content/store'
  import { outdatedPacks } from '../../core/content/builds'
  import { library, refreshLibrary } from '../../core/library.svelte'
  import { download, downloads, loadCatalog } from '../../core/content/downloads.svelte'
  import { needsUpdate } from '../../core/content/remote'
  import SrdImport from './SrdImport.svelte'

  // Obsahové balíčky: načtení ze souboru, seznam nainstalovaných, odebrání a (sbalený) převod SRD.
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

  loadCatalog()

  async function remove(id: string) {
    const name = library.packs.find((p) => p.manifest.id === id)?.manifest.name ?? id
    if (
      !(await ask('Postavy a zápisy se nemažou, jen texty z balíčku.', {
        title: `Odebrat balíček „${name}“?`,
        ok: 'Odebrat',
      }))
    )
      return
    await removePack(id)
    await refreshLibrary()
  }
</script>

<h2>Obsahové balíčky</h2>
<p class="muted">
  Texty pravidel se do aplikace stahují jako samostatné balíčky (vychází ze SRD), nebo načtěte soubor
  <code>.json</code>, který jste získali zvlášť.
</p>
{#if downloads.catalog?.length}
  <h3>Ke stažení</h3>
  {#each downloads.catalog as e}
    {@const inst = library.packs.find((p) => p.manifest.id === e.id)}
    <div class="panel pack">
      <div>
        <strong>{e.name}</strong>
        <div class="muted">
          {e.version} · {Math.round(e.size / 1024 / 1024 * 10) / 10} MB{#if inst && !needsUpdate(e, inst)}
            · máte aktuální{/if}
        </div>
      </div>
      {#if needsUpdate(e, inst)}
        <button class="primary" disabled={downloads.busy} onclick={() => download([e])}>
          {downloads.current === e.id ? 'Stahuji…' : inst ? 'Aktualizovat' : 'Stáhnout'}
        </button>
      {/if}
    </div>
  {/each}
{:else if downloads.error}
  <p class="muted">Balíčky ke stažení teď nejsou dostupné ({downloads.error}). Použijte soubor.</p>
{/if}
<label class="btn primary">
  Načíst balíček…
  <input type="file" accept=".json,application/json" multiple onchange={onfile} hidden />
</label>
{#if error || (downloads.catalog && downloads.error)}
  <p class="error" role="alert">{error || downloads.error}</p>
{/if}

<h3>Nainstalované</h3>
{#each library.packs as p}
  <div class="panel pack">
    <div>
      <strong>{p.manifest.name}</strong>
      <div class="muted">
        {p.manifest.version} · {p.chapters?.length ?? 0} kapitol · {p.professions.length} povolání{#if p.races?.length}
          · {p.races.length} ras{/if}{#if p.creatures?.length}
          · {p.creatures.length} bytostí{/if}
      </div>
      {#if outdatedPacks([p]).length}
        <div class="error">
          Starší podoba balíčku: stáhněte ho znovu (nebo ho vytvořte přes Převod ze SRD), aby
          fungovaly nové funkce.
        </div>
      {/if}
    </div>
    <button onclick={() => remove(p.manifest.id)}>Odebrat</button>
  </div>
{:else}
  <p class="muted">Zatím žádný.</p>
{/each}

<SrdImport />

<style>
  .pack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
</style>
