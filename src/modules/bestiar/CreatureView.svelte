<script lang="ts">
  import type { Creature } from '../../core/content/schema'
  import Md from '../../ui/Md.svelte'
  import { findCreature, isUser, kindName } from './state.svelte'

  let { creature }: { creature: Creature } = $props()
  const base = $derived(creature.variantOf ? findCreature(creature.variantOf) : undefined)
  const limits = $derived(creature.limits ?? undefined)
  const ch = $derived(creature.characteristic)
  // řádky karty, které už ukazujeme zvlášť, se v seznamu neopakují
  const rows = $derived(
    creature.stats.filter((s) => !['Charakteristika', 'Sudba', 'Hranice'].includes(s.label)),
  )
</script>

<h1>
  {creature.name}
  {#if creature.glyphs}<span class="glyphs" title="označení v knize">{creature.glyphs}</span>{/if}
</h1>
<p class="muted">
  {kindName(creature.kind)}{#if isUser(creature) && creature.kind !== 'vlastni'}
    · vlastní{/if}{#if base}
    · varianta bytosti <a href={'#/bestiar/' + encodeURIComponent(base.id)}>{base.name}</a>{/if}
</p>

{#if ch || creature.fate !== undefined || limits}
  <section class="panel facts">
    {#if ch}
      <div>
        <div class="muted">Charakteristika</div>
        <strong class="big">{ch.min === ch.max ? ch.min : `${ch.min}–${ch.max}`}</strong>
        {#if ch.note}<div class="note"><Md text={ch.note} /></div>{/if}
      </div>
    {/if}
    {#if creature.fate !== undefined}
      <div>
        <div class="muted">Sudba</div>
        <strong class="big">{creature.fate}</strong>
      </div>
    {/if}
    {#if limits}
      {#each ['Tělo', 'Duše', 'Vliv'] as a}
        {#if limits[a as 'Tělo']}
          <div>
            <div class="muted">{a}</div>
            <strong class="big">{limits[a as 'Tělo']}</strong>
          </div>
        {/if}
      {/each}
    {/if}
  </section>
{/if}

{#if rows.length}
  <dl class="panel">
    {#each rows as s}
      <dt>{s.label}</dt>
      <dd><Md text={s.value} /></dd>
    {/each}
  </dl>
{/if}

{#if base && !(creature.characteristic && creature.fate !== undefined && creature.limits)}
  <p class="muted">
    Údaje, které varianta neuvádí, platí jako u bytosti
    <a href={'#/bestiar/' + encodeURIComponent(base.id)}>{base.name}</a>.
  </p>
{/if}

{#if creature.description}<Md text={creature.description} />{/if}

{#each creature.sections as s}
  <h2>{s.title}</h2>
  <Md text={s.text} />
{/each}

<style>
  .glyphs {
    font-size: 0.5em;
    color: var(--drd-muted);
    font-weight: normal;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }
  .big {
    font-size: 1.6rem;
    color: var(--drd-accent);
  }
  .note {
    font-size: 0.85rem;
    color: var(--drd-muted);
    max-width: 14rem;
  }
  dt {
    font-weight: bold;
    color: var(--drd-accent);
    margin-top: 0.5rem;
  }
  dd {
    margin: 0;
  }
</style>
