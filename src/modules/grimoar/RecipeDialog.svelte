<script lang="ts">
  import { untrack } from 'svelte'
  import { ATTRIBUTES } from '../../core/character/model'
  import { MAX_SCAR_TEXT, potionFrom } from '../../core/character/potions'
  import { trapFrom, trapSummary } from '../../core/character/traps'
  import type { Attribute } from '../../core/content/schema'
  import { potionToRecipe, recipeToTrap, trapToRecipe } from '../../core/recipes/kinds'
  import { MAX_NAME, RECIPE_KIND_LABELS, type Recipe, type RecipeInput } from '../../core/recipes/model'
  import TrapFields from '../characters/TrapFields.svelte'
  import type { Trap } from '../../core/character/model'

  // Předpis lektvaru, nástrahy nebo výrobku v Grimoáru (kouzla mají vlastní dialog). Úprava existujícího předpisu se
  // projeví u všech postav, které na něj odkazují; „Uložit jako novou variantu“ vytvoří další předpis.
  let {
    kind,
    recipe,
    onsave,
    onclose,
  }: {
    kind: 'lektvar' | 'nastraha' | 'vyrobek'
    recipe?: Recipe
    onsave: (input: RecipeInput, variant: boolean) => Promise<string | undefined>
    onclose: () => void
  } = $props()

  const init = untrack(() => recipe)
  let description = $state(init?.description ?? '')
  // lektvar
  let attribute = $state<Attribute>((init?.params.vlastnost as Attribute) ?? 'Tělo')
  let scar = $state(typeof init?.params.jizva === 'string' ? init.params.jizva : '')
  // nástraha: pracovní podoba (počet a poznámka jsou u postavy, ne v předpisu)
  let spec = $state<Partial<Trap>>(
    (init && recipeToTrap(init, { count: 1 })) || {
      name: '',
      type: 'jednoducha',
      attribute: 'Tělo',
      effect: 'ohrozeni',
      maneuver: '',
      extra: 0,
      weakness: '',
    },
  )
  // výrobek
  // lektvar a výrobek: vlastní název (nástraha ho má v poli nástrahy, kouzlo ve svém dialogu)
  let name = $state(init?.kind === 'vyrobek' || init?.kind === 'lektvar' ? init.name : '')
  let error = $state('')
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  function build(): RecipeInput | string {
    if (kind === 'lektvar') {
      if (!name.trim()) return 'Zadejte název lektvaru.'
      const p = potionFrom({ attribute, scar, count: 0, note: '', name, description })
      if (!p) return 'Zadejte vlastnost a druh Jizvy, na který lektvar působí.'
      return potionToRecipe(p)
    }
    if (kind === 'nastraha') {
      const t = trapFrom({ type: 'jina', effect: 'ohrozeni', maneuver: '', extra: 0, weakness: '', note: '', count: 1, ...spec })
      if (!t) return 'Zadejte název nástrahy a cílovou vlastnost.'
      return { ...trapToRecipe(t), description }
    }
    if (!name.trim()) return 'Zadejte název výrobku.'
    return { kind: 'vyrobek', name, description }
  }

  async function save(variant: boolean) {
    error = ''
    const input = build()
    if (typeof input === 'string') return void (error = input)
    error = (await onsave(input, variant)) ?? ''
  }

  const preview = $derived.by(() => {
    if (kind === 'lektvar') return scar.trim() ? `Působí na: ${attribute}, ${scar.trim()}` : ''
    if (kind === 'nastraha') {
      const t = trapFrom({ type: 'jina', effect: 'ohrozeni', maneuver: '', extra: 0, weakness: '', note: '', count: 1, ...spec })
      return t ? trapSummary(t) : ''
    }
    return ''
  })
</script>

<dialog bind:this={dialog} {onclose} aria-label={RECIPE_KIND_LABELS[kind]}>
  <h2>{recipe ? 'Upravit' : 'Nový'}: {RECIPE_KIND_LABELS[kind].toLowerCase()}</h2>
  {#if kind === 'lektvar'}
    <input type="text" bind:value={name} maxlength={MAX_NAME} placeholder="Název lektvaru" aria-label="Název lektvaru" />
    <div class="seg" role="group" aria-label="Vlastnost">
      {#each ATTRIBUTES as a}
        <button class:primary={attribute === a} onclick={() => (attribute = a)}>{a}</button>
      {/each}
    </div>
    <input type="text" bind:value={scar} maxlength={MAX_SCAR_TEXT} placeholder="Druh Jizvy (např. popálenina)" aria-label="Druh Jizvy" />
  {:else if kind === 'nastraha'}
    <TrapFields bind:spec />
  {:else}
    <input type="text" bind:value={name} maxlength={MAX_NAME} placeholder="Název výrobku" aria-label="Název výrobku" />
  {/if}
  {#if preview}<p class="muted">{preview}</p>{/if}
  <textarea bind:value={description} rows="3" placeholder="Popis (nepovinný)" aria-label="Popis předpisu"></textarea>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    {#if recipe}
      <button class="primary" onclick={() => save(false)}>Uložit změny</button>
      <button onclick={() => save(true)}>Uložit jako novou variantu</button>
    {:else}
      <button class="primary" onclick={() => save(false)}>Uložit do Grimoáru</button>
    {/if}
    <button onclick={() => dialog.close()}>Zavřít</button>
  </p>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(30rem, 94vw);
  }
  dialog::backdrop {
    background: var(--drd-scrim);
  }
  h2 {
    margin-top: 0;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.4rem 0;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
