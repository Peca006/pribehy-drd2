import { describe, expect, it } from 'vitest'
import { crc32, isSafeZipName, readZip, writeZip, ZipError, type ZipLimits } from './zip'

const LIMITS: ZipLimits = {
  maxEntries: 8,
  maxEntryBytes: 1024 * 1024,
  maxTotalBytes: 4 * 1024 * 1024,
}
const enc = new TextEncoder()
const text = (s: string) => enc.encode(s)
const str = (b: Uint8Array) => new TextDecoder().decode(b)

/** Dá se přepsat pole v centrálním adresáři první položky (jediný zdroj pravdy při čtení). */
function patched(zip: Uint8Array, fn: (view: DataView, central: number) => void): Uint8Array {
  const copy = zip.slice()
  const view = new DataView(copy.buffer)
  fn(view, view.getUint32(copy.length - 22 + 16, true))
  return copy
}

const rejects = async (zip: Uint8Array, fragment: string, limits = LIMITS) => {
  const err = await readZip(zip, limits).then(
    () => null,
    (e) => e,
  )
  expect(err).toBeInstanceOf(ZipError)
  expect((err as ZipError).message).toContain(fragment)
}

describe('crc32', () => {
  it('odpovídá známé hodnotě', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('isSafeZipName', () => {
  it.each(['manifest.json', 'assets/bg-1.png', 'a/b/c.txt'])('přijme %s', (n) =>
    expect(isSafeZipName(n)).toBe(true),
  )
  it.each([
    '',
    '/a',
    'a/',
    '../a',
    'a/../b',
    './a',
    'a//b',
    'a\\b',
    'a b',
    'č.txt',
    'a:b',
    'x'.repeat(121),
  ])('odmítne %j', (n) => expect(isSafeZipName(n)).toBe(false))
})

describe('zápis a čtení', () => {
  it('vrátí totéž, co se zapsalo (komprimovatelná, nekomprimovatelná i prázdná data)', async () => {
    const noise = new Uint8Array(2000).map((_, i) => (i * 2654435761) >>> 24)
    const files = [
      { name: 'manifest.json', data: text('{"a":1}'.repeat(500)) },
      { name: 'assets/noise.bin', data: noise },
      { name: 'empty.txt', data: new Uint8Array() },
    ]
    const back = await readZip(await writeZip(files), LIMITS)
    expect(back.map((f) => f.name)).toEqual(files.map((f) => f.name))
    back.forEach((f, i) => expect(f.data).toEqual(files[i]!.data))
  })

  it('komprimovatelná data zmenší, nekomprimovatelná uloží beze změny', async () => {
    const big = text('abcdefgh'.repeat(1000))
    expect((await writeZip([{ name: 'a.txt', data: big }])).length).toBeLessThan(big.length / 4)
  })

  it('výstup je opakovatelný (stejný vstup dá stejné bajty)', async () => {
    const f = [{ name: 'a.txt', data: text('hello hello hello hello') }]
    expect(await writeZip(f)).toEqual(await writeZip(f))
  })

  it('zapisovač odmítne nebezpečná a duplicitní jména', async () => {
    await expect(writeZip([{ name: '../x', data: text('x') }])).rejects.toBeInstanceOf(ZipError)
    await expect(
      writeZip([
        { name: 'a', data: text('1') },
        { name: 'a', data: text('2') },
      ]),
    ).rejects.toBeInstanceOf(ZipError)
  })

  it('přečte archiv vyrobený jiným nástrojem (PowerShell Compress-Archive)', async () => {
    const b64 =
      'UEsDBBQAAAAIAPqxeF050g0iegAAAJcAAAANAAAAbWFuaWZlc3QuanNvbh3NwQnDMAwF0F3UaxxscvM1dIMuIGSFmDQ2yGophIzUKbpYFR//0//ogEYr7wgxDJATROCPspQMAxTc2eDe4fc1ebO0XIthGP3oTfClaxWDBze1/MzEpV2zefYu9E7/cFFC2Sxr3awD8QDnkiSHZBu1+21ZiKYJzvMPUEsBAhQAFAAAAAgA+rF4XTnSDSJ6AAAAlwAAAA0AAAAAAAAAAAAAAAAAAAAAAG1hbmlmZXN0Lmpzb25QSwUGAAAAAAEAAQA7AAAApQAAAAAA'
    const files = await readZip(
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
      LIMITS,
    )
    expect(files.map((f) => f.name)).toEqual(['manifest.json'])
    expect(JSON.parse(str(files[0]!.data))).toMatchObject({ id: 'externi', scheme: 'dark' })
  })
})

describe('poškozené a nebezpečné archivy', () => {
  const one = () => writeZip([{ name: 'a.txt', data: text('x'.repeat(100)) }])

  it('nesmysl a prázdný vstup nejsou ZIP', async () => {
    await rejects(new Uint8Array(), 'ZIP')
    await rejects(text('tohle není archiv, jen delší text, který tam nic nenajde'), 'ZIP')
  })

  it('useknutý archiv', async () => {
    const z = await one()
    await rejects(z.slice(0, z.length - 10), 'ZIP')
    await rejects(z.slice(0, 20), 'ZIP')
  })

  it('špatný kontrolní součet (uložená i deflate položka)', async () => {
    const stored = await writeZip([
      { name: 'a.txt', data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) },
    ])
    const flipped = stored.slice()
    flipped[30 + 5 + 2]! ^= 0xff // bajt dat první položky
    await rejects(flipped, 'kontrolní součet')
    await rejects(
      patched(await one(), (v, c) => v.setUint32(c + 16, 0x12345678, true)),
      'kontrolní součet',
    )
  })

  it('zip bomba: hlavička lže o velikosti (rozbalené je víc, než slibuje)', async () => {
    const bomb = await writeZip([{ name: 'a.txt', data: new Uint8Array(3 * 1024 * 1024) }]) // nuly: dobře se komprimují
    expect(bomb.length).toBeLessThan(10_000)
    await rejects(
      patched(bomb, (v, c) => v.setUint32(c + 24, 50, true)),
      'větší, než je povoleno',
    )
  })

  it('pravdivá hlavička nad limitem se odmítne hned', async () => {
    const big = await writeZip([{ name: 'a.txt', data: new Uint8Array(3 * 1024 * 1024) }])
    await rejects(big, 'větší než', LIMITS)
  })

  it('celkový limit po rozbalení', async () => {
    const f = new Uint8Array(600 * 1024)
    const z = await writeZip([
      { name: 'a.bin', data: f },
      { name: 'b.bin', data: f },
    ])
    await rejects(z, 'příliš velký', { ...LIMITS, maxTotalBytes: 1000 * 1024 })
  })

  it('příliš mnoho položek', async () => {
    const files = Array.from({ length: 9 }, (_, i) => ({ name: `f${i}.txt`, data: text('x') }))
    await rejects(await writeZip(files), 'příliš mnoho')
  })

  it('šifrování, ZIP64, vícedílné a neznámá komprese', async () => {
    const z = await one()
    await rejects(
      patched(z, (v, c) => v.setUint16(c + 8, 0x0001, true)),
      'šifrovan',
    )
    await rejects(
      patched(z, (v, c) => v.setUint32(c + 20, 0xffffffff, true)),
      'ZIP64',
    )
    await rejects(
      patched(z, (v) => v.setUint16(z.length - 22 + 4, 1, true)),
      'vícedílné',
    )
    await rejects(
      patched(z, (v) => v.setUint16(z.length - 22 + 10, 0xffff, true)),
      'vícedílné',
    )
    await rejects(
      patched(z, (v, c) => v.setUint16(c + 10, 12, true)),
      'komprese',
    )
  })

  it.each([
    ['../x1', 'nepovolený název'],
    ['/a.tx', 'nepovolený název'],
    ['a\\b.t', 'nepovolený název'],
    ['a b.t', 'nepovolený název'],
  ])('nebezpečný název %j v archivu', async (name, fragment) => {
    const z = patched(await writeZip([{ name: 'a.txt', data: text('x') }]), (v, c) => {
      for (let i = 0; i < 5; i++) v.setUint8(c + 46 + i, name.charCodeAt(i))
    })
    await rejects(z, fragment)
  })

  it('duplicitní jména a přeskočení složek', async () => {
    const two = await writeZip([
      { name: 'a.txt', data: text('1') },
      { name: 'b.txt', data: text('2') },
    ])
    const dup = patched(two, (v, c) => {
      const second = c + 46 + 5 // druhá položka centrálního adresáře
      for (let i = 0; i < 5; i++) v.setUint8(second + 46 + i, 'a.txt'.charCodeAt(i))
    })
    await rejects(dup, 'dvakrát')
    const dir = patched(two, (v, c) => {
      for (let i = 0; i < 5; i++) v.setUint8(c + 46 + i, 'abcd/'.charCodeAt(i))
    })
    expect((await readZip(dir, LIMITS)).map((f) => f.name)).toEqual(['b.txt'])
  })

  it('poškozená deflate data', async () => {
    const z = await one()
    const bad = z.slice()
    for (let i = 35; i < 40; i++) bad[i] = 0xff
    await rejects(bad, 'archivu')
  })
})
