<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { onDestroy } from 'svelte'
  import {
    addCharacterImage,
    deleteCharacterImage,
    imageFileName,
    listCharacterImages,
  } from '../../core/character/images'
  import ZoomImage from '../../ui/ZoomImage.svelte'

  // Ilustrace postavy (portrét, obrázky z hry): víc k jedné postavě, uložené jen v tomto zařízení. Do sdíleného kódu,
  // QR ani zvuku nejdou; dají se uložit do souboru.
  let { characterId, name }: { characterId: string; name: string } = $props()

  let items = $state<{ id: string; url: string; blob: Blob }[]>([])
  let error = $state('')
  const revoke = () => items.forEach((i) => URL.revokeObjectURL(i.url))

  async function load(id: string) {
    const list = await listCharacterImages(id)
    revoke()
    items = list.map((i) => ({ id: i.id, blob: i.blob, url: URL.createObjectURL(i.blob) }))
  }
  $effect(() => {
    void load(characterId)
  })
  onDestroy(revoke)

  async function onfiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    error = ''
    try {
      for (const f of Array.from(input.files ?? [])) await addCharacterImage(characterId, f)
    } catch {
      error = 'Některý soubor se nepodařilo načíst jako obrázek.'
    }
    input.value = ''
    await load(characterId)
  }
  async function remove(id: string) {
    if (!(await ask('Ilustrace se odebere z postavy.', { title: 'Odebrat ilustraci?', ok: 'Odebrat' }))) return
    await deleteCharacterImage(id)
    await load(characterId)
  }
  function save(i: { url: string }, index: number) {
    const a = document.createElement('a')
    a.href = i.url
    a.download = imageFileName(name, index)
    a.click()
  }
</script>

<section aria-label="Ilustrace postavy">
  {#if items.length}
    <div class="gallery">
      {#each items as i, n (i.id)}
        <figure>
          <ZoomImage src={i.url} alt={`Ilustrace postavy ${name}`} />
          <figcaption>
            <button onclick={() => save(i, n)} aria-label={`Uložit ilustraci ${n + 1} do souboru`} title="Uložit do souboru">⭳</button>
            <button onclick={() => remove(i.id)} aria-label={`Odebrat ilustraci ${n + 1}`} title="Odebrat">✕</button>
          </figcaption>
        </figure>
      {/each}
    </div>
  {/if}
  <label class="btn">
    + Přidat ilustrace
    <input type="file" accept="image/*" multiple onchange={onfiles} hidden />
  </label>
  <span class="muted">Zůstávají jen v tomto zařízení a nesdílejí se s postavou, jen je jde uložit do souboru.</span>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  section {
    margin: 0.75rem 0;
  }
  .gallery {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    margin-bottom: 0.5rem;
  }
  figure {
    position: relative;
    margin: 0;
    flex: 0 0 auto;
  }
  figure :global(img) {
    display: block;
    max-height: 11rem;
    max-width: 70vw;
    border-radius: 6px;
  }
  figcaption {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    display: flex;
    gap: 0.25rem;
  }
  figcaption button {
    min-height: 0;
    padding: 0.1rem 0.4rem;
  }
</style>
