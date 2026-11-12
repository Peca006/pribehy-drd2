<script lang="ts">
  import { onMount } from 'svelte'
  import { hasCharacterDraft } from '../../core/character/drafts'
  import {
    ATTRIBUTES,
    characterOf,
    type ChangeEvent,
    type CharacterLog,
  } from '../../core/character/model'
  import { appendEvents, deleteLog, getLog, listLogs } from '../../core/character/store'
  import { findAbility, professions, races } from '../../core/library.svelte'
  import { go } from '../../core/router.svelte'
  import Md from '../../ui/Md.svelte'
  import { formatMoney } from '../creator/rules'
  import CharacterEditor from './CharacterEditor.svelte'
  import History from './History.svelte'

  // params: [] = seznam postav, [id] = deník postavy, [id, 'uprav'] = úprava (návrh)
  let { params }: { params: string[] } = $props()

  let logs = $state<CharacterLog[]>([])
  let current = $state<CharacterLog | undefined>(undefined)
  let hasDraft = $state(false)

  async function load() {
    logs = await listLogs()
    current = params[0] ? await getLog(params[0]) : undefined
    hasDraft = params[0] ? hasCharacterDraft(params[0]) : false
  }
  onMount(load)
  $effect(() => {
    void params[0]
    load()
  })

  const c = $derived(current ? characterOf(current) : undefined)
  const race = $derived(races().find((r) => r.id === c?.raceId))
  const culture = $derived(race?.cultures.find((x) => x.id === c?.cultureId))

  async function revert(events: ChangeEvent[]) {
    if (current) current = await appendEvents(current.id, events)
  }

  async function remove() {
    if (!current || !confirm('Opravdu smazat tuto postavu i s historií změn?')) return
    await deleteLog(current.id)
    go('postavy')
  }
</script>

{#if params[1] === 'uprav' && params[0]}
  <CharacterEditor id={params[0]} />
{:else if c && current}
  <nav><a class="btn" href="#/postavy">← Postavy</a></nav>
  <h1>{c.name}</h1>
  <p class="muted">
    {race?.name ?? ''}{culture ? ` (${culture.name})` : ''}{c.concept ? ' · ' + c.concept : ''}
  </p>

  <section class="panel attrs">
    {#each ATTRIBUTES as k}
      <div>
        <div class="muted">{k}</div>
        <strong class="big">{c.attributes[k]}</strong>
      </div>
    {/each}
  </section>

  <h2>Povolání</h2>
  <ul>
    {#each Object.entries(c.professions) as [id, lvl]}
      <li>{professions().find((p) => p.id === id)?.name ?? id}: úroveň {lvl}</li>
    {/each}
  </ul>

  <h2>Zvláštní schopnosti</h2>
  {#each c.abilities as id}
    {@const a = findAbility(id)}
    <details class="panel">
      <summary>
        <strong>{a?.name ?? id}</strong>
        {#if a?.attribute}<span class="muted"> ({a.attribute})</span>{/if}
        {#if id.endsWith('rodova-zbran') && c.weaponKind}<span class="muted">
            – {c.weaponKind}</span
          >{/if}
      </summary>
      {#if a?.flavor}<Md text={a.flavor} />{/if}
      {#if a}<Md text={a.text} />{/if}
    </details>
  {/each}

  {#if c.trait}<h2>Povahový rys</h2>
    <p>{c.trait.startsWith('rys:') ? c.trait.slice(4) : c.trait}</p>{/if}
  {#if c.heroStory}<h2>Jak se stal hrdinou</h2>
    <p>{c.heroStory}</p>{/if}

  <h2>Výbava</h2>
  <ul>
    {#each c.equipment as e}<li>{e}</li>{/each}
  </ul>
  <p>Hotovost: {formatMoney(c.cash)}</p>

  {#if c.notes}<h2>Poznámky</h2>
    <p class="notes">{c.notes}</p>{/if}

  <p class="actions">
    <a class="btn primary" href={'#/postavy/' + current.id + '/uprav'}
      >{hasDraft ? 'Pokračovat v úpravě (rozpracováno)' : 'Upravit postavu'}</a
    >
  </p>

  <History log={current} onrevert={revert} />
  <button onclick={remove}>Smazat postavu</button>
{:else if params[0]}
  <p class="muted">Postava nenalezena. <a href="#/postavy">Zpět na seznam</a></p>
{:else}
  <h1>Postavy</h1>
  {#each logs as l}
    {@const ch = characterOf(l)}
    <a class="btn panel row" href={'#/postavy/' + l.id}>
      <strong>{ch.name || '(beze jména)'}</strong>
      <span class="muted">
        {races().find((r) => r.id === ch.raceId)?.name ?? ''} · {Object.entries(ch.professions)
          .map(([id, v]) => `${professions().find((p) => p.id === id)?.name ?? ''} ${v}`)
          .join(', ')}
      </span>
    </a>
  {:else}
    <p class="muted">Zatím žádná postava.</p>
  {/each}
  <a class="btn primary" href="#/tvorba">Nová postava</a>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .row {
    display: flex;
    flex-direction: column;
    margin: 0.5rem 0;
  }
  .attrs {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }
  .big {
    font-size: 2rem;
    color: var(--drd-accent);
  }
  .actions {
    margin: 1rem 0;
  }
  .notes {
    white-space: pre-wrap;
  }
</style>
