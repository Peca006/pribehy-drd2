<script lang="ts">
  import { router } from '../core/router.svelte'
  import { appearance } from '../core/skin/appearance.svelte'
  import { placeOrnaments, type Geometry, type Ornament } from '../core/skin/ornaments'

  // Ozdoby Hávu kotvené k rohům okna. Kreslí se jen ve volném bočním okraji vedle sloupce obsahu (měří se skutečné
  // rozměry stránky), takže nikdy nepřekrývají text; na telefonu na výšku se tedy neukážou. Za obsah je zasunuje pevné
  // pozadí; nereagují na klepnutí a čtečky obrazovky je přeskočí.
  let geometry = $state<Geometry | null>(null)

  function measure() {
    const page = document.querySelector('.page')
    const main = document.querySelector('main')
    if (!page || !main) return (geometry = null)
    const p = page.getBoundingClientRect()
    const m = main.getBoundingClientRect()
    const tabs = document.querySelector('.shell[data-nav="top"] .tabs')
    const bottom = document.querySelector('.bottom')
    geometry = {
      viewportWidth: document.documentElement.clientWidth,
      pageLeft: p.left,
      pageRight: p.right,
      mainLeft: m.left,
      mainRight: m.right,
      topInset: tabs ? tabs.getBoundingClientRect().bottom : 0,
      bottomInset: bottom ? window.innerHeight - bottom.getBoundingClientRect().top : 0,
    }
  }

  $effect(() => {
    if (!appearance.ornaments.length) return
    void router.module // po přechodu na jinou stránku se sloupec obsahu může změnit
    void appearance.navPosition
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    for (const el of document.querySelectorAll('.page, main, .bottom')) ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  })

  const placed = $derived(
    geometry
      ? placeOrnaments(
          appearance.ornaments.map((o) => ({ ...o, image: o.url }) satisfies Ornament),
          geometry,
        )
      : [],
  )
</script>

{#each placed as p, i (i)}
  <img
    class="ornament"
    src={p.ornament.image}
    alt=""
    aria-hidden="true"
    style:width={`${p.ornament.width}px`}
    style:left={p.ornament.anchor.endsWith('left') ? `${p.x}px` : undefined}
    style:right={p.ornament.anchor.endsWith('right') ? `${p.x}px` : undefined}
    style:top={p.ornament.anchor.startsWith('top') ? `${p.y}px` : undefined}
    style:bottom={p.ornament.anchor.startsWith('bottom') ? `${p.y}px` : undefined}
    style:transform={`scale(${p.ornament.anchor.endsWith('right') ? -1 : 1}, ${p.ornament.anchor.startsWith('bottom') ? -1 : 1})`}
  />
{/each}

<style>
  .ornament {
    position: fixed;
    z-index: 1;
    height: auto;
    pointer-events: none;
    user-select: none;
  }
</style>
