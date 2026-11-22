<script lang="ts">
  // Nadpis dialogu nebo stránky s tlačítkem „?“ a panelem nápovědy pod ním.
  import HelpButton from './HelpButton.svelte'
  import HelpPanel from './HelpPanel.svelte'

  let { title, topic, level = 2, flush = false }: { title: string; topic: string; level?: 1 | 2; flush?: boolean } = $props()
  let open = $state(false)
</script>

<div class="hhead" class:flush>
  {#if level === 1}<h1>{title}</h1>{:else}<h2>{title}</h2>{/if}
  <HelpButton bind:open label={`Nápověda: ${title}`} />
</div>
<HelpPanel {topic} {open} />

<style>
  .flush h2 {
    margin-top: 0;
  }
  .hhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
</style>
