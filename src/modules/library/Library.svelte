<script lang="ts">
  import { setAuthor, settings } from '../../core/settings.svelte'
  import AudioTest from '../../ui/audiogram/AudioTest.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
  import About from './About.svelte'
  import AppInfo from './AppInfo.svelte'
  import DemoData from './DemoData.svelte'
  import Grimoire from './Grimoire.svelte'
  import Packs from './Packs.svelte'

  // Více: nastavení nahoře (používá se nejčastěji), pak balíčky, a vzácněji používané věci sbalené.
</script>

<h1>Více</h1>

<h2>Nastavení</h2>
<div class="panel settings">
  <label>
    <span class="muted">Jméno, kterým se podepisují změny postav a zápisy:</span>
    <input
      value={settings.author}
      maxlength="60"
      onchange={(e) => setAuthor(e.currentTarget.value)}
    />
  </label>
  <LinkModeSelect />
</div>

<Packs />

<Grimoire />

<h2>Pomůcky</h2>
<DemoData />
<details>
  <summary>Zkouška zvuku (přenos zvukem mezi zařízeními, audiogram)</summary>
  <AudioTest />
</details>

<AppInfo />
<About />

<style>
  .settings {
    display: grid;
    gap: 0.75rem;
  }
</style>
