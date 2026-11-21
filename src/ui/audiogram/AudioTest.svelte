<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audioSupported, AudioSession, deviceText } from '../../core/audiogram/audio'
  import LogView from './LogView.svelte'
  import {
    analyseModeTest,
    fullTestSeconds,
    fullTestSignal,
    MODE_TEST_FRAMES,
    PROBE_TONES,
    rms,
    toDb,
    toneLevels,
    type ModeTestResult,
  } from '../../core/audiogram/probe'

  // Zkouška zvuku mezi dvěma zařízeními: jedno přehraje tóny a potom přenosové režimy, druhé je zaznamená a vyhodnotí,
  // které frekvence reproduktor a mikrofon propustí a které režimy přenosu projdou (a jestli telefon zvuk neupravuje).
  let busy = $state<'' | 'send' | 'recv' | 'eval'>('')
  let error = $state('')
  /** nejvyšší naměřená úroveň (dB) u každého tónu */
  let tones = $state<number[]>([])
  let modeResults = $state<ModeTestResult[]>([])
  let info = $state<ReturnType<AudioSession['inputInfo']> | undefined>(undefined)
  /** aktuální hlasitost vstupu při snímání (dB) a nejvyšší špička (0 až 1) */
  let level = $state(-120)
  let peak = $state(0)
  let logOpen = $state(false)
  let abort: AbortController | undefined

  // Přehrát test: po 3 s se postupně přehrají všechny tóny a pak všechny přenosové režimy.
  async function send() {
    error = ''
    busy = 'send'
    const s = new AudioSession()
    try {
      await s.ctx.resume()
      await new Promise((r) => setTimeout(r, 3000))
      await s.play(fullTestSignal(s.fs))
    } catch {
      error = 'Zvuk se nepodařilo přehrát.'
    } finally {
      s.close()
      busy = ''
    }
  }

  // Snímat a vyhodnotit: zaznamená celé vysílání, pak vyhodnotí tóny i režimy a otevře protokol ke zkopírování.
  async function receive() {
    error = ''
    tones = []
    modeResults = []
    level = -120
    peak = 0
    logOpen = false
    busy = 'recv'
    abort = new AbortController()
    const s = new AudioSession()
    try {
      await s.open()
      info = s.inputInfo()
      s.tap = (block) => {
        level = toDb(rms(block))
        for (let i = 0; i < block.length; i++) peak = Math.max(peak, Math.abs(block[i]))
      }
      // celé vysílání (odpočet 3 s + tóny + režimy) s rezervou
      const rec = await s.record(fullTestSeconds() + 12, abort.signal)
      busy = 'eval'
      await new Promise((r) => setTimeout(r, 30))
      tones = toneLevels(rec, s.fs)
      modeResults = analyseModeTest(rec, s.fs)
      logOpen = true
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        error = 'Mikrofon se nepodařilo spustit (zkontrolujte povolení; potřebný je https).'
    } finally {
      s.close()
      busy = ''
    }
  }
  onDestroy(() => abort?.abort())

  /** Souhrn všech výsledků pro zkopírování. */
  const report = $derived.by(() => {
    const out: string[] = []
    if (!tones.length && !modeResults.length) return out
    out.push(deviceText(info))
    out.push(
      'Tóny (nejvyšší úroveň): ' +
        PROBE_TONES.map((f, i) => `${f} Hz ${tones[i] > -120 ? Math.round(tones[i]) + ' dB' : '–'}`).join(', '),
    )
    out.push(`Špička vstupu při zkoušce: ${Math.round(toDb(peak))} dB${peak > 0.95 ? ' (PŘEBUZENO)' : ''}`)
    out.push(
      `Režimy (zkušebních rámců ${MODE_TEST_FRAMES}): ` +
        modeResults.map((r) => `${r.mode} ${r.ok}/${MODE_TEST_FRAMES}`).join(', '),
    )
    return out
  })

  const bar = (db: number) => Math.max(0, Math.min(100, ((db + 90) / 90) * 100))
  const yesNo = (v: boolean | string | undefined) =>
    v === undefined ? 'neznámé' : v === false ? 'vypnuto' : 'zapnuto'
</script>

{#if !audioSupported()}
  <p class="muted">Tento prohlížeč nepodporuje zvuk (mikrofon / Web Audio).</p>
{:else}
  <p class="muted">
    Na jednom zařízení stiskněte nejprve <em>Snímat a vyhodnotit</em>, potom na druhém <em>Přehrát test</em> (za 3 s začne
    zvuk, trvá necelou minutu). Uvidíte, které tóny druhé zařízení slyší a jak silně. Ukáže, které režimy přenosu mezi
    zařízeními projdou. Na příjemci se objeví výsledek. Pro druhý směr role prohoďte.
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
    {#if busy === 'recv'}
      <button onclick={() => abort?.abort()}>Zrušit snímání</button>
    {:else}
      <button class="primary" onclick={receive} disabled={busy !== ''}>
        {busy === 'eval' ? 'Vyhodnocuji…' : 'Snímat a vyhodnotit'}
      </button>
    {/if}
    <button onclick={send} disabled={busy !== ''}>{busy === 'send' ? 'Přehrávám…' : 'Přehrát test'}</button>
  </p>
  {#if busy === 'recv'}
    <p class="muted" role="status">
      Snímám… hlasitost na vstupu: {level > -120 ? `${Math.round(level)} dB` : '–'}. Na druhém zařízení stiskněte Přehrát test.
    </p>
  {/if}
  {#if tones.length}
    <table class="probe" aria-label="Naměřené úrovně tónů">
      <thead><tr><th>Tón</th><th>Úroveň</th><th></th></tr></thead>
      <tbody>
        {#each PROBE_TONES as f, i}
          <tr>
            <td class="nowrap">{f} Hz</td>
            <td><progress max="100" value={bar(tones[i])}></progress></td>
            <td class="nowrap">{tones[i] > -120 ? `${Math.round(tones[i])} dB` : '–'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="muted">
      Tóny slabší než asi −60 dB zařízení prakticky neslyší; rozdíl nad 20 dB mezi tóny znamená, že je některé pásmo
      tlumené.
    </p>
  {/if}
  {#if modeResults.length}
    <p class={peak > 0.95 ? 'error' : 'muted'} role={peak > 0.95 ? 'alert' : undefined}>
      Špička vstupu: {Math.round(toDb(peak))} dB.
      {#if peak > 0.95}Vstup je přebuzený, výsledky rychlých režimů jsou zkreslené. Snižte hlasitost vysílače nebo citlivost mikrofonu a zopakujte.{/if}
    </p>
    <table class="probe" aria-label="Výsledky zkoušky režimů">
      <thead><tr><th>Režim</th><th>Prošlo</th></tr></thead>
      <tbody>
        {#each modeResults as r}
          <tr><td>{r.mode}</td><td class="nowrap">{r.ok} z {MODE_TEST_FRAMES}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <LogView lines={report} title="Protokol zkoušek" bind:open={logOpen} />
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
  /* každý tón na jednom řádku: text se nezalamuje a ukazatel dostane zbytek šířky */
  .nowrap {
    white-space: nowrap;
  }
  progress {
    width: 100%;
    min-width: 4rem;
  }
</style>
