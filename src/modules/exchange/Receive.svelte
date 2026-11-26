<script lang="ts">
  import { onMount } from 'svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import QrScanner from '../../ui/QrScanner.svelte'
  import { newCreatureId } from '../../core/creatures/bundle'
  import { fromScan, loadAssembler, saveAssembler } from '../../core/character/qr'
  import {
    addNpcsTo,
    describeContent,
    planAdventure,
    planExpedition,
  } from '../../core/exchange/content'
  import { detectIncoming, type Incoming } from '../../core/exchange/detect'
  import { setHandoff } from '../../core/exchange/handoff'
  import {
    listAdventures,
    listExpeditions,
    saveAdventure,
    saveExpedition,
  } from '../../core/expedition/store'
  import type { Adventure, Expedition } from '../../core/expedition/model'
  import { go } from '../../core/router.svelte'
  import { refreshInstalledSkins } from '../../core/skin/runtime'
  import { installSkinFile } from '../../core/skin/store'
  import { allCreatures, refreshBestiary, saveCreature } from '../bestiar/state.svelte'

  // Přijmout obsah: jedno místo pro soubor, kód nebo QR. Aplikace sama pozná, co přišlo (výprava, dobrodružství,
  // cizí postavy, bytosti, Háv, postava či družina), ukáže souhrn a nic neuloží bez potvrzení.
  let text = $state('')
  let errors = $state<string[]>([])
  let incoming = $state.raw<Incoming | undefined>(undefined)
  let skinBytes = $state.raw<Uint8Array | undefined>(undefined)
  let done = $state('')
  let busy = $state(false)
  let showScanner = $state(false)
  let scanInfo = $state('')
  let scanner = $state<{ stop: () => void } | undefined>(undefined)
  let adventures = $state.raw<Adventure[]>([])
  let expeditions = $state.raw<Expedition[]>([])
  let target = $state('')
  const assembler = loadAssembler()

  onMount(async () => {
    await refreshBestiary()
    adventures = await listAdventures()
    expeditions = await listExpeditions()
  })

  async function check(input: string | Uint8Array) {
    done = ''
    incoming = undefined
    skinBytes = undefined
    target = ''
    const r = await detectIncoming(input)
    errors = r.errors
    incoming = r.incoming
    if (typeof input === 'string') text = input
    if (r.incoming?.kind === 'hav' && typeof input !== 'string') skinBytes = input
  }
  async function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    input.value = ''
    if (f) await check(new Uint8Array(await f.arrayBuffer()))
  }
  async function onscan(t: string) {
    const s = assembler.add(fromScan(t))
    saveAssembler(assembler)
    if (s.status === 'partial') scanInfo = `Naskenováno ${s.have} z ${s.total} QR, naskenujte další…`
    else if (s.status === 'complete') {
      scanInfo = ''
      scanner?.stop()
      showScanner = false
      await check(s.code)
    }
  }

  async function run(fn: () => Promise<string>) {
    busy = true
    try {
      done = await fn()
      incoming = undefined
      text = ''
    } catch (e) {
      errors = [e instanceof Error ? e.message : String(e)]
    } finally {
      busy = false
    }
  }

  const content = $derived(incoming?.kind === 'obsah' ? incoming.content : undefined)
  const summary = $derived(content ? describeContent(content) : undefined)
  const targets = $derived([
    ...adventures.map((a) => ({ id: 'a:' + a.id, label: `Dobrodružství: ${a.name}` })),
    ...expeditions.map((e) => ({ id: 'e:' + e.id, label: `Výprava: ${e.name}` })),
  ])

  const addContent = () =>
    run(async () => {
      if (!content) return ''
      if (content.kind === 'vyprava') {
        const { expedition } = planExpedition(content)
        await saveExpedition(expedition)
        return `Výprava „${expedition.name}“ je přidaná jako samostatná (nic se nepřepsalo).`
      }
      if (content.kind === 'dobrodruzstvi') {
        const p = planAdventure(content)
        for (const e of p.expeditions) await saveExpedition(e)
        await saveAdventure(p.adventure)
        return `Dobrodružství „${p.adventure.name}“ je přidané i s výpravami (${p.expeditions.length}).`
      }
      const [kind, id] = target.split(':')
      if (kind === 'a') {
        const a = adventures.find((x) => x.id === id)
        if (!a) throw new Error('Vyberte, kam cizí postavy přidat.')
        await saveAdventure(addNpcsTo(a, content.npcs))
      } else {
        const e = expeditions.find((x) => x.id === id)
        if (!e) throw new Error('Vyberte, kam cizí postavy přidat.')
        await saveExpedition(addNpcsTo(e, content.npcs))
      }
      return `Cizí postavy přidané (${content.npcs.length}).`
    })

  const addCreatures = () =>
    run(async () => {
      if (incoming?.kind !== 'bestiar') return ''
      const taken = new Set(allCreatures().map((c) => c.id))
      for (const c of incoming.creatures) {
        // cizí ID se nikdy nepřepisuje: při shodě vznikne nová bytost
        const id = taken.has(c.id) || !c.id ? newCreatureId(c.name, taken) : c.id
        taken.add(id)
        await saveCreature({ ...c, id })
      }
      return `Do bestiáře přidáno bytostí: ${incoming.creatures.length}.`
    })

  const installSkin = () =>
    run(async () => {
      if (!skinBytes) return ''
      const r = await installSkinFile(skinBytes, { appVersion: __APP_VERSION__ })
      if (!r.ok) throw new Error(r.issues.map((i) => i.message).join(' ') || 'Háv se nepodařilo přečíst.')
      await refreshInstalledSkins()
      return `Háv „${r.skin?.name ?? ''}“ je nainstalovaný${r.replaced ? ' (nahradil starší se stejným ID)' : ''}. Vyberete ho v Šatníku.`
    })

  function toImport() {
    setHandoff(text)
    go('postavy', 'import')
  }
</script>

<nav><a class="btn" href="#/knihovna/dilna"><Arrow dir="left" /> Dílna</a></nav>
<h1>Přijmout obsah</h1>
<p class="muted">
  Vyberte soubor (kód <code>DRD2:</code>, balíček bytostí, Háv), vložte kód nebo naskenujte QR. Aplikace
  pozná, co přišlo, a před uložením ukáže souhrn. Nic se nepřepisuje, vždy vznikne nová kopie.
</p>
<p class="actions">
  <label class="btn">
    Vybrat soubor…
    <input type="file" accept=".txt,.json,.drdskin,text/plain,application/json,application/zip" onchange={onfile} hidden />
  </label>
  <button onclick={() => (showScanner = !showScanner)}>{showScanner ? 'Skrýt kameru' : 'Naskenovat QR'}</button>
</p>
{#if showScanner}<QrScanner bind:this={scanner} {onscan} />{/if}
{#if scanInfo}<p role="status">{scanInfo}</p>{/if}
<textarea
  rows="4"
  bind:value={text}
  oninput={() => check(text)}
  placeholder="Sem vložte kód…"
  aria-label="Kód k přijetí"
></textarea>
{#each errors as e}<p class="error" role="alert">{e}</p>{/each}

{#if content && summary}
  <div class="panel">
    <h2>{summary.title}</h2>
    {#each summary.lines as l}<p class="line">{l}</p>{/each}
    {#if content.kind === 'cizi-postava'}
      <label>
        Kam přidat
        <select bind:value={target}>
          <option value="">(vyberte)</option>
          {#each targets as t}<option value={t.id}>{t.label}</option>{/each}
        </select>
      </label>
    {/if}
    <button class="primary" disabled={busy || (content.kind === 'cizi-postava' && !target)} onclick={addContent}>Přidat</button>
  </div>
{:else if incoming?.kind === 'bestiar'}
  <div class="panel">
    <h2>Bytosti ({incoming.creatures.length})</h2>
    <ul>{#each incoming.creatures as c}<li>{c.name}</li>{/each}</ul>
    {#each incoming.errors as e}<p class="muted">{e}</p>{/each}
    <button class="primary" disabled={busy} onclick={addCreatures}>Přidat do bestiáře</button>
  </div>
{:else if incoming?.kind === 'hav'}
  <div class="panel">
    <h2>Háv</h2>
    <p>Soubor s Hávem (vzhledem aplikace). Před instalací se zkontroluje jako každý import.</p>
    <button class="primary" disabled={busy} onclick={installSkin}>Nainstalovat</button>
  </div>
{:else if incoming?.kind === 'postava'}
  <div class="panel">
    <h2>Postava, družina nebo předpisy</h2>
    <p>Tohle se přijímá v Importu postav, kde se před uložením ukáže, co se změní.</p>
    <button class="primary" onclick={toImport}>Pokračovat v Importu</button>
  </div>
{/if}

{#if done}
  <p role="status">{done}</p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  textarea {
    margin-top: 0.5rem;
    font-family: monospace;
    font-size: 0.75rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .line {
    margin: 0.15rem 0;
  }
</style>
