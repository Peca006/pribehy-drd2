<script lang="ts">
  // Kopírovatelný protokol zkoušky nebo přenosu: text se dá vložit do zprávy a poslat vývojáři.
  let {
    lines,
    title = 'Protokol',
    open = $bindable(false),
  }: { lines: string[]; title?: string; open?: boolean } = $props()

  let note = $state('')
  const text = $derived(lines.join('\n'))

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      note = 'Zkopírováno.'
    } catch {
      note = 'Kopírování se nepovedlo, označte text ručně.'
    }
  }
</script>

{#if lines.length}
  <details bind:open>
    <summary>{title} ({lines.length} řádků)</summary>
    <p class="actions"><button onclick={copy}>Kopírovat protokol</button> <small class="muted">{note}</small></p>
    <textarea readonly rows="10" aria-label={title} value={text}></textarea>
  </details>
{/if}

<style>
  textarea {
    width: 100%;
    font-family: monospace;
    font-size: 0.75rem;
  }
</style>
