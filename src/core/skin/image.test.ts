import { describe, expect, it } from 'vitest'
import { inspectImage, MAX_IMAGE_SIDE, MAX_SVG_BYTES } from './image'

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const text = (s: string) => new TextEncoder().encode(s)

// minimální platné obrázky 1 × 1 px
const PNG = b64(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
)
const JPEG = b64(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
)
const WEBP_LOSSLESS = b64('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==')
const WEBP_LOSSY = b64('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA')

const svg = (body = '<rect width="10" height="10"/>') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">${body}</svg>`

const err = (bytes: Uint8Array) => {
  const r = inspectImage(bytes)
  expect(r.ok).toBe(false)
  return r.ok ? '' : r.error
}

describe('rastrové obrázky', () => {
  it.each([
    ['PNG', PNG, 'image/png'],
    ['JPEG', JPEG, 'image/jpeg'],
    ['WebP lossless', WEBP_LOSSLESS, 'image/webp'],
    ['WebP lossy', WEBP_LOSSY, 'image/webp'],
  ])('%s: přečte typ a rozměry z hlavičky', (_n, bytes, type) => {
    expect(inspectImage(bytes)).toEqual({ ok: true, info: { type, width: 1, height: 1 } })
  })

  it('typ určuje obsah, ne přípona ani deklarace (PNG pod jiným názvem je pořád PNG)', () => {
    expect(inspectImage(PNG)).toMatchObject({ ok: true, info: { type: 'image/png' } })
  })

  it('PNG s obřími rozměry se odmítne', () => {
    const big = PNG.slice()
    new DataView(big.buffer).setUint32(16, MAX_IMAGE_SIDE + 1)
    expect(err(big)).toContain('větší než')
    const many = PNG.slice() // 4096 × 4096 má příliš mnoho pixelů
    new DataView(many.buffer).setUint32(16, 4096)
    new DataView(many.buffer).setUint32(20, 4096)
    expect(err(many)).toContain('příliš mnoho pixelů')
    const zero = PNG.slice()
    new DataView(zero.buffer).setUint32(16, 0)
    expect(err(zero)).toContain('nulový')
  })

  it('poškozené hlavičky', () => {
    expect(err(PNG.slice(0, 20))).toContain('PNG')
    const noIhdr = PNG.slice()
    noIhdr[12] = 0x58
    expect(err(noIhdr)).toContain('PNG')
    expect(err(JPEG.slice(0, 12))).toContain('JPEG')
    expect(err(WEBP_LOSSLESS.slice(0, 24))).toContain('WebP')
    const wrongSig = WEBP_LOSSLESS.slice()
    wrongSig[20] = 0
    expect(err(wrongSig)).toContain('WebP')
  })
})

describe('nepodporované vstupy', () => {
  it.each([
    ['prázdný soubor', new Uint8Array()],
    ['krátký soubor', new Uint8Array([1, 2, 3])],
    ['GIF', text('GIF89a\u0001\u0000\u0001\u0000xxxxxxxxxxxxxxxxxxx')],
    ['text', text('tohle není obrázek, jen delší běžný text bez značek')],
    ['HTML', text('<html><body><script>alert(1)</script></body></html>')],
    ['ZIP', text('PK\u0003\u0004 něco jako archiv, ale bez obrázku vůbec nic')],
  ])('%s', (_n, bytes) => {
    expect(err(bytes)).toEqual(expect.any(String))
  })
})

describe('SVG', () => {
  it.each([
    ['jednoduchý', svg()],
    [
      's deklarací XML a komentářem',
      `<?xml version="1.0" encoding="UTF-8"?>\n<!-- x -->\n${svg()}`,
    ],
    [
      's gradientem a odkazem na #id',
      svg('<defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="4" height="4"/>'),
    ],
    [
      's filtrem a šumem (mramor)',
      svg(
        '<filter id="f"><feTurbulence baseFrequency="0.02"/></filter><rect filter="url(#f)" width="9" height="9"/>',
      ),
    ],
    ['s use na #id', svg('<defs><g id="a"/></defs><use href="#a"/><use xlink:href="#a"/>')],
    ['s BOM', String.fromCharCode(0xfeff) + svg()],
  ])('přijme: %s', (_n, source) => {
    expect(inspectImage(text(source))).toEqual({ ok: true, info: { type: 'image/svg+xml' } })
  })

  it.each([
    ['skript', svg('<script>alert(1)</script>')],
    ['skript velkými písmeny', svg('<SCRIPT>alert(1)</SCRIPT>')],
    ['událost', svg('<rect onload="x()" width="1" height="1"/>')],
    ['událost s mezerou', svg('<rect onclick = "x()" width="1" height="1"/>')],
    ['foreignObject', svg('<foreignObject><div/></foreignObject>')],
    ['iframe', svg('<iframe src="x"/>')],
    ['javascript:', svg('<a href="javascript:alert(1)"><rect width="1" height="1"/></a>')],
    ['cizí href', svg('<image href="https://example.com/x.png"/>')],
    ['cizí xlink:href', svg('<image xlink:href="//example.com/x.png"/>')],
    ['data URL v href', svg('<image href="data:image/png;base64,AAAA"/>')],
    ['cizí url()', svg('<rect fill="url(https://example.com/a.svg#x)"/>')],
    ['url() v CSS', svg('<style>rect{fill:url("http://example.com/a")}</style>')],
    ['@import', svg('<style>@import "http://example.com/a.css";</style>')],
    ['entita', `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "b">]>${svg()}`],
    ['animace odkazu', svg('<animate attributeName="href" values="javascript:x"/>')],
  ])('odmítne: %s', (_n, source) => {
    expect(err(text(source))).toContain('SVG')
  })

  it('odmítne příliš velké SVG a neplatné UTF-8 a soubor, který jen vypadá jako SVG', () => {
    expect(err(text(svg('<!-- ' + 'x'.repeat(MAX_SVG_BYTES) + ' -->')))).toContain('větší')
    expect(
      err(Uint8Array.from([...text('<svg xmlns="x">'), 0xff, 0xfe, ...text('</svg>')])),
    ).toContain('UTF-8')
    expect(err(text('nějaký text a pak <svg>, ale není to na začátku'))).toContain('není SVG')
  })
})
