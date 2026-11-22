<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  // Rejstřík pojmů: začátky knih, pak abecední seznam; u pojmů s více místy další odkazy v závorce.
  import Arrow from '../../ui/Arrow.svelte'
  import GetPacks from '../../ui/GetPacks.svelte'
  import extra from '../../data/index-extra.json'
  import { books, terms } from '../../core/library.svelte'
  import { buildRejstrik, type IndexExtra } from '../../core/rejstrik'

  const rejstrik = $derived(buildRejstrik(terms(), books(), extra as IndexExtra))
</script>

<nav>
  <a class="btn" href="#/ctenar"><Arrow dir="left" /> Kapitoly</a>
</nav>
<HelpHeading level={1} title="Rejstřík" topic="rejstrik" />

{#if rejstrik.starts.length}
  <h2 class="letter">Začátky knih</h2>
  <ul class="starts">
    {#each rejstrik.starts as s}
      <li><a href={s.href}>{s.label}</a></li>
    {/each}
  </ul>
{/if}

{#if rejstrik.groups.length}
  <p class="muted letters">
    {#each rejstrik.groups as g}<a href="#/ctenar/rejstrik" onclick={(e) => {
          e.preventDefault()
          document.getElementById('rej-' + g.letter)?.scrollIntoView()
        }}>{g.letter}</a>{' '}{/each}
  </p>
  {#each rejstrik.groups as g (g.letter)}
    <h2 class="letter" id={'rej-' + g.letter}>{g.letter}</h2>
    <ul class="entries">
      {#each g.entries as e}
        <li>
          <a href={e.main.href}>{e.name}</a>
          {#if e.also.length}
            <span class="muted"
              >({#each e.also as r, i}{#if i}, {/if}<a href={r.href}>{r.label}</a>{/each})</span
            >
          {/if}
          {#if e.summary}<div class="muted summary">{e.summary}</div>{/if}
        </li>
      {/each}
    </ul>
  {/each}
{:else}
  <p class="muted">Rejstřík se ukáže po stažení knih. <GetPacks label="Stáhnout pravidla a Bestiář" /></p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .letter {
    font-size: 1.1rem;
    margin: 1.25rem 0 0.4rem;
  }
  .letters a {
    margin-right: 0.4rem;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    margin: 0.35rem 0;
  }
  .summary {
    font-size: 0.85rem;
  }
</style>
