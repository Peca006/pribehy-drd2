<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import jsQR from 'jsqr'

  // Čtečka QR kamerou zařízení (potřebuje https nebo localhost a povolení kamery). Každý nově přečtený
  // text předá funkci `onscan`; skládání dílů řeší volající.
  let { onscan }: { onscan: (text: string) => void } = $props()

  let video = $state<HTMLVideoElement | undefined>(undefined)
  let running = $state(false)
  let error = $state('')
  let stream: MediaStream | undefined
  let raf = 0
  let last = ''
  const canvas = document.createElement('canvas')

  async function start() {
    error = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
    } catch {
      error = 'Kameru se nepodařilo spustit (zkontrolujte povolení kamery v prohlížeči).'
      return
    }
    running = true
    // <video> se vytvoří až po `running`
    await tick()
    if (!video) return
    video.srcObject = stream
    await video.play().catch(() => {})
    loop()
  }

  function loop() {
    raf = requestAnimationFrame(loop)
    if (!video || video.readyState < 2 || !video.videoWidth) return
    // zmenšený snímek je pro čtečku rychlejší a pro QR na displeji stačí
    const scale = Math.min(1, 640 / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (hit?.data && hit.data !== last) {
      last = hit.data
      onscan(hit.data)
    }
  }

  export function stop() {
    cancelAnimationFrame(raf)
    stream?.getTracks().forEach((t) => t.stop())
    stream = undefined
    running = false
    last = ''
  }
  onDestroy(stop)
</script>

{#if !running}
  <button onclick={start}>📷 Skenovat QR</button>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
{:else}
  <div class="cam">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted></video>
    <button onclick={stop}>Zastavit kameru</button>
  </div>
{/if}

<style>
  .cam {
    margin: 0.5rem 0;
    text-align: center;
  }
  video {
    width: min(100%, 22rem);
    border-radius: 6px;
    background: #000;
  }
</style>
