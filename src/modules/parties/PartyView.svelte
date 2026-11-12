<script lang="ts">
  import { onMount } from 'svelte'
  import { appendEvents, getLog, listLogs } from '../../core/character/store'
  import { characterOf, eventsFor, type CharacterLog } from '../../core/character/model'
  import { newPartyId, type JournalEntry, type Member, type Party } from '../../core/party/model'
  import { deleteParty, getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'

  // Družina: členové, poznámky a žurnál dobrodružství (zápisy a zápisy ze sezení s rozdanými zkušenostmi).
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

  const nameOfChar = (cid: string) => {
    const l = logs.find((x) => x.id === cid)
    return l ? characterOf(l).name || '(beze jména)' : undefined
  }
  const free = $derived(logs.filter((l) => !party?.members.some((m) => m.characterId === l.id)))
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
      title: entryTitle.trim() || 'Zápis',
      text: entryText.trim(),
    }
    party.journal = [e, ...party.journal]
    entryTitle = ''
    entryText = ''
    await save()
  }
  async function removeEntry(e: JournalEntry) {
    if (!party || !confirm(`Smazat zápis „${e.title}“?`)) return
    party.journal = party.journal.filter((x) => x.id !== e.id)
    await save()
  }
  async function saveEdit(e: JournalEntry) {
    editing = ''
    await save()
    void e
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
  <input class="title" bind:value={party.name} onblur={save} aria-label="Název družiny" />

  <h2>Členové</h2>
  {#each party.members as m (m.id)}
    <div class="row">
      <span>
        <strong>{m.name}</strong>
        {#if m.characterId}
          <a class="muted" href={'#/postavy/' + m.characterId}>postava v zařízení</a>
        {:else}<span class="muted">postava u hráče</span>{/if}
      </span>
      <button onclick={() => removeMember(m)} aria-label={`Odebrat ${m.name}`}>✕</button>
    </div>
  {:else}
    <p class="muted">Družina zatím nemá členy.</p>
  {/each}
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

  <h2>Žurnál dobrodružství</h2>
  <p class="actions">
    <a class="btn primary" href={'#/druziny/' + party.id + '/sezeni'}>Nové sezení (zkušenosti)</a>
  </p>
  <div class="panel">
    <input bind:value={entryTitle} placeholder="Nadpis zápisu" aria-label="Nadpis zápisu" />
    <textarea rows="3" bind:value={entryText} placeholder="Co se stalo…" aria-label="Text zápisu"
    ></textarea>
    <button disabled={!entryTitle.trim() && !entryText.trim()} onclick={addEntry}
      >Přidat zápis</button
    >
  </div>
  {#if message}<p role="status">{message}</p>{/if}

  {#each party.journal as e (e.id)}
    <article class="panel">
      {#if editing === e.id}
        <input bind:value={e.title} aria-label="Nadpis" />
        <textarea rows="4" bind:value={e.text} aria-label="Text"></textarea>
        <button class="primary" onclick={() => saveEdit(e)}>Uložit</button>
      {:else}
        <h3>{e.title}</h3>
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
                {:else if m.characterId}
                  <button onclick={() => applyXp(e, m)}>Připsat postavě</button>
                {:else}<span class="muted">(předat hráči)</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
        <p class="actions">
          <button onclick={() => (editing = e.id)}>Upravit</button>
          <button onclick={() => removeEntry(e)}>Smazat</button>
        </p>
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
</style>
