<script lang="ts">
  import { installPack, removePack } from '../../core/content/store'
  import { removeDemo, restoreDemo } from '../../core/demo'
  import { library, refreshLibrary } from '../../core/library.svelte'
  import { setAuthor, settings } from '../../core/settings.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
  import AppInfo from './AppInfo.svelte'
  import SrdImport from './SrdImport.svelte'

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

  let demoMsg = $state('')
  async function demo() {
    if (
      !confirm(
        'Obnovit ukázkové postavy a družinu? Pokud je máte upravené, vrátí se do původního stavu. Ostatní data se nemění.',
      )
    )
      return
    try {
      await restoreDemo(settings.author)
      demoMsg = 'Ukázková data jsou obnovená (3 postavy a družina).'
    } catch (err) {
      demoMsg = err instanceof Error ? err.message : String(err)
    }
  }

  async function undemo() {
    if (!confirm('Odstranit ukázkové postavy a družinu? Ostatní data se nemění.')) return
    try {
      await removeDemo()
      demoMsg = 'Ukázková data jsou odstraněná.'
    } catch (err) {
      demoMsg = err instanceof Error ? err.message : String(err)
    }
  }

  async function remove(id: string) {
    const name = library.packs.find((p) => p.manifest.id === id)?.manifest.name ?? id
    if (!confirm(`Odebrat balíček „${name}“? Postavy a zápisy se nemažou, jen texty z balíčku.`))
      return
    await removePack(id)
    await refreshLibrary()
  }
</script>

<h1>Více</h1>

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

<h2>Ukázková data</h2>
<p class="muted">
  Ukázkové postavy a družina k vyzkoušení aplikace. Dají se upravit i smazat, tady je znovu
  nahrajete.
</p>
<p>
  <button onclick={demo}>Obnovit</button>
  <button onclick={undemo}>Odstranit</button>
</p>
{#if demoMsg}<p role="status" class="muted">{demoMsg}</p>{/if}

<h2>Nastavení</h2>
<div class="panel settings">
  <label>
    <span class="muted">Jméno, kterým se podepisují změny postav a zápisy:</span>
    <input
      value={settings.author}
      maxlength="60"
      onchange={(e) => setAuthor(e.currentTarget.value)}
    />
  </label>
  <LinkModeSelect />
</div>

<AppInfo />

<style>
  .settings {
    display: grid;
    gap: 0.75rem;
  }
  .pack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
</style>
