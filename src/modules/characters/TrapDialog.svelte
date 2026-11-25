<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { untrack } from 'svelte'
  import type { Character, Trap } from '../../core/character/model'
  import { removeTrap, saveTrap, trapCost, trapCostLines, trapSummary, trapFrom } from '../../core/character/traps'
  import { recipeToTrap } from '../../core/recipes/kinds'
  import RecipeSuggest from './RecipeSuggest.svelte'
  import TrapFields from './TrapFields.svelte'

  // Zapsání nebo úprava připravené nástrahy (nalezené, koupené nebo vyrobené mimo aplikaci). Výroba s odečtem Surovin je
  // ve „Výroba a opravy“. Ukáže cenu jednoho kusu v Surovinách podle pravidel (informativně).
  let {
    character,
    id,
    onsave,
    onclose,
  }: {
    character: Character
    id?: string
    onsave: (next: Character, note: string) => void | Promise<void>
    onclose: () => void
  } = $props()

  const old = untrack(() => (id ? character.traps[id] : undefined))
  let spec = $state<Partial<Trap>>(
    old ? { ...old } : { name: '', type: 'jednoducha', attribute: 'Tělo', effect: 'ohrozeni', maneuver: '', extra: 0, weakness: '' },
  )
  let count = $state(old?.count ?? 1)
  let error = $state('')
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  const priced = $derived({
    type: spec.type ?? 'jina',
    effect: spec.effect ?? 'ohrozeni',
    maneuver: spec.maneuver ?? '',
    extra: spec.extra ?? 0,
  })

  function save() {
    error = ''
    const r = saveTrap(character, { ...spec, count }, id)
    if ('error' in r) return void (error = r.error)
    const t = trapFrom({ ...spec, count })
    void onsave(r.character, `${id ? 'Nástraha upravena' : 'Nová nástraha'}: ${t ? trapSummary(t) : ''}${count > 1 ? ` ×${count}` : ''}`)
  }

  function remove() {
    if (!id || !old) return
    const r = removeTrap(character, id)
    if ('character' in r) void onsave(r.character, `Nástraha odstraněna: ${trapSummary(old)}`)
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Nástraha">
  <HelpHeading flush title={id ? 'Upravit nástrahu' : 'Nová nástraha'} topic="nastrahy" />
  {#if !id}
    <RecipeSuggest
      kind="nastraha"
      onpick={(r) => {
        const t = recipeToTrap(r, { count: 1 })
        if (t) spec = { ...t }
      }}
    />
  {/if}
  <TrapFields bind:spec />
  <textarea bind:value={spec.description} rows="2" placeholder="Popis (nepovinný)" aria-label="Popis nástrahy"></textarea>
  <p>
    Cena jednoho kusu: <strong>{trapCost(priced)}</strong> Surovin
    <span class="muted">({trapCostLines(priced).join(', ')})</span>
  </p>
  <div class="row">
    <span>Kusů (dávek)</span>
    <button onclick={() => (count = Math.max(0, count - 1))} disabled={count <= 0} aria-label="Méně kusů">−</button>
    <strong>{count}</strong>
    <button onclick={() => (count = Math.min(999, count + 1))} aria-label="Více kusů">+</button>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    <button class="primary" onclick={save}>Uložit</button>
    <button onclick={() => dialog.close()}>Zrušit</button>
    {#if id}<button onclick={remove}>Odstranit</button>{/if}
  </p>
</dialog>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.3rem 0;
  }
  .row span {
    flex: 1;
  }
  .row strong {
    min-width: 2ch;
    text-align: center;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
