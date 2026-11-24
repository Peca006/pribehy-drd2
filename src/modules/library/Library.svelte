<script lang="ts">
  import HelpPage from './HelpPage.svelte'
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { setAuthor, settings } from '../../core/settings.svelte'
  import AudioTest from '../../ui/audiogram/AudioTest.svelte'
  import LinkModeSelect from '../../ui/LinkModeSelect.svelte'
  import About from './About.svelte'
  import AppInfo from './AppInfo.svelte'
  import Backup from './Backup.svelte'
  import DemoData from './DemoData.svelte'
  import Packs from './Packs.svelte'

  // Více: nastavení nahoře (používá se nejčastěji), pak balíčky, a vzácněji používané věci sbalené.
  // `#/knihovna/napoveda` ukáže stránku Nápověda.
  let { params = [] }: { params?: string[] } = $props()
</script>

{#if params[0] === 'napoveda'}
  <HelpPage />
{:else}
<h1>Více</h1>
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
{/if}

<style>
  .settings {
    display: grid;
    gap: 0.75rem;
  }
</style>
