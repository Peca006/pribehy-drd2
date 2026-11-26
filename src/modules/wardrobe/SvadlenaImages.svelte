<script lang="ts">
  import { ask } from '../../core/confirm.svelte'
  import { allModules } from '../../core/modules'
  import {
    addAsset,
    assetStats,
    defaultRole,
    removeAsset,
    setIcon,
    setOrnaments,
    setRole,
    usesOf,
  } from '../../core/skin/editor-assets'
  import type { AssetFile } from '../../core/skin/file'
  import {
    MAX_HEADER_HEIGHT,
    MIN_HEADER_HEIGHT,
    ROLE_EDGES,
    ROLE_MODES,
    ROLE_POSITIONS,
    type Role,
    type RoleName,
  } from '../../core/skin/roles'
  import { MAX_ORNAMENTS, MAX_ORNAMENT_WIDTH, MIN_ORNAMENT_WIDTH, ORNAMENT_ANCHORS, type Ornament } from '../../core/skin/ornaments'
  import { MAX_ASSETS, type Skin } from '../../core/skin/skin'

  // Švadlena, etapa 2: obrázky Hávu a místa, kde se používají (role, ikony záložek, ozdoby). Ověřování dělá jádro
  // (`core/skin/editor-assets.ts`), tady je jen rozhraní.
  let {
    skin,
    assets,
    onchange,
  }: { skin: Skin; assets: readonly AssetFile[]; onchange: (skin: Skin, assets: readonly AssetFile[]) => void } = $props()

  const ROLE_LABELS: Record<RoleName, { title: string; hint: string }> = {
    background: { title: 'Pozadí stránky', hint: 'obrázek na celé stránce (např. textura, mramor)' },
    panel: { title: 'Panely', hint: 'rámeček a výplň karet a bloků' },
    button: { title: 'Tlačítka', hint: 'rámeček a výplň tlačítek' },
    tab: { title: 'Lišta záložek', hint: 'pozadí hlavní lišty' },
    divider: { title: 'Dělicí čára', hint: 'čára mezi částmi stránky' },
    dialog: { title: 'Okna', hint: 'rámeček dialogů' },
    header: { title: 'Záhlaví', hint: 'pás s obrázkem nad obsahem, povinná výška' },
  }
  const MODE_LABELS: Record<string, string> = {
    stretch: 'Roztáhnout',
    contain: 'Celý obrázek',
    cover: 'Vyplnit plochu',
    repeat: 'Dlaždice',
    'repeat-x': 'Dlaždice vodorovně',
    'repeat-y': 'Dlaždice svisle',
    slice: 'Rámeček (devítidílný)',
  }
  const EDGE_LABELS: Record<string, string> = {
    stretch: 'Roztáhnout',
    repeat: 'Opakovat',
    round: 'Opakovat a přizpůsobit',
    space: 'Opakovat s mezerami',
  }
  const ANCHOR_LABELS: Record<string, string> = {
    'top-left': 'Vlevo nahoře',
    'top-right': 'Vpravo nahoře',
    'bottom-left': 'Vlevo dole',
    'bottom-right': 'Vpravo dole',
  }
  const roleNames = Object.keys(ROLE_LABELS) as RoleName[]

  const names = $derived(Object.keys(skin.assets))
  const stats = $derived(assetStats(assets))
  const modules = $derived(allModules().filter((m) => m.nav))
  let message = $state('')
  let errors = $state<Record<string, string>>({})

  // náhledy obrázků (adresy `blob:` se po změně seznamu a při odchodu zrušují)
  let urls = $state<Record<string, string>>({})
  $effect(() => {
    const next: Record<string, string> = {}
    for (const a of assets)
      next[a.name] = URL.createObjectURL(new Blob([a.bytes as Uint8Array<ArrayBuffer>], { type: a.type }))
    urls = next
    return () => Object.values(next).forEach((u) => URL.revokeObjectURL(u))
  })

  const fail = (key: string, error: string | null) => {
    const { [key]: _drop, ...rest } = errors
    errors = error ? { ...rest, [key]: error } : rest
    return !error
  }

  async function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const files = [...(input.files ?? [])]
    input.value = ''
    message = ''
    let s = skin
    let a: readonly AssetFile[] = assets
    const problems: string[] = []
    let added = 0
    for (const f of files) {
      const r = addAsset(s, a, f.name, new Uint8Array(await f.arrayBuffer()))
      if (r.error) problems.push(r.error)
      else {
        s = r.skin
        a = r.assets
        added++
      }
    }
    message = problems.join(' ')
    if (added) onchange(s, a)
  }

  async function remove(name: string) {
    const uses = usesOf(skin, name)
    if (
      uses.length &&
      !(await ask(`Obrázek „${name}“ se používá (${uses.join(', ')}). Odebere se i z těchto míst.`, {
        title: 'Odebrat obrázek?',
        ok: 'Odebrat',
      }))
    )
      return
    const r = removeAsset(skin, assets, name)
    onchange(r.skin, r.assets)
  }

  // ---------- role ----------
  function changeRole(name: RoleName, role: Role | null) {
    const r = setRole(skin, name, role)
    if (fail(`role-${name}`, r.error) && r.skin !== skin) onchange(r.skin, assets)
  }

  function patchRole(name: RoleName, patch: Partial<Role>) {
    const cur = skin.roles[name]
    if (!cur) return
    const next: Role = { ...cur, ...patch }
    if (next.mode === 'slice') {
      next.slice ??= [12, 12, 12, 12]
    } else {
      delete next.slice
      delete next.width
      delete next.fill
      delete next.edge
    }
    if (!next.mode.startsWith('repeat')) delete next.size
    changeRole(name, next)
  }

  function pickImage(name: RoleName, image: string) {
    if (!image) return changeRole(name, null)
    const cur = skin.roles[name]
    changeRole(name, cur ? { ...cur, image } : defaultRole(name, image))
  }

  function setSlice(name: RoleName, index: number, raw: string) {
    const cur = skin.roles[name]
    if (!cur?.slice) return
    const slice = [...cur.slice] as Role['slice']
    slice![index] = Number(raw)
    patchRole(name, { slice })
  }

  const numberOr = (raw: string): number | undefined => (raw.trim() === '' ? undefined : Number(raw))

  // ---------- ikony a ozdoby ----------
  function pickIcon(moduleId: string, image: string) {
    const r = setIcon(skin, moduleId, image || null)
    if (fail(`ikona-${moduleId}`, r.error)) onchange(r.skin, assets)
  }

  function changeOrnaments(next: Ornament[]) {
    const r = setOrnaments(skin, next)
    if (fail('ozdoby', r.error) && r.skin !== skin) onchange(r.skin, assets)
  }
  const patchOrnament = (i: number, patch: Partial<Ornament>) =>
    changeOrnaments(skin.ornaments.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  const variantRoles = (name: RoleName) => skin.variants.some((v) => v.roles && name in v.roles)
</script>

<section class="panel">
  <h3>Obrázky</h3>
  <p class="muted">
    PNG, WebP, JPEG nebo SVG (SVG bez skriptů a odkazů ven). Nejvýše {MAX_ASSETS} obrázků, každý do 2 MB a 4096 px.
    Typ se pozná podle obsahu souboru, ne podle přípony.
  </p>
  <label>
    <span class="muted">Přidat obrázek:</span>
    <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onchange={pick} />
  </label>
  {#if message}<p class="error" role="alert">{message}</p>{/if}
  <p class="muted">
    {stats.count} z {MAX_ASSETS} obrázků · {(stats.bytes / 1024).toFixed(0)} kB · {(stats.pixels / 1e6).toFixed(1)} Mpx z 16
  </p>
  {#if assets.length}
    <ul class="assets">
      {#each assets as a (a.name)}
        {@const uses = usesOf(skin, a.name)}
        <li>
          {#if urls[a.name]}<img src={urls[a.name]} alt="" class="thumb" />{/if}
          <div class="meta">
            <strong>{a.name}</strong>
            <span class="muted">
              {a.type === 'image/svg+xml' ? 'SVG' : `${a.width} × ${a.height} px`} · {(a.bytes.length / 1024).toFixed(1)} kB
            </span>
            <span class="muted">{uses.length ? `použito: ${uses.join(', ')}` : 'nepoužito'}</span>
          </div>
          <button type="button" aria-label="Odebrat obrázek {a.name}" onclick={() => remove(a.name)}>Odebrat</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="panel">
  <h3>Role: kam se obrázky použijí</h3>
  <p class="muted">Obrázek vybraný pro roli zastoupí barvu daného prvku. Bez obrázku platí jen barvy.</p>
  {#each roleNames as name (name)}
    {@const role = skin.roles[name]}
    <div class="role">
      <div class="control">
        <label for="r-{name}"><strong>{ROLE_LABELS[name].title}</strong></label>
        <select id="r-{name}" value={role?.image ?? ''} onchange={(e) => pickImage(name, e.currentTarget.value)}>
          <option value="">Bez obrázku</option>
          {#each names as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </div>
      <p class="muted hint">{ROLE_LABELS[name].hint}</p>
      {#if role}
        <div class="grid">
          <label>
            <span class="muted">Zobrazení</span>
            <select value={role.mode} onchange={(e) => patchRole(name, { mode: e.currentTarget.value as Role['mode'] })}>
              {#each ROLE_MODES.filter((m) => name !== 'header' || m !== 'slice') as m (m)}
                <option value={m}>{MODE_LABELS[m]}</option>
              {/each}
            </select>
          </label>
          <label>
            <span class="muted">Poloha</span>
            <select value={role.position ?? 'center'} onchange={(e) => patchRole(name, { position: e.currentTarget.value as Role['position'] })}>
              {#each ROLE_POSITIONS as p (p)}<option value={p}>{p}</option>{/each}
            </select>
          </label>
          {#if role.mode.startsWith('repeat')}
            <label>
              <span class="muted">Šířka dlaždice (px)</span>
              <input type="number" min="1" max="2048" value={role.size ?? ''} onchange={(e) => patchRole(name, { size: numberOr(e.currentTarget.value) })} />
            </label>
          {/if}
          {#if name === 'header' || name === 'divider'}
            <label>
              <span class="muted">Výška (px){name === 'header' ? ` ${MIN_HEADER_HEIGHT} až ${MAX_HEADER_HEIGHT}` : ''}</span>
              <input type="number" min="1" max={name === 'header' ? MAX_HEADER_HEIGHT : 512} value={role.height ?? ''} onchange={(e) => patchRole(name, { height: numberOr(e.currentTarget.value) })} />
            </label>
          {/if}
          {#if name === 'background'}
            <label class="check">
              <input type="checkbox" checked={!!role.pixelated} onchange={(e) => patchRole(name, { pixelated: e.currentTarget.checked })} />
              <span>Pixelart (ostré zvětšení)</span>
            </label>
          {/if}
        </div>
        {#if role.mode === 'slice' && role.slice}
          <div class="grid">
            {#each ['nahoře', 'vpravo', 'dole', 'vlevo'] as side, i (side)}
              <label>
                <span class="muted">Okraj {side} (px obrázku)</span>
                <input type="number" min="0" max="2048" value={role.slice[i]} onchange={(e) => setSlice(name, i, e.currentTarget.value)} />
              </label>
            {/each}
            <label>
              <span class="muted">Strany rámečku</span>
              <select value={role.edge ?? 'stretch'} onchange={(e) => patchRole(name, { edge: e.currentTarget.value as Role['edge'] })}>
                {#each ROLE_EDGES as x (x)}<option value={x}>{EDGE_LABELS[x]}</option>{/each}
              </select>
            </label>
            <label class="check">
              <input type="checkbox" checked={role.fill !== false} onchange={(e) => patchRole(name, { fill: e.currentTarget.checked })} />
              <span>Vyplnit střed obrázkem</span>
            </label>
          </div>
        {/if}
        {#if variantRoles(name)}
          <p class="muted hint">Pro některé rozměry okna roli přepisuje varianta (varianty se upravují v další etapě).</p>
        {/if}
      {/if}
      {#if errors[`role-${name}`]}<p class="error" role="alert">{errors[`role-${name}`]}</p>{/if}
    </div>
  {/each}
</section>

<section class="panel">
  <h3>Ikony záložek</h3>
  <p class="muted">Obrázek místo výchozí ikony záložky. Doporučený je čtverec, nejlépe SVG.</p>
  {#each modules as m (m.id)}
    <div class="control">
      <label for="i-{m.id}">{m.title}</label>
      <select id="i-{m.id}" value={skin.icons[m.id] ?? ''} onchange={(e) => pickIcon(m.id, e.currentTarget.value)}>
        <option value="">Výchozí ikona</option>
        {#each names as n (n)}<option value={n}>{n}</option>{/each}
      </select>
    </div>
    {#if errors[`ikona-${m.id}`]}<p class="error" role="alert">{errors[`ikona-${m.id}`]}</p>{/if}
  {/each}
  <label class="check">
    <input
      type="checkbox"
      checked={!!skin.iconStyle?.pixelated}
      onchange={(e) => onchange({ ...skin, iconStyle: { pixelated: e.currentTarget.checked } }, assets)}
    />
    <span>Pixelart ikony (ostré zvětšení)</span>
  </label>
</section>

<section class="panel">
  <h3>Ozdoby v rozích</h3>
  <p class="muted">
    Obrázek nakreslený pro levý horní roh, ostatní rohy se zrcadlí. Zobrazí se jen tehdy, když se vejde do volného
    bočního okraje vedle obsahu (na telefonu na výšku se tedy neukáže). Nejvýše {MAX_ORNAMENTS}.
  </p>
  {#each skin.ornaments as o, i (i)}
    <div class="grid orn">
      <label>
        <span class="muted">Obrázek</span>
        <select value={o.image} onchange={(e) => patchOrnament(i, { image: e.currentTarget.value })}>
          {#each names as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </label>
      <label>
        <span class="muted">Roh</span>
        <select value={o.anchor} onchange={(e) => patchOrnament(i, { anchor: e.currentTarget.value as Ornament['anchor'] })}>
          {#each ORNAMENT_ANCHORS as a (a)}<option value={a}>{ANCHOR_LABELS[a]}</option>{/each}
        </select>
      </label>
      <label>
        <span class="muted">Šířka (px)</span>
        <input type="number" min={MIN_ORNAMENT_WIDTH} max={MAX_ORNAMENT_WIDTH} value={o.width} onchange={(e) => patchOrnament(i, { width: Number(e.currentTarget.value) })} />
      </label>
      <button type="button" aria-label="Odebrat ozdobu {i + 1}" onclick={() => changeOrnaments(skin.ornaments.filter((_, j) => j !== i))}>Odebrat</button>
    </div>
  {/each}
  {#if errors.ozdoby}<p class="error" role="alert">{errors.ozdoby}</p>{/if}
  <p>
    <button
      type="button"
      disabled={!names.length || skin.ornaments.length >= MAX_ORNAMENTS}
      onclick={() => changeOrnaments([...skin.ornaments, { image: names[0]!, anchor: 'top-left', width: 96 }])}
      >Přidat ozdobu</button
    >
  </p>
</section>

<style>
  section {
    display: grid;
    gap: 0.5rem;
  }
  h3 {
    margin: 0;
  }
  .assets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .assets li {
    display: flex;
    gap: 0.6rem;
    align-items: center;
  }
  .thumb {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border: 1px solid var(--drd-border);
    background: repeating-conic-gradient(#8884 0 25%, transparent 0 50%) 0 0 / 12px 12px;
    flex: none;
  }
  .meta {
    display: grid;
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .role {
    display: grid;
    gap: 0.3rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid color-mix(in srgb, var(--drd-border) 40%, transparent);
  }
  .control {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
  .control select {
    width: auto;
    max-width: 60%;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.5rem;
  }
  .grid label {
    display: grid;
    gap: 0.2rem;
  }
  .check {
    display: flex !important;
    gap: 0.5rem;
    align-items: center;
  }
  .check input {
    width: auto;
    min-height: 0;
  }
  .hint {
    margin: 0;
    font-size: 0.85em;
  }
  .orn {
    align-items: end;
  }
</style>
