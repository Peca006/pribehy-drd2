<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { ATTRIBUTES, type Character } from '../../core/character/model'
  import type { Attribute } from '../../core/content/schema'
  import {
    availableOf,
    effectiveAttributes,
    clampThreat,
    DEFAULT_THREAT,
    loadThreat,
    MAX_ADVANTAGE,
    MAX_THREAT,
    MIN_THREAT,
    saveThreat,
    type Bonus,
    type Spent,
  } from '../../core/character/play'
  import { evaluateAction, type Actor, type Kind } from '../../core/character/action'
  import {
    describeRoll,
    levelOf,
    rollDice,
    rollDie,
    type Mode,
    SUCCESS_AT,
    type Dice,
  } from '../../core/character/roll'
  import { MANEUVERS, maneuver, type ManeuverId } from '../../core/character/maneuvers'
  import {
    initiativeAction,
    newActionManeuver,
    payManeuver as payManeuverStep,
    pickManeuver,
    toggleInaccurate,
    type ManeuverState,
  } from '../../core/character/maneuverFlow'
  import { professions } from '../../core/library.svelte'
  import Guide from './Guide.svelte'
  import { rollRequest } from './rollRequest.svelte'

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
  // manévr: nejvýš jeden v akci; platí se 1 Zdrojem až při použití
  let man = $state<ManeuverId | undefined>(undefined)
  let manPaid = $state(false)
  let manMsg = $state('')
  let extra = $state(0)
  let inaccurate = $state(false)
  // střet: soupeř (úroveň a kostky), kdo byl aktér, výsledek losu při úplné shodě
  let oppLevel = $state(0)
  let oppDice = $state<Dice>([0, 0])
  let actor = $state<Actor>('me')
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
  // pravidla vyhodnocení jsou v `core/character/action.ts` (čistá funkce s testy)
  const evaluated = $derived(
    evaluateAction({ kind, dice, extra, man, inaccurate, level, oppDice, oppLevel, actor, losWin }),
  )
  const mode: Mode = $derived(evaluated.mode)
  const three = $derived(evaluated.three)
  const rolled = $derived(evaluated.rolled)
  const result = $derived(evaluated.result)
  const opp = $derived(evaluated.opp)
  const clashRes = $derived(evaluated.clashRes)
  /** vyhodnocení je rozhodnuto (u střetu i po losu) */
  const done = $derived(evaluated.done)
  const won = $derived(evaluated.won)
  const REASONS: Record<string, string> = {
    hod: 'vyšší hod',
    aktér: 'při shodě vítězí aktér',
    kostka: 'při shodě vyšší kostka',
    součet: 'při shodě vyšší součet kostek',
    los: 'úplná shoda, rozhodne los',
  }
  const maxes = $derived(effectiveAttributes(character))
  // vyčerpání stojí tolik Zdrojů, kolik je Ohrožení (podle trackeru), a Ohrožení se tím zvýší o 1
  const cost = $derived(threat)
  const have = $derived(availableOf(spent, bonus, maxes, payAttr, advantage))

  const toggle = (pid: string) =>
    (used = used.includes(pid) ? used.filter((x) => x !== pid) : [...used, pid])
  const reset = () => {
    outcome = undefined
    losWin = undefined
  }
  // přechody manévru a plateb jsou v `core/character/maneuverFlow.ts` (čisté funkce s testy); tady jen přenos do stavu
  const maneuverState = (): ManeuverState => ({ man, manPaid, manMsg, extra, inaccurate })
  function setManeuverState(s: ManeuverState) {
    man = s.man
    manPaid = s.manPaid
    manMsg = s.manMsg
    extra = s.extra
    inaccurate = s.inaccurate
  }
  /** Nová akce: manévr se znovu neplatí a nic z předchozí akce nezůstává. */
  function newAction() {
    reset()
    setManeuverState(newActionManeuver(maneuverState()))
  }
  function payManeuver(): boolean {
    const r = payManeuverStep(maneuverState(), payAttr, pay)
    setManeuverState(r.state)
    return r.ok
  }
  const pickMan = (id: ManeuverId) => setManeuverState(pickManeuver(maneuverState(), id))
  function toggleInaccurateNow() {
    setManeuverState(toggleInaccurate(maneuverState()))
    reset()
  }
  function setDie(i: 0 | 1, v: number) {
    dice = i === 0 ? [v, dice[1]] : [dice[0], v]
    reset()
  }
  // po hodu je tlačítko na chvíli zablokované, aby si hráč omylem nehodil hned znovu
  const LOCK_MS = 2000
  let locked = $state(false)
  let lockTimer: ReturnType<typeof setTimeout> | undefined
  onDestroy(() => clearTimeout(lockTimer))
  // ruční zadání z fyzických kostek: kostky se ukážou i před hodem
  let manual = $state(false)
  const showDice = $derived(manual || dice[0] > 0 || dice[1] > 0 || extra > 0)
  function roll() {
    if (locked) return
    newAction()
    const m = maneuver(man)
    if (m?.when === 'pred' && !payManeuver()) return
    dice = rollDice()
    if (three) extra = rollDie()
    locked = true
    lockTimer = setTimeout(() => (locked = false), LOCK_MS)
  }
  function rollOpp() {
    oppDice = rollDice()
    reset()
  }
  // iniciativa: hod bez dovednosti; přístup rychle/pomalu stojí 1 Duši (platí se hned při hodu)
  let initMode = $state<Mode>('normal')
  let initText = $state('')
  let initFlash = $state('')
  function rollInit() {
    const r = initiativeAction(initMode, pay)
    initFlash = r.flash
    if (!r.ok) return
    if (r.flash) setTimeout(() => (initFlash = ''), 2500)
    initText = r.text
  }
  function setKind(k: Kind) {
    kind = k
    reset()
  }
  function setThreat(n: number) {
    threat = clampThreat(n)
    saveThreat(id, threat)
  }
  function exhaust() {
    if (!pay(payAttr, cost)) return
    paid = cost
    setThreat(threat + 1)
    outcome = 'vycerpano'
  }
  // žádost z výroby nebo nástrah: záměr a druh se předvyplní, Ohrožení zůstává podle trackeru
  let seenRequest = rollRequest.n
  $effect(() => {
    const n = rollRequest.n
    if (n === seenRequest) return
    seenRequest = n
    untrack(() => {
      setKind(rollRequest.kind)
      newAction()
      intent = rollRequest.intent
    })
  })
  /** Konec konfliktu: Ohrožení se vrací na výchozí a nespotřebovaná Výhoda propadá. */
  function endConflict() {
    setThreat(DEFAULT_THREAT)
    onadvantage(0)
    manual = false
    dice = [0, 0]
    reset()
  }
</script>

<section class="panel" id="roll-panel" aria-label="Hod">
  <div class="head">
    <strong>Hod</strong>
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
  <div class="chips" role="group" aria-label="Vlastnost dovednosti (Zdroje)">
    {#each ATTRIBUTES as a}
      <button class:primary={payAttr === a} onclick={() => (payAttr = a)}>{a}</button>
    {/each}
  </div>
  <p class="muted">
    Vlastnost, pod kterou spadá použitá dovednost: z ní se platí vyčerpání i manévry.
  </p>
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

  <div class="chips" role="group" aria-label="Manévr">
    {#each MANEUVERS as m}
      <button
        class:primary={man === m.id}
        onclick={() => pickMan(m.id)}
        disabled={(manPaid && man !== m.id) || (m.id === 'presne' && inaccurate)}
      >
        {m.name}
      </button>
    {/each}
  </div>
  <p class="chips">
    <button
      class:primary={inaccurate}
      disabled={manPaid && man === 'presne'}
      onclick={toggleInaccurateNow}>Nepřesně (postih)</button
    >
  </p>
  {#if inaccurate}
    <p class="muted">Postih: 3 kostky, počítají se dvě nejnižší. Manévr přesně nelze.</p>
  {/if}
  {#if man}
    <p class="muted">
      {maneuver(man)?.hint}. Platí se 1 {payAttr}
      {maneuver(man)?.when === 'pred' ? 'při hodu' : 'po hodu, až když vyhrajete'}; v akci jen
      jeden.
      {#if !manPaid && maneuver(man)?.when === 'pred'}
        <button onclick={payManeuver}>Zaplatit teď</button>
      {/if}
    </p>
  {/if}
  {#if manMsg}<p role="status" class="muted">{manMsg}</p>{/if}

  {#if kind === 'vyzva' && outcome === 'bezreakce'}
    <p role="status" class="bad">
      Bez reakce nastane následek hned a nelze ho zmírnit vyčerpáním. Popište ho a zapište podle
      pravidel.
    </p>
  {:else}
    <div class="rollrow">
      <button class="primary roll" onclick={roll} disabled={locked}>Hodit</button>
      {#if !showDice}<button onclick={() => (manual = true)}>Zadat z kostek</button>{/if}
    </div>
    <div class="dice">
      {#if showDice}
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
        {#if three}
          <span>+</span>
          <select
            value={extra}
            onchange={(e) => {
              extra = Number(e.currentTarget.value)
              reset()
            }}
            aria-label="Třetí kostka"
          >
            <option value={0}>?</option>
            {#each [1, 2, 3, 4, 5, 6] as v}<option value={v}>{v}</option>{/each}
          </select>
        {/if}
      {/if}
      <span>{showDice ? '+' : ''} {level} =</span>
      <strong
        class="total"
        class:ok={won || outcome === 'vycerpano'}
        class:bad={result && done && !won && outcome !== 'vycerpano'}
      >
        {result ? result.total : '–'}
      </strong>
    </div>
    {#if three && rolled}
      <p class="muted">Hozeno {describeRoll([...dice, extra], mode)}</p>
    {/if}
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
        {#if man === 'mocne' || man === 'lstive'}
          <p class="actions">
            <button class="primary" onclick={payManeuver} disabled={manPaid}>
              {manPaid
                ? `${maneuver(man)?.name} použito`
                : `Použít ${maneuver(man)?.name?.toLowerCase()} (−1 ${payAttr})`}
            </button>
          </p>
          {#if man === 'mocne' && manPaid}
            <p class="muted">Poražený musí vyčerpat o 1 Zdroj víc, než by jinak platil.</p>
          {/if}
        {/if}
        {@const step = man === 'lstive' && manPaid ? 2 : 1}
        <p class="muted">Následky úspěchu, které jste ohlásili:</p>
        <p class="actions">
          <button onclick={() => setThreat(threat - step)} disabled={threat <= MIN_THREAT}
            >Ohrožení −{step}</button
          >
          <button onclick={() => onadvantage(advantage + step)}>Výhoda +{step}</button>
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

  <details class="situations">
    <summary>Iniciativa</summary>
    <div class="chips" role="group" aria-label="Přístup k iniciativě">
      {#each [['normal', 'Normálně'], ['best', 'Rychle'], ['worst', 'Pomalu']] as [m, label]}
        <button class:primary={initMode === m} onclick={() => (initMode = m as Mode)}
          >{label}</button
        >
      {/each}
      <button onclick={rollInit}>Hodit</button>
    </div>
    {#if initMode !== 'normal'}<small class="muted">1 Duše</small>{/if}
    {#if initFlash}<small role="status" class="bad">{initFlash}</small>{/if}
    {#if initText}<p role="status"><strong>{initText}</strong></p>{/if}
    <p class="muted">Hod bez dovednosti. Hlásí se od nejvyšší iniciativy.</p>
  </details>

  <Guide />

  <div class="threat">
    <span>Ohrožení</span>
    <button
      onclick={() => setThreat(threat - 1)}
      disabled={threat <= MIN_THREAT}
      aria-label="Snížit Ohrožení">−</button
    >
    <input
      class="num"
      type="number"
      inputmode="numeric"
      min={MIN_THREAT}
      max={MAX_THREAT}
      value={threat}
      onchange={(e) => {
        setThreat(e.currentTarget.valueAsNumber)
        e.currentTarget.value = String(threat)
      }}
      aria-label="Ohrožení"
    />
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
    <input
      class="num"
      type="number"
      inputmode="numeric"
      min="0"
      max={MAX_ADVANTAGE}
      value={advantage}
      onchange={(e) => {
        const n = e.currentTarget.valueAsNumber
        onadvantage(Math.min(MAX_ADVANTAGE, Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0)))
        e.currentTarget.value = String(advantage)
      }}
      aria-label="Výhoda"
    />
    <button
      onclick={() => onadvantage(advantage + 1)}
      disabled={advantage >= MAX_ADVANTAGE}
      aria-label="Přidat Výhodu">+</button
    >
  </div>
  {#if threat !== DEFAULT_THREAT || advantage > 0}
    <p class="muted">
      Po skončení konfliktu vraťte Ohrožení na {DEFAULT_THREAT}, Výhoda propadá.
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
  .rollrow {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .roll {
    min-width: 7rem;
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
  .situations {
    margin-top: 0.75rem;
  }
  .threat span:first-child {
    flex: 1;
  }
  .count {
    min-width: 2rem;
    text-align: center;
  }
  .num {
    width: 3.2rem;
    text-align: center;
    padding: 0.3rem 0.2rem;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .num::-webkit-inner-spin-button,
  .num::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
