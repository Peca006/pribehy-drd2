<script lang="ts">
  import { onDestroy } from 'svelte'
  import { splitForQr, toLink } from '../core/character/qr'
  import { qrPath } from './qrImage'

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
