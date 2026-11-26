<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import { characterOf, emptyCharacter, type CharacterLog } from '../../core/character/model'
  import { recordResponse } from '../../core/character/reviews'
  import { getAt, groupRevisions } from '../../core/character/revisions'
  import {
    analyzeImport,
    applyRevisions,
    decodeBundle,
    encodeBundle,
    previewAfter,
    type Bundle,
    type ImportAnalysis,
    type ReviewBundle,
  } from '../../core/character/share'
  import { getLog } from '../../core/character/store'
  import {
    acceptRevisions,
    decisionOf,
    incomingSteps,
    KIND_TEXT,
    recipeImportNote,
    revertRejectedRevisions,
    withKeptMine,
  } from '../../core/character/importFlow'
  import { upgradeBundle } from '../../core/recipes/legacy'
  import { importRecipes } from '../../core/recipes/exchange'
  import { fromScan, loadAssembler, saveAssembler } from '../../core/character/qr'
  import { onMount } from 'svelte'
  import { takeShared } from '../../core/sharedInbox'
  import { takeHandoff } from '../../core/exchange/handoff'
  import { mergeIncoming, type MergeResult } from '../../core/party/share'
  import { getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import QrScanner from '../../ui/QrScanner.svelte'
  import AudioReceive from '../../ui/audiogram/AudioReceive.svelte'
  import QrView from '../../ui/QrView.svelte'
  import CheckList from './CheckList.svelte'
  import { describeChange, pathLabel } from './describe'

  // Import kódu nebo souboru od jiného zařízení: revize od hráče (přijmout / zamítnout) a odpověď
  // vypravěče (stav revizí, vrácení zamítnutých změn).
  // `part`: kód nebo díl kódu z adresy (QR s odkazem otevřený systémovou čtečkou)
  let { part }: { part?: string } = $props()
  let text = $state('')
  let showAudio = $state(false)
  let errors = $state<string[]>([])
  let bundle = $state.raw<Bundle | undefined>(undefined)
  let log = $state.raw<CharacterLog | undefined>(undefined)
  let analysis = $state.raw<ImportAnalysis | undefined>(undefined)
  let accept = $state<Record<string, boolean>>({})
  /** konfliktní pole (cesta) → ponechat místní hodnotu */
  let keep = $state<Record<string, boolean>>({})
  let result = $state('')
  let reply = $state('')
  let replyNote = $state('')
  let replyBundle = $state.raw<ReviewBundle | undefined>(undefined)
  let showReplyQr = $state(false)
  let partyMerge = $state.raw<MergeResult | undefined>(undefined)
  async function acceptParty() {
    if (!bundle || bundle.type !== 'druzina' || !partyMerge?.party) return
    await saveParty(partyMerge.party)
    go('druziny', bundle.party.id)
  }
  async function acceptRecipes() {
    if (!bundle || bundle.type !== 'predpisy') return
    const imp = await importRecipes(bundle.recipes)
    result = `Grimoár: ${recipeImportNote(imp)}`
    bundle = undefined
  }
  let scanner = $state<{ stop: () => void } | undefined>(undefined)
  let scanInfo = $state('')
  const assembler = loadAssembler()

  async function check() {
    result = ''
    reply = ''
    bundle = undefined
    analysis = undefined
    partyMerge = undefined
    errors = []
    if (!text.trim()) return
    const r = await decodeBundle(text)
    errors = r.errors
    // balíček ze starého formátu (lektvary a nástrahy přímo v deníku) se převede na odkazy na předpisy
    bundle = r.bundle ? upgradeBundle(r.bundle) : undefined
    if (!bundle) return
    if (bundle.type === 'druzina') {
      partyMerge = mergeIncoming(await getParty(bundle.party.id), bundle)
      return
    }
    if (bundle.type === 'predpisy') return // zobrazí se nabídka přidání do Grimoáru
    log = await getLog(bundle.char)
    if (bundle.type === 'revize') {
      analysis = analyzeImport(log, bundle)
      accept = Object.fromEntries(analysis.fresh.map((x) => [x.id, true]))
      keep = {}
    }
  }
  // QR z kamery: díly se skládají, hotový kód se zpracuje stejně jako vložený text
  async function onscan(t: string) {
    const s = assembler.add(fromScan(t))
    saveAssembler(assembler)
    if (s.status === 'partial')
      scanInfo = `Naskenováno ${s.have} z ${s.total} QR, naskenujte další…`
    else if (s.status === 'complete') {
      scanInfo = ''
      scanner?.stop()
      text = s.code
      await check()
    }
  }
  function discardParts() {
    assembler.reset()
    saveAssembler(assembler)
    scanInfo = ''
  }
  // QR otevřený systémovou čtečkou: kód (nebo jeho díl) je v adrese; díly se skládají mezi otevřeními
  onMount(async () => {
    if (part === 'sdileno') {
      // kód sdílený z jiné aplikace
      history.replaceState(null, '', location.pathname + location.search + '#/postavy/import')
      const shared = await takeShared()
      if (shared) {
        text = shared.trim()
        await check()
      } else errors = ['Sdílený kód se nepodařilo načíst.']
      return
    }
    const handed = takeHandoff()
    if (handed && !part) {
      text = handed.trim()
      await check()
      return
    }
    if (!part) return
    history.replaceState(null, '', location.pathname + location.search + '#/postavy/import')
    await onscan(part)
  })
  async function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    if (f) {
      text = await f.text()
      await check()
    }
    input.value = ''
  }

  // kontrola postavy po přijetí zaškrtnutých revizí (s označením nových problémů)
  const acceptedSet = $derived(
    new Set(
      Object.entries(accept)
        .filter(([, v]) => v)
        .map(([k]) => k),
    ),
  )
  const keptPaths = $derived(Object.keys(keep).filter((p) => keep[p]))
  const afterChar = $derived.by(() => {
    if (bundle?.type !== 'revize' || !analysis) return undefined
    if (!log || !keptPaths.length) return previewAfter(log, bundle, acceptedSet)
    const next = withKeptMine(
      log,
      applyRevisions(log, bundle, acceptedSet),
      keptPaths,
      settings.author,
    )
    return characterOf(next)
  })
  // místní a příchozí hodnota u konfliktních polí (příchozí = po přijetí všech nových revizí)
  const conflictRows = $derived.by(() => {
    if (bundle?.type !== 'revize' || !analysis || !log) return []
    const mineNow = characterOf(log)
    const theirs = characterOf(
      applyRevisions(log, bundle, new Set(analysis.fresh.map((r) => r.id))),
    )
    return analysis.conflicts.map((path) => ({
      path,
      lines: describeChange({ path, before: getAt(mineNow, path), after: getAt(theirs, path) }),
    }))
  })
  const beforeChar = $derived(log ? characterOf(log) : undefined)

  // změny jednotlivých příchozích revizí v pořadí, v jakém se použijí
  const shown = $derived(
    bundle?.type === 'revize' && analysis ? incomingSteps(log, bundle, analysis) : [],
  )

  async function decide() {
    if (!bundle || bundle.type !== 'revize' || !analysis) return
    const { accepted, rejected } = decisionOf(analysis, accept)
    const recipeMsg = await acceptRevisions(log, bundle, accepted, keptPaths, settings.author)
    log = await getLog(bundle.char)
    replyBundle = {
      v: 1,
      type: 'odpoved',
      char: bundle.char,
      name: bundle.name,
      accepted,
      rejected,
      note: '',
    }
    result = `Přijato revizí: ${accepted.length}, zamítnuto: ${rejected.length}.${recipeMsg}`
    analysis = undefined
    await makeReply()
  }
  async function makeReply() {
    if (replyBundle) reply = await encodeBundle({ ...replyBundle, note: replyNote })
  }
  let copied = $state(false)
  async function copyReply() {
    try {
      await navigator.clipboard.writeText(reply)
    } catch {
      return
    }
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  async function shareReply() {
    try {
      await navigator.share({ title: 'Odpověď vypravěče', text: reply })
    } catch {
      /* zrušeno */
    }
  }

  // --- odpověď vypravěče u hráče ---
  const mine = $derived(log ? groupRevisions(log.events) : [])
  const label = (rid: string) => mine.find((r) => r.id === rid)?.note || rid
  async function applyResponse() {
    if (!bundle || bundle.type !== 'odpoved') return
    recordResponse(bundle.char, bundle.accepted, bundle.rejected, bundle.note)
    result = 'Odpověď je zapsána do historie postavy.'
  }
  async function revertRejected() {
    if (!bundle || bundle.type !== 'odpoved' || !log) return
    await revertRejectedRevisions(log, bundle.rejected, settings.author)
    recordResponse(bundle.char, bundle.accepted, bundle.rejected, bundle.note)
    go('postavy', bundle.char)
  }
</script>

<nav><a class="btn" href="#/postavy"><Arrow dir="left" /> Postavy</a></nav>
<HelpHeading level={1} title="Import" topic="import" />
<p class="muted">
  Vložte kód (začíná <code>DRD2:</code>) nebo vyberte soubor od hráče nebo vypravěče. Před uložením
  uvidíte, co se změní.
</p>
<label class="btn">
  Vybrat soubor…
  <input type="file" accept=".txt,.json,text/plain,application/json" onchange={onfile} hidden />
</label>
<QrScanner bind:this={scanner} {onscan} />
<button onclick={() => (showAudio = !showAudio)}
  >{showAudio ? 'Skrýt zvuk' : 'Přijímat zvukem'}</button
>
{#if showAudio}<AudioReceive
    onresult={async (t) => {
      text = t
      showAudio = false
      await check()
    }}
  />{/if}
{#if scanInfo}<p role="status">
    {scanInfo} <button onclick={discardParts}>Zahodit naskenované díly</button>
  </p>{/if}
<textarea
  rows="4"
  bind:value={text}
  oninput={check}
  placeholder="Sem vložte kód…"
  aria-label="Kód k importu"
></textarea>
{#each errors as e}<p class="error" role="alert">{e}</p>{/each}

{#if bundle?.type === 'revize' && analysis}
  <h2>Postava {bundle.name || bundle.char}</h2>
  <p>{KIND_TEXT[analysis.kind]}</p>
  {#if bundle?.type === 'revize' && bundle.images?.length}
    <p class="muted">Soubor obsahuje ilustrace postavy ({bundle.images.length}), po přijetí revize se k postavě přidají.</p>
  {/if}
  {#if analysis.note}<p class="muted">{analysis.note}</p>{/if}
  {#if bundle.omitted?.length}
    <p class="muted">
      Hráč kvůli velikosti QR neposlal: {bundle.omitted.map(pathLabel).join(', ').toLowerCase()}.
      Tyto texty se nezmění (u nové postavy zůstanou prázdné).
    </p>
  {/if}
  {#if analysis.conflicts.length}
    <div class="panel error" role="alert">
      <p>Změněno na obou stranách. U každého pole zvolte, která hodnota zůstane:</p>
      {#each conflictRows as row (row.path)}
        <div>
          <strong>{pathLabel(row.path)}</strong>
          {#each row.lines as line}<div class="muted">{line}</div>{/each}
          <label class="check">
            <input type="radio" name={'k-' + row.path} checked={!keep[row.path]} onchange={() => (keep[row.path] = false)} />
            <span>Příchozí (jejich)</span>
          </label>
          <label class="check">
            <input type="radio" name={'k-' + row.path} checked={!!keep[row.path]} onchange={() => (keep[row.path] = true)} />
            <span>Ponechat moje</span>
          </label>
        </div>
      {/each}
    </div>
  {/if}
  {#each shown as { r, changes, before, after } (r.id)}
    <div class="panel">
      <label class="check">
        <input type="checkbox" bind:checked={accept[r.id]} />
        <span>
          <strong>{r.note || 'Změna'}</strong>
          <span class="muted"> · {r.by} · {new Date(r.at).toLocaleString('cs-CZ')}</span>
        </span>
      </label>
      <ul class="changes">
        {#each changes as c}
          <li>
            <span class="muted">{pathLabel(c.path)}:</span>
            {#each describeChange(c) as line}<div>{line}</div>{/each}
          </li>
        {:else}
          <li class="muted">Beze změny.</li>
        {/each}
      </ul>
      <CheckList
        character={after}
        baseline={before ?? emptyCharacter(after.id)}
        onlyNew
        title="Tato revize způsobuje"
      />
    </div>
  {/each}
  {#if analysis.fresh.length}
    {#if afterChar}
      <CheckList
        character={afterChar}
        baseline={beforeChar}
        title="Kontrola postavy po přijetí zaškrtnutých revizí"
      />
    {/if}
    <p class="muted">Zaškrtnuté revize se přijmou, ostatní se zamítnou.</p>
    <button class="primary" onclick={decide}>Potvrdit rozhodnutí</button>
  {/if}
{/if}

{#if result}<p role="status">{result}</p>{/if}

{#if reply && replyBundle}
  <h2>Odpověď hráči</h2>
  <p class="muted">
    Volitelně hráči pošlete, co jste přijal a co zamítl, aby si u sebe zamítnuté změny mohl vrátit.
  </p>
  <label>
    Poznámka (nepovinná)
    <input bind:value={replyNote} oninput={makeReply} placeholder="např. Na meč nemáš dost peněz" />
  </label>
  <textarea rows="3" readonly value={reply} aria-label="Kód odpovědi"></textarea>
  <p class="actions">
    <button onclick={copyReply}>{copied ? 'Zkopírováno ✓' : 'Zkopírovat odpověď'}</button>
    <button onclick={() => (showReplyQr = !showReplyQr)}
      >{showReplyQr ? 'Skrýt QR' : 'Ukázat QR'}</button
    >
    {#if canShare}<button onclick={shareReply}>Sdílet…</button>{/if}
    <a class="btn" href={'#/postavy/' + (bundle && 'char' in bundle ? bundle.char : '')}
      >Otevřít postavu</a
    >
  </p>
  {#if showReplyQr}<QrView code={reply} />{/if}
{/if}

{#if bundle?.type === 'predpisy'}
  <h2>Předpisy do Grimoáru</h2>
  <div class="panel">
    <p>Balíček obsahuje předpisy ({bundle.recipes.length}):</p>
    <ul>
      {#each bundle.recipes as r (r.id)}<li>{r.name}</li>{/each}
    </ul>
    <p class="muted">Co už v Grimoáru je, se nezdvojí; nic se nepřepisuje.</p>
    <p><button class="primary" onclick={acceptRecipes}>Přidat do Grimoáru</button></p>
  </div>
{/if}

{#if bundle?.type === 'druzina' && partyMerge}
  <h2>Družina {bundle.party.name}</h2>
  <p>
    {bundle.from === 'pruvodce'
      ? `Družinu posílá Průvodce${bundle.author && bundle.author !== 'hráč' ? ' ' + bundle.author : ''}.`
      : `Návrhy zápisů od hráče${bundle.author && bundle.author !== 'hráč' ? ' ' + bundle.author : ''} (Průvodce je schválí nebo zamítne).`}
  </p>
  {#if partyMerge.error}
    <p class="error" role="alert">{partyMerge.error}</p>
  {:else}
    {#if partyMerge.report.created}
      <p>
        V zařízení ještě nemáte, vznikne vaše kopie družiny ({bundle.party.members.length} členů).
      </p>
    {/if}
    {#each partyMerge.report.added as e (e.id)}
      <div class="panel">
        <strong>{e.title || 'Zápis'}</strong>
        <span class="muted"> · {e.by} · {new Date(e.at).toLocaleDateString('cs-CZ')} · nový</span>
        {#if e.text}<p class="entry">{e.text}</p>{/if}
      </div>
    {/each}
    {#each partyMerge.report.updated as e (e.id)}
      <div class="panel">
        <strong>{e.title || 'Zápis'}</strong>
        <span class="muted"> · změněný zápis</span>
        {#if e.text}<p class="entry">{e.text}</p>{/if}
      </div>
    {/each}
    {#if partyMerge.report.ignored}<p class="muted">
        Beze změny: {partyMerge.report.ignored}.
      </p>{/if}
    <button
      class="primary"
      disabled={!partyMerge.report.created &&
        !partyMerge.report.added.length &&
        !partyMerge.report.updated.length &&
        bundle.from === 'hrac'}
      onclick={acceptParty}>Přijmout</button
    >
  {/if}
{/if}

{#if bundle?.type === 'odpoved'}
  <h2>Odpověď vypravěče: {bundle.name || bundle.char}</h2>
  {#if !log}
    <p class="error" role="alert">Tato postava v zařízení není.</p>
  {:else}
    {#if bundle.note}<p>„{bundle.note}“</p>{/if}
    <p>Přijato: {bundle.accepted.length}, zamítnuto: {bundle.rejected.length}</p>
    <ul>
      {#each bundle.accepted as rid}<li>✓ {label(rid)}</li>{/each}
      {#each bundle.rejected as rid}<li>✕ {label(rid)}</li>{/each}
    </ul>
    <p class="actions">
      <button onclick={applyResponse}>Zapsat do historie</button>
      {#if bundle.rejected.length}
        <button class="primary" onclick={revertRejected}>Vrátit zamítnuté změny</button>
      {/if}
    </p>
  {/if}
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
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .check input {
    width: auto;
    min-height: 0;
    margin-top: 0.3rem;
  }
  .changes {
    list-style: none;
    padding-left: 0.5rem;
    font-size: 0.9rem;
  }
  .entry {
    white-space: pre-wrap;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
