<script lang="ts">
  import { onMount } from 'svelte'
  import { refreshLibrary } from './core/library.svelte'
  import { allModules, getModule } from './core/modules'
  import { router, startRouter, toHash } from './core/router.svelte'
  import { DEFAULT_MODULE } from './modules'

  onMount(() => {
    startRouter()
    refreshLibrary()
  })

  const active = $derived(getModule(router.module || DEFAULT_MODULE))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Current = $derived(active?.component as any)
  const tabs = $derived(allModules().filter((m) => m.nav))
</script>

<div class="shell">
  <main>
    {#if Current}
      <Current params={router.params} />
    {:else}
      <p>Stránka nenalezena. <a href={toHash(DEFAULT_MODULE)}>Domů</a></p>
    {/if}
  </main>
  <nav class="tabs" aria-label="Hlavní navigace">
    {#each tabs as m}
      <a href={toHash(m.id)} aria-current={active?.id === m.id ? 'page' : undefined}>
        <span class="icon" aria-hidden="true">{m.icon}</span>
        <span>{m.title}</span>
      </a>
    {/each}
  </nav>
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
    padding-bottom: 5rem;
  }
  .tabs {
    position: fixed;
    inset: auto 0 0 0;
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
