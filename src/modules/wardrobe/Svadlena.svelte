<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import BackButton from '../../ui/BackButton.svelte'
  import { setSkin, settings } from '../../core/settings.svelte'
  import type { AssetFile } from '../../core/skin/file'
  import { assetLimitError } from '../../core/skin/editor-assets'
  import {
    TOKEN_GROUPS,
    blankSkin,
    copyForEditing,
    setMeta,
    setScheme,
    setToken,
    tokenValue,
    type TokenField,
  } from '../../core/skin/editor'
  import { reapplyTheme, refreshInstalledSkins } from '../../core/skin/runtime'
  import { validateSkin, type Skin, type SkinIssue } from '../../core/skin/skin'
  import { getSkin, getSkinAssets, listSkins, putSkin, type StoredSkin } from '../../core/skin/store'
  import { BUILTIN_ASSETS, BUILTIN_SKINS } from '../../themes/havy'
  import DevicePreview from './DevicePreview.svelte'
  import SvadlenaImages from './SvadlenaImages.svelte'
  import SvadlenaVariants from './SvadlenaVariants.svelte'
  import TokenControl from './TokenControl.svelte'
  import { downloadSkin } from './download'

  // Švadlena: editor Hávů. Upravuje se vždy vlastní kopie uložená v zařízení; každá změna projde stejnou validací jako
  // import souboru a po krátké prodlevě se uloží, takže náhled (aplikace v rámečku zařízení) ukazuje poslední platný stav.
  // Etapa 1: tokeny (barvy, písmo, tvary, mezery, průhlednost panelů, poloha lišty). Etapa 2: obrázky, role,
  // ikony záložek a ozdoby (`SvadlenaImages.svelte`). Etapa 3: varianty podle viewportu (`SvadlenaVariants.svelte`). Pravidla formátu: WARDROBE.md.
  let { id }: { id?: string } = $props()

  const APP = { appVersion: __APP_VERSION__ }
  const SAVE_DELAY = 500

  // ---------- seznam a založení ----------
  let installed = $state.raw<StoredSkin[]>([])
  let startId = $state('zaklad-dark')
  let newName = $state('')
  let error = $state('')
  let busy = $state(false)

  const starts = $derived([
    { id: 'zaklad-dark', name: 'Tmavý základ (jen barvy)' },
    { id: 'zaklad-light', name: 'Světlý základ (jen barvy)' },
    ...BUILTIN_SKINS.map((s) => ({ id: s.id, name: `${s.name} (vestavěný)` })),
    ...installed.map((s) => ({ id: s.skin.id, name: `${s.skin.name} (nainstalovaný)` })),
  ])

  async function loadInstalled() {
    try {
      installed = await listSkins()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  async function sourceOf(choice: string): Promise<{ skin: Skin; assets: readonly AssetFile[] } | null> {
    if (choice === 'zaklad-dark') return { skin: blankSkin('dark'), assets: [] }
    if (choice === 'zaklad-light') return { skin: blankSkin('light'), assets: [] }
    const builtin = BUILTIN_SKINS.find((s) => s.id === choice)
    if (builtin) return { skin: builtin, assets: BUILTIN_ASSETS[choice] ?? [] }
    const stored = installed.find((s) => s.skin.id === choice)
    return stored ? { skin: stored.skin, assets: await getSkinAssets(choice) } : null
  }

  async function create() {
    busy = true
    error = ''
    try {
      const src = await sourceOf(startId)
      if (!src) throw new Error('Zdrojový Háv se nenašel.')
      const name = newName.trim() || `Můj ${src.skin.name.replace(/ \(.*$/, '')}`
      const copy = copyForEditing(src.skin, {
        name,
        author: settings.author,
        taken: installed.map((s) => s.skin.id),
      })
      const r = await putSkin(copy, Date.now(), APP, src.assets)
      if (!r.ok) throw new Error(r.issues.map(lineOf).join('; ') || 'Háv se nepodařilo uložit.')
      await refreshInstalledSkins()
      location.hash = `#/satnik/svadlena/${copy.id}`
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      busy = false
    }
  }

  // ---------- editor ----------
  let draft = $state.raw<Skin | null>(null)
  let assets = $state.raw<readonly AssetFile[]>([])
  let missing = $state(false)
  let problems = $state.raw<SkinIssue[]>([])
  let fieldError = $state<Record<string, string>>({})
  let saved = $state(true)
  let rev = $state(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  const errors = $derived(problems.filter((p) => p.level === 'error'))
  const warnings = $derived(problems.filter((p) => p.level === 'warning'))

  async function open(skinId: string) {
    const stored = await getSkin(skinId)
    if (!stored) {
      missing = true
      return
    }
    assets = BUILTIN_ASSETS[skinId] ?? (await getSkinAssets(skinId))
    draft = stored.skin
    problems = validateSkin(stored.skin, APP).issues
  }

  function edit(next: Skin) {
    draft = next
    saved = false
    clearTimeout(timer)
    timer = setTimeout(flush, SAVE_DELAY)
  }

  function editWithAssets(next: Skin, nextAssets: readonly AssetFile[]) {
    assets = nextAssets
    edit(next)
  }

  /** Uloží rozpracovaný Háv, je-li platný; jinak ponechá poslední uloženou verzi a ukáže důvody. */
  async function flush() {
    clearTimeout(timer)
    const current = draft
    if (!current) return
    const v = validateSkin(current, APP)
    const limit = assetLimitError(assets)
    problems = limit ? [...v.issues, { level: 'error', path: 'assets', message: limit }] : v.issues
    if (!v.ok || limit) return
    try {
      const r = await putSkin(current, Date.now(), APP, assets)
      if (!r.ok) {
        problems = r.issues
        return
      }
      saved = draft === current
      await refreshInstalledSkins() // je-li Háv právě používaný, použije se hned
      rev++
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  function setField(f: TokenField, raw: string) {
    if (!draft) return
    const r = setToken(draft, f.name, raw)
    if (r.error) {
      fieldError = { ...fieldError, [f.name]: r.error }
      return
    }
    const { [f.name]: _drop, ...rest } = fieldError
    fieldError = rest
    if (r.skin !== draft) edit(r.skin)
  }

  async function use() {
    if (!draft) return
    await flush()
    setSkin(draft.id)
    await reapplyTheme()
  }

  async function exportFile() {
    if (!draft) return
    await flush()
    try {
      await downloadSkin(draft, assets)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  const lineOf = (i: SkinIssue) => (i.path ? `${i.path}: ${i.message}` : i.message)

  onMount(() => {
    void loadInstalled()
    if (id) void open(id)
  })
  // rozpracovaná úprava se při odchodu ze stránky uloží (platná) a nepřijde nazmar
  onDestroy(() => {
    if (!saved) void flush()
  })
</script>

<nav><BackButton fallback={id ? '#/satnik/svadlena' : '#/knihovna/dilna'} /></nav>
<h1>Švadlena</h1>

{#if error}<p class="error" role="alert">{error}</p>{/if}

{#if !id}
  <p class="muted">
    Tady si ušijete vlastní Háv, tedy vzhled aplikace. Vždy se upravuje kopie, vestavěné Hávy zůstávají
    beze změny. Úpravy se ukládají samy a vedle formuláře je vidět, jak aplikace vypadá.
  </p>

  <h2>Nový Háv</h2>
  <div class="panel create">
    <label>
      <span class="muted">Začít od:</span>
      <select bind:value={startId}>
        {#each starts as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
      </select>
    </label>
    <label>
      <span class="muted">Název:</span>
      <input bind:value={newName} maxlength="60" placeholder="Můj Háv" />
    </label>
    <p><button class="primary" disabled={busy} onclick={create}>Přešít</button></p>
  </div>

  <h2>Moje Hávy</h2>
  {#if installed.length}
    <ul class="list">
      {#each installed as row (row.skin.id)}
        <li class="panel">
          <strong>{row.skin.name}</strong>
          <span class="muted">{row.skin.author} · verze {row.skin.version}</span>
          <a class="btn" href="#/satnik/svadlena/{row.skin.id}">Přešít</a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Zatím žádný. Nainstalované Hávy ze souboru se tu také objeví a půjdou upravit.</p>
  {/if}
{:else if missing}
  <p class="error" role="alert">Háv „{id}“ v tomto zařízení není. <a href="#/satnik/svadlena">Zpět na seznam</a></p>
{:else if draft}
  {@const d = draft}
  <div class="head">
    <h2>{d.name}</h2>
    <span class="muted" role="status">{saved ? 'Uloženo' : 'Ukládá se…'}</span>
  </div>
  <p class="actions">
    {#if settings.skin === d.id}
      <span class="badge" aria-current="true">používá se</span>
    {:else}
      <button type="button" onclick={use}>Použít</button>
    {/if}
    <button type="button" onclick={exportFile}>Exportovat</button>
  </p>

  {#if errors.length}
    <div class="error" role="alert">
      <strong>Tento stav se neuložil a náhled ukazuje poslední platný:</strong>
      <ul>{#each errors as e}<li>{lineOf(e)}</li>{/each}</ul>
    </div>
  {/if}
  {#if warnings.length}
    <details>
      <summary class="warn">Upozornění ({warnings.length})</summary>
      <ul>{#each warnings as w}<li>{lineOf(w)}</li>{/each}</ul>
    </details>
  {/if}

  <div class="layout">
    <div class="form">
      <section class="panel">
        <h3>O Hávu</h3>
        <label>
          <span class="muted">Název</span>
          <input value={d.name} maxlength="60" onchange={(e) => edit(setMeta(d, { name: e.currentTarget.value }))} />
        </label>
        <label>
          <span class="muted">Autor</span>
          <input value={d.author} maxlength="80" onchange={(e) => edit(setMeta(d, { author: e.currentTarget.value }))} />
        </label>
        <label>
          <span class="muted">Licence</span>
          <input value={d.license} maxlength="120" onchange={(e) => edit(setMeta(d, { license: e.currentTarget.value }))} />
        </label>
        <label>
          <span class="muted">Schéma (určuje výchozí barvy)</span>
          <select value={d.scheme} onchange={(e) => edit(setScheme(d, e.currentTarget.value === 'light' ? 'light' : 'dark'))}>
            <option value="dark">Tmavé</option>
            <option value="light">Světlé</option>
          </select>
        </label>
      </section>

      {#each TOKEN_GROUPS as g (g.id)}
        <section class="panel">
          <h3>{g.title}</h3>
          {#each g.fields as f (f.name)}
            <TokenControl
              field={f}
              value={tokenValue(d, f.name)}
              overridden={f.name in d.tokens}
              error={fieldError[f.name] ?? ''}
              onset={(raw) => setField(f, raw)}
            />
          {/each}
        </section>
      {/each}

      <SvadlenaImages skin={d} {assets} onchange={editWithAssets} />
      <SvadlenaVariants skin={d} onchange={edit} />
    </div>

    <div class="preview">
      <h3>Náhled</h3>
      <DevicePreview choice={d.id} {rev} />
    </div>
  </div>
{:else}
  <p class="muted">Načítá se…</p>
{/if}

<style>
  .create {
    display: grid;
    gap: 0.5rem;
  }
  .list {
    list-style: none;
    padding: 0;
  }
  .list li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: baseline;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .layout {
    display: grid;
    gap: 1rem;
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: minmax(320px, 440px) 1fr;
      align-items: start;
    }
    .preview {
      position: sticky;
      top: 0.5rem;
    }
  }
  .form section {
    display: grid;
    gap: 0.5rem;
  }
  .form section > label,
  .create > label {
    display: grid;
    gap: 0.2rem;
  }
  .form section > label input {
    width: 100%;
  }
  h3 {
    margin: 0;
  }
  .badge {
    border: 1px solid var(--drd-accent);
    color: var(--drd-accent);
    padding: 0.2rem 0.6rem;
  }
  .warn {
    color: var(--drd-warning);
  }
</style>
