<script lang="ts">
  import { onMount } from 'svelte'
  import { appendEvents, getLog } from '../../core/character/store'
  import { characterOf, eventsFor } from '../../core/character/model'
  import {
    newPartyId,
    sessionAward,
    XP_ATTENDANCE,
    XP_REWARD_MAX,
    type JournalEntry,
    type Party,
  } from '../../core/party/model'
  import { getParty, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'

  // Zápis ze sezení: kdo byl přítomen, odměny od ostatních a shrnutí. Pravidlo: každý přítomný dostane 4 body
  // zkušeností, každý hráč (i Průvodce) může udělit 1 bod za odměnu, nejvýš 2 body odměny na hráče.
  let { id }: { id: string } = $props()

  let party = $state<Party | undefined>(undefined)
  let title = $state('')
  let date = $state(new Date().toISOString().slice(0, 10))
  let text = $state('')
  let attended = $state<Record<string, boolean>>({})
  let reward = $state<Record<string, number>>({})
  let apply = $state(true)
  let busy = $state(false)

  onMount(async () => {
    party = await getParty(id)
    if (!party) return
    title = `Sezení ${party.journal.filter((e) => e.session).length + 1}`
    attended = Object.fromEntries(party.members.map((m) => [m.id, true]))
  })

  const present = $derived(
    new Set(
      Object.entries(attended)
        .filter(([, v]) => v)
        .map(([k]) => k),
    ),
  )
  const award = $derived(
    party ? sessionAward(party.members, present, reward) : { xp: {}, problems: [] },
  )

  async function save() {
    if (!party || busy) return
    busy = true
    const applied: string[] = []
    if (apply)
      for (const m of party.members) {
        const n = award.xp[m.id]
        if (!m.characterId || !n) continue
        const log = await getLog(m.characterId)
        if (!log) continue
        const before = characterOf(log)
        await appendEvents(
          m.characterId,
          eventsFor(
            before,
            { ...before, xp: before.xp + n },
            settings.author,
            `Zkušenosti za sezení „${title.trim() || 'Sezení'}“ (+${n})`,
          ),
        )
        applied.push(m.id)
      }
    const entry: JournalEntry = {
      id: newPartyId(),
      at: new Date(`${date}T12:00:00`).toISOString(),
      by: settings.author,
      title: title.trim() || 'Sezení',
      text: text.trim(),
      session: { xp: { ...award.xp }, applied },
    }
    party.journal = [entry, ...party.journal].sort((a, b) => b.at.localeCompare(a.at))
    await saveParty($state.snapshot(party) as Party)
    go('druziny', party.id)
  }
</script>

<nav><a class="btn" href={'#/druziny/' + id}>← Zpět na družinu</a></nav>

{#if !party}
  <p class="muted">Družina nenalezena. <a href="#/druziny">Zpět na seznam</a></p>
{:else}
  <h1>Nové sezení</h1>
  <label>Název <input bind:value={title} /></label>
  <label>Datum <input type="date" bind:value={date} /></label>

  <h2>Přítomní a odměny</h2>
  <p class="muted">
    Za účast {XP_ATTENDANCE} body. Odměnu (nejvýš {XP_REWARD_MAX} body na hráče) uděluje každý hráč i
    Průvodce vždy jedním bodem za hraní role, spolupráci nebo rozvíjení příběhu.
  </p>
  {#each party.members as m (m.id)}
    <div class="row" class:off={!attended[m.id]}>
      <label class="check">
        <input type="checkbox" bind:checked={attended[m.id]} />
        <span>{m.name}</span>
      </label>
      {#if attended[m.id]}
        <span class="stepper">
          <button
            onclick={() => (reward[m.id] = Math.max(0, (reward[m.id] ?? 0) - 1))}
            aria-label={`Ubrat odměnu ${m.name}`}>−</button
          >
          <output>{reward[m.id] ?? 0}</output>
          <button
            onclick={() => (reward[m.id] = Math.min(XP_REWARD_MAX, (reward[m.id] ?? 0) + 1))}
            aria-label={`Přidat odměnu ${m.name}`}>+</button
          >
        </span>
        <strong class="total">+{award.xp[m.id]}</strong>
      {/if}
    </div>
  {:else}
    <p class="muted">Družina nemá členy. <a href={'#/druziny/' + id}>Přidejte je</a>.</p>
  {/each}
  {#each award.problems as p}<p class="error" role="alert">{p}</p>{/each}

  <label class="check">
    <input type="checkbox" bind:checked={apply} />
    <span>Rovnou připsat body postavám, které jsou v tomto zařízení</span>
  </label>

  <h2>Shrnutí sezení</h2>
  <textarea
    rows="6"
    bind:value={text}
    placeholder="Co se na sezení stalo…"
    aria-label="Shrnutí sezení"
  ></textarea>

  <p class="actions">
    <button class="primary" disabled={busy || !present.size} onclick={save}
      >Zapsat do žurnálu</button
    >
  </p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  label {
    display: block;
    margin: 0.5rem 0;
  }
  .row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    margin: 0.35rem 0;
  }
  .row.off {
    opacity: 0.55;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
  .stepper {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  output {
    min-width: 1.5rem;
    text-align: center;
  }
  .total {
    min-width: 2.5rem;
    text-align: right;
    color: var(--drd-accent);
  }
</style>
