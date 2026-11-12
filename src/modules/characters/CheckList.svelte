<script lang="ts">
  import { checkCharacter } from '../../core/character/check'
  import type { Character } from '../../core/character/model'
  import { commonRaceAbilities, creationRules, professions, races } from '../../core/library.svelte'

  // Kontrola postavy proti pravidlům (neznámá ID, počet schopností, …). Jen upozorňuje, nic neblokuje.
  // `baseline`: stav před změnou; problémy, které v něm nebyly, se označí jako nové
  let {
    character,
    baseline,
    title = 'Kontrola postavy',
  }: { character: Character; baseline?: Character; title?: string } = $props()

  const run = (c: Character) => {
    const rules = creationRules()
    if (!rules) return []
    return checkCharacter(c, {
      rules,
      professions: professions(),
      races: races(),
      commonAbilities: commonRaceAbilities(),
    })
  }
  const checks = $derived.by(() => {
    const known = baseline ? new Set(run(baseline).map((x) => x.text)) : undefined
    return run(character).map((x) => ({ ...x, isNew: !!known && !known.has(x.text) }))
  })
</script>

{#if checks.length}
  <section class="panel" aria-label={title}>
    <strong>{title}</strong>
    <ul>
      {#each checks as c}
        <li class={c.level === 'chyba' ? 'error' : 'warn'}>
          <span aria-hidden="true">{c.level === 'chyba' ? '⛔' : '⚠'}</span>
          <span class="sr-only">{c.level}: </span>{c.text}
          {#if c.isNew}<span class="new">nové</span>{/if}
        </li>
      {/each}
    </ul>
    <p class="muted">Upozornění nic neblokují, vypravěč může udělit výjimku.</p>
  </section>
{/if}

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0;
  }
  li {
    margin: 0.25rem 0;
  }
  .warn {
    color: var(--drd-text);
  }
  .new {
    font-size: 0.75rem;
    padding: 0.05rem 0.4rem;
    border: 1px solid var(--drd-accent);
    border-radius: 1rem;
    margin-left: 0.3rem;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
