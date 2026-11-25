<script lang="ts">
  // Stránka Nápověda (z Dílny): úvod do aplikace a všechna témata z registru `core/help.ts` s hledáním.
  import Arrow from '../../ui/Arrow.svelte'
  import HelpPanel from '../../ui/HelpPanel.svelte'
  import { helpGroups, searchHelp } from '../../core/help'

  let query = $state('')
  const groups = $derived(
    helpGroups()
      .map((g) => ({ ...g, topics: searchHelp(g.topics, query) }))
      .filter((g) => g.topics.length),
  )
  const found = $derived(groups.reduce((n, g) => n + g.topics.length, 0))
  const searching = $derived(query.trim().length > 0)
</script>

<nav><a class="btn" href="#/knihovna/dilna"><Arrow dir="left" /> Dílna</a></nav>
<h1>Nápověda</h1>

<div class="panel">
  <p>
    <strong>Příběhy v Dračím doupěti</strong> jsou aplikace, která funguje i bez připojení. Postavy, družiny, Grimoár
    i nastavení zůstávají v tomto zařízení. Mezi zařízeními se přenášejí kódem, QR, souborem nebo zvukem, bez serveru.
  </p>
  <p>
    Pravidla a Bestiář v rozsahu SRD se stahují jako balíčky (Sluj → Dílna → Obsahové balíčky). U většiny prvků je tlačítko
    „?“ s krátkou nápovědou; tady je všechna pohromadě.
  </p>
</div>

<input
  type="search"
  bind:value={query}
  placeholder="Hledat v nápovědě…"
  aria-label="Hledat v nápovědě"
/>
{#if searching}
  <p class="muted" role="status">{found ? `Nalezeno: ${found}` : 'Nic nenalezeno.'}</p>
{/if}

{#each groups as g (g.id)}
  <section>
    <h2>{g.title}</h2>
    {#each g.topics as t (t.id)}
      <details class="panel topic" open={searching}>
        <summary><strong>{t.title}</strong></summary>
        <HelpPanel topic={t.id} ordered={g.id !== 'situace'} />
      </details>
    {/each}
  </section>
{/each}

<style>
  input[type='search'] {
    width: 100%;
    margin: 0.75rem 0 0.25rem;
  }
  .topic {
    margin: 0.5rem 0;
  }
</style>
