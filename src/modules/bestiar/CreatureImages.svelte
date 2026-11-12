<script lang="ts">
  import { onDestroy } from 'svelte'
  import { addImage, deleteImage, listImages } from '../../core/creatures/images'

  // Vlastní obrázky bytosti – uložené jen v tomto zařízení.
  let { creatureId }: { creatureId: string } = $props()

  let items = $state<{ id: string; url: string }[]>([])
  let error = $state('')
  const revoke = () => items.forEach((i) => URL.revokeObjectURL(i.url))

  async function load(id: string) {
    const list = await listImages(id)
    revoke()
    items = list.map((i) => ({ id: i.id, url: URL.createObjectURL(i.blob) }))
  }
  $effect(() => {
    load(creatureId)
  })
  onDestroy(revoke)

  async function onfiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    error = ''
    try {
      for (const f of Array.from(input.files ?? [])) await addImage(creatureId, f)
    } catch {
      error = 'Některý soubor se nepodařilo načíst jako obrázek.'
    }
    input.value = ''
    await load(creatureId)
  }
  async function remove(id: string) {
    if (!confirm('Odebrat obrázek?')) return
    await deleteImage(id)
    await load(creatureId)
  }
</script>

<section>
  {#if items.length}
    <div class="gallery">
      {#each items as i (i.id)}
        <figure>
          <img src={i.url} alt="Obrázek bytosti" />
          <button onclick={() => remove(i.id)} aria-label="Odebrat obrázek" title="Odebrat">✕</button>
        </figure>
      {/each}
    </div>
  {/if}
  <label class="btn">
    + Přidat obrázky
    <input type="file" accept="image/*" multiple onchange={onfiles} hidden />
  </label>
  <span class="muted">Obrázky zůstávají jen v tomto zařízení.</span>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  section {
    margin: 1rem 0;
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
  img {
    display: block;
    max-height: 14rem;
    max-width: 85vw;
    border-radius: 6px;
  }
  figure button {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    min-height: 0;
    padding: 0.1rem 0.45rem;
  }
</style>
