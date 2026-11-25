<script lang="ts">
  import Arrow from '../../ui/Arrow.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { setAuthor, settings } from '../../core/settings.svelte'
  import AudioTest from '../../ui/audiogram/AudioTest.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
  import About from './About.svelte'
  import AppInfo from './AppInfo.svelte'
  import Backup from './Backup.svelte'
  import DemoData from './DemoData.svelte'
  import Packs from './Packs.svelte'
  import TabbarSettings from './TabbarSettings.svelte'

  // Dílna (`#/knihovna/dilna`): nastavení nahoře (používá se nejčastěji), pak balíčky, a vzácněji používané věci sbalené.
</script>

<nav><a class="btn" href="#/knihovna"><Arrow dir="left" /> Sluj</a></nav>
<h1>Dílna</h1>
<p>
  <a class="btn" href="#/knihovna/napoveda">Nápověda a návody</a>
  <a class="btn" href="#/satnik">Šatník (vzhled aplikace)</a>
</p>

<HelpHeading title="Nastavení" topic="nastaveni" />
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

<TabbarSettings />

<Packs />

<Backup />

<h2>Pomůcky</h2>
<DemoData />
<details>
  <summary>Zkouška zvuku (přenos zvukem mezi zařízeními, audiogram)</summary>
  <HelpHeading title="Nápověda ke zvuku" topic="zvuk" />
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
