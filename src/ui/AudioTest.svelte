<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, AudioSession } from '../core/audiogram/audio'
  import { PROBE_TONES, probeSignal, rms, toDb, toneAmplitude } from '../core/audiogram/probe'

  // Zkouška zvuku mezi dvěma zařízeními: jedno přehraje tóny, druhé ukáže, jaké úrovně u nich slyší. Pomůže zjistit,
  // které frekvence reproduktor a mikrofon propustí (a jestli telefon zvuk neupravuje).
  let playing = $state(false)
  let listening = $state(false)
  let error = $state('')
  /** nejvyšší naměřená úroveň (dB) u každého tónu a aktuální celková hlasitost */
  let hold = $state<number[]>(PROBE_TONES.map(() => -120))
  let level = $state(-120)
  let info = $state<ReturnType<AudioSession['inputInfo']> | undefined>(undefined)
  let session: AudioSession | undefined

  async function play() {
    error = ''
    playing = true
    const s = new AudioSession()
    try {
      await s.ctx.resume()
      await s.play(probeSignal(s.fs))
    } catch {
      error = 'Zvuk se nepodařilo přehrát.'
    } finally {
      s.close()
      playing = false
    }
  }

  async function listen() {
    error = ''
    hold = PROBE_TONES.map(() => -120)
    level = -120
    const s = new AudioSession()
    session = s
    try {
      await s.open()
      info = s.inputInfo()
      let buf: number[] = []
      const need = Math.round(s.fs * 0.25)
      s.tap = (block) => {
        level = toDb(rms(block))
        buf.push(...block)
        if (buf.length < need) return
        const part = buf
        buf = []
        hold = hold.map((h, i) => Math.max(h, toDb(toneAmplitude(part, PROBE_TONES[i], s.fs))))
      }
      listening = true
    } catch {
      error = 'Mikrofon se nepodařilo spustit (zkontrolujte povolení; potřebný je https).'
      s.close()
      session = undefined
    }
  }

  function stop() {
    session?.close()
    session = undefined
    listening = false
  }
  onDestroy(stop)

  const best = $derived(Math.max(...hold))
  const bar = (db: number) => Math.max(0, Math.min(100, ((db + 90) / 90) * 100))
  const yesNo = (v: boolean | string | undefined) =>
    v === undefined ? 'neznámé' : v === false ? 'vypnuto' : 'zapnuto'
</script>

{#if !audioSupported()}
  <p class="muted">Tento prohlížeč nepodporuje zvuk (mikrofon / Web Audio).</p>
{:else}
  <p class="muted">
    Na jednom zařízení stiskněte <em>Přehrát tóny</em>, na druhém předtím <em>Poslouchat</em>.
    Uvidíte, které tóny druhé zařízení slyší a jak silně. Funguje v obou směrech.
  </p>
  <p class="actions">
    <button onclick={play} disabled={playing}>{playing ? 'Přehrávám…' : 'Přehrát tóny'}</button>
    {#if listening}
      <button onclick={stop}>Skončit poslech</button>
    {:else}
      <button onclick={listen}>Poslouchat</button>
    {/if}
  </p>
  {#if listening || best > -120}
    <table class="probe" aria-label="Naměřené úrovně tónů">
      <thead><tr><th>Tón</th><th>Úroveň</th><th></th></tr></thead>
      <tbody>
        {#each PROBE_TONES as f, i}
          <tr>
            <td>{f} Hz</td>
            <td><progress max="100" value={bar(hold[i])}></progress></td>
            <td>{hold[i] > -120 ? `${Math.round(hold[i])} dB` : '–'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="muted">
      Hlasitost na vstupu teď: {level > -120 ? `${Math.round(level)} dB` : '–'}. Tóny slabší než
      asi −60 dB zařízení prakticky neslyší; rozdíl nad 20 dB mezi tóny znamená, že je některé
      pásmo tlumené.
    </p>
  {/if}
  {#if info}
    <p class="muted">
      Vzorkování {info.fs} Hz · potlačení ozvěny: {yesNo(info.echoCancellation)} · potlačení šumu: {yesNo(
        info.noiseSuppression,
      )} · automatická hlasitost: {yesNo(info.autoGainControl)}. U přenosu mají být všechna tři
      vypnutá.
    </p>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
{/if}

<style>
  .probe {
    border-collapse: collapse;
    width: 100%;
    max-width: 28rem;
  }
  .probe td,
  .probe th {
    text-align: left;
    padding: 0.15rem 0.5rem 0.15rem 0;
  }
  progress {
    width: 100%;
  }
</style>
