<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { ask } from '../../core/confirm.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import GetPacks from '../../ui/GetPacks.svelte'
  import { onMount } from 'svelte'
  import type { Creature } from '../../core/content/schema'
  import { addToConflict, fromCreature } from '../../core/party/conflict'
  import { roleOf, type Party } from '../../core/party/model'
  import { listParties } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { library } from '../../core/library.svelte'
  import EnvIcon from '../../ui/EnvIcon.svelte'
  import { ENVIRONMENTS } from '../../core/environments'
  import CreatureImages from './CreatureImages.svelte'
  import CreatureEditor from './CreatureEditor.svelte'
  import CreatureView from './CreatureView.svelte'
  import ExchangePanel from './ExchangePanel.svelte'
  import {
    allCreatures,
    bestiary,
    findCreature,
    isUser,
    kindName,
    kinds,
    refreshBestiary,
    removeCreature,
  } from './state.svelte'
  import { stripMd } from './text'

  // params: [] seznam · ['nova'] · ['vymena'] · ['uprav', id] · [id] detail
  let { params }: { params: string[] } = $props()
  let parties = $state<Party[]>([])
  let conflictParty = $state('')
  onMount(async () => {
    refreshBestiary()
    parties = (await listParties()).filter((p) => roleOf(p) === 'pruvodce')
  })
  function toConflict() {
    if (!creature || !conflictParty) return
    addToConflict(conflictParty, fromCreature(creature))
    go('druziny', conflictParty, 'konflikt')
  }

  let query = $state('')
  let kind = $state('')
  // filtr prostředí: vybraná písmena značek (b–h, a = prastaří) a 'none' = bez uvedeného prostředí
  let envs = $state<string[]>([])
  let sortBy = $state<'abc' | 'kind'>('abc')
  const ENV_LETTERS = 'bcdefgh'
  const envOf = (c: Creature) => [...(c.glyphs ?? '')].filter((g) => ENV_LETTERS.includes(g))
  const toggleEnv = (e: string) => (envs = envs.includes(e) ? envs.filter((x) => x !== e) : [...envs, e])
  // odkaz z kapitoly druhu (#/bestiar/druh/ID) nastaví filtr druhu
  $effect(() => {
    if (params[0] === 'druh') kind = params[1] ?? ''
  })
  const creature = $derived(
    params[0] && params[0] !== 'uprav' && params[0] !== 'druh' ? findCreature(params[0]) : undefined,
  )
  const editing = $derived(params[0] === 'uprav' ? findCreature(params[1] ?? '') : undefined)

  const list = $derived(
    allCreatures()
      .filter((c) => !kind || c.kind === kind)
      .filter((c) => {
        if (!envs.length) return true
        const own = envOf(c)
        return (
          (envs.includes('none') && !own.length) ||
          envs.some((e) => (e === 'a' ? c.glyphs?.includes('a') : own.includes(e)))
        )
      })
      .filter((c) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return (
          c.name +
          ' ' +
          stripMd(c.description) +
          ' ' +
          c.stats.map((s) => stripMd(s.value)).join(' ')
        )
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  )
  const groups = $derived(
    sortBy === 'kind'
      ? kinds()
          .map((k) => ({ title: k.name, items: list.filter((c) => c.kind === k.id) }))
          .filter((g) => g.items.length)
      : [{ title: '', items: list }],
  )
  const hasPackData = $derived(library.packs.some((p) => p.creatures?.length))

  async function remove() {
    if (
      creature &&
      (await ask(`Smazat bytost „${creature.name}“?`, { title: 'Smazat bytost', ok: 'Smazat' }))
    ) {
      await removeCreature(creature.id)
      go('bestiar')
    }
  }
</script>

{#if params[0] === 'nova'}
  <CreatureEditor />
{:else if params[0] === 'vymena'}
  <ExchangePanel selected={params[1] ?? ''} />
{:else if params[0] === 'uprav' && editing}
  <CreatureEditor initial={editing} />
{:else if creature}
  <nav><a class="btn" href="#/bestiar"><Arrow dir="left" /> Bestiář</a></nav>
  <p class="actions">
    {#if isUser(creature)}
      <a class="btn" href={'#/bestiar/uprav/' + encodeURIComponent(creature.id)}>Upravit</a>
      <a class="btn" href={'#/bestiar/vymena/' + encodeURIComponent(creature.id)}>Sdílet…</a>
    {:else}
      <a class="btn" href={'#/bestiar/uprav/' + encodeURIComponent(creature.id)}
        >Vytvořit vlastní kopii…</a
      >
    {/if}
  </p>
  {#if parties.length}
    <p class="actions">
      <select bind:value={conflictParty} aria-label="Družina">
        <option value="">Družina…</option>
        {#each parties as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
      <button disabled={!conflictParty} onclick={toConflict}>Do konfliktu</button>
    </p>
  {/if}
  <CreatureView {creature} />
  <CreatureImages creatureId={creature.id} />
  {#if isUser(creature)}
    <details class="more">
      <summary>Další</summary>
      <button onclick={remove}>Smazat bytost…</button>
    </details>
  {/if}
{:else if params[0] && params[0] !== 'druh'}
  <p class="muted">Bytost nenalezena. <a href="#/bestiar">Zpět do bestiáře</a></p>
{:else}
  <HelpHeading level={1} title="Bestiář" topic="bestiar" />
  {#if !hasPackData}
    <div class="panel">
      <strong>Bytosti z knihy nejsou nainstalované.</strong>
      <p class="muted">
        Data Bestiáře jsou v obsahovém balíčku. <GetPacks label="Stáhnout Bestiář" />
        Bestiář můžete používat i s vlastními bytostmi – vytvořte si je, nebo je importujte od
        jiných vypravěčů.
      </p>
    </div>
  {/if}
  <input type="search" placeholder="Hledat bytost…" bind:value={query} aria-label="Hledat bytost" />
  <div class="chips">
    <button class:primary={!kind} onclick={() => (kind = '')}>Vše</button>
    {#each kinds().filter((k) => allCreatures().some((c) => c.kind === k.id)) as k}
      <button class:primary={kind === k.id} onclick={() => (kind = k.id)}>{k.name}</button>
    {/each}
  </div>
  <div class="chips" role="group" aria-label="Prostředí">
    {#each [...ENV_LETTERS, 'a'] as e}
      <button
        class="env"
        class:primary={envs.includes(e)}
        aria-pressed={envs.includes(e)}
        title={ENVIRONMENTS[e]}
        onclick={() => toggleEnv(e)}><EnvIcon letter={e} size="1.3em" /></button
      >
    {/each}
    <button
      class="env"
      class:primary={envs.includes('none')}
      aria-pressed={envs.includes('none')}
      title="Bez uvedeného prostředí"
      aria-label="Bez uvedeného prostředí"
      onclick={() => toggleEnv('none')}
    ></button>
    {#if envs.length}<button onclick={() => (envs = [])}>Zrušit filtr</button>{/if}
  </div>
  <p>
    <label
      >Řazení
      <select bind:value={sortBy}>
        <option value="abc">abecedně</option>
        <option value="kind">podle druhů</option>
      </select></label
    >
  </p>
  <p class="actions">
    <a class="btn primary" href="#/bestiar/nova">Nová</a>
    <a class="btn" href="#/bestiar/vymena">Import / export</a>
  </p>
  <p class="muted">
    {list.length} bytostí{bestiary.user.length
      ? ` (z toho vlastních: ${bestiary.user.length})`
      : ''}
  </p>
  {#each groups as g}
    {#if g.title}<h2>{g.title} <span class="muted">({g.items.length})</span></h2>{/if}
    <ul class="list">
      {#each g.items as c (c.id)}
        <li>
          <a class="btn panel" href={'#/bestiar/' + encodeURIComponent(c.id)}>
            <strong>{c.name}</strong>
            <span class="muted">
              {kindName(c.kind)}{c.variantOf ? ' · varianta' : ''}{isUser(c) && c.kind !== 'vlastni'
                ? ' · vlastní'
                : ''}{c.characteristic
                ? ` · charakteristika ${c.characteristic.min === c.characteristic.max ? c.characteristic.min : c.characteristic.min + '–' + c.characteristic.max}`
                : ''}{c.fate !== undefined ? ` · sudba ${c.fate}` : ''}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/each}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .more {
    margin: 1rem 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.75rem 0;
  }
  .env {
    width: 2.4rem;
    height: 2.4rem;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .list a {
    display: flex;
    flex-direction: column;
    margin: 0.4rem 0;
  }
</style>
