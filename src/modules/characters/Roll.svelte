<script lang="ts">
  import { type Character } from '../../core/character/model'
  import { loadThreat, MAX_THREAT, saveThreat } from '../../core/character/play'
  import { evaluateRoll, levelOf, rollDice, SUCCESS_AT, type Dice } from '../../core/character/roll'
  import { professions } from '../../core/library.svelte'

  // Hod (2k6 + úroveň povolání) a Ohrožení. Kostky lze hodit tady, nebo zadat z fyzických kostek.
  let { id, character }: { id: string; character: Character } = $props()

  // komponenta se pro každou postavu vytváří znovu (`{#key}` u volající stránky)
  // svelte-ignore state_referenced_locally
  let threat = $state(loadThreat(id))
  let dice = $state<Dice>([0, 0])
  let used = $state<string[]>([])

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
  const setDie = (i: 0 | 1, v: number) => (dice = i === 0 ? [v, dice[1]] : [dice[0], v])
  function setThreat(n: number) {
    threat = Math.min(MAX_THREAT, Math.max(0, n))
    saveThreat(id, threat)
  }
</script>

<section class="panel" aria-label="Hod">
  <div class="head">
    <strong>Hod</strong>
    <button class="primary" onclick={() => (dice = rollDice())}>Hodit</button>
  </div>

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
    <strong class="total" class:ok={result?.success} class:bad={result && !result.success}>
      {result ? result.total : '–'}
    </strong>
  </div>
  {#if result}
    <p role="status" class:ok={result.success} class:bad={!result.success}>
      {result.success
        ? `Úspěch (${SUCCESS_AT} a více).`
        : `Hrozí neúspěch. Můžete se vyčerpat: škrtnete Zdroje podle Ohrožení (nejméně 1) a Ohrožení se zvýší o 1, nebo neúspěch přijmete.`}
    </p>
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
