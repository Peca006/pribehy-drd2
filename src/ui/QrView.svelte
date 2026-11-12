<script lang="ts">
  import { onDestroy } from 'svelte'
  import { splitForQr, toLink } from '../core/character/qr'
  import { qrPath, qrPng } from './qrImage'

  // Zobrazí kód jako QR; dlouhý kód se rozdělí na několik QR, která se střídají (čtečka je složí).
  let { code }: { code: string } = $props()

  // odkaz do aplikace: systémová čtečka fotoaparátu QR otevře přímo v aplikaci (jinak jen ukáže text)
  let asLink = $state(true)
  const parts = $derived(splitForQr(code).map((p) => (asLink ? toLink(p) : p)))
  let index = $state(0)
  let paused = $state(false)
  const timer = setInterval(() => {
    if (!paused && parts.length > 1) index = (index + 1) % parts.length
  }, 2000)
  onDestroy(() => clearInterval(timer))

  // čtvercová matice jako jediná cesta SVG (ostrá při libovolné velikosti), s tichou zónou
  const svg = $derived(qrPath(parts[Math.min(index, parts.length - 1)]))

  // QR jako obrázek: uložení do zařízení a sdílení (zprávy, AirDrop, Quick Share)
  let imgError = $state('')
  const fileName = (i: number) =>
    parts.length > 1 ? `qr-${i + 1}-z-${parts.length}.png` : 'qr.png'
  async function files(): Promise<File[]> {
    return Promise.all(
      parts.map(async (p, i) => new File([await qrPng(p)], fileName(i), { type: 'image/png' })),
    )
  }
  async function savePng() {
    imgError = ''
    try {
      for (const f of await files()) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(f)
        a.download = f.name
        a.click()
        // Chrome stahuje víc souborů za sebou jen s malou prodlevou
        await new Promise((r) => setTimeout(r, 250))
        URL.revokeObjectURL(a.href)
      }
    } catch {
      imgError = 'Obrázek se nepodařilo vytvořit.'
    }
  }
  const canShareImg =
    typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator
  async function shareImg() {
    imgError = ''
    try {
      const fs = await files()
      if (navigator.canShare({ files: fs })) await navigator.share({ files: fs, title: 'QR kód' })
      else imgError = 'Toto zařízení neumí sdílet obrázky, použijte Uložit obrázek.'
    } catch {
      /* zrušeno */
    }
  }
</script>

<div class="qr">
  <svg
    viewBox={`0 0 ${svg.size} ${svg.size}`}
    role="img"
    aria-label={parts.length > 1 ? `QR kód, díl ${index + 1} z ${parts.length}` : 'QR kód'}
    shape-rendering="crispEdges"
  >
    <rect width={svg.size} height={svg.size} fill="#fff" />
    <path d={svg.d} fill="#000" />
  </svg>
  <p class="img">
    <button onclick={savePng}
      >Uložit obrázek{parts.length > 1 ? ` (všech ${parts.length})` : ''}</button
    >
    {#if canShareImg}<button onclick={shareImg}>Sdílet obrázek…</button>{/if}
  </p>
  {#if imgError}<p class="error" role="alert">{imgError}</p>{/if}
  <label class="link">
    <input type="checkbox" bind:checked={asLink} />
    QR obsahuje odkaz do aplikace (systémová čtečka ho otevře přímo)
  </label>
  {#if parts.length > 1}
    <p class="muted">
      Díl {index + 1} z {parts.length} – kódy se střídají, druhé zařízení je naskenuje všechny.
      <button onclick={() => (paused = !paused)}>{paused ? 'Pokračovat' : 'Pozastavit'}</button>
      {#if paused}
        <button onclick={() => (index = (index + parts.length - 1) % parts.length)}>←</button>
        <button onclick={() => (index = (index + 1) % parts.length)}>→</button>
      {/if}
    </p>
  {/if}
</div>

<style>
  .qr {
    margin: 0.75rem 0;
    text-align: center;
  }
  .img {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
    margin: 0.5rem 0;
  }
  .link {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }
  .link input {
    width: auto;
    min-height: 0;
  }
  svg {
    width: min(100%, 30rem);
    height: auto;
    border-radius: 6px;
  }
</style>
