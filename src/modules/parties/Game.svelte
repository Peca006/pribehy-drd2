<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { ask } from '../../core/confirm.svelte'
  import {
    activate,
    activeMember,
    bars,
    elapsed,
    fairness,
    finish,
    formatClock,
    pause,
    resume,
    setAbsent,
    startSitting,
    totals,
    wallClock,
    type Sitting,
  } from '../../core/game/clock'
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

  let timer: ReturnType<typeof setInterval> | undefined
  let lock: { release: () => Promise<void> } | undefined

  onMount(async () => {
    party = await getParty(id)
    const all = await listSittings(id)
    sitting = all.find((s) => s.status !== 'hotovo')
    last = all.find((s) => s.status === 'hotovo')
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
  function onVisible() {
    if (document.visibilityState === 'visible') {
      now = Date.now()
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
