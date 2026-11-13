<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, sendByAudio, type RadioStatus } from '../core/radiogram/audio'

  // Vysílání kódu zvukem (experiment „radiogram“): handshake, volba režimu podle kvality kanálu,
  // dávky rámců s potvrzením. Druhé zařízení musí mít zapnuté „Přijímat zvukem“ dřív, než tady začnete.
  let { code, onsent }: { code: string; onsent?: () => void } = $props()

  let running = $state(false)
  let status = $state<RadioStatus | undefined>(undefined)
  let result = $state<'ok' | 'fail' | ''>('')
  let error = $state('')
  let abort: AbortController | undefined

  const bytes = $derived(new TextEncoder().encode(code))

  async function start() {
    error = ''
    result = ''
    status = undefined
    abort = new AbortController()
    running = true
    try {
      const ok = await sendByAudio(bytes, (s) => (status = s), abort.signal)
      result = ok ? 'ok' : 'fail'
      if (ok) onsent?.()
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        error = 'Zvuk se nepodařilo spustit (zkontrolujte povolení mikrofonu; potřebný je https).'
    } finally {
      running = false
    }
  }
  function stop() {
    abort?.abort()
  }
  onDestroy(stop)
</script>

{#if !audioSupported()}
  <p class="muted">Tento prohlížeč nepodporuje přenos zvukem (mikrofon / Web Audio).</p>
{:else}
  <p class="muted">
    Přiložte zařízení k sobě, na druhém spusťte <em>Přijímat zvukem</em> a pak tady
    <em>Začít vysílat</em>. Zvuk bude slyšet (písčivé pípání). Zpráva má {bytes.length} B.
  </p>
  <p class="actions">
    {#if running}
      <button onclick={stop}>Zrušit</button>
    {:else}
      <button class="primary" onclick={start}>Začít vysílat</button>
    {/if}
  </p>
  {#if status}
    <p role="status">
      {status.text}
      {#if status.total}<progress max={status.total} value={status.done ?? 0}></progress>
        {status.done}/{status.total}{/if}
    </p>
    <p class="muted">
      {#if status.mode}Režim: {status.mode}.{/if}
      {#if status.snr !== undefined}Odstup signálu u příjemce: {status.snr} dB.{/if}
    </p>
  {/if}
  {#if result === 'ok'}<p role="status">Hotovo, příjemce potvrdil přijetí.</p>{/if}
  {#if result === 'fail'}<p class="error" role="alert">
      Příjemce neodpovídá. Zkuste zařízení přiblížit, zvýšit hlasitost a zopakovat.
    </p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
{/if}
