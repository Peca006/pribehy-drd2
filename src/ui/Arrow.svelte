<script lang="ts">
  // Výrazná šipka do strany (tučná, přebírá barvu textu) místo tenkých znaků ← →.
  let { dir }: { dir: 'left' | 'right' } = $props()
</script>

<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true" class={dir}>
  <path
    d="M15 4 7 12l8 8"
    fill="none"
    stroke="currentColor"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  svg {
    vertical-align: -0.2em;
  }
  .right {
    transform: scaleX(-1);
  }
</style>
