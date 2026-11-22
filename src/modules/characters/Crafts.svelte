<script lang="ts">
  import HelpButton from '../../ui/HelpButton.svelte'
  import HelpPanel from '../../ui/HelpPanel.svelte'
  import type { Character } from '../../core/character/model'
  import { recipes, refreshRecipes } from '../../core/recipes/cache.svelte'
  import { suggestRecipes } from '../../core/recipes/find'
  import type { Recipe, RecipeInput } from '../../core/recipes/model'
  import { saveRecipe } from '../../core/recipes/store'
  import { addLink, adjustLinkCount, linkedRecipes, removeLink } from '../../core/recipes/spells'
  import RecipeDialog from '../grimoar/RecipeDialog.svelte'

  // Výrobky postavy (lano, pochodně, cokoli, co se eviduje po kusech): odkazy na předpisy druhu „výrobek“ s počtem kusů.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  let query = $state('')
  let message = $state('')
  let creating = $state(false)

  const list = $derived(linkedRecipes(character, recipes()).filter((l) => l.recipe?.kind === 'vyrobek'))
  const free = $derived(recipes().filter((r) => r.kind === 'vyrobek' && !list.some((l) => l.recipeId === r.id)))
  const hints = $derived(suggestRecipes(free, query, 'vyrobek'))
  const countOf = (linkId: string) => {
    const n = character.recipeLinks[linkId]?.state.count
    return typeof n === 'number' ? n : 0
  }

  async function add(r: Recipe) {
    message = ''
    const e = addLink(character, r.id, undefined, false, { count: 1 })
    if ('error' in e) return void (message = e.error)
    query = ''
    await onchange(e.character, `Výrobek přidán: ${r.name}`)
  }

  async function bump(linkId: string, name: string, by: number) {
    await onchange(adjustLinkCount(character, linkId, by), `Výrobek ${by > 0 ? '+' : '−'}${Math.abs(by)}: ${name}`)
  }

  async function remove(linkId: string, name: string) {
    const e = removeLink(character, linkId)
    if ('character' in e) await onchange(e.character, `Výrobek odebrán: ${name}`)
  }

  async function create(input: RecipeInput): Promise<string | undefined> {
    try {
      const saved = await saveRecipe(input)
      await refreshRecipes()
      creating = false
      const e = addLink(character, saved.id, undefined, false, { count: 1 })
      if ('character' in e) await onchange(e.character, `Nový výrobek: ${saved.name}`)
    } catch (err) {
      return err instanceof Error ? err.message : 'Uložení se nepovedlo.'
    }
  }
  let helpOpen = $state(false)
</script>

<div class="crafts">
  <div class="head">
    <span><strong>Výrobky</strong> <HelpButton bind:open={helpOpen} label="Nápověda: Výrobky" /></span>
    <button onclick={() => (creating = true)}>+ Nový výrobek…</button>
  </div>
  <HelpPanel topic="vyroba" open={helpOpen} />
  {#if list.length}
    <ul>
      {#each list as l (l.linkId)}
        {@const r = l.recipe!}
        <li>
          <span class="what" title={r.description}>{r.name}</span>
          <button onclick={() => bump(l.linkId, r.name, -1)} disabled={countOf(l.linkId) < 1} aria-label={`Ubrat: ${r.name}`}>−</button>
          <span class="n">{countOf(l.linkId)}</span>
          <button onclick={() => bump(l.linkId, r.name, 1)} aria-label={`Přidat: ${r.name}`}>+</button>
          <button onclick={() => remove(l.linkId, r.name)} aria-label={`Odebrat: ${r.name}`}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if free.length}
    <input type="search" bind:value={query} placeholder="Přidat výrobek z Grimoáru (začni psát název)" aria-label="Přidat výrobek z Grimoáru" />
    {#if hints.length}
      <ul class="hints">
        {#each hints as r (r.id)}<li><button onclick={() => add(r)}>{r.name}</button></li>{/each}
      </ul>
    {/if}
  {/if}
  {#if message}<p class="error" role="alert">{message}</p>{/if}
</div>

{#if creating}
  <RecipeDialog kind="vyrobek" onsave={(input) => create(input)} onclose={() => (creating = false)} />
{/if}

<style>
  .crafts {
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
  .n {
    min-width: 2ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  input[type='search'] {
    width: 100%;
    box-sizing: border-box;
    margin-top: 0.4rem;
  }
</style>
