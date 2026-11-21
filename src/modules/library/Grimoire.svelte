<script lang="ts">
  import { onMount } from 'svelte'
  import { characterOf } from '../../core/character/model'
  import { listLogs } from '../../core/character/store'
  import { encodeBundle } from '../../core/character/share'
  import { ask } from '../../core/confirm.svelte'
  import { buildRecipesBundle } from '../../core/recipes/exchange'
  import { foldName } from '../../core/recipes/find'
  import type { Recipe } from '../../core/recipes/model'
  import { listRecipes, removeRecipe, saveRecipe } from '../../core/recipes/store'
  import {
    KNOWN_FIELDS,
    spellFrom,
    spellSummary,
    spellToParams,
    usedBy,
    type SpellParams,
  } from '../../core/recipes/spells'
  import SpellDialog from '../characters/SpellDialog.svelte'

  // Grimoár: předpisy hráče (zatím kouzla). Používání je nepovinné; kouzlo se do Grimoáru dostane i uložením u postavy.
  let recipes = $state<Recipe[]>([])
  let query = $state('')
  let dialog = $state<{ recipe?: Recipe } | undefined>(undefined)
  let msg = $state('')

  const load = async () => (recipes = await listRecipes())
  onMount(load)

  const shown = $derived(
    recipes
      .filter((r) => !query.trim() || foldName(r.name).includes(foldName(query)))
      .sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  )

  async function save(
    input: { name: string; description: string; spell: SpellParams },
    variant: boolean,
  ): Promise<string | undefined> {
    const edit = dialog?.recipe
    try {
      await saveRecipe(
        { kind: 'kouzlo', name: input.name, description: input.description, params: spellToParams(input.spell) },
        edit && !variant ? edit.id : undefined,
      )
      dialog = undefined
      await load()
    } catch (err) {
      return err instanceof Error ? err.message : 'Uložení se nepovedlo.'
    }
  }

  // sdílení: kód DRD2:… s jedním kouzlem nebo s celým Grimoárem; příjemce ho vloží v Postavy → Import
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
      ? `Kouzlo mají postavy: ${users.map((c) => c.name || '(beze jména)').join(', ')}. U nich zůstane odkaz bez kouzla.`
      : 'Žádná postava na zařízení kouzlo nemá.'
    if (!(await ask(`${who} Smazání nelze vrátit zpět.`, { title: `Smazat „${r.name}“?`, ok: 'Smazat' }))) return
    await removeRecipe(r.id)
    await load()
  }
</script>

<h2>Grimoár</h2>
<div class="panel">
  <p class="muted">
    Kouzla uložená pro příště. U postavy se na ně odkazuje, úprava se projeví u všech postav, které je mají. Grimoár
    používat nemusíte: kouzlo jde seslat i ad hoc.
  </p>
  <p>
    <button onclick={() => (dialog = {})}>Nové kouzlo…</button>
    {#if recipes.length}<button onclick={() => share(recipes, 'celý Grimoár')}>Sdílet vše</button>{/if}
    <a class="btn" href="#/postavy/import">Importovat…</a>
  </p>
  {#if recipes.length > 5}
    <input type="search" bind:value={query} placeholder="Hledat podle názvu" aria-label="Hledat v Grimoáru" />
  {/if}
  {#if shown.length}
    <ul>
      {#each shown as r (r.id)}
        <li>
          <button class="icon" onclick={() => (dialog = { recipe: r })} aria-label={`Upravit: ${r.name}`}>✎</button>
          <span class="what" title={r.description}>{spellSummary(r.name, spellFrom(r.params))}</span>
          <button onclick={() => share([r], r.name)} aria-label={`Sdílet: ${r.name}`}>Sdílet</button>
          <button onclick={() => remove(r)} aria-label={`Smazat: ${r.name}`}>✕</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{recipes.length ? 'Nic nenalezeno.' : 'Grimoár je zatím prázdný.'}</p>
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

{#if dialog}
  <SpellDialog
    recipe={dialog.recipe}
    allowed={KNOWN_FIELDS}
    canCast={false}
    oncast={() => {}}
    onsave={save}
    onclose={() => (dialog = undefined)}
  />
{/if}

<style>
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
  }
</style>
