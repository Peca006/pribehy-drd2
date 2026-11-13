<script lang="ts">
  import { onMount } from 'svelte'
  import { emptyParty, type Party } from '../../core/party/model'
  import { listParties, saveParty } from '../../core/party/store'
  import { go } from '../../core/router.svelte'
  import PartyShare from './PartyShare.svelte'
  import PartyView from './PartyView.svelte'
  import SessionForm from './SessionForm.svelte'

  // params: [] = seznam družin, [id] = družina, [id, 'sezeni'] = nové sezení, [id, 'sdilet'] = sdílení
  let { params }: { params: string[] } = $props()

  let parties = $state.raw<Party[]>([])
  let name = $state('')
  const load = async () =>
    (parties = (await listParties()).sort((a, b) => b.updated.localeCompare(a.updated)))
  onMount(load)

  async function create() {
    const p = emptyParty(name.trim() || 'Nová družina')
    await saveParty(p)
    name = ''
    go('druziny', p.id)
  }
</script>

{#if params[0] && params[1] === 'sezeni'}
  <SessionForm id={params[0]} />
{:else if params[0] && params[1] === 'sdilet'}
  <PartyShare id={params[0]} />
{:else if params[0]}
  <PartyView id={params[0]} />
{:else}
  <h1>Družiny</h1>
  <p class="muted">
    Družina sdružuje postavy hráčů, vede žurnál dobrodružství a rozděluje zkušenosti za sezení.
  </p>
  {#each parties as p (p.id)}
    <a class="btn panel row" href={'#/druziny/' + p.id}>
      <strong>{p.name}</strong>
      <span class="muted"
        >{p.role === 'hrac' ? 'kopie od Průvodce · ' : ''}členů: {p.members.length} · zápisů v žurnálu:
        {p.journal.length}</span
      >
    </a>
  {:else}
    <p class="muted">Zatím žádná družina.</p>
  {/each}
  <div class="new">
    <input
      bind:value={name}
      placeholder="Název nové družiny"
      aria-label="Název nové družiny"
      onkeydown={(e) => e.key === 'Enter' && create()}
    />
    <button class="primary" onclick={create}>Nová</button>
  </div>
  <p><a class="btn" href="#/postavy/import">Import družiny nebo postavy…</a></p>
{/if}

<style>
  .row {
    display: flex;
    flex-direction: column;
    margin: 0.5rem 0;
  }
  .new {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .new input {
    flex: 1;
  }
</style>
