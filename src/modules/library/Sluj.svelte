<script lang="ts">
  import { chapters, professionBooks } from '../../core/library.svelte'
  import { getModule } from '../../core/modules'
  import { go, markRestore, tabHref } from '../../core/router.svelte'
  import { appearance } from '../../core/skin/appearance.svelte'
  import { readerSearch } from '../reader/state.svelte'

  // Sluj: rozcestník. Vyhledávání otevře Příručku s hledaným textem, dlaždice vedou do Příručky, Bestiáře a Grimoáru
  // (i když je uživatel má na liště) a Dílna je nastavení a data.
  const TILES = [
    { id: 'ctenar', note: 'Pravidla a kapitoly' },
    { id: 'bestiar', note: 'Bytosti a nestvůry' },
    { id: 'grimoar', note: 'Kouzla, lektvary, nástrahy a výrobky' },
  ]
  const tiles = $derived(
    TILES.flatMap((t) => {
      const m = getModule(t.id)
      return m ? [{ ...t, title: m.title, icon: m.icon }] : []
    }),
  )

  // bez nainstalovaných knih není co hledat, pole se neukáže
  const searchable = $derived(chapters().length > 0 || professionBooks().length > 0)

  let query = $state('')
  function submit(e: SubmitEvent) {
    e.preventDefault()
    readerSearch.query = query.trim()
    go('ctenar')
  }
</script>

<h1>Sluj</h1>

{#if searchable}
  <form class="search" role="search" onsubmit={submit}>
    <input
      type="search"
      bind:value={query}
      placeholder="Hledat v pravidlech, bytostech a pojmech"
      aria-label="Hledat v pravidlech, bytostech a pojmech"
    />
    <button class="primary" disabled={query.trim().length < 2}>Hledat</button>
  </form>
{/if}

<ul class="tiles">
  {#each tiles as t (t.id)}
    <li>
      <a class="panel tile" href={tabHref(t.id, 'knihovna')} onclick={() => markRestore()}>
        {#if appearance.icons[t.id]}
          <img class="icon-img" src={appearance.icons[t.id]} alt="" aria-hidden="true" />
        {:else}
          <span class="icon" aria-hidden="true">{t.icon}</span>
        {/if}
        <span class="name">{t.title}</span>
        <span class="muted">{t.note}</span>
      </a>
    </li>
  {/each}
</ul>

<p>
  <a class="btn" href="#/knihovna/dilna"><span aria-hidden="true">⚗️</span> Dílna</a>
  <span class="muted">Nastavení, balíčky, záloha, Šatník, nápověda a O aplikaci.</span>
</p>

<style>
  .search {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .search input {
    flex: 1;
    min-width: 0;
  }
  .tiles {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .tile {
    display: grid;
    grid-template-columns: 2.25rem 1fr;
    grid-template-rows: auto auto;
    column-gap: 0.75rem;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }
  .tile .icon,
  .tile .icon-img {
    grid-row: 1 / span 2;
    font-size: 1.6rem;
    width: 2.25rem;
    height: 2.25rem;
    object-fit: contain;
    text-align: center;
  }
  .name {
    font-weight: 600;
  }
</style>
