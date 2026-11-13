<script lang="ts">
  import { onMount } from 'svelte'
  import { go } from '../../core/router.svelte'
  import { library } from '../../core/library.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
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
  onMount(refreshBestiary)

  let query = $state('')
  let kind = $state('')
  const creature = $derived(
    params[0] && params[0] !== 'uprav' ? findCreature(params[0]) : undefined,
  )
  const editing = $derived(params[0] === 'uprav' ? findCreature(params[1] ?? '') : undefined)

  const list = $derived(
    allCreatures()
      .filter((c) => !kind || c.kind === kind)
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
  const hasPackData = $derived(library.packs.some((p) => p.creatures?.length))

  async function remove() {
    if (creature && confirm(`Smazat bytost „${creature.name}“?`)) {
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
  <nav><a class="btn" href="#/bestiar">← Bestiář</a> <LinkModeSelect /></nav>
  <CreatureView {creature} />
  <CreatureImages creatureId={creature.id} />
  <p class="actions">
    {#if isUser(creature)}
      <a class="btn" href={'#/bestiar/uprav/' + encodeURIComponent(creature.id)}>Upravit</a>
      <a class="btn" href={'#/bestiar/vymena/' + encodeURIComponent(creature.id)}>Sdílet…</a>
      <button onclick={remove}>Smazat</button>
    {:else}
      <a class="btn" href={'#/bestiar/uprav/' + encodeURIComponent(creature.id)}
        >Vytvořit vlastní kopii…</a
      >
    {/if}
  </p>
{:else if params[0]}
  <p class="muted">Bytost nenalezena. <a href="#/bestiar">Zpět do bestiáře</a></p>
{:else}
  <h1>Bestiář</h1>
  {#if !hasPackData}
    <div class="panel">
      <strong>Bytosti z knihy nejsou nainstalované.</strong>
      <p class="muted">
        Data Bestiáře se načítají zvlášť jako obsahový balíček (<a href="#/knihovna">Více</a>).
        Bestiář můžete používat i s vlastními bytostmi – vytvořte si je, nebo je importujte od
        jiných vypravěčů.
      </p>
    </div>
  {/if}
  <p class="actions">
    <a class="btn primary" href="#/bestiar/nova">+ Nová bytost</a>
    <a class="btn" href="#/bestiar/vymena">Import / export</a>
  </p>
  <input type="search" placeholder="Hledat bytost…" bind:value={query} aria-label="Hledat bytost" />
  <div class="chips">
    <button class:primary={!kind} onclick={() => (kind = '')}>Vše</button>
    {#each kinds().filter((k) => allCreatures().some((c) => c.kind === k.id)) as k}
      <button class:primary={kind === k.id} onclick={() => (kind = k.id)}>{k.name}</button>
    {/each}
  </div>
  <p class="muted">
    {list.length} bytostí{bestiary.user.length
      ? ` (z toho vlastních: ${bestiary.user.length})`
      : ''}
  </p>
  <ul class="list">
    {#each list as c (c.id)}
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
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
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
