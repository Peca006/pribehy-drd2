<script lang="ts">
  import { onMount } from 'svelte'
  import {
    clearCharacterDraft,
    loadCharacterDraft,
    saveCharacterDraft,
  } from '../../core/character/drafts'
  import {
    ATTRIBUTES,
    characterOf,
    eventsFor,
    type Character,
    type CharacterLog,
  } from '../../core/character/model'
  import { changesBetween } from '../../core/character/revisions'
  import { appendEvents, getLog } from '../../core/character/store'
  import type { Ability } from '../../core/content/schema'
  import { commonRaceAbilities, professions, races } from '../../core/library.svelte'
  import { go } from '../../core/router.svelte'
  import { setAuthor, settings } from '../../core/settings.svelte'
  import { formatMoney } from '../creator/rules'
  import CheckList from './CheckList.svelte'
  import { describeChange, nameOf, pathLabel } from './describe'

  // Úprava postavy po vytvoření: změny se dělají na návrhu (kopii postavy uložené v zařízení);
  // do deníku se zapíše až „Zveřejnit“, jako jedna revize s popisem.
  let { id }: { id: string } = $props()

  let log = $state<CharacterLog | undefined>(undefined)
  let draft = $state<Character | undefined>(undefined)
  let base = $state(0)
  let note = $state('')
  let author = $state(settings.author)
  let resumed = $state(false)

  onMount(async () => {
    log = await getLog(id)
    if (!log) return
    const saved = loadCharacterDraft(id)
    if (saved) {
      draft = saved.character
      base = saved.base
      resumed = true
    } else {
      draft = structuredClone(characterOf(log))
      base = log.events.length
    }
  })

  // každá změna se hned ukládá jako návrh
  $effect(() => {
    if (draft && log) saveCharacterDraft(id, base, $state.snapshot(draft) as Character)
  })

  const current = $derived(log ? characterOf(log) : undefined)
  const changes = $derived(current && draft ? changesBetween(current, draft) : [])
  const stale = $derived(!!log && base !== log.events.length)

  // --- nabídky z balíčků ---
  const race = $derived(races().find((r) => r.id === draft?.raceId))
  const commonAbilities = $derived(commonRaceAbilities())
  const groups = $derived.by(() => {
    if (!draft) return []
    const out: { title: string; abilities: Ability[] }[] = []
    if (race)
      out.push({ title: `Rasa: ${race.name}`, abilities: [...race.abilities, ...commonAbilities] })
    for (const p of professions())
      if ((draft.professions[p.id] ?? 0) > 0) out.push({ title: p.name, abilities: p.abilities })
    return out
  })
  const known = $derived(new Set(groups.flatMap((g) => g.abilities.map((a) => a.id))))
  const orphan = $derived(draft?.abilities.filter((a) => !known.has(a)) ?? [])
  const addable = $derived(professions().filter((p) => draft && !(p.id in draft.professions)))
  let adding = $state('')
  let newItem = $state('')

  function toggle(abilityId: string) {
    if (!draft) return
    draft.abilities = draft.abilities.includes(abilityId)
      ? draft.abilities.filter((a) => a !== abilityId)
      : [...draft.abilities, abilityId]
  }
  function setLevel(pid: string, level: number) {
    if (!draft) return
    if (level <= 0) delete draft.professions[pid]
    else draft.professions[pid] = Math.min(5, level)
  }
  function addItem() {
    if (!draft || !newItem.trim()) return
    draft.equipment = [...draft.equipment, newItem.trim()]
    newItem = ''
  }

  async function publish() {
    if (!log || !current || !draft || !changes.length || !note.trim()) return
    setAuthor(author)
    const events = eventsFor(
      current,
      $state.snapshot(draft) as Character,
      settings.author,
      note.trim(),
    )
    await appendEvents(id, events)
    clearCharacterDraft(id)
    go('postavy', id)
  }
  function discard() {
    if (!confirm('Zahodit rozpracované úpravy? Postava zůstane, jak je.')) return
    clearCharacterDraft(id)
    go('postavy', id)
  }
</script>

<nav><a class="btn" href={'#/postavy/' + id}>← Zpět na postavu</a></nav>

{#if !log}
  <p class="muted">Postava nenalezena. <a href="#/postavy">Zpět na seznam</a></p>
{:else if draft}
  <h1>Úprava postavy</h1>
  <p class="muted">
    Změny se ukládají jako návrh jen v tomto zařízení. Do historie postavy se zapíšou až po
    <strong>Zveřejnit</strong>, jako jedna revize.
  </p>
  {#if resumed}<p class="panel" role="status">Pokračujete v rozpracované úpravě.</p>{/if}
  {#if stale}
    <p class="panel error" role="alert">
      Postava se od vzniku návrhu změnila. Při zveřejnění se hodnoty z návrhu přepíšou.
    </p>
  {/if}

  <h2>Základ</h2>
  <label>Jméno <input bind:value={draft.name} /></label>
  <label>Koncept <input bind:value={draft.concept} /></label>

  <h2>Zdatnost</h2>
  <div class="grid">
    {#each ATTRIBUTES as a}
      <label>{a} <input type="number" min="0" max="20" bind:value={draft.attributes[a]} /></label>
    {/each}
  </div>

  <h2>Povolání</h2>
  {#each Object.keys(draft.professions) as pid}
    <div class="row">
      <span>{nameOf(pid)}</span>
      <button onclick={() => setLevel(pid, draft!.professions[pid] - 1)} aria-label="Snížit úroveň"
        >−</button
      >
      <strong>{draft.professions[pid]}</strong>
      <button onclick={() => setLevel(pid, draft!.professions[pid] + 1)} aria-label="Zvýšit úroveň"
        >+</button
      >
    </div>
  {/each}
  {#if addable.length}
    <div class="row">
      <select bind:value={adding} aria-label="Přidat povolání">
        <option value="">Přidat povolání…</option>
        {#each addable as p}<option value={p.id}>{p.name}</option>{/each}
      </select>
      <button
        disabled={!adding}
        onclick={() => {
          setLevel(adding, 1)
          adding = ''
        }}>Přidat</button
      >
    </div>
  {/if}

  <h2>Zvláštní schopnosti</h2>
  {#each groups as g}
    <h3>{g.title}</h3>
    {#each g.abilities as a (a.id)}
      <label class="check">
        <input
          type="checkbox"
          checked={draft.abilities.includes(a.id)}
          onchange={() => toggle(a.id)}
        />
        {a.name}{#if a.attribute}<span class="muted"> ({a.attribute})</span>{/if}
      </label>
    {/each}
  {/each}
  {#if orphan.length}
    <h3>Ostatní</h3>
    {#each orphan as a}
      <label class="check">
        <input type="checkbox" checked onchange={() => toggle(a)} />
        {nameOf(a)}
      </label>
    {/each}
  {/if}
  <label>Druh zbraně (Rodová zbraň) <input bind:value={draft.weaponKind} /></label>

  <h2>Povahový rys a příběh</h2>
  <label>Povahový rys <input bind:value={draft.trait} /></label>
  <label>Jak se stal hrdinou <textarea rows="4" bind:value={draft.heroStory}></textarea></label>

  <h2>Výbava</h2>
  {#each draft.equipment as _, i}
    <div class="row">
      <input bind:value={draft.equipment[i]} aria-label={`Položka ${i + 1}`} />
      <button
        onclick={() => (draft!.equipment = draft!.equipment.filter((__, j) => j !== i))}
        aria-label="Odebrat položku">✕</button
      >
    </div>
  {/each}
  <div class="row">
    <input
      bind:value={newItem}
      placeholder="Nová položka…"
      aria-label="Nová položka výbavy"
      onkeydown={(e) => e.key === 'Enter' && addItem()}
    />
    <button disabled={!newItem.trim()} onclick={addItem}>Přidat</button>
  </div>
  <label>
    Hotovost v haléřích <input type="number" min="0" bind:value={draft.cash} />
    <span class="muted">= {formatMoney(draft.cash || 0)}</span>
  </label>

  <h2>Poznámky</h2>
  <textarea rows="5" bind:value={draft.notes} aria-label="Poznámky"></textarea>

  <h2>Zveřejnit</h2>
  {#if changes.length}
    <ul class="preview">
      {#each changes as c}
        <li>
          <span class="muted">{pathLabel(c.path)}:</span>
          {#each describeChange(c) as line}<div>{line}</div>{/each}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Zatím žádná změna proti postavě.</p>
  {/if}
  <CheckList character={draft} title="Kontrola upravené postavy" />
  <label>
    Popis změny (povinný) <input
      bind:value={note}
      placeholder="např. Koupil jsem meč, přestup na 2. úroveň"
    />
  </label>
  <label>Podepsat jako <input bind:value={author} /></label>
  <p class="actions">
    <button class="primary" disabled={!changes.length || !note.trim()} onclick={publish}
      >Zveřejnit</button
    >
    <button onclick={discard}>Zahodit návrh</button>
  </p>
{/if}

<style>
  nav {
    margin-bottom: var(--drd-gap);
  }
  label {
    display: block;
    margin: 0.6rem 0;
  }
  .grid {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .grid label {
    flex: 1 1 6rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.35rem 0;
  }
  .row input,
  .row select,
  .row span {
    flex: 1;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.3rem 0;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
  .preview {
    list-style: none;
    padding-left: 0.5rem;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
