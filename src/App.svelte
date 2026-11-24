<script lang="ts">
  import { onMount } from 'svelte'
  import { refreshLibrary } from './core/library.svelte'
  import { refreshRecipes } from './core/recipes/cache.svelte'
  import { migrateLegacyLogs } from './core/recipes/legacy'
  import { initPwa } from './core/pwa.svelte'
  import { allModules, getModule } from './core/modules'
  import { markRestore, router, startRouter, tabHref, toHash } from './core/router.svelte'
  import { appearance } from './core/skin/appearance.svelte'
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
  const tabs = $derived(allModules().filter((m) => m.nav))
</script>

<div class="shell">
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
  <!-- pruhy a navigace jsou na konci stránky „lepivé“ (sticky): drží se u spodního okraje, ale zabírají místo, takže nezakrývají konec obsahu -->
  <div class="bottom">
    <AppBanners />
    <nav class="tabs" aria-label="Hlavní navigace">
      {#each tabs as m}
        <a
          href={tabHref(m.id, active?.id)}
          onclick={() => active?.id !== m.id && markRestore()}
          aria-current={active?.id === m.id ? 'page' : undefined}
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
      {/each}
    </nav>
  </div>
</div>

<style>
  .shell {
    min-height: 100dvh;
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
    justify-content: space-around;
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
