<script lang="ts">
  import Md from '../../../ui/Md.svelte'
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()
  const custom = $derived(!!draft.trait && !data.traits.some((t) => t.id === draft.trait))
</script>

<h2>Povaha a příběh</h2>
<p class="muted">
  Povahový rys je způsob chování, ke kterému se hrdina uchyluje, i když mu dělá potíže. Vyberte ze
  seznamu, nebo vymyslete vlastní.
</p>
{#each data.traits as t}
  <div class="panel" class:sel={draft.trait === t.id}>
    <label class="radio">
      <input
        type="radio"
        name="rys"
        checked={draft.trait === t.id}
        onchange={() => (draft.trait = t.id)}
      />
      <span>
        <strong>{t.name}</strong>
        {#if t.flavor}<Md text={t.flavor} />{/if}
        <Md text={t.text} hint srd={t.srd} />
      </span>
    </label>
  </div>
{/each}
<div class="panel" class:sel={custom}>
  <label>
    Vlastní rys
    <input
      type="text"
      value={custom ? draft.trait : ''}
      oninput={(e) => (draft.trait = e.currentTarget.value)}
    />
  </label>
</div>

<h3>Jak se stal hrdinou?</h3>
<p class="muted">Kdy, jak a proč se z postavy stal hrdina – stačí pár vět.</p>
<textarea rows="4" bind:value={draft.heroStory} aria-label="Jak se stal hrdinou"></textarea>

<style>
  .sel {
    outline: 2px solid var(--drd-accent);
  }
  .radio {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }
  .radio input {
    width: auto;
    min-height: 0;
  }
</style>
