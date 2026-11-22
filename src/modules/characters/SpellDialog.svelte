<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { untrack } from 'svelte'
  import { foldName } from '../../core/recipes/find'
  import { MAX_NAME, type Recipe } from '../../core/recipes/model'
  import {
    SPELL_DURATION,
    SPELL_RANGE,
    SPELL_REACH,
    emptySpell,
    spellCost,
    spellFrom,
    type SpellParams,
  } from '../../core/recipes/spells'

  // Kouzlo: zadání parametrů, cena podle pravidel a kontrolní seznam rituálu. Bez uložení jde o ad hoc seslání
  // (název ani popis netřeba, aplikace jen vyřeší mechaniku a hod). Uložení do Grimoáru chce název.
  let {
    recipe,
    oncast,
    onsave,
    onclose,
    allowed = [],
    canCast = true,
  }: {
    /** v Grimoáru bez postavy se nesesílá */
    canCast?: boolean
    /** obory magie, které postava ovládá (z jejích povolání) */
    allowed?: string[]
    /** existující předpis z Grimoáru (úprava se projeví u všech postav, které ho mají) */
    recipe?: Recipe
    oncast: (name: string, spell: SpellParams) => void
    onsave: (input: { name: string; description: string; spell: SpellParams }, variant: boolean) => Promise<string | undefined>
    onclose: () => void
  } = $props()

  const init = untrack(() => recipe)
  let name = $state(init?.name ?? '')
  let description = $state(init?.description ?? '')
  let spell = $state<SpellParams>(init ? spellFrom(init.params) : emptySpell())
  // obor: výběr z oborů postavy; mimo ně jen záměrnou volbou „Vlastní obor“ (alternativní sada povolání)
  const CUSTOM = '__custom'
  let choice = $state(
    untrack(() => (!spell.obor.trim() ? '' : (allowed.find((a) => foldName(a) === foldName(spell.obor)) ?? CUSTOM))),
  )
  function pick(v: string) {
    choice = v
    if (v !== CUSTOM) spell.obor = v
  }
  let error = $state('')
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  const cost = $derived(spellCost(spell))

  async function save(variant: boolean) {
    error = ''
    if (!name.trim()) return void (error = 'Pro uložení do Grimoáru zadejte název kouzla.')
    error = (await onsave({ name, description, spell }, variant)) ?? ''
  }
</script>

<dialog bind:this={dialog} {onclose} aria-label="Kouzlo">
  <HelpHeading flush title={recipe ? 'Upravit kouzlo' : 'Kouzlo'} topic="kouzla" />
  {#if !recipe}<p class="muted">Bez uložení se kouzlo jen vyhodnotí, název ani popis není potřeba.</p>{/if}
  <input type="text" bind:value={name} maxlength={MAX_NAME} placeholder="Název (jen pro uložení)" aria-label="Název kouzla" />
  <div class="row">
    <label for="sp-field">Obor magie</label>
    <select id="sp-field" value={choice} onchange={(e) => pick(e.currentTarget.value)}>
      <option value="">Neurčeno</option>
      {#each allowed as a}<option value={a}>{a}</option>{/each}
      <option value={CUSTOM}>Vlastní obor…</option>
    </select>
  </div>
  {#if choice === CUSTOM}
    <input type="text" bind:value={spell.obor} maxlength="60" placeholder="Vlastní obor" aria-label="Vlastní obor" />
    <p class="muted">Obor mimo schopnosti postavy (např. alternativní sada povolání).</p>
  {/if}

  <fieldset>
    <legend>Rituál</legend>
    <label><input type="checkbox" bind:checked={spell.zvuky} /> Zvuky a slova</label>
    <label><input type="checkbox" bind:checked={spell.gesta} /> Gesta</label>
    <label><input type="checkbox" bind:checked={spell.substance} /> Příprava substance</label>
    <input type="text" bind:value={spell.ritual} maxlength="300" placeholder="Jak rituál vypadá (nepovinné)" aria-label="Popis rituálu" />
  </fieldset>

  <div class="row">
    <label for="sp-reach">Dosah</label>
    <select id="sp-reach" bind:value={spell.dosah}>
      {#each SPELL_REACH as r}<option value={r.id}>{r.label}</option>{/each}
    </select>
  </div>
  <div class="row">
    <label for="sp-range">Rozsah</label>
    <select id="sp-range" bind:value={spell.rozsah}>
      {#each SPELL_RANGE as r}<option value={r.id}>{r.label}</option>{/each}
    </select>
  </div>
  <div class="row">
    <label for="sp-dur">Trvání</label>
    <select id="sp-dur" bind:value={spell.trvani}>
      {#each SPELL_DURATION as r}<option value={r.id}>{r.label}</option>{/each}
    </select>
  </div>

  <fieldset>
    <legend>Cena</legend>
    <label><input type="checkbox" bind:checked={spell.narocne} /> Náročné kouzlo (1 Zdroj)</label>
    <div class="row">
      <span>Aktivace schopností (Zdroje)</span>
      <button onclick={() => (spell.aktivace = Math.max(0, spell.aktivace - 1))} disabled={spell.aktivace <= 0} aria-label="Méně aktivací">−</button>
      <strong>{spell.aktivace}</strong>
      <button onclick={() => (spell.aktivace = Math.min(99, spell.aktivace + 1))} aria-label="Více aktivací">+</button>
    </div>
    <div class="row">
      <span>Substance (Suroviny)</span>
      <button onclick={() => (spell.suroviny = Math.max(0, spell.suroviny - 1))} disabled={spell.suroviny <= 0} aria-label="Méně Surovin">−</button>
      <strong>{spell.suroviny}</strong>
      <button onclick={() => (spell.suroviny = Math.min(99, spell.suroviny + 1))} aria-label="Více Surovin">+</button>
    </div>
    <p>
      <strong>{cost.zdroje} Zdroje, {cost.suroviny} Surovin</strong>
      <span class="muted">({cost.lines.join(', ')})</span>
    </p>
    <p class="muted">Zmaří-li se kouzlo, vložené Zdroje propadnou. Obranu (přerušení rituálu, únik, zrušení, protikouzlo) hrají soupeři.</p>
  </fieldset>

  <textarea bind:value={description} rows="3" placeholder="Popis (doporučený při uložení)" aria-label="Popis kouzla"></textarea>

  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <p class="actions">
    {#if canCast}<button class="primary" onclick={() => oncast(name, spell)}>Seslat</button>{/if}
    {#if recipe}
      <button onclick={() => save(false)}>Uložit změny</button>
      <button onclick={() => save(true)}>Uložit jako novou variantu</button>
    {:else}
      <button onclick={() => save(false)}>Uložit do Grimoáru</button>
    {/if}
    <button onclick={() => dialog.close()}>Zavřít</button>
  </p>
</dialog>

<style>
  dialog {
    background: var(--drd-surface);
    color: var(--drd-text);
    border: 1px solid var(--drd-accent);
    border-radius: var(--drd-radius);
    width: min(30rem, 94vw);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  fieldset {
    margin: 0.5rem 0;
    border: 1px solid var(--drd-muted);
    border-radius: var(--drd-radius);
  }
  fieldset label {
    display: block;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.3rem 0;
  }
  .row span,
  .row label {
    flex: 1;
  }
  .row strong {
    min-width: 2ch;
    text-align: center;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
