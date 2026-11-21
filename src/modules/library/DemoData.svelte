<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { removeDemo, restoreDemo } from '../../core/demo'
  import { refreshRecipes } from '../../core/recipes/cache.svelte'
  import { settings } from '../../core/settings.svelte'

  // Ukázkové postavy, družina a předpisy v Grimoáru: obnovení do původního stavu a odstranění.
  let msg = $state('')

  async function restore() {
    if (
      !(await ask(
        'Pokud máte ukázkové postavy, družinu nebo předpisy upravené, vrátí se do původního stavu. Ostatní data se nemění.',
        { title: 'Obnovit ukázková data?', ok: 'Obnovit' },
      ))
    )
      return
    try {
      await restoreDemo(settings.author)
      await refreshRecipes()
      msg = 'Ukázková data jsou obnovená (3 postavy, družina a předpisy v Grimoáru).'
    } catch (err) {
      msg = err instanceof Error ? err.message : String(err)
    }
  }

  async function remove() {
    if (
      !(await ask('Ukázkové postavy, družina a ukázkové předpisy se odstraní. Ostatní data se nemění.', {
        title: 'Odstranit ukázková data?',
        ok: 'Odstranit',
      }))
    )
      return
    try {
      await removeDemo()
      await refreshRecipes()
      msg = 'Ukázková data jsou odstraněná.'
    } catch (err) {
      msg = err instanceof Error ? err.message : String(err)
    }
  }
</script>

<details>
  <summary>Ukázková data</summary>
  <p class="muted">
    Ukázkové postavy, družina a předpisy v Grimoáru k vyzkoušení aplikace. Dají se upravit i smazat, tady je znovu
    nahrajete.
  </p>
  <p>
    <button onclick={restore}>Obnovit</button>
    <button onclick={remove}>Odstranit</button>
  </p>
  {#if msg}<p role="status" class="muted">{msg}</p>{/if}
</details>
