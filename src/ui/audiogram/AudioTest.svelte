<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, AudioSession } from '../../core/audiogram/audio'
  import LogView from './LogView.svelte'
  import { deviceText } from '../../core/audiogram/audio'
  import {
    analyseModeTest,
    MODE_TEST_FRAMES,
    modeTestSeconds,
    modeTestSignal,
    PROBE_TONES,
    probeSignal,
    rms,
    toDb,
    toneAmplitude,
    type ModeTestResult,
  } from '../../core/audiogram/probe'

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
  let testBusy = $state<'' | 'send' | 'recv' | 'eval'>('')
  let modeResults = $state<ModeTestResult[]>([])
  let abort: AbortController | undefined
  /** nejvyšší špička vstupu při zkoušce režimů (0 až 1) */
  let modePeak = $state(0)

  // Zkouška režimů: odesílatel po odpočtu přehraje několik rámců v každém režimu, příjemce je zaznamená a vyhodnotí.
  async function modeSend() {
    error = ''
    testBusy = 'send'
    const s = new AudioSession()
    try {
      await s.ctx.resume()
      await new Promise((r) => setTimeout(r, 3000))
      await s.play(modeTestSignal(s.fs))
    } catch {
      error = 'Zvuk se nepodařilo přehrát.'
    } finally {
      s.close()
      testBusy = ''
    }
  }

  async function modeRecv() {
    error = ''
    modeResults = []
    modePeak = 0
    testBusy = 'recv'
    abort = new AbortController()
    const s = new AudioSession()
    try {
      await s.open()
      info = s.inputInfo()
      modePeak = 0
      s.tap = (block) => {
        for (let i = 0; i < block.length; i++) modePeak = Math.max(modePeak, Math.abs(block[i]))
      }
      // zaznamenat celé vysílání (odpočet 3 s + zkouška + rezerva), pak vyhodnotit
      const rec = await s.record(modeTestSeconds() + 12, abort.signal)
      testBusy = 'eval'
      await new Promise((r) => setTimeout(r, 30))
      modeResults = analyseModeTest(rec, s.fs)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error = 'Mikrofon se nepodařilo spustit (zkontrolujte povolení; potřebný je https).'
    } finally {
      s.close()
      testBusy = ''
    }
  }

  /** Souhrn všech výsledků zkoušek pro zkopírování. */
  const report = $derived.by(() => {
    const out: string[] = [deviceText(info)]
    if (hold.some((h) => h > -120))
      out.push('Tóny (nejvyšší úroveň): ' + PROBE_TONES.map((f, i) => `${f} Hz ${hold[i] > -120 ? Math.round(hold[i]) + ' dB' : '–'}`).join(', '))
    if (modeResults.length)
      out.push(`Špička vstupu při zkoušce režimů: ${Math.round(toDb(modePeak))} dB${modePeak > 0.95 ? ' (PŘEBUZENO)' : ''}`)
    if (modeResults.length)
      out.push(
        `Režimy (zkušebních rámců ${MODE_TEST_FRAMES}): ` + modeResults.map((r) => `${r.mode} ${r.ok}/${MODE_TEST_FRAMES}`).join(', '),
      )
    return out
  })

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
  <details>
    <summary>Nastavení zařízení před přenosem</summary>
    <ul>
      <li>
        Vypněte vylepšování zvuku: ve Windows Nastavení, Systém, Zvuk, u mikrofonu i reproduktorů
        „Vylepšení zvuku“ vypnout (a Jasný hlas). Jinak systém tóny bere za šum a maže je. Na Macu
        v ovládacím centru zvolte u mikrofonu režim Standardní (ne Izolace hlasu). V telefonu vypněte
        potlačení šumu a hlasové funkce, pokud je nabízí.
      </li>
      <li>Hlasitost vstupu nastavte asi na 60 %, hlasitost výstupu asi na polovinu a zvyšujte podle ukazatele.</li>
      <li>Zařízení dejte 1 až 2 m od sebe nebo blíž, v klidu, bez hudby a ventilátoru.</li>
    </ul>
  </details>
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
  <h4>Zkouška režimů</h4>
  <p class="muted">
    Ukáže, které režimy přenosu mezi zařízeními projdou. Na příjemci stiskněte <em>Přijmout a vyhodnotit</em>,
    na vysílači hned potom <em>Vysílat režimy</em> (za 3 s začne zvuk, trvá asi půl minuty). Výsledek se objeví na příjemci;
    pro druhý směr role prohoďte.
  </p>
  <p class="actions">
    <button onclick={modeSend} disabled={testBusy !== ''}>{testBusy === 'send' ? 'Vysílám…' : 'Vysílat režimy'}</button>
    {#if testBusy === 'recv'}
      <button onclick={() => abort?.abort()}>Zrušit</button>
    {:else}
      <button onclick={modeRecv} disabled={testBusy !== ''}>
        {testBusy === 'eval' ? 'Vyhodnocuji…' : 'Přijmout a vyhodnotit'}
      </button>
    {/if}
  </p>
  {#if modeResults.length}
    <p class={modePeak > 0.95 ? 'error' : 'muted'} role={modePeak > 0.95 ? 'alert' : undefined}>
      Špička vstupu: {Math.round(toDb(modePeak))} dB.
      {#if modePeak > 0.95}Vstup je přebuzený, výsledky rychlých režimů jsou zkreslené. Snižte hlasitost vysílače nebo citlivost mikrofonu a zopakujte.{/if}
    </p>
    <table class="probe" aria-label="Výsledky zkoušky režimů">
      <thead><tr><th>Režim</th><th>Prošlo</th></tr></thead>
      <tbody>
        {#each modeResults as r}
          <tr><td>{r.mode}</td><td>{r.ok} z {MODE_TEST_FRAMES}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <LogView lines={report} title="Protokol zkoušek" />
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
