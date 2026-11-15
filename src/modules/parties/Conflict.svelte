<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { onMount } from 'svelte'
  import {
    addParticipant,
    cycleStatus,
    hero,
    loadConflict,
    moveInTie,
    nextRound,
    ordered,
    overLimit,
    roundState,
    saveConflict,
    setFate,
    statusOf,
    summary,
    tiedWith,
    update,
    type Conflict,
    type Participant,
    type Status,
  } from '../../core/party/conflict'
  import { newPartyId, type Party } from '../../core/party/model'
  import { getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import Arrow from '../../ui/Arrow.svelte'
  import ParticipantDialog from './ParticipantDialog.svelte'

  // Tracker konfliktu pro vypravěče: nejdřív příprava (iniciativy a pořadí), pak průběh kol. Podrobnosti (hody bytostí,
  // Ohrožení, Jizvy) jsou v dialogu účastníka. Hrdinové si své hody řeší sami, vypravěč je jen označuje.
  let { id }: { id: string } = $props()

  let party = $state<Party | undefined>(undefined)
  let conflict = $state<Conflict>({ round: 1, participants: [] })
  let name = $state('')
  let pick = $state('')
  let openId = $state<string | undefined>(undefined)
  let envDone = $state(false)

  onMount(async () => {
    party = await getParty(id)
    conflict = loadConflict(id)
  })

  const rows = $derived(ordered(conflict))
  const rs = $derived(roundState(conflict))
  const started = $derived(!!conflict.started)
  const hasBeast = $derived(conflict.participants.some((p) => p.kind === 'bytost'))
  const opened = $derived(conflict.participants.find((p) => p.id === openId))
  const free = $derived(
    party?.members.filter((m) => !conflict.participants.some((p) => p.name === m.name)) ?? [],
  )
  const LABEL: Record<Status, string> = {
    ready: 'Čeká',
    acted: 'Jednal',
    deferred: 'Odložil',
    out: 'Vyřazen',
  }

  function set(c: Conflict) {
    conflict = c
    saveConflict(id, c)
  }
  const patch = (p: Participant, x: Partial<Participant>) => set(update(conflict, p.id, x))
  function add(n: string) {
    if (!n.trim()) return
    set(addParticipant(conflict, hero(n.trim())))
  }
  async function remove(p: Participant) {
    if (
      !(await ask(`Odebrat „${p.name}“ z konfliktu?`, {
        title: 'Odebrat z konfliktu',
        ok: 'Odebrat',
      }))
    )
      return
    openId = undefined
    set({ ...conflict, participants: conflict.participants.filter((x) => x.id !== p.id) })
  }
  function next() {
    envDone = false
    set(nextRound(conflict))
  }
  async function finish(toJournal: boolean) {
    if (
      !(await ask('Ohrožení, Výhody, Sudba a pořadí se smažou.', {
        title: 'Ukončit konflikt?',
        ok: 'Ukončit',
      }))
    )
      return
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
    envDone = false
    set({ round: 1, participants: [] })
  }
</script>

<nav>
  <a class="btn" href={'#/druziny/' + id}><Arrow dir="left" /> Zpět</a>
</nav>
<h1>Konflikt</h1>

{#if party}
  <div class="bar">
    <strong>{started ? `Kolo ${conflict.round}` : 'Příprava'}</strong>
    {#if hasBeast}
      <span class="fate">
        Sudba
        <button
          onclick={() => set(setFate(conflict, (conflict.fate ?? 0) - 1))}
          disabled={(conflict.fate ?? 0) < 1}
          aria-label="Ubrat Sudbu">−</button
        >
        <strong>{conflict.fate ?? 0}</strong>
        <button onclick={() => set(setFate(conflict, (conflict.fate ?? 0) + 1))} aria-label="Přidat Sudbu"
          >+</button
        >
      </span>
    {/if}
  </div>

  {#if !started}
    <p class="muted">
      Zadejte iniciativy (hrdinové je hlásí, u bytostí je hodíte v dialogu). Stejné hodnoty jsou
      současné akce, pořadí mezi nimi upravíte šipkami.
    </p>
  {:else}
    <p role="status" class="round">
      {#if rs.done}
        <strong>Kolo je hotové.</strong>
        {#if rs.deferred.length}Odložili: {rs.deferred.map((p) => p.name).join(', ')}. Nikdo
          nereagoval? Přicházejí o akci.{/if}
      {:else}
        Na řadě: <strong>{rs.next?.name}</strong>
        {#if rs.deferred.length}<span class="muted">
            (odložili: {rs.deferred.map((p) => p.name).join(', ')})</span
          >{/if}
      {/if}
    </p>
  {/if}

  {#each rows as p (p.id)}
    {@const tie = tiedWith(conflict, p.id)}
    {@const st = statusOf(p)}
    {@const over = overLimit(p).length > 0}
    <div class="row" class:out={st === 'out' || over} class:now={started && rs.next?.id === p.id}>
      {#if started}
        <span class="init">{p.initiative}</span>
      {:else}
        <input
          class="init"
          type="number"
          value={p.initiative}
          aria-label={`Iniciativa ${p.name}`}
          onchange={(e) => patch(p, { initiative: Number(e.currentTarget.value) || 0 })}
        />
      {/if}
      <button class="name" onclick={() => (openId = p.id)} aria-label={`Podrobnosti ${p.name}`}>
        {p.name}
        <small class="muted">{p.kind === 'bytost' ? 'bytost' : ''}</small>
      </button>
      {#if tie.up || tie.down}
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
      {#if started}
        <button
          class="state"
          class:primary={st === 'ready' && rs.next?.id === p.id}
          onclick={() => patch(p, cycleStatus(p))}
          aria-label={`Stav ${p.name}: ${LABEL[st]}, klepnutím změnit`}>{LABEL[st]}</button
        >
      {/if}
      <span class="threat" title="Ohrožení" aria-label={`Ohrožení ${p.threat}`}>{p.threat}</span>
    </div>
  {:else}
    <p class="muted">Zatím nikdo. Přidejte členy družiny a bytosti (z karty bytosti v Bestiáři).</p>
  {/each}

  {#if started}
    <label class="row env">
      <input type="checkbox" bind:checked={envDone} />
      <span>Akce prostředí (na konci kola)</span>
    </label>
    <div class="bar">
      <button class="primary" onclick={next}>Další kolo</button>
      <button onclick={() => set({ ...conflict, started: false })}>Upravit iniciativy</button>
      <button onclick={() => finish(false)}>Konec konfliktu</button>
      <button onclick={() => finish(true)}>Konec + do žurnálu</button>
    </div>
  {:else}
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
    <p>
      <button onclick={() => go('bestiar')}>Bestiář (přidat bytost)</button>
    </p>
    <div class="bar">
      <button
        class="primary"
        disabled={!conflict.participants.length}
        onclick={() => set({ ...conflict, started: true })}>Začít kolo {conflict.round}</button
      >
      <button onclick={() => finish(false)} disabled={!conflict.participants.length}>
        Konec konfliktu
      </button>
    </div>
  {/if}
{:else}
  <p class="muted">Družina nenalezena.</p>
{/if}

{#if opened}
  {#key opened.id}
    <ParticipantDialog
      p={opened}
      fate={conflict.fate ?? 0}
      {started}
      onpatch={(x) => patch(opened, x)}
      onfate={(n) => set(setFate(conflict, n))}
      onremove={() => remove(opened)}
      onclose={() => (openId = undefined)}
    />
  {/key}
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  .bar,
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .fate {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
  }
  .line input[type='text'],
  .line select {
    flex: 1;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.3rem 0;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--drd-muted);
    border-radius: var(--drd-radius);
  }
  .row.now {
    border-color: var(--drd-accent);
  }
  .row.out {
    opacity: 0.55;
  }
  .init {
    min-width: 2.2rem;
    width: 4.2rem;
    text-align: center;
    font-weight: bold;
  }
  .name {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    padding: 0.3rem 0;
  }
  .state {
    min-width: 5rem;
  }
  .threat {
    min-width: 1.5rem;
    text-align: center;
    font-weight: bold;
  }
  .env {
    margin-top: 0.75rem;
    border-style: dashed;
  }
  .round {
    margin: 0.4rem 0;
  }
</style>
