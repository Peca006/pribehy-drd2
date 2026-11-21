<script lang="ts">
  import { onMount } from 'svelte'
  import { characterOf } from '../../core/character/model'
  import { encodeBundle } from '../../core/character/share'
  import { listLogs } from '../../core/character/store'
  import { ask } from '../../core/confirm.svelte'
  import { recipes, refreshRecipes } from '../../core/recipes/cache.svelte'
  import { buildRecipesBundle } from '../../core/recipes/exchange'
  import { foldName } from '../../core/recipes/find'
  import { RECIPE_KINDS, RECIPE_KIND_LABELS, type Recipe, type RecipeInput, type RecipeKind } from '../../core/recipes/model'
  import { removeRecipe, saveRecipe } from '../../core/recipes/store'
  import { KNOWN_FIELDS, spellToParams, usedBy, type SpellParams } from '../../core/recipes/spells'
  import { kindLabel, recipeSummary } from '../../core/recipes/summary'
  import SpellDialog from '../characters/SpellDialog.svelte'
  import RecipeDialog from './RecipeDialog.svelte'

  // Grimoár: předpisy hráče (kouzla, lektvary, nástrahy, výrobky). Používání je nepovinné; předpis se do Grimoáru dostane
  // i uložením u postavy. Postavy se na předpisy odkazují, úprava se projeví u všech, které ho mají.
  let query = $state('')
  let kind = $state<RecipeKind | ''>('')
  let dialog = $state<{ kind: RecipeKind; recipe?: Recipe } | undefined>(undefined)
  let msg = $state('')
  let creating = $state(false)

  onMount(() => void refreshRecipes())

  const shown = $derived(
    recipes()
      .filter((r) => !kind || r.kind === kind)
      .filter((r) => !query.trim() || foldName(r.name).includes(foldName(query)))
      .sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  )
  const count = (k: RecipeKind) => recipes().filter((r) => r.kind === k).length

  /** Uloží předpis (nový, úprava, nebo varianta); vrací text chyby. */
  async function save(input: RecipeInput, variant: boolean): Promise<string | undefined> {
    const edit = dialog?.recipe
    try {
      await saveRecipe(input, edit && !variant ? edit.id : undefined)
      dialog = undefined
      await refreshRecipes()
    } catch (err) {
      return err instanceof Error ? err.message : 'Uložení se nepovedlo.'
    }
  }
  const saveSpell = (
    input: { name: string; description: string; spell: SpellParams },
    variant: boolean,
  ) =>
    save(
      { kind: 'kouzlo', name: input.name, description: input.description, params: spellToParams(input.spell) },
      variant,
    )

  // sdílení: kód DRD2:… s jedním předpisem nebo s celým Grimoárem; příjemce ho vloží v Postavy → Import
  let shareCode = $state('')
  let shareTitle = $state('')
  let copied = $state(false)
  async function share(list: Recipe[], title: string) {
    copied = false
    shareTitle = title
    shareCode = await encodeBundle(buildRecipesBundle(list))
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareCode)
      copied = true
    } catch {
      msg = 'Kód se nepodařilo zkopírovat, označte ho a zkopírujte ručně.'
    }
  }

  async function remove(r: Recipe) {
    msg = ''
    const users = usedBy(r.id, (await listLogs()).map(characterOf))
    const who = users.length
      ? `Předpis mají postavy: ${users.map((c) => c.name || '(beze jména)').join(', ')}. U nich zůstane odkaz bez předpisu.`
      : 'Žádná postava na zařízení předpis nemá.'
    if (!(await ask(`${who} Smazání nelze vrátit zpět.`, { title: `Smazat „${r.name}“?`, ok: 'Smazat' }))) return
    await removeRecipe(r.id)
    await refreshRecipes()
  }
</script>

<h1>Grimoár</h1>
<div class="panel">
  <p class="muted">
    Kouzla, lektvary, nástrahy a výrobky uložené pro příště. U postavy se na ně odkazuje, úprava se projeví u všech
    postav, které je mají. Grimoár používat nemusíte: kouzlo jde seslat i ad hoc a lektvar či nástrahu zapsat přímo u
    postavy.
  </p>
  <p class="actions">
    <button onclick={() => (creating = !creating)} aria-expanded={creating}>Nový…</button>
    {#if recipes().length}<button onclick={() => share(recipes(), 'celý Grimoár')}>Sdílet vše</button>{/if}
    <a class="btn" href="#/postavy/import">Importovat…</a>
  </p>
  {#if creating}
    <p class="actions" role="group" aria-label="Druh nového předpisu">
      {#each RECIPE_KINDS as k}
        <button
          onclick={() => {
            creating = false
            dialog = { kind: k }
          }}>{RECIPE_KIND_LABELS[k]}</button
        >
      {/each}
    </p>
  {/if}

  <div class="chips" role="group" aria-label="Filtr podle druhu">
    <button class:primary={kind === ''} onclick={() => (kind = '')}>Vše ({recipes().length})</button>
    {#each RECIPE_KINDS as k}
      <button class:primary={kind === k} onclick={() => (kind = kind === k ? '' : k)}>
        {RECIPE_KIND_LABELS[k]} ({count(k)})
      </button>
    {/each}
  </div>
  {#if recipes().length > 5}
    <input type="search" bind:value={query} placeholder="Hledat podle názvu" aria-label="Hledat v Grimoáru" />
  {/if}
  {#if shown.length}
    <ul>
      {#each shown as r (r.id)}
        <li>
          <button class="icon" onclick={() => (dialog = { kind: r.kind, recipe: r })} aria-label={`Upravit: ${r.name}`}>✎</button>
          <span class="what" title={r.description}>
            <small class="muted">{kindLabel(r)}</small> {recipeSummary(r)}
            {#if r.description}<small class="muted desc">{r.description}</small>{/if}
          </span>
          <button onclick={() => share([r], r.name)} aria-label={`Sdílet: ${r.name}`}>Sdílet</button>
          <button onclick={() => remove(r)} aria-label={`Smazat: ${r.name}`}>✕</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{recipes().length ? 'Nic nenalezeno.' : 'Grimoár je zatím prázdný.'}</p>
  {/if}
  {#if msg}<p role="status">{msg}</p>{/if}
  {#if shareCode}
    <p><strong>Kód ke sdílení: {shareTitle}</strong> <span class="muted">(vložte v Postavy → Import)</span></p>
    <textarea readonly rows="3" value={shareCode} aria-label="Kód předpisů ke sdílení"></textarea>
    <p>
      <button onclick={copy}>{copied ? 'Zkopírováno' : 'Kopírovat'}</button>
      <button onclick={() => (shareCode = '')}>Zavřít</button>
    </p>
  {/if}
</div>

{#if dialog?.kind === 'kouzlo'}
  <SpellDialog
    recipe={dialog.recipe}
    allowed={KNOWN_FIELDS}
    canCast={false}
    oncast={() => {}}
    onsave={saveSpell}
    onclose={() => (dialog = undefined)}
  />
{:else if dialog}
  <RecipeDialog kind={dialog.kind} recipe={dialog.recipe} onsave={save} onclose={() => (dialog = undefined)} />
{/if}

<style>
  .actions,
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  ul {
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.3rem 0;
  }
  .what {
    flex: 1;
    min-width: 0;
  }
  .desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .icon {
    padding: 0 0.4rem;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: monospace;
  }
  input[type='search'] {
    width: 100%;
    box-sizing: border-box;
    margin-top: 0.4rem;
  }
</style>
