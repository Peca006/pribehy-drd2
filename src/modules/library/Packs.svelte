<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { installPack, removePack } from '../../core/content/store'
  import { library, refreshLibrary } from '../../core/library.svelte'
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
  Aplikace neobsahuje texty pravidel. Načtěte obsahový balíček (soubor <code>.json</code>), který
  jste získali zvlášť.
</p>
<label class="btn primary">
  Načíst balíček…
  <input type="file" accept=".json,application/json" multiple onchange={onfile} hidden />
</label>
{#if error}<p class="error" role="alert">{error}</p>{/if}

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
