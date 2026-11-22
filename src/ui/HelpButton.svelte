<script lang="ts">
  // Tlačítko „?“, které přepíná panel nápovědy (`HelpPanel`) pod prvkem; stav drží volající (`bind:open`).
  let { open = $bindable(false), label = 'Nápověda' }: { open?: boolean; label?: string } = $props()
</script>

<button
  type="button"
  class="qm"
  class:primary={open}
  onclick={() => (open = !open)}
  onkeydown={(e) => e.key === 'Escape' && (open = false)}
  aria-expanded={open}
  aria-label={label}
  title={label}>?</button
>

<style>
  .qm {
    min-width: 1.6rem;
    min-height: 1.6rem;
    padding: 0 0.4rem;
    line-height: 1;
    font-weight: 600;
  }
</style>
