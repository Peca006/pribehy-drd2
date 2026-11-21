<script lang="ts">
  import { onMount } from 'svelte'
  import type { Character } from '../../core/character/model'
  import { professions } from '../../core/library.svelte'
  import { allowedFields, fieldAllowed } from '../../core/recipes/fields'
  import { suggestRecipes } from '../../core/recipes/find'
  import type { Recipe } from '../../core/recipes/model'
  import { listRecipes, saveRecipe } from '../../core/recipes/store'
  import {
    addLink,
    linkedRecipes,
    removeLink,
    spellFrom,
    spellIntent,
    spellSummary,
    spellToParams,
    type SpellParams,
  } from '../../core/recipes/spells'
  import SpellDialog from './SpellDialog.svelte'
  import { requestRoll } from './rollRequest.svelte'

  // Kouzla postavy: odkazy na předpisy v Grimoáru hráče (nepovinném), ad hoc seslání bez uložení a našeptávání podle názvu.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  let recipes = $state<Recipe[]>([])
  let query = $state('')
  let message = $state('')
  /** otevřený dialog: nový/ad hoc, nebo úprava předpisu */
  let dialog = $state<{ recipe?: Recipe } | undefined>(undefined)

  onMount(async () => {
    recipes = await listRecipes()
  })

  // odkazy na lektvary a nástrahy mají vlastní seznamy; tady jen kouzla
  const list = $derived(linkedRecipes(character, recipes).filter((l) => !l.recipe || l.recipe.kind === 'kouzlo'))
  const free = $derived(recipes.filter((r) => !list.some((l) => l.recipeId === r.id)))
  const allowed = $derived(allowedFields(character, professions()))
  const fieldOf = (r: Recipe) => spellFrom(r.params).obor
  /** odkaz je v pořádku, když obor patří postavě, nebo byl přidán jako vlastní */
  const linkOk = (r: Recipe, linkId: string) =>
    fieldAllowed(fieldOf(r), allowed) || !!character.recipeLinks[linkId]?.state.vlastniObor
  /** kouzlo čekající na potvrzení jako vlastní obor */
  let override = $state<Recipe | undefined>(undefined)
  const hints = $derived(suggestRecipes(free, query, 'kouzlo'))

  const cast = (name: string, s: SpellParams) => {
    dialog = undefined
    requestRoll('zkouska', spellIntent(name, s))
  }

  async function add(r: Recipe, ownField = false) {
    message = ''
    override = undefined
    if (!ownField && !fieldAllowed(fieldOf(r), allowed)) {
      override = r
      return void (message = `Obor „${fieldOf(r)}“ postava neovládá.`)
    }
    const e = addLink(character, r.id, undefined, ownField)
    if ('error' in e) return void (message = e.error)
    query = ''
    await onchange(e.character, `Kouzlo přidáno: ${r.name}`)
  }

  async function remove(linkId: string, name: string) {
    const e = removeLink(character, linkId)
    if ('character' in e) await onchange(e.character, `Kouzlo odebráno: ${name}`)
  }

  /** Uloží předpis (nový, úprava, nebo varianta); nový nebo varianta se rovnou přidá postavě. Vrací text chyby. */
  async function save(
    input: { name: string; description: string; spell: SpellParams },
    variant: boolean,
  ): Promise<string | undefined> {
    const edit = dialog?.recipe
    try {
      const saved = await saveRecipe(
        { kind: 'kouzlo', name: input.name, description: input.description, params: spellToParams(input.spell) },
        edit && !variant ? edit.id : undefined,
      )
      recipes = await listRecipes()
      dialog = undefined
      if (!edit || variant) {
        const e = addLink(character, saved.id)
        if ('character' in e) await onchange(e.character, `Nové kouzlo: ${saved.name}`)
      }
    } catch (err) {
      return err instanceof Error ? err.message : 'Uložení se nepovedlo.'
    }
  }
</script>

<div class="spells">
  <div class="head">
    <strong>Kouzla</strong>
    <button onclick={() => (dialog = {})}>Seslat / nové…</button>
  </div>
  {#if list.length}
    <ul>
      {#each list as l (l.linkId)}
        <li>
          {#if l.recipe}
            {@const r = l.recipe}
            <button class="icon" onclick={() => (dialog = { recipe: r })} aria-label={`Upravit: ${r.name}`} title="Upravit (platí pro všechny postavy)">✎</button>
            <span class="what" title={r.description}>{spellSummary(r.name, spellFrom(r.params))}{#if !linkOk(r, l.linkId)}<span class="warn" title="Obor nepatří mezi obory postavy"> ⚠ obor mimo schopnosti</span>{/if}</span>
            <button onclick={() => requestRoll('zkouska', spellIntent(r.name, spellFrom(r.params)))}>Seslat</button>
            <button onclick={() => remove(l.linkId, r.name)} aria-label={`Odebrat: ${r.name}`}>✕</button>
          {:else}
            <span class="what muted">Předpis chybí v Grimoáru</span>
            <button onclick={() => remove(l.linkId, 'chybějící')} aria-label="Odebrat chybějící kouzlo">✕</button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if free.length}
    <input
      type="search"
      bind:value={query}
      placeholder="Přidat kouzlo z Grimoáru (začni psát název)"
      aria-label="Přidat kouzlo z Grimoáru"
    />
    {#if hints.length}
      <ul class="hints">
        {#each hints as r (r.id)}
          <li><button onclick={() => add(r)}>{r.name}</button></li>
        {/each}
      </ul>
    {/if}
  {/if}
  {#if message}<p class="error" role="alert">{message}</p>{/if}
  {#if override}
    <p><button onclick={() => override && add(override, true)}>Přidat přesto (vlastní obor)</button></p>
  {/if}
</div>

{#if dialog}
  <SpellDialog recipe={dialog.recipe} {allowed} oncast={cast} onsave={save} onclose={() => (dialog = undefined)} />
{/if}

<style>
  .spells {
    margin: 0.5rem 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  ul {
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin: 0.3rem 0;
  }
  .what {
    flex: 1 1 12rem;
    min-width: 0;
  }
  .warn {
    color: var(--drd-accent);
  }
  .icon {
    padding: 0 0.4rem;
  }
  input[type='search'] {
    width: 100%;
    box-sizing: border-box;
    margin-top: 0.4rem;
  }
</style>
