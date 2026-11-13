<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import { onMount } from 'svelte'
  import { encodeBundle } from '../../core/character/share'
  import { slugify } from '../../core/creatures/bundle'
  import { QR_CHUNK, splitForQr } from '../../core/character/qr'
  import { roleOf, type Party } from '../../core/party/model'
  import { buildPartyBundle } from '../../core/party/share'
  import { getParty, saveParty } from '../../core/party/store'
  import { settings } from '../../core/settings.svelte'
  import QrView from '../../ui/QrView.svelte'
  import RadioSend from '../../ui/RadioSend.svelte'

  // Sdílení družiny. Průvodce posílá hráčům družinu a schválené zápisy; hráč posílá Průvodci své návrhy zápisů.
  let { id }: { id: string } = $props()

  let party = $state.raw<Party | undefined>(undefined)
  let mode = $state<'nove' | 'cela'>('cela')
  let code = $state('')
  let showQr = $state(false)
  let showRadio = $state(false)
  let copied = $state(false)
  let copyFailed = $state(false)

  onMount(async () => {
    party = await getParty(id)
    if (party?.lastSent) mode = 'nove'
  })

  const gm = $derived(party ? roleOf(party) === 'pruvodce' : false)
  const bundle = $derived(
    party
      ? buildPartyBundle(party, settings.author, gm && mode === 'nove' ? party.lastSent : null)
      : undefined,
  )
  $effect(() => {
    const b = bundle
    if (b) encodeBundle(b).then((c) => (code = c))
  })
  const empty = $derived(!bundle || (bundle.journal.length === 0 && !gm))
  const qrCount = $derived(splitForQr(code).length)

  async function sent() {
    if (!party || !gm) return
    party = { ...party, lastSent: new Date().toISOString() }
    await saveParty(party)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      copyFailed = true
      return
    }
    copyFailed = false
    copied = true
    setTimeout(() => (copied = false), 2000)
    await sent()
  }
  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = `druzina-${slugify(party?.name ?? '') || 'drd2'}.drd2.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    void sent()
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  async function share() {
    const file = new File([code], 'druzina.drd2.txt', { type: 'text/plain' })
    try {
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: `Družina ${party?.name}`, files: [file] })
      else await navigator.share({ title: `Družina ${party?.name}`, text: code })
      await sent()
    } catch {
      /* zrušeno */
    }
  }
</script>

<nav><a class="btn" href={'#/druziny/' + id}><Arrow dir="left" /> Zpět</a></nav>

{#if !party}
  <p class="muted">Družina nenalezena. <a href="#/druziny">Zpět na seznam</a></p>
{:else}
  <h1>Sdílet družinu {party.name}</h1>
  {#if gm}
    <p class="muted">
      Hráči dostanou členy, poznámky a schválené zápisy žurnálu a zkušenosti ze sezení. Kód nebo
      soubor pošlete jakkoli a hráči ho vloží v <em>Postavy → Import</em>.
    </p>
    <fieldset>
      <label class="check">
        <input type="radio" bind:group={mode} value="nove" disabled={!party.lastSent} />
        Jen nové a změněné zápisy od posledního odeslání
      </label>
      <label class="check">
        <input type="radio" bind:group={mode} value="cela" /> Celá družina
      </label>
    </fieldset>
  {:else}
    <p class="muted">
      Průvodce dostane vaše návrhy zápisů, uvidí je a přijme je do žurnálu, nebo zamítne. O výsledku
      se dozvíte s příští družinou od Průvodce.
    </p>
  {/if}

  {#if bundle}
    <h2>Obsah</h2>
    <p class="muted">
      {gm ? 'Členů' : 'Návrhů zápisů'}: {gm
        ? bundle.party.members.length
        : bundle.journal.length}{gm ? `, zápisů: ${bundle.journal.length}` : ''}
    </p>
    {#if empty}
      <p class="muted">Nemáte žádné návrhy zápisů k odeslání. Přidejte zápis v žurnálu družiny.</p>
    {:else}
      <ul>
        {#each bundle.journal as e}<li>{e.title || 'Zápis'}</li>{/each}
      </ul>
      <p class="muted">
        Velikost kódu: {code.length} znaků{code.length > QR_CHUNK ? `, QR: ${qrCount}` : ''}.
      </p>
      <textarea rows="4" readonly value={code} aria-label="Kód ke sdílení"></textarea>
      {#if copyFailed}<p class="error" role="alert">
          Kopírování není povoleno, označte text a zkopírujte ho ručně (nebo použijte soubor).
        </p>{/if}
      <p class="actions">
        <button class="primary" onclick={copy}>{copied ? 'Zkopírováno ✓' : 'Zkopírovat kód'}</button
        >
        <button
          onclick={() => {
            showQr = !showQr
            if (showQr) void sent()
          }}>{showQr ? 'Skrýt QR' : 'Ukázat QR'}</button
        >
        <button onclick={download}>Stáhnout soubor</button>
        {#if canShare}<button onclick={share}>Sdílet…</button>{/if}
        <button onclick={() => (showRadio = !showRadio)}
          >{showRadio ? 'Skrýt zvuk' : 'Vysílat zvukem'}</button
        >
      </p>
      {#if showQr}<QrView {code} />{/if}
      {#if showRadio}<RadioSend {code} onsent={() => void sent()} />{/if}
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
