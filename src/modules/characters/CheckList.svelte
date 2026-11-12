<script lang="ts">
  import { checkCharacter } from '../../core/character/check'
  import type { Character } from '../../core/character/model'
  import { commonRaceAbilities, creationRules, professions, races } from '../../core/library.svelte'

  // Kontrola postavy proti pravidlům (neznámá ID, počet schopností, …). Jen upozorňuje, nic neblokuje.
  let { character, title = 'Kontrola postavy' }: { character: Character; title?: string } = $props()

  const checks = $derived.by(() => {
    const rules = creationRules()
    if (!rules) return []
    return checkCharacter(character, {
      rules,
      professions: professions(),
      races: races(),
      commonAbilities: commonRaceAbilities(),
    })
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
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
