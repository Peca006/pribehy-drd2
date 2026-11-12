<script lang="ts">
  // Převod SRD přímo v prohlížeči uživatele: záložka (bookmarklet) se spustí na stránce drd2srd.d20.cz, stáhne ji,
  // převede na balíčky a nabídne je ke stažení. Aplikace ani tento web žádný text SRD neobsahují ani nehostují.
  const script = new URL('srd-import.js', location.href.split('#')[0]).href
  const bookmarklet = `javascript:(()=>{var s=document.createElement('script');s.src='${script}?'+Date.now();document.head.appendChild(s)})()`
</script>

<h2>Převod SRD z webu</h2>
<div class="panel">
  <p>
    Balíčky pravidel a bestiáře si můžete sestavit sami z veřejného SRD, aniž byste cokoli stahovali
    z cizích zdrojů. Převod proběhne ve vašem prohlížeči a texty zůstanou jen u vás.
  </p>
  <ol>
    <li>
      Přetáhněte toto tlačítko do lišty záložek:
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a class="btn primary" href={bookmarklet} onclick={(e) => e.preventDefault()}>Převést SRD</a>
      <span class="muted">(na mobilu přidejte záložku ručně a vložte do ní tento odkaz)</span>
    </li>
    <li>
      Otevřete <a href="https://drd2srd.d20.cz/" target="_blank" rel="noreferrer">drd2srd.d20.cz</a>
      a klepněte na záložku.
    </li>
    <li>
      Po chvíli se ukáže okno se dvěma soubory <code>.json</code>. Stáhněte je a načtěte tady nahoře
      tlačítkem Načíst balíček.
    </li>
  </ol>
  <details>
    <summary>Odkaz záložky (pro mobil)</summary>
    <textarea rows="4" readonly value={bookmarklet} aria-label="Odkaz záložky"></textarea>
  </details>
  <p class="muted">
    Nepodporují-li záložky váš prohlížeč, sestavte balíčky na počítači (viz README) a soubory sem
    přeneste.
  </p>
</div>
