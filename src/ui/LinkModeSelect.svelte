<script lang="ts">
  import { setTermLinks, settings } from '../core/settings.svelte'
  import { isLinkMode, LINK_MODES } from '../core/termLinks'
</script>

<label class="mode">
  <span class="muted">Odkazy v textu:</span>
  <select
    value={settings.termLinks}
    onchange={(e) => {
      const v = e.currentTarget.value
      if (isLinkMode(v)) setTermLinks(v)
    }}
  >
    {#each LINK_MODES as m}<option value={m.id}>{m.label}</option>{/each}
  </select>
</label>

<style>
  .mode {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }
  select {
    width: auto;
    min-height: 0;
  }
</style>
