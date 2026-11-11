<script lang="ts">
  import { emptyCharacter, eventsFor } from '../../core/character/model'
  import { saveLog } from '../../core/character/store'
  import { go } from '../../core/router.svelte'
  import { creationData } from './data'
  import { Draft } from './draft.svelte'
  import { steps } from './steps'

  let { params }: { params: string[] } = $props()
  const data = $derived(creationData())

  let draft = $state<Draft | undefined>(undefined)
  // rozpracovaná postava se vytvoří, až jsou k dispozici data balíčku
  $effect(() => {
    if (data && !draft) draft = new Draft(data.rules)
  })

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
    const events = eventsFor(emptyCharacter(c.id), c, 'hráč', 'Tvorba postavy')
    await saveLog({ id: c.id, events })
    go('postavy', c.id)
  }
</script>

<h1>Tvorba postavy</h1>
{#if !data}
  <p class="muted">
    Pro tvorbu postavy je potřeba nainstalovaný balíček s pravidly (rasy, povolání, výbava).
    <a href="#/knihovna">Otevřít Knihovnu</a>
  </p>
{:else if draft}
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
  .nav {
    display: flex;
    justify-content: space-between;
    margin: 1.5rem 0;
  }
</style>
