<script lang="ts">
  import HelpHeading from '../../ui/HelpHeading.svelte'
  import { applyUpdate, checkForUpdate, install, pwa } from '../../core/pwa.svelte'

  // Verze aplikace, kontrola aktualizací a instalace na plochu.
  let result = $state('')
  const built = new Date(__BUILD_TIME__).toLocaleString('cs-CZ')
  const offline = $derived(
    typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
  )

  async function check() {
    result = ''
    const r = await checkForUpdate()
    result =
      r === 'nova'
        ? 'Nová verze je připravená, stačí ji obnovit.'
        : r === 'aktualni'
          ? 'Máte nejnovější verzi.'
          : 'Kontrola se nepovedla (jste offline, nebo aplikace běží bez service workeru).'
  }
</script>

<HelpHeading title="Aplikace" topic="aplikace" />
<div class="panel">
  <p>
    Verze <strong>{__APP_VERSION__}</strong>
    <span class="muted"> · sestaveno {built}</span>
  </p>
  <p class="muted">
    {offline
      ? 'Aplikace je uložená v zařízení a funguje i bez internetu.'
      : 'Aplikace zatím není uložená pro práci offline (po prvním načtení z internetu se uloží).'}
  </p>

  <p class="muted">
    Na webu se anonymně měří, kolik lidí aplikaci otevírá, v jaké verzi a kolik se stáhlo balíčků a nových verzí (služba GoatCounter, bez cookies a
    bez osobních údajů). Z aplikace se neposílá žádný obsah ani postavy a při nastaveném „Do Not Track“ ani offline se neměří.
  </p>

  {#if pwa.needRefresh}
    <!-- dokud je dole lišta s novou verzí, nabídka se neopakuje; po „Později“ se ukáže tady -->
    {#if pwa.updateDismissed}
      <p>
        Je připravená nová verze.
        <button class="primary" onclick={applyUpdate}>Načíst</button>
      </p>
    {/if}
  {:else}
    <p>
      <button onclick={check} disabled={pwa.checking}>
        {pwa.checking ? 'Ověřuji…' : 'Ověřit'}
      </button>
    </p>
  {/if}
  {#if result && !pwa.needRefresh}<p role="status">{result}</p>{/if}
</div>

<div class="panel">
  <strong>Instalace na plochu</strong>
  {#if pwa.installed}
    <p>Aplikace již je nainstalovaná a běží jako samostatná aplikace.</p>
  {:else if pwa.installable}
    <p class="muted">Přidá ikonu na plochu. Aplikace se otevře bez adresního řádku i offline.</p>
    <button class="primary" onclick={install}>Nainstalovat</button>
  {:else if pwa.ios}
    <ol>
      <li>V Safari klepněte na <strong>Sdílet</strong> (čtverec se šipkou nahoru).</li>
      <li>Zvolte <strong>Přidat na plochu</strong>.</li>
      <li>Potvrďte <strong>Přidat</strong>. Aplikace se otevře z plochy.</li>
    </ol>
    <p class="muted">Instalaci na iPhonu a iPadu nabízí jen Safari.</p>
  {:else}
    <p class="muted">
      Prohlížeč instalaci tlačítkem nenabídl. V Chrome na telefonu otevřete menu (⋮) a zvolte
      <strong>Nainstalovat aplikaci</strong> nebo <strong>Přidat na plochu</strong>. Na počítači
      je ikona instalace v adresním řádku. Instalovat lze jen z adresy s <code>https</code>.
    </p>
  {/if}
</div>
