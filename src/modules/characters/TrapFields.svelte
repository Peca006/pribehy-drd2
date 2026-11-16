<script lang="ts">
  import { ATTRIBUTES, type Trap } from '../../core/character/model'
  import { MAX_EXTRA, MAX_NAME, MAX_TEXT, TRAP_EFFECTS, TRAP_MANEUVERS, TRAP_TYPES } from '../../core/character/traps'

  // Pole nástrahy sdílená dialogem „Nástraha“ a dialogem výroby: název, druh, cílová vlastnost, zamýšlený účinek,
  // vložený manévr, další vlastnosti (každá +1 Surovina) a slabina.
  let { spec = $bindable() }: { spec: Partial<Trap> } = $props()

  const extra = $derived(spec.extra ?? 0)
</script>

<input type="text" bind:value={spec.name} maxlength={MAX_NAME} placeholder="Název nástrahy" aria-label="Název nástrahy" />
<div class="row">
  <label for="trap-type">Druh</label>
  <select id="trap-type" bind:value={spec.type}>
    {#each TRAP_TYPES as t}<option value={t.id}>{t.label}{t.advanced ? ' (pokročilá)' : ''}</option>{/each}
  </select>
</div>
<div class="seg" role="group" aria-label="Cílová vlastnost">
  {#each ATTRIBUTES as a}
    <button class:primary={spec.attribute === a} onclick={() => (spec.attribute = a)}>{a}</button>
  {/each}
</div>
<div class="seg" role="group" aria-label="Zamýšlený účinek">
  {#each TRAP_EFFECTS as e}
    <button class:primary={spec.effect === e.id} onclick={() => (spec.effect = e.id)}>{e.label}</button>
  {/each}
</div>
<div class="row">
  <label for="trap-man">Vložený manévr</label>
  <select id="trap-man" bind:value={spec.maneuver}>
    {#each TRAP_MANEUVERS as m}<option value={m.id}>{m.label}</option>{/each}
  </select>
</div>
<div class="row">
  <span>Další vlastnosti, posílení (+1 každá)</span>
  <button onclick={() => (spec.extra = Math.max(0, extra - 1))} disabled={extra <= 0} aria-label="Méně vlastností">−</button>
  <strong>{extra}</strong>
  <button onclick={() => (spec.extra = Math.min(MAX_EXTRA, extra + 1))} disabled={extra >= MAX_EXTRA} aria-label="Více vlastností">+</button>
</div>
<input type="text" bind:value={spec.weakness} maxlength={MAX_TEXT} placeholder="Slabina (čím jde odhalit)" aria-label="Slabina" />

<style>
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.4rem 0;
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
  .row select {
    flex: 1.2;
    min-width: 0;
  }
  .row strong {
    min-width: 2ch;
    text-align: center;
  }
  input[type='text'] {
    width: 100%;
    margin: 0.3rem 0;
  }
</style>
