<script lang="ts">
  import { encodeJson } from '../../core/character/share'
  import type { Content } from '../../core/exchange/content'
  import { shareFileName } from '../../core/shareFile'

  // Odeslání zásilky obsahu (výprava, dobrodružství, cizí postavy): soubor, zkopírovaný kód, Sdílet.
  // Příjemce ji otevře v Přijmout obsah (Dílna). Obsah je tajný jen vůči hráčům, posílá se jinému vypravěči.
  let {
    build,
    kind,
    name,
    label = 'Sdílet',
  }: {
    build: () => Content
    kind: 'vyprava' | 'dobrodruzstvi' | 'cizi-postavy'
    name: string
    label?: string
  } = $props()

  let copied = $state(false)
  let error = $state('')
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  const fileName = $derived(shareFileName(kind, name))

  async function code() {
    return encodeJson(build())
  }
  async function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([await code()], { type: 'text/plain' }))
    a.download = fileName
    a.click()
    URL.revokeObjectURL(a.href)
  }
  async function copy() {
    error = ''
    try {
      await navigator.clipboard.writeText(await code())
    } catch {
      error = 'Kód se nepodařilo zkopírovat, použijte Stáhnout soubor.'
      return
    }
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
  async function share() {
    const text = await code()
    const file = new File([text], fileName, { type: 'text/plain' })
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: name, files: [file] })
      else await navigator.share({ title: name, text })
    } catch {
      /* uživatel sdílení zrušil */
    }
  }
</script>

<details class="send">
  <summary>{label}</summary>
  <p class="muted">
    Soubor či kód otevře jiný vypravěč v Dílně → Přijmout obsah. Posílají se i tajná pozadí a příhody;
    rozehraná vedení ne.
  </p>
  <p class="actions">
    <button onclick={download}>Stáhnout soubor</button>
    <button onclick={copy}>{copied ? 'Zkopírováno ✓' : 'Zkopírovat kód'}</button>
    {#if canShare}<button onclick={share}>Sdílet…</button>{/if}
  </p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</details>

<style>
  .send {
    margin: 0.5rem 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
