<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import { onMount } from 'svelte'
  import { hasCharacterDraft } from '../../core/character/drafts'
  import { loadReviews, type Reviews } from '../../core/character/reviews'
  import {
    ATTRIBUTES,
    characterOf,
    type ChangeEvent,
    type Character,
    eventsFor,
    type CharacterLog,
  } from '../../core/character/model'
  import { easeScar, healScar } from '../../core/character/healing'
  import { settings } from '../../core/settings.svelte'
  import {
    type Bonus,
    type Spent,
    effectiveAttributes,
    emptyBonus,
    loadAdvantage,
    loadBonus,
    loadSpent,
    payResources,
    saveAdvantage,
    saveBonus,
    saveSpent,
  } from '../../core/character/play'
  import { appendEvents, deleteLog, getLog, listLogs } from '../../core/character/store'
  import { findAbility, professions, races } from '../../core/library.svelte'
  import { go } from '../../core/router.svelte'
  import type { Attribute } from '../../core/content/schema'
  import Md from '../../ui/Md.svelte'
  import { formatMoney } from '../creator/rules'
  import Advance from './Advance.svelte'
  import CharacterEditor from './CharacterEditor.svelte'
  import CheckList from './CheckList.svelte'
  import History from './History.svelte'
  import Roll from './Roll.svelte'
  import ScarDialog from './ScarDialog.svelte'
  import Resources from './Resources.svelte'
  import ImportPanel from './ImportPanel.svelte'
  import SharePanel from './SharePanel.svelte'

  // params: [] = seznam, ['import'] = import kódu, [id] = deník postavy, [id, 'uprav'] = úprava (návrh),
  // [id, 'sdilet'] = sdílení revizí
  let { params }: { params: string[] } = $props()

  let logs = $state<CharacterLog[]>([])
  let current = $state<CharacterLog | undefined>(undefined)
  let hasDraft = $state(false)
  let reviews = $state<Reviews>({ status: {} })

  async function load() {
    logs = await listLogs()
    current = params[0] ? await getLog(params[0]) : undefined
    hasDraft = params[0] ? hasCharacterDraft(params[0]) : false
    reviews = params[0] ? loadReviews(params[0]) : { status: {} }
    bonus = params[0] ? loadBonus(params[0]) : emptyBonus()
    advantage = params[0] ? loadAdvantage(params[0]) : 0
    spent = params[0] ? loadSpent(params[0]) : { Tělo: 0, Duše: 0, Vliv: 0 }
  }
  onMount(load)
  $effect(() => {
    void params[0]
    load()
  })

  const c = $derived(current ? characterOf(current) : undefined)
  const race = $derived(races().find((r) => r.id === c?.raceId))
  const culture = $derived(race?.cultures.find((x) => x.id === c?.cultureId))

  /** Hojení jizvy jako samostatná revize v deníku (s poznámkou, kterou jizvu a jak). */
  async function healing(c: Character, scarId: string, fn: typeof easeScar, what: string) {
    if (!current) return
    const s = c.scars.find((x) => x.id === scarId)
    if (!s) return
    const note = `${what} jizvy (${s.attribute} ${s.severity}${s.note ? `: ${s.note}` : ''})`
    current = await appendEvents(current.id, eventsFor(c, fn(c, scarId), settings.author, note))
  }
  let spent = $state<Spent>({ Tělo: 0, Duše: 0, Vliv: 0 })
  const setSpent = (s: Spent) => {
    spent = s
    if (current) saveSpent(current.id, s)
  }
  /** Zaplatí Zdroje (dočasné z jizvy první); vrací, zda na to postava měla. */
  function pay(a: Attribute, n: number): boolean {
    if (!c) return false
    const r = payResources(spent, bonus, effectiveAttributes(c), a, n, advantage)
    if (!r) return false
    setSpent(r.spent)
    setBonus(r.bonus)
    setAdvantage(r.advantage)
    return true
  }
  let advantage = $state(0)
  const setAdvantage = (n: number) => {
    advantage = Math.max(0, n)
    if (current) saveAdvantage(current.id, advantage)
  }
  let bonus = $state<Bonus>(emptyBonus())
  const setBonus = (b: Bonus) => {
    bonus = b
    if (current) saveBonus(current.id, b)
  }
  let scarFor = $state<Attribute | undefined>(undefined)
  let scarMsg = $state('')
  async function addScar(next: Character, what: string, gain: number, attr: Attribute) {
    if (!current || !c) return
    current = await appendEvents(current.id, eventsFor(c, next, settings.author, `Jizva (${what})`))
    scarFor = undefined
    if (gain) setBonus({ ...bonus, [attr]: bonus[attr] + gain })
    scarMsg = 'Jizva zapsána.'
  }
  async function revert(events: ChangeEvent[]) {
    if (current) current = await appendEvents(current.id, events)
  }

  async function remove() {
    if (!current || !confirm('Opravdu smazat tuto postavu i s historií změn?')) return
    await deleteLog(current.id)
    go('postavy')
  }
</script>

{#if params[0] === 'import'}
  <ImportPanel part={params[1]} />
{:else if params[1] === 'sdilet' && params[0]}
  <SharePanel id={params[0]} />
{:else if params[1] === 'postup' && params[0]}
  <Advance id={params[0]} />
{:else if params[1] === 'uprav' && params[0]}
  <CharacterEditor id={params[0]} />
{:else if c && current}
  <nav><a class="btn" href="#/postavy"><Arrow dir="left" /> Postavy</a></nav>
  <h1>{c.name}</h1>
  <p class="muted">
    {race?.name ?? ''}{culture ? ` (${culture.name})` : ''}{c.concept ? ' · ' + c.concept : ''}
  </p>

  <p class="actions">
    <a class="btn primary" href={'#/postavy/' + current.id + '/uprav'}
      >{hasDraft ? 'Upravit (rozpracováno)' : 'Upravit'}</a
    >
    <a class="btn" href={'#/postavy/' + current.id + '/postup'}>Vylepšit</a>
    <a class="btn" href={'#/postavy/' + current.id + '/sdilet'}>Sdílet…</a>
  </p>
  {#key current.id}<Resources
      character={c}
      {spent}
      onspent={setSpent}
      {bonus}
      onbonus={setBonus}
      onscar={(a) => (scarFor = a)}
    />{/key}
  {#key current.id}<Roll
      id={current.id}
      character={c}
      {spent}
      {bonus}
      {advantage}
      onadvantage={setAdvantage}
      {pay}
      onscar={(a) => (scarFor = a)}
    />{/key}
  {#if scarMsg}<p class="panel" role="status">{scarMsg}</p>{/if}
  {#if scarFor}
    <ScarDialog
      character={c}
      attribute={scarFor}
      onsave={addScar}
      onclose={() => (scarFor = undefined)}
    />
  {/if}

  {#if c.scars.length}
    <h2>Jizvy</h2>
    <ul>
      {#each c.scars as s (s.id)}
        <li>
          {s.attribute}
          {s.severity}{s.note ? `: ${s.note}` : ''}
          {#if s.severity > 1}
            <button onclick={() => healing(c, s.id, easeScar, 'Zmírnění')}>Zmírnit o 1</button>
          {/if}
          <button onclick={() => healing(c, s.id, healScar, 'Zahojení')}>Zahojeno</button>
        </li>
      {/each}
    </ul>
    <p class="muted">
      Jizvy se hojí mezi výpravami (dobu odhadne Průvodce, závažnější ubývají postupně); na výpravě
      je léčí dovednosti. Hojení se zapíše do deníku jako revize.
    </p>
  {/if}

  <h2>Povolání</h2>
  <ul>
    {#each Object.entries(c.professions) as [id, lvl]}
      <li>{professions().find((p) => p.id === id)?.name ?? id}: úroveň {lvl}</li>
    {/each}
  </ul>
  <p class="muted">Body zkušeností: {c.xp} (12 = jedno zlepšení)</p>

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
      {#if a}<Md text={a.text} hint srd={a.srd} />{/if}
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

  {#if reviews.note}<p class="panel">Vypravěč: „{reviews.note}“</p>{/if}

  <CheckList character={c} />

  <details class="panel fold">
    <summary><strong>Historie změn</strong></summary>
    <History log={current} status={reviews.status} onrevert={revert} />
  </details>
  <details class="more">
    <summary>Další</summary>
    <button onclick={remove}>Smazat…</button>
  </details>
{:else if params[0]}
  <p class="muted">Postava nenalezena. <a href="#/postavy">Zpět na seznam</a></p>
{:else}
  <h1>Postavy</h1>
  <p class="actions">
    <a class="btn primary" href="#/tvorba">Nová</a>
    <a class="btn" href="#/postavy/import">Import…</a>
  </p>
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
  .actions {
    margin: 1rem 0;
  }
  .fold,
  .more {
    margin: 1rem 0;
  }
  .notes {
    white-space: pre-wrap;
  }
</style>
