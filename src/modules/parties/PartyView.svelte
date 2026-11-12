<script lang="ts">
  import { onMount } from 'svelte'
  import { appendEvents, getLog, listLogs } from '../../core/character/store'
  import { characterOf, eventsFor, type CharacterLog } from '../../core/character/model'
  import {
    newPartyId,
    roleOf,
    type JournalEntry,
    type Member,
    type Party,
  } from '../../core/party/model'
  import { partyOverview } from '../../core/party/overview'
  import { approveEntry, rejectEntry } from '../../core/party/share'
  import { professions } from '../../core/library.svelte'
  import { deleteParty, getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'

  // Družina: členové, poznámky a žurnál dobrodružství. Průvodce vede družinu (schvaluje zápisy hráčů a zapisuje
  // sezení se zkušenostmi); hráč má její kopii a navrhuje zápisy, které Průvodce přijme nebo zamítne.
  let { id }: { id: string } = $props()

  let party = $state<Party | undefined>(undefined)
  let logs = $state.raw<CharacterLog[]>([])
  let loaded = $state(false)
  let freeName = $state('')
  let pick = $state('')
  let editing = $state('')
  let entryTitle = $state('')
  let entryText = $state('')
  let message = $state('')

  async function load() {
    party = await getParty(id)
    logs = await listLogs()
    loaded = true
  }
  onMount(load)

  const gm = $derived(party ? roleOf(party) === 'pruvodce' : false)
  const nameOfChar = (cid: string) => {
    const l = logs.find((x) => x.id === cid)
    return l ? characterOf(l).name || '(beze jména)' : undefined
  }
  const free = $derived(logs.filter((l) => !party?.members.some((m) => m.characterId === l.id)))
  const overview = $derived(
    party
      ? partyOverview(
          party.members,
          logs,
          (pid) => professions().find((p) => p.id === pid)?.name ?? pid,
        )
      : [],
  )
  const proposals = $derived(party?.journal.filter((e) => e.status === 'navrh') ?? [])
  const save = async () => {
    if (party) await saveParty($state.snapshot(party) as Party)
  }

  async function addLocal() {
    if (!party || !pick) return
    const n = nameOfChar(pick) ?? 'Postava'
    party.members = [...party.members, { id: newPartyId(), name: n, characterId: pick }]
    pick = ''
    await save()
  }
  async function addFree() {
    if (!party || !freeName.trim()) return
    party.members = [...party.members, { id: newPartyId(), name: freeName.trim() }]
    freeName = ''
    await save()
  }
  async function removeMember(m: Member) {
    if (!party || !confirm(`Odebrat „${m.name}“ z družiny? Postava ani žurnál se nemažou.`)) return
    party.members = party.members.filter((x) => x.id !== m.id)
    await save()
  }

  // --- žurnál ---
  async function addEntry() {
    if (!party || (!entryTitle.trim() && !entryText.trim())) return
    const e: JournalEntry = {
      id: newPartyId(),
      at: new Date().toISOString(),
      by: settings.author,
      // zápis hráče je návrh, který musí schválit Průvodce
      ...(gm ? {} : { status: 'navrh' as const }),
      title: entryTitle.trim() || 'Zápis',
      text: entryText.trim(),
    }
    party.journal = [e, ...party.journal]
    entryTitle = ''
    entryText = ''
    await save()
  }
  /** Hráč smí měnit a mazat jen vlastní návrhy; Průvodce všechno. */
  const mine = (e: JournalEntry) => gm || e.status === 'navrh' || e.status === 'zamitnuto'
  async function removeEntry(e: JournalEntry) {
    if (!party || !mine(e) || !confirm(`Smazat zápis „${e.title}“?`)) return
    party.journal = party.journal.filter((x) => x.id !== e.id)
    await save()
  }
  async function saveEdit(e: JournalEntry) {
    editing = ''
    e.edited = new Date().toISOString()
    // upravený zamítnutý návrh jde znovu ke schválení
    if (e.status === 'zamitnuto') e.status = 'navrh'
    await save()
  }
  async function approve(e: JournalEntry) {
    if (!party) return
    party = approveEntry($state.snapshot(party) as Party, e.id)
    await save()
  }
  async function reject(e: JournalEntry) {
    if (!party || !confirm(`Zamítnout návrh „${e.title}“? Zápis se odstraní a hráč se to dozví.`))
      return
    party = rejectEntry($state.snapshot(party) as Party, e.id)
    await save()
  }
  const day = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ')

  /** Připíše body zkušeností ze sezení postavě člena (pokud je v tomto zařízení a ještě nebyly připsány). */
  async function applyXp(e: JournalEntry, m: Member) {
    if (!party || !e.session || !m.characterId || e.session.applied.includes(m.id)) return
    const log = await getLog(m.characterId)
    const n = e.session.xp[m.id]
    if (!log || !n) {
      message = `Postava člena ${m.name} v tomto zařízení není.`
      return
    }
    const before = characterOf(log)
    await appendEvents(
      m.characterId,
      eventsFor(
        before,
        { ...before, xp: before.xp + n },
        settings.author,
        `Zkušenosti za sezení „${e.title}“ (+${n})`,
      ),
    )
    e.session.applied = [...e.session.applied, m.id]
    message = `${m.name}: připsáno ${n} bodů zkušeností.`
    await save()
  }

  async function removeParty() {
    if (!party || !confirm(`Smazat družinu „${party.name}“ i s žurnálem? Postavy zůstanou.`)) return
    await deleteParty(party.id)
    go('druziny')
  }
</script>

<nav><a class="btn" href="#/druziny">← Družiny</a></nav>

{#if !loaded}
  <p class="muted">Načítání…</p>
{:else if !party}
  <p class="muted">Družina nenalezena. <a href="#/druziny">Zpět na seznam</a></p>
{:else}
  {#if gm}
    <input class="title" bind:value={party.name} onblur={save} aria-label="Název družiny" />
    <p class="muted">Družinu vedete vy (Průvodce).</p>
  {:else}
    <h1>{party.name}</h1>
    <p class="muted">
      Kopie družiny od Průvodce. Své zápisy můžete navrhovat, Průvodce je schvaluje.
    </p>
  {/if}
  <p class="actions">
    <a class="btn" href={'#/druziny/' + party.id + '/sdilet'}>Sdílet…</a>
    <a class="btn" href="#/postavy/import">Import…</a>
  </p>

  <h2>Členové</h2>
  {#each party.members as m (m.id)}
    <div class="row">
      <span>
        <strong>{m.name}</strong>
        {#if m.characterId && nameOfChar(m.characterId)}
          <a class="muted" href={'#/postavy/' + m.characterId}>postava v zařízení</a>
        {:else}<span class="muted">postava u hráče</span>{/if}
      </span>
      {#if gm}<button onclick={() => removeMember(m)} aria-label={`Odebrat ${m.name}`}>✕</button
        >{/if}
    </div>
  {:else}
    <p class="muted">Družina zatím nemá členy.</p>
  {/each}
  {#if gm}
    {#if free.length}
      <div class="row">
        <select bind:value={pick} aria-label="Postava ze zařízení">
          <option value="">Přidat postavu z tohoto zařízení…</option>
          {#each free as l}<option value={l.id}>{characterOf(l).name || '(beze jména)'}</option
            >{/each}
        </select>
        <button disabled={!pick} onclick={addLocal}>Přidat</button>
      </div>
    {/if}
    <div class="row">
      <input
        bind:value={freeName}
        placeholder="Jiný člen (jméno hráče nebo postavy)"
        aria-label="Jméno člena"
        onkeydown={(e) => e.key === 'Enter' && addFree()}
      />
      <button disabled={!freeName.trim()} onclick={addFree}>Přidat</button>
    </div>

    <h2>Poznámky k družině</h2>
    <textarea rows="3" bind:value={party.notes} onblur={save} aria-label="Poznámky k družině"
    ></textarea>
  {:else if party.notes}
    <h2>Poznámky k družině</h2>
    <p class="text">{party.notes}</p>
  {/if}

  {#if overview.length}
    <h2>Přehled družiny</h2>
    <div class="scroll">
      <table>
        <thead>
          <tr><th>Postava</th><th>Tělo</th><th>Duše</th><th>Vliv</th><th>XP</th></tr>
        </thead>
        <tbody>
          {#each overview as r (r.member.id)}
            <tr>
              <td>
                <a href={'#/postavy/' + r.member.characterId}>{r.name}</a>
                {#if r.professions.length}<br /><span class="muted">{r.professions.join(', ')}</span>{/if}
                {#if r.scars.length}<br /><span class="muted">Jizvy: {r.scars.join('; ')}</span>{/if}
              </td>
              {#each ['Tělo', 'Duše', 'Vliv'] as const as a}
                <td class:reduced={r.reduced.includes(a)}>{r.attributes[a]}</td>
              {/each}
              <td>{r.xp}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if gm && proposals.length}
    <h2>Návrhy hráčů ({proposals.length})</h2>
    {#each proposals as e (e.id)}
      <article class="panel">
        <h3>{e.title}</h3>
        <p class="muted">{day(e.at)} · {e.by}</p>
        {#if e.text}<p class="text">{e.text}</p>{/if}
        <p class="actions">
          <button class="primary" onclick={() => approve(e)}>Přijmout do žurnálu</button>
          <button onclick={() => reject(e)}>Zamítnout</button>
        </p>
      </article>
    {/each}
  {/if}

  <h2>Žurnál dobrodružství</h2>
  {#if gm}
    <p class="actions">
      <a class="btn primary" href={'#/druziny/' + party.id + '/sezeni'}>Nové sezení (zkušenosti)</a>
    </p>
  {/if}
  <div class="panel">
    <input bind:value={entryTitle} placeholder="Nadpis zápisu" aria-label="Nadpis zápisu" />
    <textarea rows="3" bind:value={entryText} placeholder="Co se stalo…" aria-label="Text zápisu"
    ></textarea>
    <button disabled={!entryTitle.trim() && !entryText.trim()} onclick={addEntry}>
      {gm ? 'Přidat zápis' : 'Navrhnout zápis Průvodci'}
    </button>
  </div>
  {#if message}<p role="status">{message}</p>{/if}

  {#each party.journal.filter((e) => (gm ? e.status !== 'navrh' : true)) as e (e.id)}
    <article class="panel">
      {#if editing === e.id}
        <input bind:value={e.title} aria-label="Nadpis" />
        <textarea rows="4" bind:value={e.text} aria-label="Text"></textarea>
        <button class="primary" onclick={() => saveEdit(e)}>Uložit</button>
      {:else}
        <h3>
          {e.title}
          {#if e.status === 'navrh'}<span class="badge">čeká na schválení</span>{/if}
          {#if e.status === 'zamitnuto'}<span class="badge off">zamítnuto Průvodcem</span>{/if}
        </h3>
        <p class="muted">{day(e.at)} · {e.by}</p>
        {#if e.text}<p class="text">{e.text}</p>{/if}
        {#if e.session}
          <p class="muted"><strong>Zkušenosti:</strong></p>
          <ul>
            {#each party.members.filter((m) => e.session!.xp[m.id]) as m (m.id)}
              <li>
                {m.name} +{e.session.xp[m.id]}
                {#if e.session.applied.includes(m.id)}
                  <span class="muted">(připsáno)</span>
                {:else if m.characterId && nameOfChar(m.characterId)}
                  <button onclick={() => applyXp(e, m)}>Připsat postavě</button>
                {:else}<span class="muted">(předat hráči)</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
        {#if mine(e)}
          <p class="actions">
            <button onclick={() => (editing = e.id)}>Upravit</button>
            <button onclick={() => removeEntry(e)}>Smazat</button>
          </p>
        {/if}
      {/if}
    </article>
  {:else}
    <p class="muted">Žurnál je zatím prázdný.</p>
  {/each}

  <p><button onclick={removeParty}>Smazat družinu</button></p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .title {
    font-size: 1.5rem;
    font-weight: bold;
    width: 100%;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    margin: 0.35rem 0;
  }
  .row input,
  .row select {
    flex: 1;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .text {
    white-space: pre-wrap;
  }
  article h3 {
    margin: 0;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid var(--drd-muted);
  }
  .reduced {
    color: var(--drd-accent);
    font-weight: bold;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: normal;
    padding: 0.05rem 0.5rem;
    border: 1px solid var(--drd-accent);
    border-radius: 1rem;
    margin-left: 0.3rem;
    white-space: nowrap;
  }
  .badge.off {
    border-color: var(--drd-muted);
    text-decoration: line-through;
  }
</style>
