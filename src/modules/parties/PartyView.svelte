<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import PartyRuns from '../expeditions/PartyRuns.svelte'
  import { ask } from '../../core/confirm.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import { onMount } from 'svelte'
  import { appendEvents, getLog, listLogs } from '../../core/character/store'
  import { characterOf, type CharacterLog } from '../../core/character/model'
  import {
    baseXpOf,
    PACES,
    roleOf,
    type JournalEntry,
    type Member,
    type Party,
  } from '../../core/party/model'
  import {
    addFreeMember,
    addLocalMember,
    canChange,
    editedEntry,
    markApplied,
    newEntry,
    removeMember as removeMemberFrom,
    withEntry,
    withoutEntry,
    xpGrant,
  } from '../../core/party/journal'
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
    party = addLocalMember(party, pick, nameOfChar(pick) ?? 'Postava')
    pick = ''
    await save()
  }
  async function addFree() {
    if (!party || !freeName.trim()) return
    party = addFreeMember(party, freeName)
    freeName = ''
    await save()
  }
  async function removeMember(m: Member) {
    if (!party) return
    if (
      !(await ask('Postava ani žurnál se nemažou.', {
        title: `Odebrat „${m.name}“ z družiny?`,
        ok: 'Odebrat',
      }))
    )
      return
    party = removeMemberFrom(party, m.id)
    await save()
  }

  // --- žurnál ---
  async function addEntry() {
    if (!party) return
    const e = newEntry(settings.author, gm, entryTitle, entryText)
    if (!e) return
    party = withEntry(party, e)
    entryTitle = ''
    entryText = ''
    await save()
  }
  /** Hráč smí měnit a mazat jen vlastní návrhy; Průvodce všechno. */
  const mine = (e: JournalEntry) => canChange(gm, e)
  async function removeEntry(e: JournalEntry) {
    if (!party || !mine(e)) return
    if (!(await ask(`Smazat zápis „${e.title}“?`, { title: 'Smazat zápis', ok: 'Smazat' })))
      return
    party = withoutEntry(party, e.id)
    await save()
  }
  async function saveEdit(e: JournalEntry) {
    editing = ''
    Object.assign(e, editedEntry(e))
    await save()
  }
  async function seen(e: JournalEntry) {
    delete e.changed
    await save()
  }
  async function approve(e: JournalEntry) {
    if (!party) return
    party = approveEntry($state.snapshot(party) as Party, e.id)
    await save()
  }
  async function reject(e: JournalEntry) {
    if (!party) return
    if (
      !(await ask('Zápis se odstraní a hráč se to dozví.', {
        title: `Zamítnout návrh „${e.title}“?`,
        ok: 'Zamítnout',
      }))
    )
      return
    party = rejectEntry($state.snapshot(party) as Party, e.id)
    await save()
  }
  const day = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ')

  /** Připíše body zkušeností ze sezení postavě člena (pokud je v tomto zařízení a ještě nebyly připsány). */
  async function applyXp(e: JournalEntry, m: Member) {
    if (!party || !e.session || !m.characterId || e.session.applied.includes(m.id)) return
    const grant = xpGrant(e, m, await getLog(m.characterId), settings.author)
    if (!grant.ok) {
      message = `Postava člena ${m.name} v tomto zařízení není.`
      return
    }
    await appendEvents(m.characterId, grant.events)
    Object.assign(e, markApplied(e, m.id))
    message = `${m.name}: připsáno ${grant.xp} bodů zkušeností.`
    await save()
  }

  async function removeParty() {
    if (!party) return
    if (
      !(await ask('Smaže se i žurnál. Postavy zůstanou.', {
        title: `Smazat družinu „${party.name}“?`,
        ok: 'Smazat',
      }))
    )
      return
    await deleteParty(party.id)
    go('druziny')
  }
</script>

<nav><a class="btn" href="#/druziny"><Arrow dir="left" /> Družiny</a></nav>

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
    {#if gm}<a class="btn primary" href={'#/druziny/' + party.id + '/sezeni'}
        >Nové sezení (zkušenosti)</a
      >{/if}
    {#if gm}<a class="btn" href={'#/druziny/' + party.id + '/konflikt'}>Konflikt</a>{/if}
    <a class="btn" href={'#/druziny/' + party.id + '/sdilet'}>Sdílet…</a>
  </p>
  {#if !gm && party.notes}
    <p class="text">{party.notes}</p>
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

  {#if gm}<PartyRuns partyId={party.id} />{/if}

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
                {#if r.professions.length}<br /><span class="muted">{r.professions.join(', ')}</span
                  >{/if}
                {#if r.scars.length}<br /><span class="muted">Jizvy: {r.scars.join('; ')}</span
                  >{/if}
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

  <HelpHeading title="Žurnál dobrodružství" topic="zurnal" />
  <details class="panel fold">
    <summary><strong>{gm ? '+ Nový zápis' : '+ Navrhnout zápis Průvodci'}</strong></summary>
    <div>
      <input bind:value={entryTitle} placeholder="Nadpis zápisu" aria-label="Nadpis zápisu" />
      <textarea rows="3" bind:value={entryText} placeholder="Co se stalo…" aria-label="Text zápisu"
      ></textarea>
      <button disabled={!entryTitle.trim() && !entryText.trim()} onclick={addEntry}>
        {gm ? 'Přidat zápis' : 'Navrhnout zápis Průvodci'}
      </button>
    </div>
  </details>
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
          {#if e.changed && !gm}<span class="badge">změnil Průvodce</span>{/if}
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
        {#if e.changed && !gm}
          <p class="actions">
            <button onclick={() => seen(e)}>Beru na vědomí</button>
          </p>
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
    <details class="panel fold">
      <summary>Přidat člena</summary>
      {#if free.length}
        <div class="row">
          <select bind:value={pick} aria-label="Postava ze zařízení">
            <option value="">Přidat postavu z tohoto zařízení…</option>
            {#each free as l (l.id)}<option value={l.id}>{characterOf(l).name || '(beze jména)'}</option
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
    </details>

    <details class="panel fold">
      <summary>Nastavení družiny</summary>
      <h3>Rychlost postupu</h3>
      <select
        value={baseXpOf(party)}
        onchange={(e) => {
          party!.baseXp = Number(e.currentTarget.value)
          save()
        }}
        aria-label="Rychlost postupu"
      >
        {#each PACES as p}<option value={p.xp}>{p.label}</option>{/each}
      </select>
      <p class="muted">
        Kolik bodů zkušeností dostane každý za účast na sezení (odměny se přidávají k tomu).
      </p>

      <h3>Poznámky k družině</h3>
      <textarea rows="3" bind:value={party.notes} onblur={save} aria-label="Poznámky k družině"
      ></textarea>
    </details>
  {/if}

  <details class="more">
    <summary>Další</summary>
    <button onclick={removeParty}>Smazat družinu…</button>
  </details>
{/if}

<style>
  .fold,
  .more {
    margin: 1rem 0;
  }
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
    border-bottom: 1px solid var(--drd-border);
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
    border-color: var(--drd-border);
    text-decoration: line-through;
  }
</style>
