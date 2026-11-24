<script lang="ts">
  import { onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import type { Expedition, Outcome, Run, RunStatus } from '../../core/expedition/model'
  import {
    OUTCOMES,
    addExtra,
    deploy,
    finish,
    nextNode,
    pace,
    playDecks,
    postpone,
    promoteExtra,
    reachNode,
    removeExtra,
    reset,
    unreachNode,
    type PlayItem,
  } from '../../core/expedition/run'
  import { journalDraft } from '../../core/expedition/closing'
  import { STATUS_LABEL, beginRun, closeRun, nextExpeditions } from '../../core/expedition/runs'
  import { deleteRun, getExpedition, getRun, saveExpedition, saveRun } from '../../core/expedition/store'
  import type { Party } from '../../core/party/model'
  import { addToConflict, fromCreature } from '../../core/party/conflict'
  import { getParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import { bestiary, findCreature, refreshBestiary } from '../bestiar/state.svelte'

  // Vedení (Při hře): balíčky příhod podle uzlových bodů, stav příhod, uzlové body, tempo Zdrojů, improvizace.
  let { id }: { id: string } = $props()

  let run = $state<Run | undefined>(undefined)
  let exp = $state.raw<Expedition | undefined>(undefined)
  let party = $state.raw<Party | undefined>(undefined)
  let loaded = $state(false)
  let extraTitle = $state('')
  let conflictMsg = $state('')
  let closing = $state(false)
  let entry = $state({ title: '', text: '' })
  let closeMsg = $state('')
  let follow = $state.raw<Expedition[]>([])
  /** rozepsaný výsledek příhody (výsledek a vyústění), než se odehraje */
  let drafts = $state<Record<string, { outcome: Outcome; result: string }>>({})
  const ensureDraft = (iid: string) => {
    if (!drafts[iid]) drafts[iid] = { outcome: 'uspech', result: '' }
  }

  onMount(async () => {
    run = await getRun(id)
    if (run) {
      for (const [iid, r] of Object.entries(run.incidents)) if (r.state === 'nasazena') ensureDraft(iid)
      exp = await getExpedition(run.expeditionId)
      party = await getParty(run.partyId)
    }
    if (run?.status === 'hotova') follow = await nextExpeditions(run)
    if (!bestiary.loaded) void refreshBestiary()
    loaded = true
  })

  // uložení jde jedno po druhém; výsledek se do stavu nevrací (psaní by se přepsalo)
  let queue: Promise<unknown> = Promise.resolve()
  function save() {
    if (!run) return
    const snapshot = $state.snapshot(run) as Run
    queue = queue.then(() => saveRun(snapshot))
    return queue
  }
  const snap = () => $state.snapshot(run) as Run
  function change(next: Run) {
    run = next
    return save()
  }

  const decks = $derived(run && exp ? playDecks(exp, run) : [])
  const tempo = $derived(run && exp ? pace(exp, run) : undefined)
  const upcoming = $derived(run && exp ? nextNode(exp, run) : undefined)

  const outcomeLabel = (o?: Outcome) => OUTCOMES.find((x) => x.id === o)?.label ?? ''
  const stateLabel = { priprava: 'připravená', nasazena: 've hře', odehrana: 'odehraná', odlozena: 'odložená' } as const

  function addImprov() {
    if (!run || !exp || !extraTitle.trim()) return
    const r = addExtra(exp, snap(), extraTitle)
    extraTitle = ''
    void change(r.run)
  }
  async function toPreparation(item: PlayItem) {
    if (!run || !exp) return
    const r = promoteExtra(exp, snap(), item.incident.id)
    await queue
    await saveExpedition(r.expedition)
    exp = r.expedition
    await change(r.run)
  }
  function toConflict(creatureId: string) {
    if (!run) return
    const c = findCreature(creatureId)
    if (!c) {
      conflictMsg = 'Bytost se nepodařilo najít (chybí balíček Bestiáře?).'
      return
    }
    addToConflict(run.partyId, fromCreature(c))
    conflictMsg = `${c.name} je přidána do konfliktu družiny.`
  }

  function openClosing() {
    if (!run || !exp) return
    entry = journalDraft(exp, snap())
    closeMsg = ''
    closing = true
  }
  async function saveEntry(closeRunToo: boolean) {
    if (!run) return
    closeMsg = ''
    try {
      await queue
      const r = await closeRun(id, { ...entry }, settings.author, { close: closeRunToo })
      run = r.run
      closing = false
      closeMsg = 'Zápis je v žurnálu družiny. Hráči ho dostanou při dalším sdílení družiny.'
      follow = closeRunToo ? await nextExpeditions(r.run) : []
    } catch (e) {
      closeMsg = e instanceof Error ? e.message : String(e)
    }
  }
  async function beginNext(expeditionId: string) {
    if (!run) return
    const next = await beginRun(expeditionId, run.partyId)
    go('vypravy', 'vedeni', next.id)
  }

  async function removeRun() {
    if (!run) return
    if (
      !(await ask('Stav příhod a poznámky z této výpravy se smaže. Příprava výpravy zůstane.', {
        title: 'Smazat vedení výpravy?',
        ok: 'Smazat',
      }))
    )
      return
    await queue
    await deleteRun(id)
    go('vypravy')
  }
</script>

{#snippet card(item: PlayItem)}
  {@const i = item.incident}
  <details class="panel" class:done={item.state === 'odehrana'} class:live={item.state === 'nasazena'}>
    <summary>
      <strong>{i.title || '(bez názvu)'}</strong>
      <span class="badge">{stateLabel[item.state]}{item.run?.outcome ? ' · ' + outcomeLabel(item.run.outcome) : ''}</span>
    </summary>
    {#if i.text}<p class="text">{i.text}</p>{/if}
    {#if i.place}<p><strong>Místo:</strong> {i.place}</p>{/if}
    {#if i.conditions}<p><strong>Předpoklady:</strong> {i.conditions}</p>{/if}
    {#if i.cast.length}
      <p>
        <strong>Postavy:</strong>
        {i.cast.map((c) => c.name).join(', ')}
      </p>
      {#if i.cast.some((c) => c.creatureId)}
        <p class="btns">
          {#each i.cast.filter((c) => c.creatureId) as c}
            <button onclick={() => toConflict(c.creatureId!)} aria-label={`Do konfliktu: ${c.name}`}>Do konfliktu: {c.name}</button>
          {/each}
        </p>
      {/if}
    {/if}
    {#if i.ifSuccess}<p><strong>Když uspějí:</strong> {i.ifSuccess}</p>{/if}
    {#if i.ifFailure}<p><strong>Když neuspějí:</strong> {i.ifFailure}</p>{/if}
    {#if item.run?.result}<p class="result"><strong>Výsledek:</strong> {item.run.result}</p>{/if}

    {#if item.state === 'nasazena' && drafts[i.id]}
      <fieldset>
        <legend>Jak to dopadlo?</legend>
        {#each OUTCOMES as o}
          <label class="radio">
            <input type="radio" name={'vysl-' + i.id} value={o.id} bind:group={drafts[i.id].outcome} />
            {o.label}
          </label>
        {/each}
        <label>
          Poznámka k výsledku
          <textarea rows="2" bind:value={drafts[i.id].result} aria-label="Poznámka k výsledku"></textarea>
        </label>
        <p class="btns">
          <button class="primary" onclick={() => change(finish(snap(), i.id, drafts[i.id].outcome, drafts[i.id].result))}>Odehráno</button>
          <button onclick={() => change(postpone(snap(), i.id))}>Odložit</button>
        </p>
      </fieldset>
    {:else}
      <p class="btns">
        {#if item.state === 'priprava' || item.state === 'odlozena'}
          <button
            class="primary"
            onclick={() => {
              ensureDraft(i.id)
              void change(deploy(snap(), i.id))
            }}>Nasadit do hry</button
          >
        {/if}
        {#if item.state === 'priprava'}
          <button onclick={() => change(postpone(snap(), i.id))}>Odložit</button>
        {/if}
        {#if item.state === 'odehrana' || item.state === 'odlozena'}
          <button onclick={() => change(reset(snap(), i.id))}>Vrátit do přípravy</button>
        {/if}
        {#if item.extra}
          <button onclick={() => toPreparation(item)}>Uložit do přípravy</button>
          <button onclick={() => change(removeExtra(snap(), i.id))} aria-label={`Smazat vymyšlenou příhodu ${i.title}`}>Smazat</button>
        {/if}
      </p>
    {/if}
  </details>
{/snippet}

<nav>
  <a class="btn" href={run ? '#/druziny/' + run.partyId : '#/vypravy'}><Arrow dir="left" /> {party ? party.name : 'Výpravy'}</a>
</nav>

{#if !run}
  {#if loaded}<p class="muted">Vedení nenalezeno. <a href="#/vypravy">Zpět na přehled</a></p>{/if}
{:else if !exp}
  <p class="muted">Výprava, kterou toto vedení používalo, už neexistuje.</p>
  <p><button onclick={removeRun}>Smazat vedení</button></p>
{:else}
  <HelpHeading level={1} title="Při hře" topic="vedeni" />
  <div onchange={save} role="group" aria-label="Údaje vedení">
    <label>Název <input bind:value={run.name} /></label>
  </div>
  <p class="muted">
    Družina: {#if party}<a href={'#/druziny/' + party.id}>{party.name}</a>{:else}(smazaná){/if} · výprava:
    <a href={'#/vypravy/vyprava/' + exp.id}>{exp.name}</a>
  </p>
  <label class="inline">
    Stav
    <select
      value={run.status}
      onchange={(e) => change({ ...snap(), status: e.currentTarget.value as RunStatus })}
      aria-label="Stav vedení"
    >
      {#each Object.entries(STATUS_LABEL) as [k, v]}<option value={k}>{v}</option>{/each}
    </select>
  </label>

  <details class="panel">
    <summary><strong>Zápletka, cíl a pozadí (tajné)</strong></summary>
    {#if exp.hook}<p><strong>Zápletka:</strong> {exp.hook}</p>{/if}
    {#if exp.goal}<p><strong>Cíl:</strong> {exp.goal}</p>{/if}
    {#if exp.background}<p class="text"><strong>Pozadí:</strong> {exp.background}</p>{/if}
    {#if exp.resolution}<p class="text"><strong>Možné rozuzlení:</strong> {exp.resolution}</p>{/if}
    {#if !exp.hook && !exp.goal && !exp.background && !exp.resolution}<p class="muted">V přípravě zatím nic není.</p>{/if}
  </details>

  {#if tempo}
    <section class="panel" aria-label="Hrajete o Zdroje">
      <strong>Hrajete o Zdroje</strong>
      <p>
        Odehráno {tempo.played} z {tempo.total} příhod. V tomto úseku zbývá {tempo.openHere}, „kdykoli“ {tempo.openAnytime}.
        {#if tempo.next}Do uzlového bodu „{tempo.next.title}“: {tempo.next.incidents} příhod.{/if}
        {#if tempo.rest}Do příležitosti k odpočinku „{tempo.rest.title}“: {tempo.rest.incidents} příhod.{/if}
      </p>
      <p class="muted">
        Jen pomůcka: hrdinům mají Zdroje vystačit „tak akorát“. Hráče, kteří šetří, netrestejte dalšími příhodami.
        <a href="#/ctenar/41-priprava-a-vedeni-hry/hrajete-o-zdroje">Pravidlo v příručce</a>
      </p>
    </section>
  {/if}

  <h2>Uzlové body</h2>
  {#each exp.nodes as n, k (n.id)}
    {@const reached = run.reachedNodes.includes(n.id)}
    <div class="panel node" class:done={reached}>
      <div>
        <strong>{n.title || `Uzlový bod ${k + 1}`}</strong>
        <span class="muted">{n.kind === 'zvrat' ? ' · zvrat' : n.kind === 'odpocinek' ? ' · příležitost k odpočinku' : ''}</span>
        {#if n.text}<p class="text">{n.text}</p>{/if}
      </div>
      {#if reached}
        <button onclick={() => change(unreachNode(snap(), n.id))} aria-label={`Vrátit uzlový bod ${n.title}`}>Vrátit</button>
      {:else}
        <button class:primary={upcoming?.id === n.id} onclick={() => change(reachNode(snap(), n.id))} aria-label={`Uzlový bod nastal: ${n.title || k + 1}`}>Nastal</button>
      {/if}
    </div>
  {:else}
    <p class="muted">Výprava nemá uzlové body, příhody jsou v jednom proudu.</p>
  {/each}

  <h2>Příhody</h2>
  {#each decks as d (d.key)}
    {#if d.items.length}
      <h3 class:cur={d.current}>{d.title} <span class="muted">({d.open} z {d.items.length} zbývá){d.current ? ' · právě tady' : ''}</span></h3>
      {#each d.items as item (item.incident.id)}
        {@render card(item)}
      {/each}
    {/if}
  {/each}

  <div class="row">
    <input
      bind:value={extraTitle}
      placeholder="Příhoda vymyšlená při hře"
      aria-label="Název vymyšlené příhody"
      onkeydown={(e) => e.key === 'Enter' && addImprov()}
    />
    <button onclick={addImprov} disabled={!extraTitle.trim()}>Přidat</button>
  </div>

  {#if conflictMsg}
    <p role="status">{conflictMsg} <a href={'#/druziny/' + run.partyId + '/konflikt'}>Otevřít konflikt</a></p>
  {/if}

  <h2>Poznámky ze hry</h2>
  <div onchange={save} role="group" aria-label="Poznámky">
    <textarea rows="4" bind:value={run.notes} aria-label="Poznámky ze hry"></textarea>
  </div>

  <h2>Uzavření výpravy</h2>
  {#if party && party.role === 'hrac'}
    <p class="muted">Tuto družinu vede jiný Průvodce, zápis do jejího žurnálu nelze vytvořit.</p>
  {:else if closing}
    <div class="panel">
      <p class="muted">
        Návrh zápisu z odehraných příhod. Zápis uvidí hráči po sdílení družiny, proto před uložením zkontrolujte, že neprozrazuje tajemství.
      </p>
      <label>Nadpis zápisu <input bind:value={entry.title} aria-label="Nadpis zápisu" /></label>
      <label>Text zápisu <textarea rows="9" bind:value={entry.text} aria-label="Text zápisu"></textarea></label>
      <p class="btns">
        <button class="primary" onclick={() => saveEntry(true)}>Uložit do žurnálu a uzavřít výpravu</button>
        <button onclick={() => saveEntry(false)}>Uložit do žurnálu, vedení nechat otevřené</button>
        <button onclick={() => (closing = false)}>Zrušit</button>
      </p>
    </div>
  {:else}
    {#if run.journalEntryId}<p class="muted">Zápis o této výpravě už je v žurnálu družiny.</p>{/if}
    <p><button class="primary" onclick={openClosing}>{run.journalEntryId ? 'Přidat další zápis do žurnálu' : 'Zapsat do žurnálu a uzavřít'}</button></p>
  {/if}
  {#if closeMsg}<p role="status">{closeMsg}</p>{/if}
  {#if follow.length}
    <h3>Další výprava v dobrodružství</h3>
    {#each follow as f (f.id)}
      <div class="panel node">
        <strong>{f.name}</strong>
        <button onclick={() => beginNext(f.id)} aria-label={`Začít výpravu ${f.name} s touto družinou`}>Začít s touto družinou</button>
      </div>
    {/each}
  {/if}

  <p><button onclick={removeRun}>Smazat vedení</button></p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  label {
    display: block;
    margin: 0.5rem 0;
  }
  label input:not([type='radio']),
  label textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .inline {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .radio {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }
  .radio input {
    width: auto;
    min-height: 0;
  }
  summary {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .badge {
    font-size: 0.8rem;
    color: var(--drd-text-muted);
    margin-left: auto;
  }
  .live {
    outline: 2px solid var(--drd-accent);
  }
  .done {
    opacity: 0.7;
  }
  .node {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
  }
  .cur {
    color: var(--drd-accent);
  }
  .btns {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }
  .row input {
    flex: 1;
    display: block;
    width: auto;
  }
</style>
