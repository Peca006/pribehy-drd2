<script lang="ts">
  // Obrázek (mapa) v textu; po klepnutí se otevře na celou obrazovku s přibližováním
  // (štípnutí dvěma prsty, kolečko myši, tlačítka, dvojklik) a posouváním tažením.
  let { src, alt }: { src: string; alt: string } = $props()

  let open = $state(false)
  let scale = $state(1)
  let x = $state(0)
  let y = $state(0)
  const MIN = 1
  const MAX = 8
  const pointers = new Map<number, { x: number; y: number }>()
  let lastDist = 0

  const reset = () => ((scale = 1), (x = 0), (y = 0))
  const zoomTo = (s: number) => {
    const next = Math.min(MAX, Math.max(MIN, s))
    if (next === MIN) reset()
    else scale = next
  }
  function close() {
    open = false
    reset()
  }

  function down(e: PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    lastDist = 0
  }
  function move(e: PointerEvent) {
    const p = pointers.get(e.pointerId)
    if (!p) return
    if (pointers.size === 2) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (lastDist) zoomTo(scale * (d / lastDist))
      lastDist = d
    } else if (scale > 1) {
      x += e.clientX - p.x
      y += e.clientY - p.y
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
  }
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    lastDist = 0
  }
  const wheel = (e: WheelEvent) => {
    e.preventDefault()
    zoomTo(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2))
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
    else if (e.key === '+' || e.key === '=') zoomTo(scale * 1.4)
    else if (e.key === '-') zoomTo(scale / 1.4)
  }
</script>

<svelte:window onkeydown={open ? key : undefined} />

<figure>
  <button class="thumb" onclick={() => (open = true)} aria-label={`Zvětšit: ${alt}`}>
    <img {src} {alt} />
  </button>
  {#if alt}<figcaption class="muted">{alt} – klepnutím zvětšíte</figcaption>{/if}
</figure>

{#if open}
  <div class="overlay" role="dialog" aria-modal="true" aria-label={alt}>
    <div class="bar">
      <button onclick={() => zoomTo(scale / 1.4)} aria-label="Oddálit">−</button>
      <button onclick={() => zoomTo(scale * 1.4)} aria-label="Přiblížit">+</button>
      <button onclick={reset}>Celé</button>
      <button class="primary" onclick={close}>Zavřít ✕</button>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="stage"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onwheel={wheel}
      ondblclick={() => (scale > 1 ? reset() : zoomTo(2.5))}
    >
      <img {src} {alt} draggable="false" style:transform={`translate(${x}px, ${y}px) scale(${scale})`} />
    </div>
  </div>
{/if}

<style>
  figure {
    margin: 1rem 0;
    text-align: center;
  }
  .thumb {
    display: inline-block;
    padding: 0;
    border: 0;
    background: none;
    min-height: 0;
    max-width: 100%;
    cursor: zoom-in;
  }
  .thumb img {
    display: block;
    max-width: 100%;
    max-height: 70vh;
    height: auto;
    border-radius: var(--drd-radius);
  }
  figcaption {
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.92);
  }
  .bar {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    padding: 0.5rem;
    padding-top: calc(0.5rem + env(safe-area-inset-top));
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    touch-action: none;
  }
  .stage img {
    max-width: 100%;
    max-height: 100%;
    user-select: none;
    transform-origin: center;
  }
</style>
