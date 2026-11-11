<script lang="ts">
  import type { Draft } from '../draft.svelte'

  let { draft }: { draft: Draft } = $props()
</script>

<h2>Koncept</h2>
<p class="muted">
  Než sáhnete po pravidlech, popište hrdinu několika slovy: kým je, co chce, čím se liší. Koncept
  nemá vliv na pravidla a můžete ho kdykoli změnit.
</p>
<label>
  Koncept postavy
  <textarea
    rows="4"
    bind:value={draft.concept}
    placeholder="např. samotářský stopař z hvozdu, poprvé ve městě"
  ></textarea>
</label>
