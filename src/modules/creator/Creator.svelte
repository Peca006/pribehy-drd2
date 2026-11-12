<script lang="ts">
  import { emptyCharacter, eventsFor } from '../../core/character/model'
  import { saveLog } from '../../core/character/store'
  import { hasRulesPack } from '../../core/library.svelte'
  import { go } from '../../core/router.svelte'
  import { settings } from '../../core/settings.svelte'
  import { creationData } from './data'
  import { Draft } from './draft.svelte'
  import { clearDraft, hasContent, loadDraft, saveDraft } from './draftData'
  import { steps } from './steps'

  let { params }: { params: string[] } = $props()
  const data = $derived(creationData())

  let draft = $state<Draft | undefined>(undefined)
  /** obnovená rozpracovaná postava (kvůli upozornění nahoře) */
  let resumed = $state<{ name: string; saved: number } | undefined>(undefined)
  // rozpracovaná postava se vytvoří, až jsou k dispozici data balíčku; dřív uložená se obnoví
  $effect(() => {
    if (!data || draft) return
    const d = new Draft(data.rules)
    const saved = loadDraft(d.snapshot())
    if (saved) {
      d.restore(saved.data)
      resumed = { name: saved.data.name || saved.data.concept, saved: saved.saved }
      if (!params[0] && saved.step && steps.some((s) => s.id === saved.step)) goto(saved.step)
    }
    draft = d
  })
  // každá změna se hned ukládá, takže se při zavření aplikace nic neztratí
  $effect(() => {
    if (draft) saveDraft(draft.snapshot(), step.id)
  })
  function restart() {
    if (!data || !confirm('Zahodit rozpracovanou postavu a začít znovu?')) return
    clearDraft()
    resumed = undefined
    draft = new Draft(data.rules)
    goto('koncept')
  }
  const when = (t: number) => (t ? new Date(t).toLocaleString('cs-CZ') : '')

  // aktuální krok je v adrese (#/tvorba/rasa), takže tlačítko Zpět vrací na předchozí krok
  const index = $derived(
    Math.max(
      0,
      steps.findIndex((s) => s.id === params[0]),
    ),
  )
  const step = $derived(steps[index])
  const goto = (id: string) => go('tvorba', id)

  async function finish() {
    if (!draft) return
    const c = draft.toCharacter()
    const events = eventsFor(emptyCharacter(c.id), c, settings.author, 'Tvorba postavy')
    await saveLog({ id: c.id, events })
    clearDraft()
    go('postavy', c.id)
  }
</script>

<h1>Tvorba postavy</h1>
{#if data && !hasRulesPack()}
  <p class="muted">
    Používáte vestavěný přehled (názvy a čísla) bez popisů pravidel. Popisy, hotové sady výbavy a
    ceník doplní balíček pravidel v <a href="#/knihovna">Knihovně</a>.
  </p>
{/if}
{#if !data}
  <p class="muted">
    Pro tvorbu postavy je potřeba nainstalovaný balíček s pravidly (rasy, povolání, výbava).
    <a href="#/knihovna">Otevřít Knihovnu</a>
  </p>
{:else if draft}
  {#if resumed}
    <p class="panel resumed" role="status">
      Pokračujete v rozpracované postavě{resumed.name ? ` „${resumed.name}“` : ''} (uloženo
      {when(resumed.saved)}).
      <button onclick={() => (resumed = undefined)} aria-label="Skrýt upozornění">✕</button>
    </p>
  {/if}
  <ol class="progress" aria-label="Kroky tvorby postavy">
    {#each steps as s, i}
      <li>
        <a
          href={'#/tvorba/' + s.id}
          aria-current={i === index ? 'step' : undefined}
          class:done={i < index}>{i + 1}. {s.title}</a
        >
      </li>
    {/each}
  </ol>

  {@const Step = step.component}
  <Step {draft} {data} {goto} {finish} />

  <nav class="nav">
    <button disabled={index === 0} onclick={() => goto(steps[index - 1].id)}>← Zpět</button>
    {#if hasContent(draft.snapshot())}<button onclick={restart}>Začít znovu</button>{/if}
    {#if index < steps.length - 1}
      <button class="primary" onclick={() => goto(steps[index + 1].id)}>Dál →</button>
    {/if}
  </nav>
{/if}

<style>
  .progress {
    list-style: none;
    display: flex;
    gap: 0.25rem;
    padding: 0;
    overflow-x: auto;
    margin: 0 0 1rem;
  }
  .progress a {
    display: block;
    white-space: nowrap;
    padding: 0.4rem 0.7rem;
    border-radius: 1rem;
    background: var(--drd-surface);
    color: var(--drd-muted);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .progress a[aria-current='step'] {
    color: var(--drd-bg);
    background: var(--drd-accent);
  }
  .progress a.done {
    color: var(--drd-text);
  }
  .resumed {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    align-items: center;
  }
  .nav {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    margin: 1.5rem 0;
  }
</style>
