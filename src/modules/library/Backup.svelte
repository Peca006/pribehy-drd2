<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import {
    backupFileName,
    buildBackup,
    parseBackup,
    restoreBackup,
    summarize,
    type ParsedBackup,
    type RestoreMode,
    type RestoreResult,
  } from '../../core/backup'
  import { refreshRecipes } from '../../core/recipes/cache.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'

  // Záloha všech dat do jednoho souboru a obnova z něj (formát: FORMAT.md). Balíčky pravidel se nezálohují.
  let withImages = $state(true)
  let busy = $state(false)
  let msg = $state('')
  let parsed = $state<ParsedBackup | undefined>(undefined)
  let fileName = $state('')
  let mode = $state<RestoreMode>('doplnit')
  let result = $state<RestoreResult | undefined>(undefined)

  async function save() {
    busy = true
    msg = ''
    try {
      const b = await buildBackup({ withImages })
      const blob = new Blob([JSON.stringify(b)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = backupFileName()
      a.click()
      URL.revokeObjectURL(a.href)
      const s = summarize(b)
      msg = `Záloha uložena: ${s.characters} postav, ${s.parties} družin, ${s.creatures} bytostí, ${s.recipes} předpisů, ${s.expeditions} výprav, ${s.images} obrázků (${(blob.size / 1_000_000).toFixed(1)} MB).`
    } catch (err) {
      msg = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }

  async function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    result = undefined
    msg = ''
    if (!file) return
    fileName = file.name
    parsed = parseBackup(await file.text())
  }

  async function restore() {
    if (!parsed?.backup) return
    if (
      mode === 'prepsat' &&
      !(await ask('Postavy, družiny, bytosti a předpisy se stejným ID se přepíšou stavem ze zálohy. Novější změny v zařízení se tím ztratí.', {
        title: 'Přepsat data ze zálohy?',
        ok: 'Přepsat',
      }))
    )
      return
    busy = true
    try {
      result = await restoreBackup(parsed.backup, mode)
      await refreshRecipes()
      parsed = undefined
    } catch (err) {
      msg = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }

  const dropNote = (p: ParsedBackup) => {
    const d = p.dropped
    const parts = [
      d.records && `${d.records} neplatných záznamů`,
      d.newer && `${d.newer} záznamů z novější verze aplikace`,
      d.events && `${d.events} neplatných změn`,
      d.images && `${d.images} obrázků`,
      d.local && `${d.local} místních nastavení`,
    ].filter(Boolean)
    return parts.length ? `Přeskočeno: ${parts.join(', ')}.` : ''
  }
</script>

<HelpHeading title="Záloha a obnova dat" topic="zaloha" />
<div class="panel box">
  <p class="muted">
    Všechny postavy, družiny, bytosti, předpisy, ilustrace a rozpracované úpravy v jednom souboru. Soubor si uložte mimo
    telefon (e-mail sobě, cloud). Balíčky pravidel se nezálohují, stáhnou se znovu.
  </p>
  <label class="check">
    <input type="checkbox" bind:checked={withImages} /> Včetně ilustrací (soubor bývá větší)
  </label>
  <p><button class="primary" disabled={busy} onclick={save}>Stáhnout zálohu</button></p>

  <label>
    <span class="muted">Obnovit ze zálohy (soubor .json):</span>
    <input type="file" accept=".json,application/json" onchange={pick} />
  </label>

  {#if parsed}
    {#if parsed.backup}
      {@const s = summarize(parsed.backup)}
      <div role="status">
        <strong>{fileName}</strong>: {s.characters} postav, {s.parties} družin, {s.creatures} bytostí, {s.recipes} předpisů,
        {s.expeditions} výprav, {s.images} obrázků{parsed.backup.created ? `, vytvořeno ${new Date(parsed.backup.created).toLocaleString('cs-CZ')}` : ''}.
        {#if dropNote(parsed)}<p class="muted">{dropNote(parsed)}</p>{/if}
      </div>
      <label class="check">
        <input type="radio" name="rezim" value="doplnit" bind:group={mode} />
        <span><strong>Doplnit</strong>: přidá jen to, co v zařízení chybí, nic nepřepíše.</span>
      </label>
      <label class="check">
        <input type="radio" name="rezim" value="prepsat" bind:group={mode} />
        <span><strong>Přepsat</strong>: záznamy se stejným ID nahradí zálohou.</span>
      </label>
      <p><button class="primary" disabled={busy} onclick={restore}>Obnovit data</button></p>
    {:else}
      {#each parsed.errors as e}<p class="error" role="alert">{e}</p>{/each}
    {/if}
  {/if}

  {#if result}
    <p role="status">
      Obnoveno: přidáno {result.added.characters} postav, {result.added.parties} družin, {result.added.creatures} bytostí,
      {result.added.recipes} předpisů, {result.added.images} obrázků{result.replaced ? `, přepsáno ${result.replaced}` : ''}{result.kept
        ? `, ponecháno ${result.kept} stávajících`
        : ''}.
      <button onclick={() => location.reload()}>Načíst aplikaci znovu</button>
    </p>
  {/if}
  {#if msg}<p role="status" class="muted">{msg}</p>{/if}
</div>

<style>
  .box {
    display: grid;
    gap: 0.5rem;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
</style>
