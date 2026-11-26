<script lang="ts">
  import {
    MAX_HEADER_HEIGHT,
    MIN_HEADER_HEIGHT,
    ROLE_EDGES,
    ROLE_MODES,
    ROLE_POSITIONS,
    type Role,
    type RoleName,
  } from '../../core/skin/roles'

  // Nastavení jedné role s vybraným obrázkem (zobrazení, poloha, dlaždice, výška, okraje rámečku). Mění se jen
  // pole role, ověřování a doplnění závislých hodnot dělá jádro (`patchedRole`, `setRole`).
  let {
    name,
    role,
    onpatch,
  }: { name: RoleName; role: Role; onpatch: (patch: Partial<Role>) => void } = $props()

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
  const SIDES = ['nahoře', 'vpravo', 'dole', 'vlevo']

  const numberOr = (raw: string): number | undefined => (raw.trim() === '' ? undefined : Number(raw))
  function setSlice(index: number, raw: string) {
    if (!role.slice) return
    const slice = [...role.slice] as NonNullable<Role['slice']>
    slice[index] = Number(raw)
    onpatch({ slice })
  }
</script>

<div class="grid">
  <label>
    <span class="muted">Zobrazení</span>
    <select value={role.mode} onchange={(e) => onpatch({ mode: e.currentTarget.value as Role['mode'] })}>
      {#each ROLE_MODES.filter((m) => name !== 'header' || m !== 'slice') as m (m)}
        <option value={m}>{MODE_LABELS[m]}</option>
      {/each}
    </select>
  </label>
  <label>
    <span class="muted">Poloha</span>
    <select value={role.position ?? 'center'} onchange={(e) => onpatch({ position: e.currentTarget.value as Role['position'] })}>
      {#each ROLE_POSITIONS as p (p)}<option value={p}>{p}</option>{/each}
    </select>
  </label>
  {#if role.mode.startsWith('repeat')}
    <label>
      <span class="muted">Šířka dlaždice (px)</span>
      <input type="number" min="1" max="2048" value={role.size ?? ''} onchange={(e) => onpatch({ size: numberOr(e.currentTarget.value) })} />
    </label>
  {/if}
  {#if name === 'header' || name === 'divider'}
    <label>
      <span class="muted">Výška (px){name === 'header' ? ` ${MIN_HEADER_HEIGHT} až ${MAX_HEADER_HEIGHT}` : ''}</span>
      <input type="number" min="1" max={name === 'header' ? MAX_HEADER_HEIGHT : 512} value={role.height ?? ''} onchange={(e) => onpatch({ height: numberOr(e.currentTarget.value) })} />
    </label>
  {/if}
  {#if name === 'background'}
    <label class="check">
      <input type="checkbox" checked={!!role.pixelated} onchange={(e) => onpatch({ pixelated: e.currentTarget.checked })} />
      <span>Pixelart (ostré zvětšení)</span>
    </label>
  {/if}
</div>
{#if role.mode === 'slice' && role.slice}
  <div class="grid">
    {#each SIDES as side, i (side)}
      <label>
        <span class="muted">Okraj {side} (px obrázku)</span>
        <input type="number" min="0" max="2048" value={role.slice[i]} onchange={(e) => setSlice(i, e.currentTarget.value)} />
      </label>
    {/each}
    <label>
      <span class="muted">Strany rámečku</span>
      <select value={role.edge ?? 'stretch'} onchange={(e) => onpatch({ edge: e.currentTarget.value as Role['edge'] })}>
        {#each ROLE_EDGES as x (x)}<option value={x}>{EDGE_LABELS[x]}</option>{/each}
      </select>
    </label>
    <label class="check">
      <input type="checkbox" checked={role.fill !== false} onchange={(e) => onpatch({ fill: e.currentTarget.checked })} />
      <span>Vyplnit střed obrázkem</span>
    </label>
  </div>
{/if}

<style>
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
</style>
