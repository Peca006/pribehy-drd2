<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { installPack, removePack } from '../../core/content/store'
  import { outdatedPacks } from '../../core/content/builds'
  import { library, refreshLibrary } from '../../core/library.svelte'
  import { download, downloads, loadCatalog } from '../../core/content/downloads.svelte'
  import { packState } from '../../core/content/packState'

  // Obsahové balíčky: distribuované (Pravidla, Bestiář) jsou vidět vždy se stavem a tlačítkem Stáhnout / Aktualizovat /
  // Odebrat; pod nimi načtení ze souboru a ostatní (načtené) balíčky s tlačítkem Odebrat.
  let error = $state('')
  const others = $derived(
    library.packs.filter((p) => !downloads.catalog?.some((e) => e.id === p.manifest.id)),
  )

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
  Pravidla a Bestiář (v rozsahu SRD) se stahují z webu aplikace a pak fungují i offline. Jiný balíček
  (např. vlastní) načtěte ze souboru <code>.json</code>.
</p>
{#each downloads.catalog ?? [] as e (e.id)}
  {@const inst = library.packs.find((p) => p.manifest.id === e.id)}
  {@const st = packState(e, inst)}
  <div class="panel pack">
    <div>
      <strong>{e.name}</strong>
      <div class="muted">
        {e.version} · {Math.round((e.size / 1024 / 1024) * 10) / 10} MB{#if st === 'ok'}
          · máte aktuální{/if}
      </div>
      {#if inst}{@render outdated(inst)}{/if}
    </div>
    <div class="actions">
      {#if st !== 'ok'}
        <button class="primary" disabled={downloads.busy} onclick={() => download([e])}>
          {downloads.current === e.id ? `Stahuji… ${downloads.percent} %` : inst ? 'Aktualizovat' : 'Stáhnout'}
        </button>
      {/if}
      {#if inst}
        <button aria-label={`Odebrat: ${e.name}`} onclick={() => remove(inst.manifest.id)}>Odebrat</button>
      {/if}
    </div>
  </div>
{/each}
{#if downloads.error && !downloads.catalog?.length}
  <p class="muted">Balíčky ke stažení teď nejsou dostupné ({downloads.error}). Použijte soubor.</p>
{/if}

<label class="btn primary">
  Načíst balíček…
  <input type="file" accept=".json,application/json" multiple onchange={onfile} hidden />
</label>
{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

{#each others as p (p.manifest.id)}
  <div class="panel pack">
    <div>
      <strong>{p.manifest.name}</strong>
      <div class="muted">
        {p.manifest.version} · {p.chapters?.length ?? 0} kapitol · {p.professions.length} povolání{#if p.races?.length}
          · {p.races.length} ras{/if}{#if p.creatures?.length}
          · {p.creatures.length} bytostí{/if}
      </div>
      {@render outdated(p)}
    </div>
    <button aria-label={`Odebrat: ${p.manifest.name}`} onclick={() => remove(p.manifest.id)}>Odebrat</button>
  </div>
{/each}

{#snippet outdated(p: (typeof library.packs)[number])}
  {#if outdatedPacks([p]).length}
    <div class="error">Starší podoba balíčku: stáhněte ho znovu, aby fungovaly nové funkce.</div>
  {/if}
{/snippet}

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .pack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
</style>
