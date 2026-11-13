<script lang="ts">
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import type { Attribute } from '../../core/content/schema'
  import {
    availableOf,
    effectiveAttributes,
    loadThreat,
    MAX_THREAT,
    saveThreat,
    type Bonus,
    type Spent,
  } from '../../core/character/play'
  import { evaluateRoll, levelOf, rollDice, SUCCESS_AT, type Dice } from '../../core/character/roll'
  import { professions } from '../../core/library.svelte'

  // Hod (2k6 + úroveň povolání) a Ohrožení. Kostky lze hodit tady, nebo zadat z fyzických kostek.
  let {
    id,
    character,
    spent,
    bonus,
    pay,
    onscar,
  }: {
    id: string
    character: Character
    spent: Spent
    bonus: Bonus
    /** zaplatí Zdroje vlastnosti; vrací, zda na to postava měla */
    pay: (a: Attribute, n: number) => boolean
    onscar: (a: Attribute) => void
  } = $props()

  // komponenta se pro každou postavu vytváří znovu (`{#key}` u volající stránky)
  // svelte-ignore state_referenced_locally
  let threat = $state(loadThreat(id))
  let dice = $state<Dice>([0, 0])
  let used = $state<string[]>([])
  let intent = $state('')
  let payAttr = $state<Attribute>('Tělo')
  /** jak dopadl neúspěšný hod: vyčerpáním zmírněn, nebo přijat */
  let outcome = $state<'vycerpano' | 'prijato' | undefined>(undefined)
  let paid = $state(0)

  const owned = $derived(
    Object.entries(character.professions)
      .filter(([, lvl]) => lvl > 0)
      .map(([pid, lvl]) => ({
        id: pid,
        name: professions().find((p) => p.id === pid)?.name ?? pid,
        lvl,
      })),
  )
  const level = $derived(levelOf(character, used))
  const rolled = $derived(dice[0] > 0 && dice[1] > 0)
  const result = $derived(rolled ? evaluateRoll(dice, level) : undefined)

  const toggle = (pid: string) =>
    (used = used.includes(pid) ? used.filter((x) => x !== pid) : [...used, pid])
  const setDie = (i: 0 | 1, v: number) => {
    dice = i === 0 ? [v, dice[1]] : [dice[0], v]
    outcome = undefined
  }
  function roll() {
    dice = rollDice()
    outcome = undefined
  }
  // vyčerpání stojí tolik Zdrojů, kolik je Ohrožení (nejméně 1), a Ohrožení se tím zvýší o 1
  const cost = $derived(Math.max(1, threat))
  const have = $derived(availableOf(spent, bonus, effectiveAttributes(character), payAttr))
  function exhaust() {
    if (!pay(payAttr, cost)) return
    paid = cost
    setThreat(Math.max(1, threat) + 1)
    outcome = 'vycerpano'
  }
  function setThreat(n: number) {
    threat = Math.min(MAX_THREAT, Math.max(0, n))
    saveThreat(id, threat)
  }
</script>

<section class="panel" aria-label="Hod">
  <div class="head">
    <strong>Hod</strong>
    <button class="primary" onclick={roll}>Hodit</button>
  </div>

  <input
    type="text"
    bind:value={intent}
    placeholder="Záměr a hrozící neúspěch (poznámka)"
    aria-label="Záměr a hrozící neúspěch"
  />
  {#if owned.length}
    <div class="chips" role="group" aria-label="Použité povolání">
      {#each owned as p}
        <button class:primary={used.includes(p.id)} onclick={() => toggle(p.id)}>
          {p.name}
          {p.lvl}
        </button>
      {/each}
    </div>
  {/if}
  <p class="muted">
    Úroveň {level}{used.length > 1
      ? ' (nejnižší z vybraných)'
      : used.length === 0
        ? ' (bez povolání)'
        : ''}
  </p>

  <div class="dice">
    {#each [0, 1] as i}
      <select
        value={dice[i as 0 | 1]}
        onchange={(e) => setDie(i as 0 | 1, Number(e.currentTarget.value))}
        aria-label={`Kostka ${i + 1}`}
      >
        <option value={0}>?</option>
        {#each [1, 2, 3, 4, 5, 6] as v}<option value={v}>{v}</option>{/each}
      </select>
      {#if i === 0}<span>+</span>{/if}
    {/each}
    <span>+ {level} =</span>
    <strong
      class="total"
      class:ok={result?.success || outcome === 'vycerpano'}
      class:bad={result && !result.success && outcome !== 'vycerpano'}
    >
      {result ? result.total : '–'}
    </strong>
  </div>
  {#if result}
    {#if result.success}
      <p role="status" class="ok">Úspěch ({SUCCESS_AT} a více).</p>
      <p class="muted">
        Zlepšila-li akce vaše okolnosti:
        <button onclick={() => setThreat(threat - 1)} disabled={threat === 0}>Ohrožení −1</button>
      </p>
    {:else if outcome === 'vycerpano'}
      <p role="status" class="ok">
        Úspěch vyčerpáním: škrtli jste {paid}
        {payAttr}, Ohrožení je {threat}. Popište úsilí či újmu a nové potíže.
      </p>
    {:else if outcome === 'prijato'}
      <p role="status" class="bad">Neúspěch přijat, Zdroje zůstaly. Popište následek.</p>
    {:else}
      <p role="status" class="bad">
        Hrozí neúspěch. Vyčerpáním ho zmírníte nebo přemůžete, nebo ho přijmete.
      </p>
      <div class="chips" role="group" aria-label="Zdroje k vyčerpání">
        {#each ATTRIBUTES as a}
          <button class:primary={payAttr === a} onclick={() => (payAttr = a)}>{a}</button>
        {/each}
      </div>
      <p class="muted">
        Vyčerpání stojí {cost}
        {payAttr} (Ohrožení, nejméně 1), máte {have}. Ohrožení se zvýší o 1.
      </p>
      <p class="actions">
        <button class="primary" onclick={exhaust} disabled={have < cost}>Vyčerpat</button>
        <button onclick={() => (outcome = 'prijato')}>Přijmout</button>
        {#if have < cost}<button onclick={() => onscar(payAttr)}>Zjizvit se…</button>{/if}
      </p>
    {/if}
  {/if}

  <div class="threat">
    <span>Ohrožení</span>
    <button
      onclick={() => setThreat(threat - 1)}
      disabled={threat === 0}
      aria-label="Snížit Ohrožení">−</button
    >
    <strong class="count">{threat}</strong>
    <button
      onclick={() => setThreat(threat + 1)}
      disabled={threat >= MAX_THREAT}
      aria-label="Zvýšit Ohrožení">+</button
    >
  </div>
</section>

<style>
  .head,
  .threat,
  .dice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .head {
    justify-content: space-between;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0 0;
  }
  .dice {
    margin: 0.5rem 0;
  }
  .dice select {
    width: 3.6rem;
    min-width: 3.6rem;
    text-align: center;
  }
  .total {
    font-size: 1.6rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ok {
    color: #7c7;
  }
  .bad {
    color: #e88;
  }
  .threat {
    margin-top: 0.5rem;
  }
  .threat span:first-child {
    flex: 1;
  }
  .count {
    min-width: 2rem;
    text-align: center;
  }
</style>
