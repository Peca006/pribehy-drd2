<script lang="ts">
  // Detail povolání z balíčku, který nemá kapitoly (např. mistrovská povolání z Her mocných).
  import Arrow from '../../ui/Arrow.svelte'
  import Md from '../../ui/Md.svelte'
  import { professionBooks, professions } from '../../core/library.svelte'

  let { id }: { id: string } = $props()
  const profession = $derived(professionBooks().flatMap((b) => b.professions).find((p) => p.id === id))
  const requires = $derived(
    (profession?.requires ?? []).map((r) => professions().find((p) => p.id === r)?.name ?? r),
  )
  const attr = (a: { attribute?: string; attributeNote?: string }) => a.attribute ?? a.attributeNote
</script>

<nav>
  <a class="btn" href="#/ctenar"><Arrow dir="left" /> Kapitoly</a>
</nav>

{#if profession}
  <h1>{profession.name}</h1>
  <p class="muted">Mistrovské povolání</p>
  {#if requires.length && !profession.intro.includes('Pokročilá povolání')}
    <p class="muted">Vychází z povolání: {requires.join(', ')}</p>
  {/if}
  {#if profession.intro}<Md text={profession.intro} />{/if}

  {#if profession.skills.length}
    <h2>Dovednosti</h2>
    <ul>
      {#each profession.skills as s}
        <li>
          <strong>{s.name}</strong>{#if attr(s)} <span class="muted">({attr(s)})</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}

  <h2>Schopnosti</h2>
  {#each profession.abilities as a (a.id)}
    <section class="ability">
      <h3>{a.name}{#if attr(a)} <span class="muted">({attr(a)})</span>{/if}</h3>
      {#if a.flavor}<div class="flavor"><Md text={a.flavor} /></div>{/if}
      <Md text={a.text} />
    </section>
  {/each}
{:else}
  <p class="muted">Povolání nenalezeno. <a href="#/ctenar">Zpět do Příručky</a></p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .ability h3 {
    margin-bottom: 0.25rem;
  }
  .flavor {
    font-style: italic;
  }
</style>
