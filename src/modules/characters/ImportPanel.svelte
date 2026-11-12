<script lang="ts">
  import type { CharacterLog } from '../../core/character/model'
  import { recordResponse } from '../../core/character/reviews'
  import { groupRevisions, revertEvents, revisionChanges } from '../../core/character/revisions'
  import {
    analyzeImport,
    applyRevisions,
    decodeBundle,
    encodeBundle,
    type Bundle,
    type ImportAnalysis,
    type ReviewBundle,
    type RevisionBundle,
  } from '../../core/character/share'
  import { appendEvents, getLog, saveLog } from '../../core/character/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import { describeChange, pathLabel } from './describe'

  // Import kódu nebo souboru od jiného zařízení: revize od hráče (přijmout / zamítnout) a odpověď
  // vypravěče (stav revizí, vrácení zamítnutých změn).
  let text = $state('')
  let errors = $state<string[]>([])
  let bundle = $state.raw<Bundle | undefined>(undefined)
  let log = $state.raw<CharacterLog | undefined>(undefined)
  let analysis = $state.raw<ImportAnalysis | undefined>(undefined)
  let accept = $state<Record<string, boolean>>({})
  let result = $state('')
  let reply = $state('')
  let replyNote = $state('')
  let replyBundle = $state.raw<ReviewBundle | undefined>(undefined)

  async function check() {
    result = ''
    reply = ''
    bundle = undefined
    analysis = undefined
    errors = []
    if (!text.trim()) return
    const r = await decodeBundle(text)
    errors = r.errors
    bundle = r.bundle
    if (!bundle) return
    log = await getLog(bundle.char)
    if (bundle.type === 'revize') {
      analysis = analyzeImport(log, bundle)
      accept = Object.fromEntries(analysis.fresh.map((x) => [x.id, true]))
    }
  }
  async function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    if (f) {
      text = await f.text()
      await check()
    }
    input.value = ''
  }

  // změny jednotlivých příchozích revizí v pořadí, v jakém se použijí
  const shown = $derived.by(() => {
    if (!bundle || bundle.type !== 'revize' || !analysis) return []
    const b: RevisionBundle = bundle
    let tmp: CharacterLog | undefined = log
    return analysis.fresh.map((r) => {
      tmp = applyRevisions(tmp, b, new Set([r.id]))
      const rev = groupRevisions(tmp.events).find((x) => x.id === r.id)
      return { r, changes: rev ? revisionChanges(tmp, rev) : [] }
    })
  })

  const KIND: Record<ImportAnalysis['kind'], string> = {
    'nova-postava': 'Tuto postavu ještě v zařízení nemáte, vznikne nová.',
    navazuje: 'Změny navazují na poslední revizi v deníku.',
    'jiny-stav':
      'V deníku jsou od společného základu novější změny. Příchozí hodnoty přepíšou současné u stejných polí.',
    'neznamy-zaklad':
      'Základ těchto změn v deníku není (postava mohla být upravena jinde). Zkontrolujte rozdíl.',
    'nic-noveho': 'Všechny revize už v deníku jsou.',
  }

  async function decide() {
    if (!bundle || bundle.type !== 'revize' || !analysis) return
    const accepted = analysis.fresh.filter((r) => accept[r.id]).map((r) => r.id)
    const rejected = analysis.fresh.filter((r) => !accept[r.id]).map((r) => r.id)
    if (accepted.length) await saveLog(applyRevisions(log, bundle, new Set(accepted)))
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
    result = `Přijato revizí: ${accepted.length}, zamítnuto: ${rejected.length}.`
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
    // od nejnovější po nejstarší, aby se vracelo postupně
    let cur = log
    for (const rid of [...bundle.rejected].reverse()) {
      const rev = groupRevisions(cur.events).find((r) => r.id === rid)
      if (!rev) continue
      const undo = revertEvents(
        cur,
        rev,
        settings.author,
        `Vrácení (zamítnuto): ${rev.note || 'změna'}`,
      )
      if (undo.length) cur = await appendEvents(cur.id, undo)
    }
    recordResponse(bundle.char, bundle.accepted, bundle.rejected, bundle.note)
    go('postavy', bundle.char)
  }
</script>

<nav><a class="btn" href="#/postavy">← Postavy</a></nav>
<h1>Import</h1>
<p class="muted">
  Vložte kód (začíná <code>DRD2:</code>) nebo vyberte soubor od hráče nebo vypravěče. Před uložením
  uvidíte, co se změní.
</p>
<label class="btn">
  Vybrat soubor…
  <input type="file" accept=".txt,.json,text/plain,application/json" onchange={onfile} hidden />
</label>
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
  <p>{KIND[analysis.kind]}</p>
  {#if analysis.conflicts.length}
    <p class="panel error" role="alert">
      Změněno na obou stranách: {analysis.conflicts.map(pathLabel).join(', ')}.
    </p>
  {/if}
  {#each shown as { r, changes } (r.id)}
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
    </div>
  {/each}
  {#if analysis.fresh.length}
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
    {#if canShare}<button onclick={shareReply}>Sdílet…</button>{/if}
    <a class="btn" href={'#/postavy/' + bundle?.char}>Otevřít postavu</a>
  </p>
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
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
