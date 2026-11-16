<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, sendByAudio, type AudioStatus, type InputLevel } from '../core/audiogram/audio'
  import { MODES } from '../core/audiogram/modes'
  import LevelMeter from './LevelMeter.svelte'
  import LogView from './LogView.svelte'
  import { packMessage } from '../core/audiogram/payload'

  // Vysílání kódu zvukem (experiment „audiogram“): handshake, volba režimu podle kvality kanálu
  // (nebo ručně vybraný režim), dávky rámců s potvrzením. Druhé zařízení musí mít zapnuté
  // „Přijímat zvukem“ dřív, než tady začnete.
  let { code, onsent }: { code: string; onsent?: () => void } = $props()

  let running = $state(false)
  let status = $state<AudioStatus | undefined>(undefined)
  let result = $state<'ok' | 'fail' | ''>('')
  let error = $state('')
  let level = $state<InputLevel | undefined>(undefined)
  /** 'auto' nebo index režimu v tabulce */
  let mode = $state<string>('auto')
  let size = $state(0)
  let log = $state<string[]>([])
  let abort: AbortController | undefined

  // kód DRD2: se vysílá jako bajty (o čtvrtinu méně než text)
  $effect(() => {
    const c = code
    packMessage(c).then((b) => (size = b.length))
  })

  async function start() {
    error = ''
    result = ''
    status = undefined
    level = undefined
    log = []
    abort = new AbortController()
    running = true
    try {
      const data = await packMessage(code)
      const ok = await sendByAudio(
        data,
        (s) => (status = s),
        abort.signal,
        mode === 'auto' ? undefined : Number(mode),
        (l) => (level = l),
        (line) => (log = [...log, line]),
      )
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
    <em>Začít vysílat</em>. Zvuk bude slyšet (písčivé pípání). Zpráva má {size} B.
  </p>
  <label class="check">
    Režim
    <select bind:value={mode} disabled={running} aria-label="Režim přenosu">
      <option value="auto">Automaticky podle handshake</option>
      {#each MODES as m}
        <option value={String(m.id)}>{m.name} ({m.bitrate} b/s)</option>
      {/each}
    </select>
  </label>
  <p class="actions">
    {#if running}
      <button onclick={stop}>Zrušit</button>
    {:else}
      <button class="primary" onclick={start}>Začít vysílat</button>
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
      {#if status.mode}Režim: {status.mode} ({status.forced ? 'vybraný ručně' : 'automaticky'}).{/if}
      {#if status.snr !== undefined}Odstup signálu u příjemce: {status.snr} dB.{/if}
    </p>
  {/if}
  {#if result === 'ok'}<p role="status">Hotovo, příjemce potvrdil přijetí.</p>{/if}
  {#if result === 'fail'}<p class="error" role="alert">
      Příjemce neodpovídá. Zkuste zařízení přiblížit, zvýšit hlasitost, zopakovat nebo zvolit pomalejší
      režim.
    </p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <LogView lines={log} />
{/if}
