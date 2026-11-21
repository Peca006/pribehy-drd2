<script lang="ts">
  import { onMount } from 'svelte'
  import { characterOf } from '../../core/character/model'
  import { listLogs } from '../../core/character/store'
  import { ask } from '../../core/confirm.svelte'
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
          <button onclick={() => remove(r)} aria-label={`Smazat: ${r.name}`}>✕</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{recipes.length ? 'Nic nenalezeno.' : 'Grimoár je zatím prázdný.'}</p>
  {/if}
  {#if msg}<p role="status">{msg}</p>{/if}
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
  input[type='search'] {
    width: 100%;
    box-sizing: border-box;
  }
</style>
