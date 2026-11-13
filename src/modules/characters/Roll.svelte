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
  import {
    clash,
    evaluateRoll,
    levelOf,
    rollDice,
    SUCCESS_AT,
    type Dice,
    type Side,
  } from '../../core/character/roll'
  import { professions } from '../../core/library.svelte'

  // Vyhodnocení akce: zkouška nebo výzva. Hod (2k6 + úroveň povolání), vyčerpání, následky, Ohrožení a Výhody.
  // Kostky lze hodit tady, nebo zadat z fyzických kostek.
  let {
    id,
    character,
    spent,
    bonus,
    advantage,
    onadvantage,
    pay,
    onscar,
  }: {
    id: string
    character: Character
    spent: Spent
    bonus: Bonus
    advantage: number
    onadvantage: (n: number) => void
    /** zaplatí Zdroje vlastnosti; vrací, zda na to postava měla */
    pay: (a: Attribute, n: number) => boolean
    onscar: (a: Attribute) => void
  } = $props()

  type Kind = 'zkouska' | 'vyzva' | 'stret'
  type Outcome = 'vycerpano' | 'prijato' | 'bezreakce' | undefined

  // komponenta se pro každou postavu vytváří znovu (`{#key}` u volající stránky)
  // svelte-ignore state_referenced_locally
  let threat = $state(loadThreat(id))
  let kind = $state<Kind>('zkouska')
  let dice = $state<Dice>([0, 0])
  let used = $state<string[]>([])
  let intent = $state('')
  let payAttr = $state<Attribute>('Tělo')
  let outcome = $state<Outcome>(undefined)
  let paid = $state(0)
  // střet: soupeř (úroveň a kostky), kdo byl aktér, výsledek losu při úplné shodě
  let oppLevel = $state(0)
  let oppDice = $state<Dice>([0, 0])
  let actor = $state<'me' | 'opp' | 'unclear'>('me')
  let losWin = $state<'me' | 'opp' | undefined>(undefined)

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
  const oppRolled = $derived(oppDice[0] > 0 && oppDice[1] > 0)
  const opp = $derived(oppRolled ? evaluateRoll(oppDice, oppLevel) : undefined)
  const clashRes = $derived(
    result && opp
      ? clash(
          { dice, total: result.total },
          { dice: oppDice, total: opp.total },
          actor === 'me' ? ('a' as Side) : actor === 'opp' ? ('b' as Side) : undefined,
        )
      : undefined,
  )
  /** vyhodnocení je rozhodnuto (u střetu i po losu) */
  const done = $derived(
    kind === 'stret' ? !!clashRes && (clashRes.winner !== 'los' || !!losWin) : !!result,
  )
  const won = $derived(
    kind === 'stret'
      ? clashRes?.winner === 'a' || (clashRes?.winner === 'los' && losWin === 'me')
      : !!result?.success,
  )
  const REASONS: Record<string, string> = {
    hod: 'vyšší hod',
    aktér: 'při shodě vítězí aktér',
    kostka: 'při shodě vyšší kostka',
    součet: 'při shodě vyšší součet kostek',
    los: 'úplná shoda, rozhodne los',
  }
  const maxes = $derived(effectiveAttributes(character))
  // vyčerpání stojí tolik Zdrojů, kolik je Ohrožení (nejméně 1), a Ohrožení se tím zvýší o 1
  const cost = $derived(Math.max(1, threat))
  const have = $derived(availableOf(spent, bonus, maxes, payAttr, advantage))

  const toggle = (pid: string) =>
    (used = used.includes(pid) ? used.filter((x) => x !== pid) : [...used, pid])
  const reset = () => {
    outcome = undefined
    losWin = undefined
  }
  function setDie(i: 0 | 1, v: number) {
    dice = i === 0 ? [v, dice[1]] : [dice[0], v]
    reset()
  }
  function roll() {
    dice = rollDice()
    reset()
  }
  function rollOpp() {
    oppDice = rollDice()
    reset()
  }
  function setKind(k: Kind) {
    kind = k
    reset()
  }
  function setThreat(n: number) {
    threat = Math.min(MAX_THREAT, Math.max(0, n))
    saveThreat(id, threat)
  }
  function exhaust() {
    if (!pay(payAttr, cost)) return
    paid = cost
    setThreat(Math.max(1, threat) + 1)
    outcome = 'vycerpano'
  }
  /** Konec konfliktu: Ohrožení zaniká a nespotřebovaná Výhoda propadá. */
  function endConflict() {
    setThreat(0)
    onadvantage(0)
    dice = [0, 0]
    reset()
  }
</script>

<section class="panel" aria-label="Hod">
  <div class="head">
    <strong>Hod</strong>
    <button class="primary" onclick={roll}>Hodit</button>
  </div>
  <div class="chips" role="group" aria-label="Druh vyhodnocení">
    <button class:primary={kind === 'zkouska'} onclick={() => setKind('zkouska')}>Zkouška</button>
    <button class:primary={kind === 'vyzva'} onclick={() => setKind('vyzva')}>Výzva</button>
    <button class:primary={kind === 'stret'} onclick={() => setKind('stret')}>Střet</button>
  </div>
  <p class="muted">
    {kind === 'zkouska'
      ? 'Proti prostředí nebo protivníkovi, který se nebrání.'
      : kind === 'vyzva'
        ? 'Akce prostředí, následná akce nebo nástraha. Postava reaguje protiakcí.'
        : 'Soupeř se akci brání protiakcí. Vyšší hod vítězí.'}
  </p>
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

  {#if kind === 'vyzva' && outcome === 'bezreakce'}
    <p role="status" class="bad">
      Bez reakce nastane následek hned a nelze ho zmírnit vyčerpáním. Popište ho a zapište podle
      pravidel.
    </p>
  {:else}
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
        class:ok={won || outcome === 'vycerpano'}
        class:bad={result && done && !won && outcome !== 'vycerpano'}
      >
        {result ? result.total : '–'}
      </strong>
    </div>
    {#if kind === 'stret'}
      <div class="opp">
        <strong>Soupeř</strong>
        <div class="dice">
          {#each [0, 1] as i}
            <select
              value={oppDice[i as 0 | 1]}
              onchange={(e) => {
                const v = Number(e.currentTarget.value)
                oppDice = i === 0 ? [v, oppDice[1]] : [oppDice[0], v]
                reset()
              }}
              aria-label={`Kostka soupeře ${i + 1}`}
            >
              <option value={0}>?</option>
              {#each [1, 2, 3, 4, 5, 6] as v}<option value={v}>{v}</option>{/each}
            </select>
            {#if i === 0}<span>+</span>{/if}
          {/each}
          <span>+ {oppLevel} =</span>
          <strong class="total">{opp ? opp.total : '–'}</strong>
        </div>
        <div class="threat">
          <span>Úroveň soupeře</span>
          <button
            onclick={() => ((oppLevel = Math.max(0, oppLevel - 1)), reset())}
            aria-label="Snížit úroveň soupeře">−</button
          >
          <strong class="count">{oppLevel}</strong>
          <button
            onclick={() => ((oppLevel = oppLevel + 1), reset())}
            aria-label="Zvýšit úroveň soupeře">+</button
          >
        </div>
        <p class="actions">
          <button onclick={rollOpp}>Hodit za soupeře</button>
        </p>
        <div class="chips" role="group" aria-label="Aktér">
          <button class:primary={actor === 'me'} onclick={() => ((actor = 'me'), reset())}
            >Aktér jsem já</button
          >
          <button class:primary={actor === 'opp'} onclick={() => ((actor = 'opp'), reset())}
            >Aktér je soupeř</button
          >
          <button class:primary={actor === 'unclear'} onclick={() => ((actor = 'unclear'), reset())}
            >Nejasné</button
          >
        </div>
      </div>
    {/if}
    {#if kind === 'vyzva' && !rolled}
      <p class="actions">
        <button onclick={() => (outcome = 'bezreakce')}>Nereaguji</button>
      </p>
    {/if}
  {/if}

  {#if kind === 'stret' && clashRes?.winner === 'los' && !losWin && outcome !== 'bezreakce'}
    <p role="status">Úplná shoda. Rozhodněte losem:</p>
    <p class="actions">
      <button onclick={() => (losWin = 'me')}>Los vyhrál/a jsem</button>
      <button onclick={() => (losWin = 'opp')}>Los vyhrál soupeř</button>
    </p>
  {/if}
  {#if done && outcome !== 'bezreakce'}
    {#if kind === 'stret' && clashRes}
      <p class="muted">{REASONS[clashRes.reason]}.</p>
    {/if}
    {#if won}
      <p role="status" class="ok">
        {kind === 'stret' ? 'Vyhráli jste střet.' : `Úspěch (${SUCCESS_AT} a více).`}
      </p>
      {#if kind === 'zkouska' || kind === 'stret'}
        <p class="muted">Následky úspěchu, které jste ohlásili:</p>
        <p class="actions">
          <button onclick={() => setThreat(threat - 1)} disabled={threat === 0}>Ohrožení −1</button>
          <button onclick={() => onadvantage(advantage + 1)}>Výhoda +1</button>
        </p>
      {:else}
        <p class="muted">
          Bezprostřední nebezpečí pominulo. Úspěch ve výzvě nesnižuje Ohrožení ani nedává Výhodu.
        </p>
      {/if}
    {:else if outcome === 'vycerpano'}
      <p role="status" class="ok">
        {kind === 'zkouska'
          ? `Úspěch vyčerpáním: škrtli jste ${paid} ${payAttr}, Ohrožení je ${threat}. Popište úsilí či újmu a nové potíže.`
          : kind === 'stret'
            ? `Vyčerpali jste se (${paid} ${payAttr}, Ohrožení je ${threat}): soupeřův úspěch je jen částečný. Popište vlastní komplikaci, kterou jste si přinesli.`
            : `Neúspěch zmírněn: škrtli jste ${paid} ${payAttr}, Ohrožení je ${threat}. Místo vážných následků popište jen komplikaci.`}
      </p>
    {:else if outcome === 'prijato'}
      <p role="status" class="bad">
        Neúspěch přijat, Zdroje zůstaly. Popište následek a zapište ho:
      </p>
      <p class="actions">
        <button onclick={() => setThreat(threat + 1)} disabled={threat >= MAX_THREAT}
          >Ohrožení +1</button
        >
        <button onclick={() => onscar(payAttr)}>Jizva…</button>
      </p>
    {:else}
      <p role="status" class="bad">
        {kind === 'stret'
          ? 'Soupeř zvítězil. Vyčerpáním změníte jeho plný úspěch v částečný, nebo následek přijmete.'
          : 'Hrozí neúspěch. Vyčerpáním ho zmírníte, nebo ho přijmete.'}
      </p>
      <div class="chips" role="group" aria-label="Zdroje k vyčerpání">
        {#each ATTRIBUTES as a}
          <button class:primary={payAttr === a} onclick={() => (payAttr = a)}>{a}</button>
        {/each}
      </div>
      <p class="muted">
        Vyčerpání stojí {cost}
        {payAttr} (Ohrožení, nejméně 1), máte {have}{advantage
          ? ` (včetně Výhody ${advantage})`
          : ''}. Ohrožení se zvýší o 1.
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
  <div class="threat">
    <span>Výhoda</span>
    <button
      onclick={() => onadvantage(advantage - 1)}
      disabled={advantage === 0}
      aria-label="Ubrat Výhodu">−</button
    >
    <strong class="count">{advantage}</strong>
    <button onclick={() => onadvantage(advantage + 1)} aria-label="Přidat Výhodu">+</button>
  </div>
  {#if threat > 0 || advantage > 0}
    <p class="muted">
      Po skončení konfliktu Ohrožení zaniká a Výhoda propadá.
      <button onclick={endConflict}>Konec konfliktu</button>
    </p>
  {/if}
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
  .chips,
  .actions {
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
  .opp {
    border-top: 1px solid var(--drd-muted);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
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
