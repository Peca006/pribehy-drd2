<script lang="ts">
  import { allModules } from '../../core/modules'
  import { setTabbar, settings } from '../../core/settings.svelte'
  import {
    LOCKED_TAB,
    defaultTabbar,
    isDefaultTabbar,
    moveTab,
    orderedIds,
    placementOf,
    setPlacement,
    type Placement,
  } from '../../core/tabbar'

  // Spodní lišta: pořadí záložek, skrytí a přišpendlení jedné záložky vlevo a jedné vpravo (zbytek se posouvá do stran).
  // Skryté záložky (Příručka, Bestiář a Grimoár jsou ve výchozím stavu jen ve Sluji) jsou dál dostupné ze Sluje a z odkazů v aplikaci. Nastavení platí jen v tomto zařízení.
  const mods = $derived(allModules().filter((m) => m.nav))
  const ids = $derived(mods.map((m) => m.id))
  const rows = $derived(orderedIds(ids, settings.tabbar).map((id) => mods.find((m) => m.id === id)!))

  const PLACEMENTS: [Placement, string][] = [
    ['scroll', 'V liště (posuvná)'],
    ['left', 'Přišpendlená vlevo'],
    ['right', 'Přišpendlená vpravo'],
    ['hidden', 'Jen ve Sluji (skrytá v liště)'],
  ]
</script>

<h2>Spodní lišta</h2>
<div class="panel">
  <p class="muted">
    Když se záložky na telefon nevejdou, střed lišty se posouvá do stran. Jednu záložku můžete
    přišpendlit vlevo a jednu vpravo, aby byly vždy na dosah. Pořadí a skrytí je jen pro toto zařízení. Co v liště není, najdete ve Sluji.
  </p>
  <ul class="rows" aria-label="Záložky spodní lišty">
    {#each rows as m, i (m.id)}
      <li>
        <span class="name"><span aria-hidden="true">{m.icon}</span> {m.title}</span>
        <select
          aria-label={`Umístění: ${m.title}`}
          value={placementOf(settings.tabbar, m.id)}
          onchange={(e) =>
            setTabbar(setPlacement(settings.tabbar, m.id, e.currentTarget.value as Placement))}
        >
          {#each PLACEMENTS as [value, label]}
            <option {value} disabled={value === 'hidden' && m.id === LOCKED_TAB}>{label}</option>
          {/each}
        </select>
        <button
          aria-label={`Posunout výš: ${m.title}`}
          disabled={i === 0}
          onclick={() => setTabbar(moveTab(settings.tabbar, ids, m.id, -1))}>↑</button
        >
        <button
          aria-label={`Posunout níž: ${m.title}`}
          disabled={i === rows.length - 1}
          onclick={() => setTabbar(moveTab(settings.tabbar, ids, m.id, 1))}>↓</button
        >
      </li>
    {/each}
  </ul>
  <button disabled={isDefaultTabbar(settings.tabbar)} onclick={() => setTabbar(defaultTabbar())}>
    Vrátit výchozí
  </button>
</div>

<style>
  .rows {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.4rem;
    align-items: center;
  }
  .name {
    min-width: 0;
  }
  select {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
  }
  li {
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--drd-border);
  }
  li:last-child {
    border-bottom: 0;
  }
</style>
