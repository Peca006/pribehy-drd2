<script lang="ts">
  // Převod SRD přímo v prohlížeči uživatele: záložka (bookmarklet) se spustí na stránce drd2srd.d20.cz, stáhne ji,
  // převede na balíčky a nabídne je ke stažení. Aplikace ani tento web žádný text SRD neobsahují ani nehostují.
  const script = new URL('srd-import.js', location.href.split('#')[0]).href
  const bookmarklet = `javascript:(()=>{var s=document.createElement('script');s.src='${script}?'+Date.now();document.head.appendChild(s)})()`
  const userscript = new URL('srd-import.user.js', location.href.split('#')[0]).href
  const SRD = 'https://drd2srd.d20.cz/'
  // dotykové zařízení (telefon, tablet) dostane postup pro telefon, ostatní postup pro počítač
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  let other = $state(false)
  let copied = $state('')
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      copied = what
      setTimeout(() => (copied = ''), 2500)
    } catch {
      /* schránka není dostupná */
    }
  }
</script>

<h2>Převod SRD z webu</h2>
<div class="panel">
  <p>
    Balíčky pravidel a bestiáře si můžete sestavit sami z veřejného SRD, aniž byste cokoli stahovali
    z cizích zdrojů. Převod proběhne ve vašem prohlížeči a texty zůstanou jen u vás. Převodník se
    spouští na stránce <a href={SRD} target="_blank" rel="noreferrer">drd2srd.d20.cz</a>, kterou
    otevřete ve <strong>svém</strong> prohlížeči (odkaz z aplikace by se mohl otevřít v jiném, proto si
    adresu zkopírujte).
  </p>
  <p class="actions">
    <button onclick={() => copy(SRD, 'adresa')}>Zkopírovat adresu SRD</button>
    {#if copied === 'adresa'}<span role="status">Zkopírováno ✓</span>{/if}
  </p>

  {#if !touch || other}
    <h3>Počítač (Firefox, Chrome, Edge)</h3>
    <ol>
      <li>
        Přetáhněte toto tlačítko do lišty záložek:
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="btn primary" href={bookmarklet} onclick={(e) => e.preventDefault()}>Převést SRD</a
        >
      </li>
      <li>Otevřete SRD a klepněte na záložku.</li>
    </ol>
  {/if}

  {#if touch || other}
    <h3>Telefon (doporučeno: Firefox s doplňkem Violentmonkey)</h3>
    <ol>
      <li>
        Ve Firefoxu otevřete Menu → Doplňky a nainstalujte <strong>Violentmonkey</strong> (nebo Tampermonkey).
      </li>
      <li>
        Otevřete <a href={userscript}>instalaci skriptu</a> (nebo
        <button onclick={() => copy(userscript, 'skript')}>zkopírujte adresu</button
        >{#if copied === 'skript'}
          ✓{/if} a vložte ji do Firefoxu) a potvrďte ji. Skript jen přidá na stránce SRD tlačítko; nic
        jiného nedělá.
      </li>
      <li>
        Otevřete SRD (adresu vložte do prohlížeče) a klepněte na tlačítko <em>Převést SRD</em> vpravo
        dole.
      </li>
    </ol>
  {/if}

  <p>
    Po chvíli se ukáže okno se dvěma soubory <code>.json</code>. Stáhněte je a načtěte tady nahoře
    tlačítkem Načíst balíček.
  </p>
  {#if !touch}
    <details>
      <summary>Odkaz záložky (jen pro prohlížeče, které záložky se skripty podporují)</summary>
      <textarea rows="4" readonly value={bookmarklet} aria-label="Odkaz záložky"></textarea>
      <button onclick={() => copy(bookmarklet, 'zalozka')}>Zkopírovat</button>
      {#if copied === 'zalozka'}<span role="status">Zkopírováno ✓</span>{/if}
    </details>
  {:else}
    <p class="muted">
      Nejde-li to, sestavte balíčky na počítači (stačí otevřít SRD a použít záložku) a soubory
      přeneste do telefonu.
    </p>
  {/if}
  <p class="muted">
    <button onclick={() => (other = !other)}>
      {other
        ? 'Skrýt druhý postup'
        : touch
          ? 'Ukázat postup pro počítač'
          : 'Ukázat postup pro telefon'}
    </button>
  </p>
</div>
