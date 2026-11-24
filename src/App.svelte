<script lang="ts">
  import { onMount } from 'svelte'
  import { refreshLibrary } from './core/library.svelte'
  import { refreshRecipes } from './core/recipes/cache.svelte'
  import { migrateLegacyLogs } from './core/recipes/legacy'
  import { initPwa } from './core/pwa.svelte'
  import { allModules, getModule } from './core/modules'
  import { markRestore, router, startRouter, tabHref, toHash } from './core/router.svelte'
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
          <span class="icon" aria-hidden="true">{m.icon}</span>
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
    border-top: 1px solid var(--drd-muted);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabs a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.25rem;
    min-height: 56px;
    color: var(--drd-muted);
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
</style>
