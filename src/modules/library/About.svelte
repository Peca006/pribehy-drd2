<script lang="ts">
  // O aplikaci: autor, licence, poděkování a zdroje. Odkazy vedou na veřejné stránky projektu.
  const REPO = 'https://github.com/Peca006/pribehy-drd2'
</script>

<h2>O aplikaci</h2>
<div class="panel about">
  <p>
    <strong>Příběhy v Dračím doupěti</strong> je pomocník pro hráče a vypravěče Dračího doupěte 2:
    postavy, družiny, bestiář, pravidla po ruce a sdílení bez serveru. Autor: Petr Palička.
  </p>
  <p class="muted">
    Neoficiální fanouškovský nástroj, nekomerční a bez reklam. Není vytvořen, schválen ani
    podporován nakladatelstvím Altar. Názvy a značky patří jejich vlastníkům.
  </p>
  <p>
    Zdrojový kód: <a href={REPO} target="_blank" rel="noopener">GitHub</a>, licence
    <a href="{REPO}/blob/main/LICENSE" target="_blank" rel="noopener">GPL-3.0-or-later</a>.
    Licence kódu se netýká textů pravidel.
  </p>
</div>

<div class="panel about">
  <strong>Poděkování</strong>
  <ul>
    <li>
      <strong>Nakladatelství Altar</strong> za svolení využít SRD v nekomerční aplikaci
      (<a href="{REPO}/blob/main/content-packs/srd/SVOLENI.md" target="_blank" rel="noopener"
        >přepis svolení</a
      >).
    </li>
    <li>
      <strong>Autoři Dračího doupěte 2</strong> a SRD na
      <a href="https://drd2srd.d20.cz/" target="_blank" rel="noopener">drd2srd.d20.cz</a>, ze
      kterého se berou texty stahovaných balíčků.
    </li>
    <li>
      <strong>Truhlice</strong> (autor Nogrim) jako ideová inspirace. Nepoužívá se z ní žádný kód,
      text ani data.
    </li>
    <li>
      <strong>Testeři a hráčská komunita</strong> za zkoušení, připomínky a trpělivost.
    </li>
  </ul>
</div>

<div class="panel about">
  <strong>Použité knihovny</strong>
  <ul>
    <li>
      <a href="https://svelte.dev/" target="_blank" rel="noopener">Svelte</a> a
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> (MIT)
    </li>
    <li>
      <a href="https://github.com/cozmo/jsQR" target="_blank" rel="noopener">jsQR</a> čtení QR
      kódů (Apache-2.0)
    </li>
    <li>
      <a href="https://github.com/kazuhikoarase/qrcode-generator" target="_blank" rel="noopener"
        >qrcode-generator</a
      > tvorba QR kódů (MIT)
    </li>
    <li>
      <a href="https://developer.chrome.com/docs/workbox" target="_blank" rel="noopener">Workbox</a>
      práce offline a mezipaměť v prohlížeči (MIT)
    </li>
  </ul>
</div>

<style>
  .about ul {
    margin: 0.4rem 0 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.4rem;
  }
</style>
