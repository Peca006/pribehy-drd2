<script lang="ts">
  import { untrack } from 'svelte'
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import { MAX_NAME, MAX_NOTE, MAX_SCAR_TEXT, potionLabel, removePotion, savePotion } from '../../core/character/potions'
  import type { Attribute } from '../../core/content/schema'
  import { recipeToPotion } from '../../core/recipes/kinds'
  import RecipeSuggest from './RecipeSuggest.svelte'

  // Lektvar, mast, odvar nebo nektar: na co je (vlastnost a druh Jizvy), kolik Surovin v něm je a poznámka.
  let {
    character,
    id,
    onsave,
    onclose,
  }: {
    character: Character
    /** upravovaný lektvar; bez něj se přidává nový */
    id?: string
    onsave: (next: Character, note: string) => void | Promise<void>
    onclose: () => void
  } = $props()

  const old = untrack(() => (id ? character.potions[id] : undefined))
  let attribute = $state<Attribute>(old?.attribute ?? 'Tělo')
  let scar = $state(old?.scar ?? '')
  let name = $state(old?.name ?? '')
  let description = $state(old?.description ?? '')
  let count = $state(old?.count ?? 3)
  let note = $state(old?.note ?? '')
  let error = $state('')
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  function save() {
    error = ''
    const r = savePotion(character, { attribute, scar, count, note, name, description }, id)
    if ('error' in r) return void (error = r.error)
    const label = potionLabel({ attribute, scar: scar.trim(), count, note, name: name.trim() })
    void onsave(r.character, id ? `Lektvar upraven: ${label}, ${count} Surovin` : `Nový lektvar: ${label}, ${count} Surovin`)
  }

  function remove() {
    if (!id || !old) return
    const r = removePotion(character, id)
    if ('character' in r) void onsave(r.character, `Lektvar odstraněn: ${potionLabel(old)}`)
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Lektvar">
  <h2>{id ? 'Upravit lektvar' : 'Nový lektvar'}</h2>
  {#if !id}
    <RecipeSuggest
      kind="lektvar"
      onpick={(r) => {
        attribute = (r.params.vlastnost as Attribute) ?? attribute
        scar = typeof r.params.jizva === 'string' ? r.params.jizva : scar
        const p = recipeToPotion(r, {})
        name = p?.name ?? ''
        description = p?.description ?? ''
      }}
    />
  {/if}
  <input type="text" bind:value={name} maxlength={MAX_NAME} placeholder="Název lektvaru (nepovinný)" aria-label="Název lektvaru" />
  <div class="seg" role="group" aria-label="Vlastnost">
    {#each ATTRIBUTES as a}
      <button class:primary={attribute === a} onclick={() => (attribute = a)}>{a}</button>
    {/each}
  </div>
  <input
    type="text"
    bind:value={scar}
    maxlength={MAX_SCAR_TEXT}
    placeholder="Na jakou Jizvu (popálenina, fobie…)"
    aria-label="Druh Jizvy"
  />
  <div class="row">
    <span>Suroviny v zásobníku</span>
    <button onclick={() => (count = Math.max(0, count - 1))} disabled={count <= 0} aria-label="Méně">−</button>
    <strong>{count}</strong>
    <button onclick={() => (count = Math.min(9999, count + 1))} aria-label="Více">+</button>
  </div>
  <textarea bind:value={description} rows="2" placeholder="Popis (nepovinný)" aria-label="Popis lektvaru"></textarea>
  <input type="text" bind:value={note} maxlength={MAX_NOTE} placeholder="Poznámka (např. do slunovratu)" aria-label="Poznámka" />
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    <button class="primary" onclick={save}>Uložit</button>
    <button onclick={() => dialog.close()}>Zrušit</button>
    {#if id}<button onclick={remove}>Odstranit</button>{/if}
  </p>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(26rem, 94vw);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  h2 {
    margin-top: 0;
  }
  .seg {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.4rem 0;
  }
  .row span {
    flex: 1;
  }
  .row strong {
    min-width: 2ch;
    text-align: center;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
  input[type='text'] {
    width: 100%;
    margin: 0.3rem 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
