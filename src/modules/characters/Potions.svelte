<script lang="ts">
  import HelpButton from '../../ui/HelpButton.svelte'
  import HelpPanel from '../../ui/HelpPanel.svelte'
  import { onDestroy } from 'svelte'
  import type { Character } from '../../core/character/model'
  import { adjustPotion, potionLabel, potionList } from '../../core/character/potions'
  import PotionDialog from './PotionDialog.svelte'

  // Lektvary a masti v přehledu postavy: na co jsou, kolik Surovin v nich je (±). Rychlá klepání se sloučí do jedné revize.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  const DELAY = 1200
  let pending = $state<Record<string, number>>({})
  let timer: ReturnType<typeof setTimeout> | undefined
  let editing = $state<string | 'new' | undefined>(undefined)

  const list = $derived(potionList(character))
  const shown = (id: string) => Math.max(0, (character.potions[id]?.count ?? 0) + (pending[id] ?? 0))

  /** Otevře dialog až po zapsání čekajících ± (dialog pak pracuje s aktuální postavou). */
  async function open(what: string) {
    await flush()
    editing = what
  }

  function bump(id: string, by: number) {
    if (shown(id) + by < 0) return
    pending = { ...pending, [id]: (pending[id] ?? 0) + by }
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY)
  }

  async function flush() {
    clearTimeout(timer)
    const todo = pending
    pending = {}
    let next = character
    const parts: string[] = []
    for (const [id, by] of Object.entries(todo)) {
      const p = character.potions[id]
      if (!by || !p) continue
      next = adjustPotion(next, id, by)
      parts.push(`${potionLabel(p)} ${by > 0 ? '+' : '−'}${Math.abs(by)}`)
    }
    if (parts.length) await onchange(next, `Lektvary: ${parts.join(', ')}`)
  }

  onDestroy(() => {
    if (Object.keys(pending).length) void flush()
  })
  let helpOpen = $state(false)
</script>

<div class="potions">
  <div class="head">
    <span><strong>Lektvary a masti</strong> <HelpButton bind:open={helpOpen} label="Nápověda: Lektvary a masti" /></span>
    <button class="icon" onclick={() => open('new')} aria-label="Přidat lektvar" title="Přidat lektvar">+ Přidat</button>
  </div>
  <HelpPanel topic="lektvary" open={helpOpen} />
  {#if list.length}
    <ul>
      {#each list as { id, potion } (id)}
        <li>
          <button class="icon" onclick={() => open(id)} aria-label={`Upravit: ${potionLabel(potion)}`} title="Upravit">✎</button>
          <span class="what" title={potion.note}>{potionLabel(potion)}</span>
          <button onclick={() => bump(id, -1)} disabled={shown(id) < 1} aria-label={`Ubrat: ${potionLabel(potion)}`}>−</button>
          <span class="n">{shown(id)}</span>
          <button onclick={() => bump(id, 1)} aria-label={`Přidat: ${potionLabel(potion)}`}>+</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if editing}
  <PotionDialog
    {character}
    id={editing === 'new' ? undefined : editing}
    onsave={async (next, note) => {
      editing = undefined
      await onchange(next, note)
    }}
    onclose={() => (editing = undefined)}
  />
{/if}

<style>
  .potions {
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
    align-items: center;
    gap: 0.4rem;
    margin: 0.2rem 0;
  }
  .what {
    flex: 1;
    min-width: 0;
  }
  .n {
    min-width: 2ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .icon {
    padding: 0 0.4rem;
  }
</style>
