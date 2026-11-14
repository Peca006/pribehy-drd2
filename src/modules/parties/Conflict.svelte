<script lang="ts">
  import { onMount } from 'svelte'
  import { ATTRIBUTES } from '../../core/character/model'
  import { describeRoll, rollInitiative, type Mode } from '../../core/character/roll'
  import {
    clampThreat,
    hero,
    loadConflict,
    moveInTie,
    nextRound,
    ordered,
    overLimit,
    roundState,
    saveConflict,
    statusOf,
    summary,
    tiedWith,
    update,
    type Conflict,
    type Participant,
  } from '../../core/party/conflict'
  import { newPartyId, type Party } from '../../core/party/model'
  import { getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import Arrow from '../../ui/Arrow.svelte'

  // Pomůcka vypravěče pro konflikt: pořadí podle iniciativy, kola, Ohrožení, Výhody, u bytostí Sudba a Jizvy proti hranicím.
  let { id }: { id: string } = $props()

  let party = $state<Party | undefined>(undefined)
  let conflict = $state<Conflict>({ round: 1, participants: [] })
  let name = $state('')
  let pick = $state('')

  onMount(async () => {
    party = await getParty(id)
    conflict = loadConflict(id)
  })

  const rows = $derived(ordered(conflict))
  const rs = $derived(roundState(conflict))
  // přístup k iniciativě a krátká zpráva o ceně (jen v tomto zobrazení)
  let approach = $state<Record<string, Mode>>({})
  let flash = $state<Record<string, string>>({})
  const APPROACHES: [Mode, string][] = [
    ['normal', 'Normálně'],
    ['best', 'Rychle'],
    ['worst', 'Pomalu'],
  ]
  function say(pid: string, text: string) {
    flash = { ...flash, [pid]: text }
    setTimeout(() => {
      const { [pid]: _, ...rest } = flash
      flash = rest
    }, 2500)
  }
  /** Hod iniciativy bez dovednosti. Rychle a pomalu stojí bytost 1 Sudbu (u hrdiny to platí hráč na své postavě). */
  function rollInit(p: Participant, mode: Mode) {
    let fate = p.fate
    if (mode !== 'normal' && p.kind === 'bytost' && fate !== undefined) {
      if (fate < 1) return say(p.id, 'Chybí Sudba na přístup.')
      fate -= 1
      say(p.id, '−1 Sudba')
    }
    const r = rollInitiative(mode)
    patch(p, { initiative: r.total, fate, initRoll: describeRoll(r.dice, mode) })
  }
  const setStatus = (p: Participant, s: 'acted' | 'deferred' | 'out') =>
    patch(
      p,
      s === 'out'
        ? { out: !p.out }
        : s === 'acted'
          ? { acted: !p.acted, deferred: false }
          : { deferred: !p.deferred, acted: false },
    )
  const free = $derived(
    party?.members.filter((m) => !conflict.participants.some((p) => p.name === m.name)) ?? [],
  )

  function set(c: Conflict) {
    conflict = c
    saveConflict(id, c)
  }
  const patch = (p: Participant, x: Partial<Participant>) => set(update(conflict, p.id, x))
  function add(n: string) {
    if (!n.trim()) return
    set({ ...conflict, participants: [...conflict.participants, hero(n.trim())] })
  }
  function remove(p: Participant) {
    if (!confirm(`Odebrat „${p.name}“ z konfliktu?`)) return
    set({ ...conflict, participants: conflict.participants.filter((x) => x.id !== p.id) })
  }
  async function finish(toJournal: boolean) {
    if (!confirm('Ukončit konflikt? Ohrožení, Výhody a pořadí se smažou.')) return
    if (toJournal && party) {
      party.journal = [
        {
          id: newPartyId(),
          at: new Date().toISOString(),
          by: settings.author,
          title: 'Konflikt',
          text: summary(conflict),
        },
        ...party.journal,
      ]
      await saveParty(party)
    }
    set({ round: 1, participants: [] })
  }
  const kola = (n: number) => (n === 1 ? 'kolo' : n < 5 ? 'kola' : 'kol')
</script>

<nav>
  <a class="btn" href={'#/druziny/' + id}><Arrow dir="left" /> Zpět</a>
</nav>
<h1>Konflikt</h1>

{#if party}
  <div class="bar">
    <strong>Kolo {conflict.round}</strong>
    <button onclick={() => set(nextRound(conflict))} disabled={!conflict.participants.length}>
      Další kolo
    </button>
    <button onclick={() => finish(false)} disabled={!conflict.participants.length}>Konec</button>
    <button onclick={() => finish(true)} disabled={!conflict.participants.length}>
      Konec + do žurnálu
    </button>
  </div>
  {#if conflict.participants.length}
    <p role="status" class="round">
      {#if rs.done}
        <strong>Kolo je hotové.</strong>
        {#if rs.deferred.length}
          Odložili: {rs.deferred.map((p) => p.name).join(', ')}. Pokud nikdo nereagoval, o akci
          přicházejí.
        {/if}
        Na konci kola se vyhodnotí akce prostředí. Pak další kolo, nebo konec konfliktu.
      {:else}
        Na řadě: <strong>{rs.next?.name}</strong>
        {#if rs.deferred.length}<span class="muted">
            (odložili: {rs.deferred.map((p) => p.name).join(', ')})</span
          >{/if}
      {/if}
    </p>
  {/if}
  <p class="muted">
    Iniciativa podle příběhu, nebo hodem bez dovednosti. Stejné hodnoty jsou současné akce, pořadí
    mezi nimi upravíte šipkami. Hrdinové hlásí své hodnoty. V konfliktu Ohrožení neklesne pod 1.
  </p>

  {#each rows as p (p.id)}
    {@const over = overLimit(p)}
    {@const tie = tiedWith(conflict, p.id)}
    {@const st = statusOf(p)}
    <article class="panel" class:out={p.out}>
      <div class="top">
        <strong>{p.name}</strong>
        <span class="muted"
          >{p.kind === 'bytost' ? 'bytost' : 'hrdina'}{p.level !== undefined
            ? ` · úroveň ${p.level}`
            : ''}</span
        >
        <button onclick={() => remove(p)} aria-label={`Odebrat ${p.name}`}>✕</button>
      </div>
      <div class="line">
        <label>
          Iniciativa
          <input
            type="number"
            value={p.initiative}
            onchange={(e) => patch(p, { initiative: Number(e.currentTarget.value) || 0 })}
          />
        </label>
        {#if tie.up || tie.down}
          <span class="muted">současně</span>
          <button
            onclick={() => set(moveInTie(conflict, p.id, -1))}
            disabled={!tie.up}
            aria-label={`Posunout ${p.name} výš`}>↑</button
          >
          <button
            onclick={() => set(moveInTie(conflict, p.id, 1))}
            disabled={!tie.down}
            aria-label={`Posunout ${p.name} níž`}>↓</button
          >
        {/if}
      </div>
      <div class="line">
        {#if p.kind === 'bytost'}
          {#each APPROACHES as [m, label]}
            <button
              class:primary={(approach[p.id] ?? 'normal') === m}
              onclick={() => (approach = { ...approach, [p.id]: m })}>{label}</button
            >
          {/each}
          <button onclick={() => rollInit(p, approach[p.id] ?? 'normal')}>Hodit</button>
          {#if (approach[p.id] ?? 'normal') !== 'normal' && p.fate !== undefined}
            <small class="muted">1 Sudba</small>
          {/if}
        {:else}
          <button onclick={() => rollInit(p, 'normal')}>Hodit 2k6</button>
        {/if}
        {#if flash[p.id]}<small role="status" class="flash">{flash[p.id]}</small>{/if}
        {#if p.initRoll}<small class="muted">{p.initRoll}</small>{/if}
      </div>
      <div class="line">
        <button class:primary={st === 'acted'} onclick={() => setStatus(p, 'acted')} disabled={p.out}
          >Jednal</button
        >
        <button
          class:primary={st === 'deferred'}
          onclick={() => setStatus(p, 'deferred')}
          disabled={p.out}>Odložil</button
        >
        <button class:primary={st === 'out'} onclick={() => setStatus(p, 'out')}>Vyřazen</button>
        {#if st === 'acted'}<small class="muted">zbývá jen obrana</small>{/if}
        {#if st === 'deferred'}<small class="muted">může jen reagovat</small>{/if}
      </div>
      <div class="line">
        <span>Ohrožení</span>
        <button
          onclick={() => patch(p, { threat: clampThreat(p.threat - 1) })}
          aria-label="Snížit Ohrožení">−</button
        >
        <strong>{p.threat}</strong>
        <button
          onclick={() => patch(p, { threat: clampThreat(p.threat + 1) })}
          aria-label="Zvýšit Ohrožení">+</button
        >
        <span>Výhoda</span>
        <button
          onclick={() => patch(p, { advantage: Math.max(0, p.advantage - 1) })}
          aria-label="Ubrat Výhodu">−</button
        >
        <strong>{p.advantage}</strong>
        <button onclick={() => patch(p, { advantage: p.advantage + 1 })} aria-label="Přidat Výhodu"
          >+</button
        >
      </div>
      {#if p.kind === 'bytost'}
        {#if p.fate !== undefined}
          <div class="line">
            <span>Sudba</span>
            <button
              onclick={() => patch(p, { fate: Math.max(0, (p.fate ?? 0) - 1) })}
              aria-label="Ubrat Sudbu">−</button
            >
            <strong>{p.fate}</strong>
            <span class="muted">/ {p.fateMax}</span>
            <button onclick={() => patch(p, { fate: (p.fate ?? 0) + 1 })} aria-label="Přidat Sudbu"
              >+</button
            >
          </div>
        {/if}
        <div class="line">
          <span>Jizvy</span>
          {#each ATTRIBUTES as a}
            <span class="scar" class:bad={over.includes(a)}>
              {a}
              <button
                onclick={() =>
                  patch(p, { scars: { ...p.scars, [a]: Math.max(0, p.scars[a] - 1) } })}
                aria-label={`Ubrat Jizvu ${a}`}>−</button
              >
              {p.scars[a]}{p.limits?.[a] !== undefined ? ` / ${p.limits[a]}` : ''}
              <button
                onclick={() => patch(p, { scars: { ...p.scars, [a]: p.scars[a] + 1 } })}
                aria-label={`Přidat Jizvu ${a}`}>+</button
              >
            </span>
          {/each}
        </div>
        {#if over.length}
          <p class="error" role="status">
            Součet Jizev přesáhl hranici ({over.join(', ')}): bytost je vyřazena.
          </p>
        {/if}
      {/if}
      <input
        type="text"
        value={p.note}
        placeholder="Poznámka"
        aria-label={`Poznámka k ${p.name}`}
        onchange={(e) => patch(p, { note: e.currentTarget.value })}
      />
    </article>
  {:else}
    <p class="muted">Zatím nikdo. Přidejte členy družiny a bytosti (z karty bytosti v Bestiáři).</p>
  {/each}

  <h2>Přidat účastníka</h2>
  {#if free.length}
    <div class="line">
      <select bind:value={pick} aria-label="Člen družiny">
        <option value="">Člen družiny…</option>
        {#each free as m}<option value={m.name}>{m.name}</option>{/each}
      </select>
      <button
        disabled={!pick}
        onclick={() => {
          add(pick)
          pick = ''
        }}>Přidat</button
      >
    </div>
  {/if}
  <div class="line">
    <input
      type="text"
      bind:value={name}
      placeholder="Jiný účastník (jméno)"
      aria-label="Jméno účastníka"
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          add(name)
          name = ''
        }
      }}
    />
    <button
      disabled={!name.trim()}
      onclick={() => {
        add(name)
        name = ''
      }}>Přidat</button
    >
  </div>
  <p><button onclick={() => go('bestiar')}>Bestiář (přidat bytost)</button></p>
{:else}
  <p class="muted">Družina nenalezena.</p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .bar,
  .line,
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.4rem 0;
  }
  .top {
    justify-content: space-between;
  }
  .top strong {
    flex: 1;
  }
  .line input[type='number'] {
    width: 4.5rem;
  }
  .line input[type='text'],
  .line select {
    flex: 1;
  }
  .flash {
    color: #e8c070;
  }
  .round {
    margin: 0.4rem 0;
  }
  .out {
    opacity: 0.55;
  }
  .scar {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  .scar.bad {
    color: #e88;
  }
</style>
