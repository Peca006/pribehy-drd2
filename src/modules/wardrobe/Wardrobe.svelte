<script lang="ts">
  import { onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import { setSkin, settings } from '../../core/settings.svelte'
  import { BUILTIN_CHOICES, isBuiltinChoice, SYSTEM_CHOICE } from '../../core/skin/active'
  import { writeSkinFile } from '../../core/skin/file'
  import { previewChoice, reapplyTheme, refreshInstalledSkins } from '../../core/skin/runtime'
  import { contrastIssues, SKIN_EXTENSION, type Skin, type SkinIssue } from '../../core/skin/skin'
  import { BUILTIN_SKINS } from '../../themes/havy'
  import { deleteSkin, installSkinFile, listSkins, type StoredSkin } from '../../core/skin/store'
  import DevicePreview from './DevicePreview.svelte'

  // Šatník: výběr vzhledu aplikace (Háv), import a export souborů `.drdskin` a náhled na zařízeních.
  // Formát a pravidla: WARDROBE.md.
  interface Row extends StoredSkin {
    issues: SkinIssue[]
  }
  interface Report {
    file: string
    ok: boolean
    replaced: boolean
    name: string
    issues: SkinIssue[]
  }

  let skins = $state<Row[]>([])
  let loaded = $state(false)
  let reports = $state<Report[]>([])
  let error = $state('')
  let busy = $state(false)
  let previewId = $state(SYSTEM_CHOICE)

  // zvolený Háv, který už není nainstalovaný, se chová jako „podle systému“ (stejně jako při použití vzhledu)
  const active = $derived(
    isBuiltinChoice(settings.skin) || skins.some((s) => s.skin.id === settings.skin)
      ? settings.skin
      : SYSTEM_CHOICE,
  )
  const choices = $derived([
    ...BUILTIN_CHOICES,
    ...skins.map((s) => ({ id: s.skin.id, name: s.skin.name })),
  ])

  async function load() {
    try {
      skins = (await listSkins()).map((s) => ({ ...s, issues: contrastIssues(s.skin) }))
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    loaded = true
    // náhled ukazuje Háv, který už neexistuje: vrátit na aktivní volbu
    if (!choices.some((c) => c.id === previewId)) previewId = active
  }

  onMount(async () => {
    await load()
    previewId = active
  })

  function use(id: string) {
    setSkin(id)
    reapplyTheme()
  }

  async function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const files = [...(input.files ?? [])]
    input.value = ''
    if (!files.length) return
    busy = true
    error = ''
    reports = []
    try {
      for (const f of files) {
        const r = await installSkinFile(new Uint8Array(await f.arrayBuffer()), {
          appVersion: __APP_VERSION__,
        })
        reports.push({
          file: f.name,
          ok: r.ok,
          replaced: r.replaced,
          name: r.skin?.name ?? '',
          issues: r.issues,
        })
      }
      await refreshInstalledSkins() // znovu se použije i právě přepsaný aktivní Háv
      await load()
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }

  async function save(skin: Skin) {
    try {
      const bytes = await writeSkinFile(skin)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
      )
      a.download = `${skin.id}${SKIN_EXTENSION}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
  }

  async function remove(row: Row) {
    const ok = await ask(
      `Háv „${row.skin.name}“ se z tohoto zařízení odstraní. Nemáte-li ho uložený v souboru (tlačítko Exportovat), nevrátí se.`,
      {
        title: 'Smazat Háv?',
        ok: 'Smazat',
      },
    )
    if (!ok) return
    try {
      await deleteSkin(row.skin.id)
      if (settings.skin === row.skin.id) setSkin(SYSTEM_CHOICE)
      await refreshInstalledSkins()
      await load()
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
  }

  const lineOf = (i: SkinIssue) => (i.path ? `${i.path}: ${i.message}` : i.message)
  const schemeLabel = (s: 'light' | 'dark') => (s === 'light' ? 'světlý' : 'tmavý')
</script>

<p><a href="#/knihovna">← Více</a></p>
<h1>Šatník</h1>
<p class="muted">
  Vzhled aplikace se jmenuje <strong>Háv</strong>. Háv je malý soubor <code>{SKIN_EXTENSION}</code>,
  který změní barvy, písmo a tvar prvků. Připravit ho jde na počítači a pak ho stačí přenést do
  telefonu.
</p>

{#if error}<p class="error" role="alert">{error}</p>{/if}

<h2>Vzhled</h2>
<ul class="list">
  {#each BUILTIN_CHOICES as c (c.id)}
    {@const built = BUILTIN_SKINS.find((s) => s.id === c.id)}
    <li class="panel" class:current={active === c.id}>
      <div class="head">
        <strong>{c.name}</strong>
        <span class="muted">
          vestavěný{built ? ` · ${schemeLabel(built.scheme)}` : ''}
        </span>
      </div>
      <div class="actions">
        {#if active === c.id}
          <span class="badge" aria-current="true">používá se</span>
        {:else}
          <button type="button" onclick={() => use(c.id)}>Použít</button>
        {/if}
        {#if built}
          <button
            type="button"
            onclick={() => save(built)}
            title="Uloží soubor, který lze upravit a nahrát jako vlastní Háv (pod jiným id)"
            >Exportovat jako vzor</button
          >
        {/if}
      </div>
    </li>
  {/each}
  {#each skins as row (row.skin.id)}
    <li class="panel" class:current={active === row.skin.id}>
      <div class="head">
        <strong>{row.skin.name}</strong>
        <span class="muted">
          {schemeLabel(row.skin.scheme)} · verze {row.skin.version} · {row.skin.author} · {row.skin
            .license}
        </span>
      </div>
      {#if row.issues.length}
        <details>
          <summary class:warn={row.issues.length > 0}
            >Upozornění ke kontrastu ({row.issues.length})</summary
          >
          <ul>
            {#each row.issues as i}<li>{lineOf(i)}</li>{/each}
          </ul>
        </details>
      {/if}
      <div class="actions">
        {#if active === row.skin.id}
          <span class="badge" aria-current="true">používá se</span>
        {:else}
          <button type="button" onclick={() => use(row.skin.id)}>Použít</button>
        {/if}
        <button type="button" onclick={() => save(row.skin)}>Exportovat</button>
        <button type="button" onclick={() => remove(row)}>Smazat</button>
      </div>
    </li>
  {/each}
</ul>
{#if loaded && !skins.length}
  <p class="muted">Zatím nemáte nainstalovaný žádný vlastní Háv.</p>
{/if}

<h2>Přidat Háv ze souboru</h2>
<div class="panel">
  <label class="file">
    <span class="muted">Soubor <code>{SKIN_EXTENSION}</code> (lze vybrat i několik):</span>
    <input
      type="file"
      accept="{SKIN_EXTENSION},.zip,application/zip"
      multiple
      disabled={busy}
      onchange={pick}
    />
  </label>
  <p class="muted">
    Háv je cizí soubor, proto se před přidáním zkontroluje: povolené jsou jen známé barvy, délky,
    písma a stíny a nesmí mít slabý kontrast textu.
  </p>
  {#each reports as r}
    <div class="report" class:bad={!r.ok}>
      <strong>{r.file}</strong>:
      {#if r.ok}
        přidán Háv „{r.name}“{r.replaced ? ' (nahradil starší se stejným označením)' : ''}.
      {:else}
        nepřidán.
      {/if}
      {#if r.issues.length}
        <ul>
          {#each r.issues as i}
            <li class={i.level}>{i.level === 'error' ? 'Chyba' : 'Upozornění'} · {lineOf(i)}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</div>

<h2>Náhled na zařízeních</h2>
{#if previewChoice}
  <p class="muted">Uvnitř náhledu se náhled znovu nezobrazuje.</p>
{:else}
  <label class="pick">
    <span class="muted">Zobrazit vzhled:</span>
    <select bind:value={previewId}>
      {#each choices as c (c.id)}
        <option value={c.id}>{c.name}</option>
      {/each}
    </select>
  </label>
  <DevicePreview choice={previewId} />
{/if}

<style>
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .panel.current {
    outline: 2px solid var(--drd-accent);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 0.75rem;
    align-items: baseline;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
    align-items: center;
  }
  .badge {
    color: var(--drd-accent);
    border: 1px solid var(--drd-accent);
    border-radius: 1rem;
    padding: 0.1rem 0.7rem;
  }
  .warn {
    color: var(--drd-warning);
  }
  .file,
  .pick {
    display: grid;
    gap: 0.3rem;
  }
  .pick {
    margin-bottom: 0.5rem;
  }
  .report {
    margin-top: 0.5rem;
  }
  .report.bad > strong {
    color: var(--drd-danger);
  }
  li.error {
    color: var(--drd-danger);
  }
  li.warning {
    color: var(--drd-warning);
  }
  code {
    font-size: 0.9em;
  }
</style>
