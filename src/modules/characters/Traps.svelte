<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { Character } from '../../core/character/model'
  import { adjustTrap, trapList, trapSummary, useTrap } from '../../core/character/traps'
  import TrapDialog from './TrapDialog.svelte'

  // Připravené nástrahy v přehledu postavy: souhrn ve stylu pravidel, počet kusů (±) a „Použít“ (ubere jeden kus). Rychlá klepání
  // na ± se sloučí do jedné revize.
  let {
    character,
    onchange,
  }: { character: Character; onchange: (next: Character, note: string) => void | Promise<void> } = $props()

  const DELAY = 1200
  let pending = $state<Record<string, number>>({})
  let timer: ReturnType<typeof setTimeout> | undefined
  let editing = $state<string | 'new' | undefined>(undefined)

  const list = $derived(trapList(character))
  const shown = (id: string) => Math.max(0, (character.traps[id]?.count ?? 0) + (pending[id] ?? 0))

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
      const t = character.traps[id]
      if (!by || !t) continue
      next = adjustTrap(next, id, by)
      parts.push(`${t.name} ${by > 0 ? '+' : '−'}${Math.abs(by)}`)
    }
    if (parts.length) await onchange(next, `Nástrahy: ${parts.join(', ')}`)
  }

  /** Použije jeden kus (spuštění vyhodnoťte jako výzvu podle postupu v Hodu); zapíše se jako samostatná revize. */
  async function use(id: string) {
    await flush()
    const t = character.traps[id]
    if (!t) return
    await onchange(useTrap(character, id), `Nástraha použita: ${trapSummary(t)}`)
  }

  onDestroy(() => {
    if (Object.keys(pending).length) void flush()
  })
</script>

<div class="traps">
  <div class="head">
    <strong>Nástrahy</strong>
    <button onclick={() => open('new')} aria-label="Přidat nástrahu">+ Přidat</button>
  </div>
  {#if list.length}
    <ul>
      {#each list as { id, trap } (id)}
        <li>
          <button class="icon" onclick={() => open(id)} aria-label={`Upravit: ${trap.name}`} title="Upravit">✎</button>
          <span class="what" title={trapSummary(trap)}>{trapSummary(trap)}</span>
          <button onclick={() => bump(id, -1)} disabled={shown(id) < 1} aria-label={`Ubrat: ${trap.name}`}>−</button>
          <span class="n">{shown(id)}</span>
          <button onclick={() => bump(id, 1)} aria-label={`Přidat: ${trap.name}`}>+</button>
          <button onclick={() => use(id)} disabled={shown(id) < 1} aria-label={`Použít: ${trap.name}`}>Použít</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if editing}
  <TrapDialog
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
  .traps {
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
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin: 0.3rem 0;
  }
  .what {
    flex: 1 1 12rem;
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
