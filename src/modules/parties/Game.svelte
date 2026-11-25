<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import {
    activate,
    activeMember,
    bars,
    clearCountdown,
    countdownLeft,
    elapsed,
    fairness,
    finish,
    formatClock,
    pause,
    plan,
    playedSince,
    resume,
    setAbsent,
    setPlanned,
    setRun,
    startCountdown,
    startSitting,
    totals,
    wallClock,
    type Sitting,
  } from '../../core/game/clock'
  import { pace } from '../../core/expedition/run'
  import { getExpedition, listRuns } from '../../core/expedition/store'
  import type { Expedition, Run } from '../../core/expedition/model'
  import { listSittings, saveSitting } from '../../core/game/store'
  import { roleOf, type Party } from '../../core/party/model'
  import { getParty } from '../../core/party/store'
  import Arrow from '../../ui/Arrow.svelte'

  // Vedení hry: časomíra sezení. Jedním klepnutím se přepíná, kdo je právě na řadě; čas běží jen jemu. Součty se počítají
  // z časových razítek, takže přežijí uspání telefonu i obnovení stránky. Vidí je jen Průvodce, nikam se nesdílejí.
  let { id }: { id: string } = $props()

  let party = $state.raw<Party | undefined>(undefined)
  let sitting = $state.raw<Sitting | undefined>(undefined)
  let last = $state.raw<Sitting | undefined>(undefined)
  let loaded = $state(false)
  let now = $state(Date.now())
  // vedení výprav družiny, které právě probíhají (pro odhad příhod)
  let runs = $state.raw<Run[]>([])
  let expedition = $state.raw<Expedition | undefined>(undefined)

  let timer: ReturnType<typeof setInterval> | undefined
  let lock: { release: () => Promise<void> } | undefined

  onMount(async () => {
    party = await getParty(id)
    const all = await listSittings(id)
    sitting = all.find((s) => s.status !== 'hotovo')
    last = all.find((s) => s.status === 'hotovo')
    await loadRuns()
    loaded = true
    timer = setInterval(() => (now = Date.now()), 500)
    document.addEventListener('visibilitychange', onVisible)
    void keepAwake()
  })
  onDestroy(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    void lock?.release().catch(() => undefined)
  })

  // displej se při hře nemá zhasínat (kde to prohlížeč umí)
  async function keepAwake() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
      }
      lock = await nav.wakeLock?.request('screen')
    } catch {
      /* bez zámku se displej může zhasnout, časomíra tím nestrádá */
    }
  }
  // vedení výprav a výprava vybraného vedení (znovu se čtou, když se vrátíte z Při hře)
  async function loadRuns() {
    runs = (await listRuns()).filter((r) => r.partyId === id && r.status === 'probiha')
    const run = runs.find((r) => r.id === sitting?.runId)
    expedition = run ? await getExpedition(run.expeditionId) : undefined
  }
  function onVisible() {
    if (document.visibilityState === 'visible') {
      now = Date.now()
      void loadRuns()
      void keepAwake()
    }
  }

  // ukládání jde jedno po druhém
  let queue: Promise<unknown> = Promise.resolve()
  function change(next: Sitting) {
    sitting = next
    now = Date.now()
    queue = queue.then(() => saveSitting(next))
  }

  const gm = $derived(party ? roleOf(party) === 'pruvodce' : false)
  const members = $derived(party?.members ?? [])
  const time = $derived(sitting ? totals(sitting, now) : {})
  const scale = $derived(
    sitting
      ? bars(
          sitting,
          members.map((m) => m.id),
          now,
        )
      : {},
  )
  const active = $derived(sitting ? activeMember(sitting) : undefined)
  const fair = $derived(
    sitting
      ? fairness(
          sitting,
          members.map((m) => m.id),
          now,
        )
      : undefined,
  )
  const run = $derived(runs.find((r) => r.id === sitting?.runId))
  const incidents = $derived.by(() => {
    if (!sitting || !run || !expedition) return undefined
    const p = pace(expedition, run)
    return {
      played: playedSince(run.incidents, sitting.started),
      left: Math.max(0, p.total - p.played),
    }
  })
  const timing = $derived(
    sitting ? plan(sitting, now, fair?.present.length ?? 0, incidents) : undefined,
  )
  const left = $derived(sitting ? countdownLeft(sitting, now) : undefined)
  const minutes = (ms: number) => Math.max(0, Math.round(ms / 60_000))
  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? ''

  function begin() {
    change(startSitting(id, Date.now()))
    last = undefined
  }
  const tap = (memberId: string) => sitting && change(activate(sitting, memberId, Date.now()))
  const togglePause = () => {
    if (!sitting) return
    change(sitting.status === 'bezi' ? pause(sitting, Date.now()) : resume(sitting, Date.now()))
  }
  const toggleAbsent = (memberId: string) => {
    if (!sitting) return
    change(setAbsent(sitting, memberId, !sitting.absent?.includes(memberId), Date.now()))
  }
  const setPlan = (e: Event) => {
    if (!sitting) return
    change(setPlanned(sitting, Number((e.currentTarget as HTMLInputElement).value)))
  }
  async function chooseRun(e: Event) {
    if (!sitting) return
    change(setRun(sitting, (e.currentTarget as HTMLSelectElement).value || undefined))
    await queue
    await loadRuns()
  }
  // krátký odpočet: na konci zvuk a vibrace (jednou pro každý odpočet)
  let alerts = $state(true)
  let alerted = 0
  const startTimer = (seconds: number) =>
    sitting && change(startCountdown(sitting, seconds, Date.now()))
  const customTimer = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement
    startTimer(Number(input.value))
    input.value = ''
  }
  const stopTimer = () => sitting && change(clearCountdown(sitting))
  $effect(() => {
    const end = sitting?.countdown?.end
    if (!end || left !== 0 || alerted === end) return
    alerted = end
    if (alerts) beep()
  })
  function beep() {
    try {
      navigator.vibrate?.([300, 100, 300])
      const Ctx = window.AudioContext
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      osc.connect(ctx.destination)
      osc.frequency.value = 880
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
      osc.onended = () => void ctx.close()
    } catch {
      /* bez zvuku zbývá text na obrazovce */
    }
  }
  async function end() {
    if (!sitting) return
    if (
      !(await ask('Časomíra se zastaví a sezení se uloží. Časy zůstanou jen u vás.', {
        title: 'Ukončit sezení?',
        ok: 'Ukončit',
      }))
    )
      return
    const done = finish(sitting, Date.now())
    change(done)
    await queue
    last = done
    sitting = undefined
  }
</script>

<nav><a class="btn" href={'#/druziny/' + id}><Arrow dir="left" /> Družina</a></nav>

{#if !loaded}
  <p class="muted">Načítání…</p>
{:else if !party}
  <p class="muted">Družina nenalezena. <a href="#/druziny">Zpět na seznam</a></p>
{:else if !gm}
  <h1>Hra</h1>
  <p class="muted">Časomíru sezení má jen Průvodce, který družinu vede.</p>
{:else}
  <h1>Hra: {party.name}</h1>

  {#if !members.length}
    <p class="muted">
      Družina zatím nemá členy. Přidejte je na stránce družiny, pak půjde sezení měřit.
    </p>
  {:else if !sitting}
    <p class="muted">
      Časomíra měří, kolik času měl který hráč. Klepnutím na hráče se přepne, kdo je na řadě. Časy
      vidíte jen vy a nikam se nesdílejí.
    </p>
    <p><button class="primary" onclick={begin}>Začít sezení</button></p>
    {#if last}
      <h2>Poslední sezení</h2>
      <div class="panel" aria-label="Poslední sezení">
        <p>
          {new Date(last.started).toLocaleString('cs-CZ')} · hra {formatClock(
            elapsed(last, last.ended ?? now),
          )}
          <span class="muted"> (celkem {formatClock(wallClock(last, now))})</span>
        </p>
        {#each members as m (m.id)}
          <div class="line">
            <span>{m.name}</span><strong>{formatClock(totals(last, now)[m.id] ?? 0)}</strong>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <section class="panel head" aria-label="Čas sezení">
      <div>
        <div class="big" aria-live="off">{formatClock(elapsed(sitting, now))}</div>
        <div class="muted">čas hry · od začátku {formatClock(wallClock(sitting, now))}</div>
      </div>
      <div class="actions">
        <button onclick={togglePause} disabled={!sitting.current}
          >{sitting.status === 'bezi' ? 'Pauza' : 'Pokračovat'}</button
        >
        <button onclick={end}>Ukončit</button>
      </div>
    </section>
    {#if sitting.status === 'pauza'}<p class="muted" role="status">
        Časomíra stojí. Klepnutím na hráče ji rozběhnete.
      </p>{/if}

    <section class="panel plan" aria-label="Plán sezení">
      <label
        >Plánovaná délka (min) <input
          type="number"
          min="0"
          step="5"
          value={sitting.planned ?? ''}
          onchange={setPlan}
        /></label
      >
      {#if runs.length}
        <label
          >Vedení výpravy
          <select value={sitting.runId ?? ''} onchange={chooseRun}>
            <option value="">bez výpravy</option>
            {#each runs as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
          </select>
        </label>
      {/if}
      {#if timing}
        <p role="status">
          {#if timing.over}
            Plán je překročen o {minutes(-timing.remainingMs)} min.
          {:else}
            Zbývá {minutes(timing.remainingMs)} min, na hráče ve hře asi {minutes(
              timing.perMemberMs,
            )} min.
          {/if}
          {#if timing.neededMs !== undefined && incidents}
            Při tempu {minutes(timing.perIncidentMs ?? 0)} min na příhodu vyjde zbývajících {incidents.left}
            příhod na {minutes(timing.neededMs)} min{timing.fits
              ? ': stihnete.'
              : ': nestihnete, zvažte zkrácení.'}
          {/if}
        </p>
      {/if}
    </section>

    <section class="panel plan" aria-label="Odpočet">
      {#if left === undefined}
        <div class="presets">
          <span>Odpočet:</span>
          {#each [10, 30, 60, 120] as sec (sec)}
            <button onclick={() => startTimer(sec)}
              >{sec < 60 ? sec + ' s' : sec / 60 + ' min'}</button
            >
          {/each}
          <label
            >vlastní (s) <input type="number" min="1" max="3600" onchange={customTimer} /></label
          >
          <label><input type="checkbox" bind:checked={alerts} /> zvuk a vibrace</label>
        </div>
      {:else if left > 0}
        <div class="presets">
          <strong class="big" role="timer">{formatClock(left + 999)}</strong>
          <button onclick={stopTimer}>Zrušit</button>
        </div>
      {:else}
        <div class="presets">
          <strong role="alert">Čas vypršel</strong>
          <button class="primary" onclick={stopTimer}>Hotovo</button>
        </div>
      {/if}
    </section>

    {#if fair?.ready && fair.behind.length}
      <p class="panel warn" role="status">
        Méně prostoru měl{fair.behind.length > 1 ? 'i' : ''}:
        <strong>{fair.behind.map(nameOf).join(', ')}</strong>. Spravedlivý díl je teď {formatClock(
          fair.share,
        )}.
      </p>
    {/if}

    <ul class="members" aria-label="Hráči">
      {#each members as m (m.id)}
        {@const out = sitting.absent?.includes(m.id) ?? false}
        <li class:out class:behind={fair?.behind.includes(m.id)}>
          <button
            class="member"
            class:active={active === m.id}
            aria-pressed={active === m.id}
            onclick={() => tap(m.id)}
          >
            <span class="who">{m.name}</span>
            <span class="t">{formatClock(time[m.id] ?? 0)}</span>
            <span class="bar" aria-hidden="true"
              ><span style:width={(scale[m.id] ?? 0) * 100 + '%'}></span></span
            >
          </button>
          <button class="away" aria-pressed={out} onclick={() => toggleAbsent(m.id)}>
            {out ? 'Vrátit do hry: ' : 'Mimo hru: '}{m.name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .head {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .big {
    font-size: 2.2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .members {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  }
  .member {
    width: 100%;
    min-height: 5.5rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.25rem 0.5rem;
    align-items: baseline;
    text-align: left;
    padding: 0.75rem;
  }
  .member.active {
    outline: 3px solid var(--drd-accent);
  }
  li {
    display: grid;
    gap: 0.25rem;
  }
  li.out .member {
    opacity: 0.55;
  }
  li.behind .member {
    border-color: var(--drd-accent);
    border-style: dashed;
  }
  .away {
    font-size: 0.85rem;
    padding: 0.2rem 0.5rem;
  }
  .plan {
    display: grid;
    gap: 0.5rem;
  }
  .plan label {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .presets {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .presets input[type='number'] {
    width: 5rem;
  }
  .warn {
    border-color: var(--drd-accent);
  }
  .who {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .t {
    font-variant-numeric: tabular-nums;
    font-size: 1.25rem;
  }
  .bar {
    grid-column: 1 / -1;
    display: block;
    height: 0.6rem;
    border-radius: 0.3rem;
    border: 1px solid var(--drd-border, currentColor);
    overflow: hidden;
  }
  .bar > span {
    display: block;
    height: 100%;
    background: var(--drd-accent);
  }
  .line {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.15rem 0;
    font-variant-numeric: tabular-nums;
  }
</style>
