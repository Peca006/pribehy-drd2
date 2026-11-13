<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, receiveByAudio, type RadioStatus } from '../core/radiogram/audio'

  // Příjem kódu zvukem (experiment „radiogram“). Po dokončení předá text funkci `onresult`.
  let { onresult }: { onresult: (text: string) => void } = $props()

  let running = $state(false)
  let status = $state<RadioStatus | undefined>(undefined)
  let error = $state('')
  let abort: AbortController | undefined

  async function start() {
    error = ''
    status = undefined
    abort = new AbortController()
    running = true
    try {
      const data = await receiveByAudio((s) => (status = s), abort.signal)
      if (data) onresult(new TextDecoder().decode(data))
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
    Zapněte příjem a pak na druhém zařízení spusťte <em>Vysílat zvukem</em>. Zařízení dejte blízko k sobě
    a v klidu (bez hluku a hudby).
  </p>
  <p class="actions">
    {#if running}
      <button onclick={stop}>Zrušit</button>
    {:else}
      <button class="primary" onclick={start}>Začít poslouchat</button>
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
      {#if status.snr !== undefined}Odstup signálu: {Math.round(status.snr)} dB.{/if}
    </p>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
{/if}
