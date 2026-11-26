<script lang="ts">
  import { back, canGoBack } from '../core/router.svelte'
  import Arrow from './Arrow.svelte'

  // Univerzální „Zpět“: vrátí na stránku, odkud uživatel přišel. Nemá-li se kam vrátit (obnovená stránka, otevřený
  // odkaz), vede na `fallback` (nadřazená stránka). Odkaz zůstává platný, takže funguje i bez skriptu.
  let { fallback }: { fallback: string } = $props()

  function click(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!canGoBack()) return
    e.preventDefault()
    back()
  }
</script>

<a class="btn" href={fallback} onclick={click}><Arrow dir="left" /> Zpět</a>
