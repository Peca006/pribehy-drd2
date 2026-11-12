<script lang="ts">
  import { onDestroy } from 'svelte'
  import qrcode from 'qrcode-generator'
  import { splitForQr } from '../core/character/qr'

  // Zobrazí kód jako QR; dlouhý kód se rozdělí na několik QR, která se střídají (čtečka je složí).
  let { code }: { code: string } = $props()

  const parts = $derived(splitForQr(code))
  let index = $state(0)
  let paused = $state(false)
  const timer = setInterval(() => {
    if (!paused && parts.length > 1) index = (index + 1) % parts.length
  }, 2000)
  onDestroy(() => clearInterval(timer))

  // čtvercová matice jako jediná cesta SVG (ostrá při libovolné velikosti), s tichou zónou
  const svg = $derived.by(() => {
    // oprava chyb M: čtečka snese drobné nečistoty, odlesky a neostrost displeje
    const qr = qrcode(0, 'M')
    qr.addData(parts[Math.min(index, parts.length - 1)], 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { size: n + 8, d }
  })
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
  svg {
    width: min(100%, 30rem);
    height: auto;
    border-radius: 6px;
  }
</style>
