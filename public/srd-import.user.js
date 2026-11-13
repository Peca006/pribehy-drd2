// ==UserScript==
// @name         Příběhy v Dračím doupěti: převod SRD
// @namespace    https://github.com/Peca006/pribehy-drd2
// @description  Na stránce drd2srd.d20.cz přidá tlačítko, které SRD převede na balíčky pro aplikaci Příběhy v Dračím doupěti. Vše běží ve vašem prohlížeči.
// @version      1.0
// @match        https://drd2srd.d20.cz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  if (document.getElementById('drd2-srd-start')) return
  const b = document.createElement('button')
  b.id = 'drd2-srd-start'
  b.textContent = 'Převést SRD'
  b.setAttribute(
    'style',
    'position:fixed;z-index:2147483646;right:1rem;bottom:1rem;padding:.7rem 1rem;font:16px system-ui,sans-serif;' +
      'background:#c9a15b;color:#1c1a17;border:0;border-radius:8px;box-shadow:0 2px 10px #0007',
  )
  b.onclick = () => {
    const s = document.createElement('script')
    s.src = 'https://peca006.github.io/pribehy-drd2/srd-import.js?' + Date.now()
    document.head.appendChild(s)
  }
  document.body.appendChild(b)
})()
