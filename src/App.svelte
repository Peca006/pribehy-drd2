<script lang="ts">
  import { onMount } from 'svelte'
  import { refreshLibrary } from './core/library.svelte'
  import { refreshRecipes } from './core/recipes/cache.svelte'
  import { migrateLegacyLogs } from './core/recipes/legacy'
  import { initPwa } from './core/pwa.svelte'
  import { allModules, getModule } from './core/modules'
  import { markRestore, router, startRouter, tabHref, toHash } from './core/router.svelte'
  import { settings } from './core/settings.svelte'
  import { appearance } from './core/skin/appearance.svelte'
  import { previewChoice } from './core/skin/runtime'
  import { LOCKED_TAB, layoutTabs } from './core/tabbar'
  import { DEFAULT_MODULE } from './modules'
  import AppBanners from './ui/AppBanners.svelte'
  import ConfirmDialog from './ui/ConfirmDialog.svelte'

  // stránky se vykreslí až po jednorázovém převodu starých deníků (lektvary a nástrahy → předpisy) a načtení Grimoáru
  let ready = $state(false)
  onMount(() => {
    startRouter()
    refreshLibrary()
    initPwa()
    migrateLegacyLogs()
      .catch((e) => console.error('Převod starých deníků se nepovedl', e))
      .then(() => refreshRecipes())
      .catch((e) => console.error('Grimoár se nepodařilo načíst', e))
      .finally(() => (ready = true))
  })

  const active = $derived(getModule(router.module || DEFAULT_MODULE))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Current = $derived(active?.component as any)
  const tabs = $derived(layoutTabs(allModules().filter((m) => m.nav), settings.tabbar))

  // zvýrazněná záložka: aktivní sekce; sekce mimo lištu (Příručka, Bestiář a Grimoár ve výchozím stavu, Šatník) patří ke Sluji
  const current = $derived.by(() => {
    const id = active?.id
    if (!id) return undefined
    const inBar = [tabs.left, ...tabs.middle, tabs.right].some((m) => m?.id === id)
    return inBar ? id : active?.nav || id === 'satnik' ? LOCKED_TAB : undefined
  })

  // poloha lišty: podle Hávu pro aktuální viewport, nebo vlastní volba uživatele (v náhledu Hávu v Šatníku se volba ignoruje)
  const position = $derived(
    previewChoice || settings.navPosition === 'skin' ? appearance.navPosition : settings.navPosition,
  )
  const vertical = $derived(position === 'left' || position === 'right')

  // střed lišty se posouvá (vodorovně, ve svislém pruhu svisle); okraje se stíní, když je za nimi další obsah
  let scroller = $state<HTMLElement>()
  let canStart = $state(false)
  let canEnd = $state(false)
  function measure() {
    if (!scroller) return
    if (vertical) {
      canStart = scroller.scrollTop > 2
      canEnd = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2
    } else {
      canStart = scroller.scrollLeft > 2
      canEnd = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2
    }
  }
  $effect(() => {
    if (!scroller) return
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(scroller)
    measure()
    return () => ro?.disconnect()
  })
  // aktivní záložka se dorolovala do viditelné části (po otevření odkazu, změně pořadí i otočení telefonu)
  $effect(() => {
    void active?.id
    void tabs
    void vertical
    const el = scroller?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!scroller || !el) return
    if (vertical) {
      const top = el.offsetTop - scroller.offsetTop
      const bottom = top + el.offsetHeight
      if (top < scroller.scrollTop) scroller.scrollTop = top
      else if (bottom > scroller.scrollTop + scroller.clientHeight)
        scroller.scrollTop = bottom - scroller.clientHeight
    } else {
      const left = el.offsetLeft - scroller.offsetLeft
      const right = left + el.offsetWidth
      if (left < scroller.scrollLeft) scroller.scrollLeft = left
      else if (right > scroller.scrollLeft + scroller.clientWidth)
        scroller.scrollLeft = right - scroller.clientWidth
    }
    measure()
  })
</script>

{#snippet tab(m: { id: string; title: string; icon: string })}
  <a
    href={tabHref(m.id, active?.id)}
    onclick={() => current !== m.id && markRestore()}
    aria-current={current === m.id ? 'page' : undefined}
  >
    {#if appearance.icons[m.id]}
      <!-- ikona z Hávu; bez ní (nebo než se načte) se použije znak modulu -->
      <img
        class="icon-img"
        class:pixelated={appearance.pixelatedIcons}
        src={appearance.icons[m.id]}
        alt=""
        aria-hidden="true"
      />
    {:else}
      <span class="icon" aria-hidden="true">{m.icon}</span>
    {/if}
    <span>{m.title}</span>
  </a>
{/snippet}

{#snippet navbar()}
  <nav class="tabs" aria-label="Hlavní navigace">
    {#if tabs.left}<div class="pin">{@render tab(tabs.left)}</div>{/if}
    <div class="mid" class:can-start={canStart} class:can-end={canEnd}>
      <div class="scroller" bind:this={scroller} onscroll={measure}>
        {#each tabs.middle as m (m.id)}{@render tab(m)}{/each}
      </div>
    </div>
    {#if tabs.right}<div class="pin">{@render tab(tabs.right)}</div>{/if}
  </nav>
{/snippet}

<!-- poloha lišty (dole, nahoře, svislý pruh vlevo nebo vpravo) určuje Háv podle viewportu nebo volba uživatele -->
<div class="shell" data-nav={position}>
  {#if position === 'top' || position === 'left'}{@render navbar()}{/if}
  <div class="page">
    <main>
      {#if !ready}
        <p class="muted" role="status">Načítám…</p>
      {:else if Current}
        <Current params={router.params} />
      {:else}
        <p>Stránka nenalezena. <a href={toHash(DEFAULT_MODULE)}>Domů</a></p>
      {/if}
    </main>
    <ConfirmDialog />
    <!-- pruhy (a dolní lišta) jsou na konci stránky „lepivé“ (sticky): drží se u spodního okraje, ale zabírají místo, takže nezakrývají konec obsahu -->
    <div class="bottom">
      <AppBanners />
      {#if position === 'bottom'}{@render navbar()}{/if}
    </div>
  </div>
  {#if position === 'right'}{@render navbar()}{/if}
</div>

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  .shell[data-nav='left'],
  .shell[data-nav='right'] {
    flex-direction: row;
  }
  .page {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  main {
    flex: 1;
    width: 100%;
    max-width: 44rem;
    margin: 0 auto;
    padding: var(--drd-gap);
    padding-bottom: 1.5rem;
  }
  .bottom {
    position: sticky;
    bottom: 0;
    z-index: 40;
  }
  .tabs {
    display: flex;
    background: var(--drd-surface);
    background-image: var(--drd-tab-image, none);
    background-size: var(--drd-tab-size, auto);
    background-repeat: var(--drd-tab-repeat, repeat);
    background-position: var(--drd-tab-position, 0 0);
    /* výchozí: čára 1 px nahoře; rámeček z Hávu (role „tab“) si šířku nastaví sám */
    border: 0 solid var(--drd-border);
    border-width: var(--drd-tab-bw, 1px 0 0 0);
    border-image: var(--drd-tab-bi-source, none) var(--drd-tab-bi-slice, 100%) /
      var(--drd-tab-bi-width, 1) / 0 var(--drd-tab-bi-repeat, stretch);
    padding-bottom: env(safe-area-inset-bottom);
  }
  /* poloha lišty: nahoře drží lišta u horního okraje, ve svislém pruhu u okraje okna po celou výšku */
  .shell[data-nav='top'] .tabs {
    position: sticky;
    top: 0;
    z-index: 40;
    padding-bottom: 0;
    padding-top: env(safe-area-inset-top);
    border-width: var(--drd-tab-bw, 0 0 1px 0);
  }
  .shell[data-nav='left'] .tabs,
  .shell[data-nav='right'] .tabs {
    position: sticky;
    top: 0;
    z-index: 40;
    flex: 0 0 auto;
    align-self: flex-start;
    flex-direction: column;
    width: 5rem;
    height: 100dvh;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .shell[data-nav='left'] .tabs {
    padding-left: env(safe-area-inset-left);
    border-width: var(--drd-tab-bw, 0 1px 0 0);
  }
  .shell[data-nav='right'] .tabs {
    padding-right: env(safe-area-inset-right);
    border-width: var(--drd-tab-bw, 0 0 0 1px);
  }
  .shell[data-nav='left'] .pin,
  .shell[data-nav='right'] .pin {
    min-width: 0;
  }
  .shell[data-nav='left'] .mid,
  .shell[data-nav='right'] .mid {
    flex-direction: column;
    min-height: 0;
  }
  .shell[data-nav='left'] .scroller,
  .shell[data-nav='right'] .scroller {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    scroll-snap-type: y proximity;
  }
  .shell[data-nav='left'] .tabs .scroller a,
  .shell[data-nav='right'] .tabs .scroller a {
    flex: 0 0 auto;
    min-height: 3.75rem;
    justify-content: center;
  }
  .shell[data-nav='left'] .tabs .pin a,
  .shell[data-nav='right'] .tabs .pin a {
    justify-content: center;
    min-height: 3.75rem;
  }
  /* přišpendlené záložky (vlevo a vpravo; ve svislém pruhu nahoře a dole) zůstávají vždy vidět, střed se posouvá */
  .pin {
    flex: 0 0 auto;
    display: flex;
    min-width: 4.5rem;
  }
  .tabs .pin a {
    flex: 1;
  }
  .mid {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
  }
  .scroller {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  .tabs .scroller a {
    flex: 1 0 4.5rem;
    scroll-snap-align: start;
  }
  /* stín na okraji, za kterým je další obsah; barvu může změnit Háv (--drd-tab-fade) */
  .mid::before,
  .mid::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.25rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 1;
  }
  .mid::before {
    left: 0;
    background: linear-gradient(to right, var(--drd-tab-fade, rgba(0, 0, 0, 0.35)), transparent);
  }
  .mid::after {
    right: 0;
    background: linear-gradient(to left, var(--drd-tab-fade, rgba(0, 0, 0, 0.35)), transparent);
  }
  .mid.can-start::before,
  .mid.can-end::after {
    opacity: 1;
  }
  /* ve svislém pruhu se stíní horní a dolní okraj */
  .shell[data-nav='left'] .mid::before,
  .shell[data-nav='right'] .mid::before,
  .shell[data-nav='left'] .mid::after,
  .shell[data-nav='right'] .mid::after {
    left: 0;
    right: 0;
    width: auto;
    height: 1.25rem;
  }
  .shell[data-nav='left'] .mid::before,
  .shell[data-nav='right'] .mid::before {
    top: 0;
    bottom: auto;
    background: linear-gradient(to bottom, var(--drd-tab-fade, rgba(0, 0, 0, 0.35)), transparent);
  }
  .shell[data-nav='left'] .mid::after,
  .shell[data-nav='right'] .mid::after {
    top: auto;
    bottom: 0;
    background: linear-gradient(to top, var(--drd-tab-fade, rgba(0, 0, 0, 0.35)), transparent);
  }
  .tabs a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.25rem;
    min-height: 56px;
    color: var(--drd-text-muted);
    text-decoration: none;
    font-size: 0.75rem;
  }
  .tabs a[aria-current='page'] {
    color: var(--drd-accent);
  }
  .icon {
    font-size: 1.3rem;
    line-height: 1.2;
  }
  /* ikona z Hávu zabírá stejné místo jako znak (1,3 rem × 1,2 řádku) */
  .icon-img {
    width: 1.6rem;
    height: 1.6rem;
    margin: 0.05rem 0;
    object-fit: contain;
  }
  .icon-img.pixelated {
    image-rendering: pixelated;
  }
</style>
