<script lang="ts">
  import {
    ENUM_LABELS,
    FONT_PRESETS,
    enumValues,
    fieldKind,
    fieldRange,
    hexOf,
    type TokenField,
  } from '../../core/skin/editor'
  import { lengthPx } from '../../core/skin/tokens'

  // Ovládací prvek jednoho tokenu (barva, písmo, délka, procento, výčet, text). Používá ho základní editor
  // i přepsání ve variantách. `value` je hodnota k zobrazení, `overridden` ukáže tlačítko „vrátit výchozí“.
  let {
    field,
    value,
    overridden,
    error = '',
    idPrefix = 't',
    onset,
  }: {
    field: TokenField
    value: string
    overridden: boolean
    error?: string
    idPrefix?: string
    onset: (raw: string) => void
  } = $props()

  const kind = $derived(fieldKind(field.name))
  const range = $derived(fieldRange(field.name))
  const id = $derived(`${idPrefix}${field.name}`)
  const fontIsPreset = $derived(FONT_PRESETS.some((p) => p.value === value))
</script>

<div class="field">
  <label for={id}>{field.label}</label>
  <div class="control">
    {#if kind === 'color'}
      <input
        type="color"
        class="swatch"
        aria-label="{field.label}: výběr barvy"
        value={hexOf(value) ?? '#000000'}
        oninput={(e) => onset(e.currentTarget.value)}
      />
      <input {id} {value} maxlength="40" onchange={(e) => onset(e.currentTarget.value)} />
    {:else if kind === 'font'}
      <select
        {id}
        value={fontIsPreset ? value : 'jine'}
        onchange={(e) => e.currentTarget.value !== 'jine' && onset(e.currentTarget.value)}
      >
        {#each FONT_PRESETS as p (p.value)}<option value={p.value}>{p.label}</option>{/each}
        <option value="jine">Jiné (zapište níže)</option>
      </select>
      {#if !fontIsPreset}
        <input aria-label="{field.label}: vlastní seznam" {value} onchange={(e) => onset(e.currentTarget.value)} />
      {/if}
    {:else if kind === 'px' && range}
      <input
        {id}
        type="number"
        min={range.min}
        max={range.max}
        step="1"
        value={lengthPx(value) ?? 0}
        onchange={(e) => onset(`${e.currentTarget.value}px`)}
      />
      <span class="muted">px</span>
    {:else if kind === 'percent' && range}
      <input
        {id}
        type="range"
        min={range.min}
        max={range.max}
        step="1"
        value={parseInt(value, 10) || range.max}
        oninput={(e) => onset(`${e.currentTarget.value}%`)}
      />
      <span class="muted">{value}</span>
    {:else if kind === 'enum'}
      <select {id} {value} onchange={(e) => onset(e.currentTarget.value)}>
        {#each enumValues(field.name) as o (o)}<option value={o}>{ENUM_LABELS[o] ?? o}</option>{/each}
      </select>
    {:else}
      <input {id} {value} maxlength="200" onchange={(e) => onset(e.currentTarget.value)} />
    {/if}
    {#if overridden}
      <button type="button" aria-label="Vrátit výchozí: {field.label}" title="Vrátit výchozí" onclick={() => onset('')}>↺</button>
    {/if}
  </div>
  {#if error}<p class="error" role="alert">{error}</p>
  {:else if field.hint}<p class="muted hint">{field.hint}</p>{/if}
</div>

<style>
  .field {
    display: grid;
    gap: 0.2rem;
  }
  .control {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .control input:not([type='color']):not([type='range']):not([type='number']) {
    flex: 1;
    min-width: 0;
  }
  .control input[type='number'] {
    width: 6rem;
  }
  .control input[type='range'] {
    flex: 1;
    min-height: 0;
  }
  .swatch {
    width: 3rem;
    min-height: 40px;
    padding: 0.1rem;
    flex: none;
  }
  .hint {
    margin: 0;
    font-size: 0.85em;
  }
</style>
