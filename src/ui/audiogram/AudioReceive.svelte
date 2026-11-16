<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, receiveByAudio, type AudioStatus, type InputLevel } from '../../core/audiogram/audio'
  import LevelMeter from './LevelMeter.svelte'
  import LogView from './LogView.svelte'
  import { unpackMessage } from '../../core/audiogram/payload'

  // Příjem kódu zvukem (experiment „audiogram“). Po dokončení předá text funkci `onresult`.
  let { onresult }: { onresult: (text: string) => void } = $props()

  let running = $state(false)
  let status = $state<AudioStatus | undefined>(undefined)
  let error = $state('')
  let level = $state<InputLevel | undefined>(undefined)
  let log = $state<string[]>([])
  let abort: AbortController | undefined

  async function start() {
    error = ''
    status = undefined
    level = undefined
    log = []
    abort = new AbortController()
    running = true
    try {
      const data = await receiveByAudio((s) => (status = s), abort.signal, (l) => (level = l), (line) => (log = [...log, line]))
      if (data) onresult(await unpackMessage(data))
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
  {#if running}<LevelMeter {level} />{/if}
  {#if status}
    <p role="status">
      {status.text}
      {#if status.total}<progress max={status.total} value={status.done ?? 0}></progress>
        {status.done}/{status.total}{/if}
    </p>
    <p class="muted">
      {#if status.mode}Režim: {status.mode} ({status.forced ? 'vybral odesílatel' : 'automaticky'}).{/if}
      {#if status.snr !== undefined}Odstup signálu: {Math.round(status.snr)} dB.{/if}
    </p>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <LogView lines={log} />
{/if}
