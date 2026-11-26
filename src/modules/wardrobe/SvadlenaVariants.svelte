<script lang="ts">
  import { EDITABLE_TOKENS, TOKEN_GROUPS, tokenValue, type TokenField } from '../../core/skin/editor'
  import { defaultRole, patchedRole } from '../../core/skin/editor-assets'
  import {
    addVariant,
    coverage,
    moveVariant,
    removeVariant,
    setVariantRole,
    setVariantToken,
    setVariantWhen,
    viewportsOf,
    whenLabel,
  } from '../../core/skin/editor-variants'
  import type { Role, RoleName } from '../../core/skin/roles'
  import { MAX_VARIANTS, type Orientation, type Skin, type VariantWhen, type WidthClass } from '../../core/skin/skin'
  import type { TokenName } from '../../core/skin/tokens'
  import RoleControls from './RoleControls.svelte'
  import TokenControl from './TokenControl.svelte'

  // Švadlena, etapa 3: varianty podle velikosti okna. Varianta přepíše tokeny a role pro okna, která splňují její
  // podmínku (šířka, orientace, nízké okno). Uplatňují se v pořadí: pozdější přepíše dřívější.
  let { skin, onchange }: { skin: Skin; onchange: (skin: Skin) => void } = $props()

  const FIELDS = new Map<TokenName, TokenField>(TOKEN_GROUPS.flatMap((g) => g.fields.map((f) => [f.name, f] as const)))
  const ROLE_TITLES: Record<RoleName, string> = {
    background: 'Pozadí stránky',
    panel: 'Panely',
    button: 'Tlačítka',
    tab: 'Lišta záložek',
    divider: 'Dělicí čára',
    dialog: 'Okna',
    header: 'Záhlaví',
  }
  const roleNames = Object.keys(ROLE_TITLES) as RoleName[]
  const PRESETS: { label: string; when: VariantWhen }[] = [
    { label: 'Nízké okno (telefon na šířku)', when: { low: true } },
    { label: 'Úzké okno (telefon na výšku)', when: { width: 'compact', orientation: 'portrait' } },
    { label: 'Střední okno', when: { width: 'medium' } },
    { label: 'Široké okno', when: { width: 'expanded' } },
    { label: 'Okno na šířku', when: { orientation: 'landscape' } },
    { label: 'Okno na výšku', when: { orientation: 'portrait' } },
  ]

  let preset = $state('0')
  let errors = $state<Record<string, string>>({})
  const assetNames = $derived(Object.keys(skin.assets))
  const rows = $derived(coverage(skin))

  const fail = (key: string, error: string | null) => {
    const { [key]: _drop, ...rest } = errors
    errors = error ? { ...rest, [key]: error } : rest
    return !error
  }
  /** Použije výsledek změny: při chybě ji ukáže u prvku a Háv nechá, jinak ho předá dál. */
  const apply = (key: string, r: { skin: Skin; error: string | null }) => {
    if (fail(key, r.error) && r.skin !== skin) onchange(r.skin)
  }

  function add() {
    apply('add', addVariant(skin, PRESETS[Number(preset)]!.when))
  }

  function changeWhen(i: number, patch: Partial<VariantWhen>) {
    const when: VariantWhen = { ...skin.variants[i]!.when, ...patch }
    for (const k of Object.keys(when) as (keyof VariantWhen)[]) if (when[k] === undefined) delete when[k]
    apply(`v${i}-when`, setVariantWhen(skin, i, when))
  }

  const overridable = (i: number) => EDITABLE_TOKENS.filter((n) => !(n in skin.variants[i]!.tokens))

  function addToken(i: number, name: string) {
    if (!name) return
    const n = name as TokenName
    apply(`v${i}-t`, setVariantToken(skin, i, n, tokenValue(skin, n)))
  }

  /** Stav role ve variantě: `''` = platí základní, `'off'` = vypnutá, jinak název obrázku. */
  function roleState(i: number, name: RoleName): string {
    const r = skin.variants[i]!.roles?.[name]
    return r === undefined ? '' : r === null ? 'off' : r.image
  }

  function pickRole(i: number, name: RoleName, value: string) {
    const cur = skin.variants[i]!.roles?.[name]
    if (value === '') return apply(`v${i}-r${name}`, setVariantRole(skin, i, name, undefined))
    if (value === 'off') return apply(`v${i}-r${name}`, setVariantRole(skin, i, name, null))
    const role = cur ? { ...cur, image: value } : (skin.roles[name] ? { ...skin.roles[name]!, image: value } : defaultRole(name, value))
    apply(`v${i}-r${name}`, setVariantRole(skin, i, name, role))
  }

  function patchRole(i: number, name: RoleName, patch: Partial<Role>) {
    const cur = skin.variants[i]!.roles?.[name]
    if (cur) apply(`v${i}-r${name}`, setVariantRole(skin, i, name, patchedRole(cur, patch)))
  }

  const widths: [WidthClass | '', string][] = [['', 'jakákoli'], ['compact', 'úzká (do 600 px)'], ['medium', 'střední (600 až 1000 px)'], ['expanded', 'široká (nad 1000 px)']]
  const orientations: [Orientation | '', string][] = [['', 'jakákoli'], ['portrait', 'na výšku'], ['landscape', 'na šířku']]
</script>

<section class="panel">
  <h3>Varianty podle velikosti okna</h3>
  <p class="muted">
    Varianta mění tokeny a role jen pro okna, která splňují její podmínku (telefon na výšku, široké okno, nízké okno
    apod.). Uplatňují se v pořadí, pozdější přepíše dřívější. Okno má 12 kombinací: šířka (úzká, střední, široká) × orientace ×
    nízké okno (výška pod 480 px).
  </p>

  {#each skin.variants as v, i (i)}
    <div class="var">
      <div class="head">
        <strong>Varianta {i + 1}: {whenLabel(v.when)}</strong>
        <span class="muted">{viewportsOf(v.when).length} z 12 oken</span>
        <span class="actions">
          <button type="button" aria-label="Varianta {i + 1} dřív" disabled={i === 0} onclick={() => onchange(moveVariant(skin, i, -1))}>↑</button>
          <button type="button" aria-label="Varianta {i + 1} později" disabled={i === skin.variants.length - 1} onclick={() => onchange(moveVariant(skin, i, 1))}>↓</button>
          <button type="button" aria-label="Odebrat variantu {i + 1}" onclick={() => onchange(removeVariant(skin, i))}>Odebrat</button>
        </span>
      </div>

      <div class="grid">
        <label>
          <span class="muted">Šířka okna</span>
          <select aria-label="Varianta {i + 1}: šířka" value={v.when.width ?? ''} onchange={(e) => changeWhen(i, { width: (e.currentTarget.value || undefined) as WidthClass | undefined })}>
            {#each widths as [val, label] (val)}<option value={val}>{label}</option>{/each}
          </select>
        </label>
        <label>
          <span class="muted">Orientace</span>
          <select aria-label="Varianta {i + 1}: orientace" value={v.when.orientation ?? ''} onchange={(e) => changeWhen(i, { orientation: (e.currentTarget.value || undefined) as Orientation | undefined })}>
            {#each orientations as [val, label] (val)}<option value={val}>{label}</option>{/each}
          </select>
        </label>
        <label>
          <span class="muted">Nízké okno (výška pod 480 px)</span>
          <select
            aria-label="Varianta {i + 1}: nízké okno"
            value={v.when.low === undefined ? '' : v.when.low ? 'ano' : 'ne'}
            onchange={(e) => changeWhen(i, { low: e.currentTarget.value === '' ? undefined : e.currentTarget.value === 'ano' })}
          >
            <option value="">jakékoli</option>
            <option value="ano">ano</option>
            <option value="ne">ne</option>
          </select>
        </label>
      </div>
      {#if errors[`v${i}-when`]}<p class="error" role="alert">{errors[`v${i}-when`]}</p>{/if}

      <h4>Přepsané tokeny</h4>
      {#each Object.keys(v.tokens) as key (key)}
        {@const f = FIELDS.get(key as TokenName)}
        {#if f}
          <TokenControl
            field={f}
            value={v.tokens[f.name] ?? ''}
            overridden={true}
            idPrefix="v{i}-"
            error={errors[`v${i}-t${f.name}`] ?? ''}
            onset={(raw) => apply(`v${i}-t${f.name}`, setVariantToken(skin, i, f.name, raw))}
          />
        {/if}
      {/each}
      <label class="add">
        <span class="muted">Přepsat další token:</span>
        <select aria-label="Varianta {i + 1}: přepsat token" value="" onchange={(e) => { addToken(i, e.currentTarget.value); e.currentTarget.value = '' }}>
          <option value="">Vyberte…</option>
          {#each overridable(i) as n (n)}<option value={n}>{FIELDS.get(n)?.label ?? n}</option>{/each}
        </select>
      </label>
      {#if errors[`v${i}-t`]}<p class="error" role="alert">{errors[`v${i}-t`]}</p>{/if}

      <h4>Role v této variantě</h4>
      {#each roleNames as name (name)}
        {@const state = roleState(i, name)}
        {@const role = v.roles?.[name]}
        <div class="role">
          <div class="control">
            <label for="v{i}-role-{name}">{ROLE_TITLES[name]}</label>
            <select id="v{i}-role-{name}" value={state} onchange={(e) => pickRole(i, name, e.currentTarget.value)}>
              <option value="">Jako základní</option>
              <option value="off">Vypnout</option>
              {#each assetNames as n (n)}<option value={n}>{n}</option>{/each}
            </select>
          </div>
          {#if role}<RoleControls {name} {role} onpatch={(patch) => patchRole(i, name, patch)} />{/if}
          {#if errors[`v${i}-r${name}`]}<p class="error" role="alert">{errors[`v${i}-r${name}`]}</p>{/if}
        </div>
      {/each}
    </div>
  {/each}

  <div class="control">
    <label for="var-preset" class="muted">Nová varianta pro:</label>
    <select id="var-preset" bind:value={preset}>
      {#each PRESETS as p, i (i)}<option value={String(i)}>{p.label}</option>{/each}
    </select>
    <button type="button" disabled={skin.variants.length >= MAX_VARIANTS} onclick={add}>Přidat variantu</button>
  </div>
  {#if errors.add}<p class="error" role="alert">{errors.add}</p>{/if}

  <details>
    <summary>Které varianty platí pro které okno</summary>
    <ul class="cover">
      {#each rows as r (r.label)}
        <li><span>{r.label}</span> <span class="muted">{r.variants.length ? `varianty ${r.variants.join(', ')}` : 'jen základ'}</span></li>
      {/each}
    </ul>
  </details>
</section>

<style>
  section {
    display: grid;
    gap: 0.5rem;
  }
  h3,
  h4 {
    margin: 0;
  }
  .var {
    display: grid;
    gap: 0.5rem;
    padding: 0.6rem;
    border: 1px solid color-mix(in srgb, var(--drd-border) 60%, transparent);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
    align-items: center;
  }
  .actions {
    display: flex;
    gap: 0.3rem;
    margin-left: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.5rem;
  }
  .grid label,
  .add {
    display: grid;
    gap: 0.2rem;
  }
  .role {
    display: grid;
    gap: 0.3rem;
  }
  .control {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .control select {
    width: auto;
    max-width: 100%;
  }
  .cover {
    list-style: none;
    padding: 0;
    margin: 0.3rem 0 0;
    display: grid;
    gap: 0.2rem;
  }
  .cover li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
</style>
