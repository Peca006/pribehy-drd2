<script lang="ts">
  import { classifyViewport, viewportLabel } from '../../core/skin/skin'

  // Náhled Háva: aplikace v rámečku zařízení. Háv se předává přes `?hav=…` (viz `previewChoiceFromSearch`),
  // takže se dá prohlížet bez aktivace. Rámeček má skutečné rozměry zařízení (aplikace uvnitř tak zjistí správnou
  // třídu viewportu) a jen se zmenší, aby se vešel do šířky stránky.
  let { choice }: { choice: string } = $props()

  const DEVICES = [
    { id: 'tel-v', label: 'Telefon na výšku', w: 360, h: 740 },
    { id: 'tel-s', label: 'Telefon na šířku', w: 740, h: 360 },
    { id: 'tab-v', label: 'Tablet na výšku', w: 768, h: 1024 },
    { id: 'tab-s', label: 'Tablet na šířku', w: 1180, h: 820 },
  ] as const
  const PAGES = [
    { hash: '#/postavy', label: 'Postavy' },
    { hash: '#/bestiar', label: 'Bestiář' },
    { hash: '#/knihovna', label: 'Více' },
  ] as const

  let deviceId = $state<(typeof DEVICES)[number]['id']>('tel-v')
  let page = $state<(typeof PAGES)[number]['hash']>('#/postavy')
  let available = $state(0)

  const device = $derived(DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0])
  // 8 px na ohraničení rámečku, ať se nezobrazí vodorovný posun
  const scale = $derived(available > 8 ? Math.min(1, (available - 8) / device.w) : 1)
  const src = $derived(`${location.pathname}?hav=${encodeURIComponent(choice)}${page}`)
</script>

<div class="bar">
  <div class="devices" role="group" aria-label="Zařízení">
    {#each DEVICES as d (d.id)}
      <button type="button" aria-pressed={deviceId === d.id} onclick={() => (deviceId = d.id)}>
        {d.label}
      </button>
    {/each}
  </div>
  <label>
    <span class="muted">Stránka:</span>
    <select bind:value={page}>
      {#each PAGES as p (p.hash)}
        <option value={p.hash}>{p.label}</option>
      {/each}
    </select>
  </label>
</div>

<p class="muted">
  {device.w} × {device.h} px · {viewportLabel(classifyViewport(device.w, device.h))}
  {#if scale < 1}· zmenšeno na {Math.round(scale * 100)} %{/if}
</p>

<div class="stage" bind:clientWidth={available}>
  <div class="frame" style:width="{device.w * scale}px" style:height="{device.h * scale}px">
    <iframe
      title="Náhled aplikace: {device.label}"
      {src}
      style:width="{device.w}px"
      style:height="{device.h}px"
      style:transform="scale({scale})"
    ></iframe>
  </div>
</div>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
  }
  .devices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  button[aria-pressed='true'] {
    border-color: var(--drd-accent);
    color: var(--drd-accent);
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  select {
    width: auto;
  }
  .stage {
    width: 100%;
    overflow: hidden;
  }
  .frame {
    overflow: hidden;
    border: 2px solid var(--drd-border);
    border-radius: var(--drd-radius);
    box-sizing: content-box;
    margin: 0 auto;
  }
  iframe {
    display: block;
    border: 0;
    transform-origin: 0 0;
    background: var(--drd-bg);
  }
</style>
