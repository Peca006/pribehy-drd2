<script lang="ts">
  import { ATTRIBUTES } from '../../core/character/model'
  import {
    counted,
    describeRoll,
    rollInitiative,
    rollMode,
    SUCCESS_AT,
    type Mode,
  } from '../../core/character/roll'
  import {
    clampThreat,
    overLimit,
    statusOf,
    type Participant,
    type Status,
  } from '../../core/party/conflict'

  // Dialog účastníka konfliktu: stav, iniciativa a hod bytosti, Ohrožení, Jizvy, poznámka. „Zavřít“ nic nevyhodnocuje,
  // změny se ukládají hned.
  let {
    p,
    fate,
    started,
    onpatch,
    onfate,
    onremove,
    onclose,
  }: {
    p: Participant
    fate: number
    started: boolean
    onpatch: (x: Partial<Participant>) => void
    onfate: (n: number) => void
    onremove: () => void
    onclose: () => void
  } = $props()

  let dialog: HTMLDialogElement
  $effect(() => {
    dialog.showModal()
  })

  const beast = $derived(p.kind === 'bytost')
  const st = $derived(statusOf(p))
  const over = $derived(overLimit(p))
  const STATES: [Status, string, Partial<Participant>][] = [
    ['ready', 'Čeká', { acted: false, deferred: false, out: false }],
    ['acted', 'Jednal', { acted: true, deferred: false, out: false }],
    ['deferred', 'Odložil', { acted: false, deferred: true, out: false }],
    ['out', 'Vyřazen', { acted: false, deferred: false, out: true }],
  ]

  let initMode = $state<Mode>('normal')
  let actMode = $state<Mode>('normal')
  let flash = $state('')
  let actText = $state('')

  function say(t: string) {
    flash = t
    setTimeout(() => (flash = ''), 2500)
  }
  /** Zaplatí Sudbu ze společné zásoby (jen bytost). */
  function payFate(n: number): boolean {
    if (fate < n) {
      say('Chybí Sudba.')
      return false
    }
    onfate(fate - n)
    say(`−${n} Sudba`)
    return true
  }
  function rollInit() {
    if (initMode !== 'normal' && !payFate(1)) return
    const r = rollInitiative(initMode)
    onpatch({ initiative: r.total, initRoll: describeRoll(r.dice, initMode) })
  }
  function rollAct() {
    if (actMode === 'best' && !payFate(1)) return
    const dice = rollMode(actMode)
    const u = counted(dice, actMode)
    const total = u[0] + u[1] + (p.level ?? 0)
    actText = `${describeRoll(dice, actMode)}${p.level ? ` + úroveň ${p.level}` : ''} = ${total}${
      total >= SUCCESS_AT ? ` (${SUCCESS_AT}+ je úspěch ve zkoušce)` : ''
    }`
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label={p.name}>
  <h2>
    {p.name}
    <small class="muted"
      >{beast ? 'bytost' : 'hrdina'}{p.level !== undefined ? ` · úroveň ${p.level}` : ''}</small
    >
  </h2>

  {#if started}
    <div class="line" role="group" aria-label="Stav v kole">
      {#each STATES as [s, label, patch]}
        <button class:primary={st === s} onclick={() => onpatch(patch)}>{label}</button>
      {/each}
    </div>
  {/if}

  {#if beast}
    {#if !started}
      <h3>Iniciativa</h3>
      <div class="line">
        <input
          type="number"
          value={p.initiative}
          aria-label="Iniciativa"
          onchange={(e) => onpatch({ initiative: Number(e.currentTarget.value) || 0 })}
        />
        {#each [['normal', 'Normálně'], ['best', 'Rychle'], ['worst', 'Pomalu']] as [m, label]}
          <button class:primary={initMode === m} onclick={() => (initMode = m as Mode)}
            >{label}</button
          >
        {/each}
        <button onclick={rollInit}>Hodit</button>
      </div>
      <p class="muted">
        Hod bez dovednosti.{#if initMode !== 'normal'}
          Přístup stojí 1 Sudbu.{/if}
        {#if p.initRoll}<strong>{p.initRoll}</strong>{/if}
      </p>
    {:else}
      <h3>Hod</h3>
      <div class="line">
        {#each [['normal', 'Normálně'], ['best', 'Přesně'], ['worst', 'Nepřesně']] as [m, label]}
          <button class:primary={actMode === m} onclick={() => (actMode = m as Mode)}
            >{label}</button
          >
        {/each}
        <button onclick={rollAct}>Hodit</button>
      </div>
      <p class="muted">
        2k6 + úroveň.{#if actMode === 'best'}
          Přesně stojí 1 Sudbu.{/if}
        {#if actText}<strong>{actText}</strong>{/if}
      </p>
    {/if}
    <div class="line">
      <span>Sudba bytostí</span>
      <button onclick={() => onfate(fate - 1)} disabled={fate < 1} aria-label="Ubrat Sudbu"
        >−</button
      >
      <strong>{fate}</strong>
      <button onclick={() => onfate(fate + 1)} aria-label="Přidat Sudbu">+</button>
      {#if flash}<small role="status" class="flash">{flash}</small>{/if}
    </div>
  {/if}

  <div class="line">
    <span>Ohrožení</span>
    <button
      onclick={() => onpatch({ threat: clampThreat(p.threat - 1) })}
      aria-label="Snížit Ohrožení">−</button
    >
    <strong>{p.threat}</strong>
    <button
      onclick={() => onpatch({ threat: clampThreat(p.threat + 1) })}
      aria-label="Zvýšit Ohrožení">+</button
    >
    {#if !beast}
      <span>Výhoda</span>
      <button
        onclick={() => onpatch({ advantage: Math.max(0, p.advantage - 1) })}
        aria-label="Ubrat Výhodu">−</button
      >
      <strong>{p.advantage}</strong>
      <button onclick={() => onpatch({ advantage: p.advantage + 1 })} aria-label="Přidat Výhodu"
        >+</button
      >
    {/if}
  </div>

  {#if beast}
    <div class="line">
      <span>Jizvy</span>
      {#each ATTRIBUTES as a}
        <span class="scar" class:bad={over.includes(a)}>
          {a}
          <button
            onclick={() => onpatch({ scars: { ...p.scars, [a]: Math.max(0, p.scars[a] - 1) } })}
            aria-label={`Ubrat Jizvu ${a}`}>−</button
          >
          {p.scars[a]}{p.limits?.[a] !== undefined ? ` / ${p.limits[a]}` : ''}
          <button
            onclick={() => onpatch({ scars: { ...p.scars, [a]: p.scars[a] + 1 } })}
            aria-label={`Přidat Jizvu ${a}`}>+</button
          >
        </span>
      {/each}
    </div>
    {#if over.length}
      <p class="error" role="status">
        Součet Jizev přesáhl hranici ({over.join(', ')}): bytost je vyřazena.
      </p>
    {/if}
  {/if}

  <input
    type="text"
    value={p.note}
    placeholder="Poznámka"
    aria-label={`Poznámka k ${p.name}`}
    onchange={(e) => onpatch({ note: e.currentTarget.value })}
  />

  <div class="line actions">
    <button class="primary" onclick={() => dialog.close()}>Zavřít</button>
    <button onclick={onremove}>Odebrat z konfliktu</button>
  </div>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(28rem, 94vw);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
  }
  h3 {
    margin: 0.75rem 0 0;
    font-size: 1rem;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .line input[type='number'] {
    width: 4.5rem;
  }
  dialog > input[type='text'] {
    width: 100%;
    box-sizing: border-box;
  }
  .scar {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  .scar.bad {
    color: #e88;
  }
  .flash {
    color: #e8c070;
  }
  .actions {
    margin-top: 0.75rem;
  }
</style>
