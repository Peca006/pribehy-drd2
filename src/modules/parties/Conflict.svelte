<script lang="ts">
  import { onMount } from 'svelte'
  import { ATTRIBUTES } from '../../core/character/model'
  import { rollDice } from '../../core/character/roll'
  import {
    clampThreat,
    hero,
    loadConflict,
    nextRound,
    ordered,
    overLimit,
    saveConflict,
    summary,
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
  <p class="muted">
    Iniciativa se určí podle situace v příběhu, nebo hodem bez dovednosti (tlačítko 2k6 u
    účastníka). Hlásí se od nejvyšší iniciativy. V konfliktu Ohrožení neklesne pod 1. Trvá {conflict.round}
    {kola(conflict.round)}.
  </p>

  {#each rows as p (p.id)}
    {@const over = overLimit(p)}
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
        <button
          onclick={() => {
            const [a, b] = rollDice()
            patch(p, { initiative: a + b })
          }}>2k6</button
        >
        <label class="check">
          <input
            type="checkbox"
            checked={p.acted}
            onchange={(e) => patch(p, { acted: e.currentTarget.checked })}
          />
          Jednal
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={p.out}
            onchange={(e) => patch(p, { out: e.currentTarget.checked })}
          />
          Vyřazen
        </label>
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
  .check {
    display: flex;
    gap: 0.3rem;
    align-items: center;
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
