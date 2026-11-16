<script lang="ts">
  import { levelVerdict, type InputLevel } from '../core/audiogram/audio'

  // Ukazatel hlasitosti vstupu (mikrofonu): ukáže, jestli zařízení vůbec něco slyší a zda není signál přebuzený.
  let { level }: { level?: InputLevel } = $props()

  // špička v dB od plné úrovně, rozsah −60 až 0 dB
  const db = $derived(level && level.peak > 0 ? 20 * Math.log10(level.peak) : -60)
  const pct = $derived(Math.max(0, Math.min(100, ((db + 60) / 60) * 100)))
  const verdict = $derived(level ? levelVerdict(level.peak) : undefined)
  const TEXT = {
    slabe: 'Mikrofon slyší jen velmi slabý zvuk. Zvyšte hlasitost druhého zařízení nebo je přibližte.',
    dobre: 'Úroveň je v pořádku.',
    prebuzene: 'Zvuk je přebuzený (zkreslený). Snižte hlasitost druhého zařízení nebo ho oddalte.',
  } as const
</script>

<div class="meter" aria-label="Hlasitost vstupu">
  <progress max="100" value={pct}></progress>
  <small class="muted">
    {level ? `${Math.round(db)} dB` : 'ticho'}{verdict ? ` · ${TEXT[verdict]}` : ''}
  </small>
</div>

<style>
  .meter {
    margin: 0.4rem 0;
  }
  progress {
    width: 100%;
    max-width: 22rem;
    display: block;
  }
</style>
