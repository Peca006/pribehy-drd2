<script lang="ts">
  import { answer, confirmState } from '../core/confirm.svelte'

  // Jediná instance dialogu pro celou aplikaci (je v App.svelte). Klávesa Esc nebo klepnutí mimo = Zrušit.
  let dialog = $state<HTMLDialogElement>()
  const p = $derived(confirmState.pending)

  $effect(() => {
    if (!dialog) return
    if (p && !dialog.open) dialog.showModal()
    if (!p && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="confirm-title"
  oncancel={(e) => {
    e.preventDefault()
    answer(false)
  }}
  onclick={(e) => {
    if (e.target === dialog) answer(false)
  }}
>
  {#if p}
    <h2 id="confirm-title">{p.title}</h2>
    <p>{p.message}</p>
    <div class="actions">
      <button class="primary" onclick={() => answer(true)}>{p.ok}</button>
      <button onclick={() => answer(false)}>{p.cancel}</button>
    </div>
  {/if}
</dialog>

<style>
  /* ostatní vzhled dialogu je v app.css */
  dialog {
    width: min(26rem, 92vw);
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
  }
  p {
    margin: 0 0 1rem;
    white-space: pre-line;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
