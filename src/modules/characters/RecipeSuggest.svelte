<script lang="ts">
  import { recipes } from '../../core/recipes/cache.svelte'
  import { suggestRecipes } from '../../core/recipes/find'
  import type { Recipe, RecipeKind } from '../../core/recipes/model'

  // Výběr předpisu z Grimoáru podle názvu (bez ohledu na velikost písmen a diakritiku). Vybraný předpis se předá
  // dialogu, který z něj předvyplní pole; uložením vznikne u postavy odkaz na stejný předpis.
  let { kind, onpick }: { kind: RecipeKind; onpick: (r: Recipe) => void } = $props()

  let query = $state('')
  const hints = $derived(suggestRecipes(recipes(), query, kind))
  const any = $derived(recipes().some((r) => r.kind === kind))
</script>

{#if any}
  <input type="search" bind:value={query} placeholder="Vybrat z Grimoáru (začni psát název)" aria-label="Vybrat z Grimoáru" />
  {#if hints.length}
    <ul>
      {#each hints as r (r.id)}
        <li>
          <button
            onclick={() => {
              onpick(r)
              query = ''
            }}>{r.name}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  input {
    width: 100%;
    box-sizing: border-box;
    margin: 0.3rem 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
</style>
