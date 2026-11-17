<script lang="ts">
  // Ikonka prostředí (b–h podle písma knihy). Rustikální, jednobarevná (barva textu), kreslená tahem.
  import { ENVIRONMENTS } from '../core/environments'

  let { letter, size = '1em' }: { letter: string; size?: string } = $props()
  const label = $derived(ENVIRONMENTS[letter])
</script>

{#if label}
  <svg
    class="env"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-label={label}
  >
    <title>{label}</title>
    {#if letter === 'a'}
      <!-- královská lebka (prastará bytost) -->
      <path d="M7 8 6 3.5l3 2 3-3 3 3 3-2L17 8z" fill="currentColor" fill-opacity="0.25" />
      <path d="M6.5 14c-.2-3.5 2-5.5 5.5-5.5s5.7 2 5.5 5.5c-.1 1.5-.8 2.5-1.8 3.2V21H9.3v-3.8C7.3 16.5 6.6 15.5 6.5 14z" />
      <circle cx="9.5" cy="14" r="1.4" fill="currentColor" />
      <circle cx="14.5" cy="14" r="1.4" fill="currentColor" />
      <path d="M12 15.8l-.7 1.6h1.4zM10.7 21v-2M12 21v-2M13.3 21v-2" />
    {:else if letter === 'b'}
      <!-- strom (jehličnan) -->
      <path d="M12 2.5 6.5 10h3L5 16h14l-4.5-6h3z" fill="currentColor" fill-opacity="0.25" />
      <path d="M12 16v5.5" />
    {:else if letter === 'c'}
      <!-- trs trávy -->
      <path d="M12 21c-.3-5-.8-10-3-16M12 21c.2-6 1.5-11 5-15M12 21c-1-3-4-6-7.5-7M12 21c1.2-3 4-5 8-5.5" />
      <path d="M3 21h18" />
    {:else if letter === 'd'}
      <!-- skalisko, hory -->
      <path d="M2.5 20 9 6.5l3.5 6L15 9l6.5 11z" fill="currentColor" fill-opacity="0.25" />
      <path d="M9 6.5 11 11l-2.2 1.5L7.5 11" />
    {:else if letter === 'e'}
      <!-- vlny -->
      <path d="M2.5 9c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0" />
      <path d="M2.5 14c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0" />
      <path d="M2.5 19c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0" />
    {:else if letter === 'f'}
      <!-- klas -->
      <path d="M12 22V9" />
      <path d="M12 9c-3-.5-4-3-3.5-5 2.5.2 4 2 3.5 5zM12 9c3-.5 4-3 3.5-5-2.5.2-4 2-3.5 5z" fill="currentColor" fill-opacity="0.25" />
      <path d="M12 15c-3-.5-4.5-3-4-5 2.5.3 4 2 4 5zM12 15c3-.5 4.5-3 4-5-2.5.3-4 2-4 5z" fill="currentColor" fill-opacity="0.25" />
      <path d="M12 21c-2.5-.5-4-2.5-3.5-4.5 2.2.3 3.5 1.8 3.5 4.5zM12 21c2.5-.5 4-2.5 3.5-4.5-2.2.3-3.5 1.8-3.5 4.5z" fill="currentColor" fill-opacity="0.25" />
    {:else if letter === 'g'}
      <!-- chaloupka -->
      <path d="M3 11.5 12 3.5l9 8" />
      <path d="M5.5 10v10.5h13V10" fill="currentColor" fill-opacity="0.25" />
      <path d="M10 20.5v-6h4v6" />
      <path d="M17 6V3.5" />
    {:else if letter === 'h'}
      <!-- zřícená věž -->
      <path d="M6 21.5V8l1.5 1.5L9 7.5l1.5 2L12 8v13.5" fill="currentColor" fill-opacity="0.25" />
      <path d="M12 21.5v-9l2 1.5 1.5-2.5V21.5" />
      <path d="M3 21.5h18" />
      <path d="M17 21.5v-4l1.5 1 1-2v5" />
      <path d="M8.5 13v3" />
    {/if}
  </svg>
{/if}

<style>
  .env {
    vertical-align: -0.12em;
    flex: none;
  }
</style>
