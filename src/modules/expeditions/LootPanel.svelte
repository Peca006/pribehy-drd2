<script lang="ts">
  import { UNIT_LABEL, UNIT_ORDER, type CashUnit } from '../../core/character/cash'
  import type { Expedition, Run } from '../../core/expedition/model'
  import { describeLoot, distribute, hide, lootRows, problem, refine, reveal } from '../../core/expedition/loot'
  import type { Party } from '../../core/party/model'
  import { settings } from '../../core/settings.svelte'

  // Kořist výpravy ve vedení: skrytá → odhalená (jde upřesnit) → rozdělená členu družiny (zapíše se jeho postavě na tomto zařízení).
  let {
    exp,
    run,
    party,
    onchange,
    onreload,
    wait,
  }: {
    exp: Expedition
    run: Run
    party: Party | undefined
    onchange: (next: Run) => void
    onreload: () => Promise<void>
    /** počká na rozepsaná uložení vedení, než se kořist rozdělí */
    wait: () => Promise<unknown>
  } = $props()

  const rows = $derived(lootRows(exp, run))
  let to = $state<Record<string, string>>({})
  let message = $state('')
  let error = $state('')

  const snap = () => $state.snapshot(run) as Run
  const memberName = (id?: string) => party?.members.find((m) => m.id === id)?.name ?? '(člen už není v družině)'

  async function give(lootId: string) {
    error = ''
    message = ''
    const member = to[lootId]
    if (!member) return
    try {
      await wait()
      const r = await distribute(run.id, lootId, member, settings.author)
      await onreload()
      message = r.applied
        ? 'Kořist je zapsaná postavě (změna s poznámkou o kořisti v jejím deníku).'
        : 'Kořist je zaznamenaná. Postava člena není v tomto zařízení, zápis si udělá hráč sám.'
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }
</script>

{#if rows.length}
  <h2>Kořist</h2>
  <p class="muted">Kořist je připravená u příhod. Odhalte ji, v případě potřeby upřesněte a rozdělte členu družiny. Trofeje jsou jen název a poznámka.</p>
  {#each rows as r (r.base.id)}
    <div class="panel loot" class:done={r.state === 'rozdelena'}>
      <div class="head">
        <strong>{r.state === 'ukryta' ? 'Skrytá kořist' : describeLoot(r.now)}</strong>
        <span class="muted">z příhody „{r.incident.title || 'bez názvu'}“</span>
      </div>
      {#if r.base.note && r.state !== 'odhalena'}<p class="muted">Poznámka: {r.now.note}</p>{/if}
      {#if r.state === 'ukryta'}
        <p class="btns"><button onclick={() => onchange(reveal(snap(), r.base.id))} aria-label={`Odhalit kořist z příhody ${r.incident.title}`}>Odhalit</button></p>
      {:else if r.state === 'odhalena'}
        <div class="fields">
          {#if r.now.kind === 'penize'}
            <label>
              Množství
              <input type="number" min="1" value={r.now.amount} onchange={(e) => onchange(refine(snap(), r.base.id, { amount: Number(e.currentTarget.value) }))} />
            </label>
            <label>
              Jednotka
              <select value={r.now.unit ?? 'grose'} onchange={(e) => onchange(refine(snap(), r.base.id, { unit: e.currentTarget.value as CashUnit }))}>
                {#each UNIT_ORDER as u}<option value={u}>{UNIT_LABEL[u]}</option>{/each}
              </select>
            </label>
          {:else if r.now.kind === 'suroviny'}
            <label>
              Množství
              <input type="number" min="1" value={r.now.amount} onchange={(e) => onchange(refine(snap(), r.base.id, { amount: Number(e.currentTarget.value) }))} />
            </label>
            <label>
              Značka druhu
              <input value={r.now.mark ?? ''} maxlength="4" onchange={(e) => onchange(refine(snap(), r.base.id, { mark: e.currentTarget.value }))} />
            </label>
            <label>
              Název druhu
              <input value={r.now.label} onchange={(e) => onchange(refine(snap(), r.base.id, { label: e.currentTarget.value }))} />
            </label>
          {:else}
            <label>
              {r.now.kind === 'vybava' ? 'Položka' : 'Název trofeje'}
              <input value={r.now.label} onchange={(e) => onchange(refine(snap(), r.base.id, { label: e.currentTarget.value }))} />
            </label>
          {/if}
          <label>
            {r.now.kind === 'trofej' ? 'Poznámka' : 'Poznámka pro Průvodce'}
            <input value={r.now.note ?? ''} onchange={(e) => onchange(refine(snap(), r.base.id, { note: e.currentTarget.value }))} />
          </label>
        </div>
        {#if problem(r.now)}<p class="error">{problem(r.now)}</p>{/if}
        <div class="row">
          <select bind:value={to[r.base.id]} aria-label={`Komu připadne: ${describeLoot(r.now)}`}>
            <option value="">Komu připadne…</option>
            {#each party?.members ?? [] as m}<option value={m.id}>{m.name}</option>{/each}
          </select>
          <button class="primary" disabled={!to[r.base.id] || !!problem(r.now)} onclick={() => give(r.base.id)}>Rozdělit</button>
          <button onclick={() => onchange(hide(snap(), r.base.id))}>Skrýt</button>
        </div>
      {:else}
        <p>
          Rozděleno: <strong>{memberName(r.entry?.to)}</strong>
          <span class="muted">{r.entry?.applied ? ' · zapsáno postavě' : r.now.kind === 'trofej' ? ' · jen záznam' : ' · postava je u hráče, zapíše si ji sám'}</span>
        </p>
      {/if}
    </div>
  {/each}
  {#if message}<p role="status">{message}</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
{/if}

<style>
  .head {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
  }
  .done {
    opacity: 0.7;
  }
  .fields {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .fields label {
    flex: 1 1 8rem;
    margin: 0.4rem 0;
  }
  .fields input,
  .fields select {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 0.5rem 0;
  }
  .row select {
    flex: 1 1 10rem;
  }
  .btns {
    display: flex;
    gap: 0.5rem;
  }
</style>
