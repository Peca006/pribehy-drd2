<script lang="ts">
  import { onMount } from 'svelte'
  import { characterOf, type CharacterLog } from '../../core/character/model'
  import { loadReviews, markSent, type Reviews } from '../../core/character/reviews'
  import { groupRevisions } from '../../core/character/revisions'
  import { slugify } from '../../core/creatures/bundle'
  import { fitForQr, type Fitted } from '../../core/character/compact'
  import { QR_CHUNK, splitForQr } from '../../core/character/qr'
  import { buildRevisionBundle, encodeBundle } from '../../core/character/share'
  import { getLog } from '../../core/character/store'
  import QrView from '../../ui/QrView.svelte'

  // Sdílení revizí postavy (hráč → vypravěč): kód k vložení, soubor nebo systémové sdílení
  // (AirDrop, Quick Share, zprávy). Odeslané revize se označí a příště se posílají jen novější.
  let { id }: { id: string } = $props()

  let log = $state<CharacterLog | undefined>(undefined)
  let reviews = $state<Reviews>({ status: {} })
  let mode = $state<'nove' | 'cela'>('nove')
  let code = $state('')
  let note = $state('')

  onMount(async () => {
    log = await getLog(id)
    reviews = loadReviews(id)
    mode = reviews.sentUpTo ? 'nove' : 'cela'
  })

  const name = $derived(log ? characterOf(log).name || 'postava' : '')
  const revs = $derived(log ? groupRevisions(log.events) : [])
  const sinceIndex = $derived(
    mode === 'nove' && reviews.sentUpTo ? revs.findIndex((r) => r.id === reviews.sentUpTo) : -1,
  )
  const included = $derived(revs.slice(sinceIndex + 1))
  const when = (iso: string) => new Date(iso).toLocaleString('cs-CZ')

  $effect(() => {
    const l = log
    if (!l) return
    const since = sinceIndex >= 0 ? revs[sinceIndex].id : null
    encodeBundle(buildRevisionBundle(l, name, since)).then((c) => (code = c))
  })

  const bytes = $derived(new TextEncoder().encode(code).length)
  const sent = () =>
    markSent(
      id,
      included.map((r) => r.id),
    )
  let copied = $state(false)
  let copyFailed = $state(false)
  let showQr = $state(false)
  // zhuštění starší historie jen pro QR (kód, soubor a sdílení zůstávají s celou historií)
  let compactOn = $state(false)
  let maxQr = $state(1)
  let fitted = $state.raw<Fitted | undefined>(undefined)
  const canCompact = $derived(sinceIndex < 0 && revs.length > 1)
  $effect(() => {
    const l = log
    fitted = undefined
    if (!l || !showQr || !compactOn || !canCompact) return
    fitForQr(l, name, maxQr).then((f) => (fitted = f))
  })
  const qrCode = $derived(compactOn && canCompact && fitted ? fitted.code : code)
  const qrCount = $derived(splitForQr(qrCode).length)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      copyFailed = true
      return
    }
    copyFailed = false
    sent()
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = `postava-${slugify(name) || 'drd2'}.drd2.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    sent()
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  async function share() {
    const file = new File([code], `postava.drd2.txt`, { type: 'text/plain' })
    try {
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: `Postava ${name}`, files: [file] })
      else await navigator.share({ title: `Postava ${name}`, text: code })
      sent()
    } catch {
      /* uživatel sdílení zrušil */
    }
  }
</script>

<nav><a class="btn" href={'#/postavy/' + id}>← Zpět na postavu</a></nav>

{#if !log}
  <p class="muted">Postava nenalezena. <a href="#/postavy">Zpět na seznam</a></p>
{:else}
  <h1>Sdílet postavu {name}</h1>
  <p class="muted">
    Vypravěč dostane změny jako revize, uvidí rozdíl a může je přijmout nebo zamítnout. Kód nebo
    soubor pošlete jakkoli (zpráva, e-mail, AirDrop, Quick Share) a vypravěč ho vloží v části
    <em>Postavy → Import</em>.
  </p>

  <fieldset>
    <label class="check">
      <input type="radio" bind:group={mode} value="nove" disabled={!reviews.sentUpTo} />
      Jen změny od posledního odeslání
    </label>
    <label class="check">
      <input type="radio" bind:group={mode} value="cela" /> Celá postava od začátku
    </label>
  </fieldset>

  <h2>Obsah ({included.length})</h2>
  {#if included.length}
    <ul>
      {#each included as r}
        <li>
          <strong>{r.note || 'Změna'}</strong>
          <span class="muted"> · {r.by} · {when(r.at)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Od posledního odeslání nejsou žádné nové změny.</p>
  {/if}

  {#if included.length}
    <p class="muted">Velikost kódu: {code.length} znaků ({bytes} B).</p>
    <textarea rows="4" readonly value={code} aria-label="Kód ke sdílení"></textarea>
    {#if copyFailed}<p class="error" role="alert">
        Kopírování není povoleno, označte text výše a zkopírujte ho ručně (nebo použijte soubor).
      </p>{/if}
    <p class="actions">
      <button class="primary" onclick={copy}>{copied ? 'Zkopírováno ✓' : 'Zkopírovat kód'}</button>
      <button
        onclick={() => {
          showQr = !showQr
          if (showQr) sent()
        }}>{showQr ? 'Skrýt QR' : 'Ukázat QR'}</button
      >
      <button onclick={download}>Stáhnout soubor</button>
      {#if canShare}<button onclick={share}>Sdílet…</button>{/if}
    </p>
    {#if showQr}
      {#if canCompact}
        <label class="check">
          <input type="checkbox" bind:checked={compactOn} />
          Zhustit starší historii, aby se vešla do
          <select bind:value={maxQr} disabled={!compactOn} aria-label="Nejvýš QR kódů">
            <option value={1}>1 QR</option>
            <option value={2}>2 QR</option>
            <option value={3}>3 QR</option>
          </select>
        </label>
      {/if}
      {#if compactOn && fitted}
        <p class="muted">
          {#if fitted.merged}
            {fitted.merged} nejstarších revizí je sloučeno do výchozího stavu; jejich podrobnosti se příjemci
            nepřenesou (v zařízení vám zůstanou).
          {:else}
            Zhuštění není potřeba, historie se vejde celá.
          {/if}
          {#if !fitted.fits}
            Ani po zhuštění se kód nevejde do {maxQr} QR (potřebuje {fitted.qrCount}).
          {/if}
        </p>
      {:else if !compactOn && code.length > QR_CHUNK}
        <p class="muted">
          Kód potřebuje {qrCount} QR. Zhuštěním starší historie lze počet snížit.
        </p>
      {/if}
      <QrView code={qrCode} />
    {/if}
  {/if}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0.5rem 0;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.3rem 0;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  textarea {
    font-family: monospace;
    font-size: 0.75rem;
  }
</style>
