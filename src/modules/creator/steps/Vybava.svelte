<script lang="ts">
  import type { CreationData } from '../data'
  import type { Draft } from '../draft.svelte'
  import { formatMoney, plain } from '../rules'

  let { draft, data }: { draft: Draft; data: CreationData } = $props()
  const items = $derived(data.equipment.flatMap((g) => g.items))
  const priced = $derived(
    data.equipment.filter((g) => g.items.every((i) => i.price.min !== undefined)),
  )
  const spent = $derived(
    Object.entries(draft.cart).reduce(
      (s, [id, n]) => s + n * (items.find((i) => i.id === id)?.price.min ?? 0),
      0,
    ),
  )
  const left = $derived(data.rules.purchaseBudget - spent)
  // bez balíčku pravidel (jen vestavěná kostra) nejsou hotové sady ani ceník: výbava se píše ručně
  const manual = $derived(!data.kits.some((k) => k.lines.length) && priced.length === 0)
  const lines = $derived(draft.equipment.join('\n'))

  function chooseKit(id: string) {
    const kit = data.kits.find((k) => k.id === id)
    if (!kit) return
    draft.equipMode = 'kit'
    draft.kitId = id
    draft.cart = {}
    // sada bez popisu (vestavěná kostra) zachová ručně napsanou výbavu a nastaví jen hotovost
    if (kit.lines.length)
      draft.equipment = kit.lines
        .filter((l) => l.label !== 'Hotovost')
        .map((l) => `${l.label}: ${plain(l.text)}`)
    draft.cash = kit.cash ?? 0
  }

  function startBuying() {
    draft.equipMode = 'buy'
    draft.kitId = undefined
    sync()
  }

  function buy(id: string, d: number) {
    const price = items.find((i) => i.id === id)?.price.min
    if (price === undefined) return
    const n = (draft.cart[id] ?? 0) + d
    if (n < 0 || (d > 0 && price > left)) return
    if (n === 0) delete draft.cart[id]
    else draft.cart[id] = n
    sync()
  }

  function sync() {
    draft.equipment = Object.entries(draft.cart).map(([id, n]) => {
      const it = items.find((i) => i.id === id)!
      return `${n > 1 ? n + '× ' : ''}${plain(it.name)}`
    })
    draft.cash = left
  }
</script>

<h2>Výbava</h2>
{#if manual}
  <p class="muted">
    Hotové sady ani ceník nejsou nainstalované (načtěte balíček pravidel v části Více). Výbavu zatím
    napište ručně, jednu položku na řádek. Vyberte úroveň vybavení, nastaví se podle ní hotovost.
  </p>
  <div class="tabs">
    {#each data.kits as k}
      <button class:primary={draft.kitId === k.id} onclick={() => chooseKit(k.id)}>
        {draft.kitId === k.id ? '✓ ' : ''}{k.name}
        <span class="muted">({formatMoney(k.cash ?? 0)})</span>
      </button>
    {/each}
  </div>
  <label>
    Výzbroj a výstroj
    <textarea
      rows="6"
      value={lines}
      oninput={(e) => (draft.equipment = e.currentTarget.value.split('\n').filter((l) => l.trim()))}
    ></textarea>
  </label>
  <label>
    Hotovost v haléřích <input type="number" min="0" bind:value={draft.cash} />
    <span class="muted">= {formatMoney(draft.cash || 0)}</span>
  </label>
{:else}
  <p class="muted">
    Vyberte hotovou sadu, nebo si nakupte vlastní výbavu v hodnotě {formatMoney(
      data.rules.purchaseBudget,
    )}.
  </p>

  <div class="tabs">
    <button class:primary={draft.equipMode === 'kit'} onclick={() => (draft.equipMode = 'kit')}>
      Hotové sady
    </button>
    <button class:primary={draft.equipMode === 'buy'} onclick={startBuying}>Vlastní nákup</button>
  </div>

  {#if draft.equipMode === 'kit'}
    {#each data.kits as k}
      <div class="panel" class:sel={draft.kitId === k.id}>
        <button class="primary" onclick={() => chooseKit(k.id)}>
          {draft.kitId === k.id ? '✓ ' : ''}{k.name}
        </button>
        <ul>
          {#each k.lines as l}<li><strong>{l.label}:</strong> {plain(l.text)}</li>{/each}
        </ul>
      </div>
    {/each}
  {:else}
    <p><strong>Zbývá: {formatMoney(left)}</strong></p>
    {#each priced as g}
      <details>
        <summary>{g.name}</summary>
        {#each g.items as i}
          <div class="item">
            <span>{plain(i.name)} <span class="muted">– {i.price.text}</span></span>
            <span class="stepper">
              <button
                aria-label="Ubrat {plain(i.name)}"
                onclick={() => buy(i.id, -1)}
                disabled={!draft.cart[i.id]}>−</button
              >
              <output>{draft.cart[i.id] ?? 0}</output>
              <button
                aria-label="Přidat {plain(i.name)}"
                onclick={() => buy(i.id, 1)}
                disabled={(i.price.min ?? 0) > left}>+</button
              >
            </span>
          </div>
        {/each}
      </details>
    {/each}
  {/if}
{/if}

<style>
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .sel {
    outline: 2px solid var(--drd-accent);
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }
  .stepper {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
  }
  output {
    min-width: 1.5rem;
    text-align: center;
  }
</style>
