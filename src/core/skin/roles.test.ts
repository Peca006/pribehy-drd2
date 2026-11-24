import { describe, expect, it } from 'vitest'
import {
  mergeRoles,
  roleVariables,
  rolesImages,
  validateRole,
  validateRoles,
  type Role,
  type Roles,
} from './roles'

const ASSETS = new Set(['marble', 'frame'])

function check(raw: unknown, assets = ASSETS) {
  const issues: { level: string; path: string; message: string }[] = []
  const role = validateRole(raw, 'roles.panel', assets, (level, path, message) =>
    issues.push({ level, path, message }),
  )
  return { role, issues }
}

describe('validateRole', () => {
  it('přijme dlaždici, roztažení i rámeček', () => {
    expect(check({ image: 'marble', mode: 'repeat', size: 128 }).role).toEqual({
      image: 'marble',
      mode: 'repeat',
      size: 128,
    })
    expect(check({ image: 'marble', mode: 'cover', position: 'top left' }).role).toMatchObject({
      mode: 'cover',
      position: 'top left',
    })
    expect(check({ image: 'frame', mode: 'slice', slice: 16 }).role).toEqual({
      image: 'frame',
      mode: 'slice',
      slice: [16, 16, 16, 16],
    })
    expect(
      check({
        image: 'frame',
        mode: 'slice',
        slice: [1, 2, 3, 4],
        width: [8, 8, 8, 8],
        fill: false,
      }).role,
    ).toEqual({
      image: 'frame',
      mode: 'slice',
      slice: [1, 2, 3, 4],
      width: [8, 8, 8, 8],
      fill: false,
    })
  })

  it.each([
    ['není objekt', 'x'],
    ['pole', []],
    ['chybí obrázek', { mode: 'repeat' }],
    ['neznámý obrázek', { image: 'nic', mode: 'repeat' }],
    ['obrázek není text', { image: 5, mode: 'repeat' }],
    ['chybí režim', { image: 'marble' }],
    ['neznámý režim', { image: 'marble', mode: 'zoom' }],
    ['slice bez okrajů', { image: 'frame', mode: 'slice' }],
    ['slice se zápornou hodnotou', { image: 'frame', mode: 'slice', slice: -1 }],
    ['slice s desetinným číslem', { image: 'frame', mode: 'slice', slice: 1.5 }],
    ['slice se třemi hodnotami', { image: 'frame', mode: 'slice', slice: [1, 2, 3] }],
    ['slice nad mezí', { image: 'frame', mode: 'slice', slice: 5000 }],
    ['příliš široký rámeček', { image: 'frame', mode: 'slice', slice: 8, width: 100 }],
    ['fill není boolean', { image: 'frame', mode: 'slice', slice: 8, fill: 'ano' }],
    ['velikost nula', { image: 'marble', mode: 'repeat', size: 0 }],
    ['velikost nad mezí', { image: 'marble', mode: 'repeat', size: 99999 }],
    ['velikost jako text', { image: 'marble', mode: 'repeat', size: '10px' }],
    ['neznámá pozice', { image: 'marble', mode: 'cover', position: 'url(x)' }],
    ['pixelated není boolean', { image: 'marble', mode: 'repeat', pixelated: 'ano' }],
  ])('odmítne: %s', (_n, raw) => {
    const r = check(raw)
    expect(r.role).toBeNull()
    expect(r.issues.some((i) => i.level === 'error')).toBe(true)
  })

  it('nepoužité položky varují, ale nevadí', () => {
    const r = check({ image: 'marble', mode: 'stretch', size: 64, slice: 4, extra: 1 })
    expect(r.role).toEqual({ image: 'marble', mode: 'stretch' })
    expect(r.issues.map((i) => i.path).sort()).toEqual(
      ['roles.panel.extra', 'roles.panel.size', 'roles.panel.slice'].sort(),
    )
    expect(r.issues.every((i) => i.level === 'warning')).toBe(true)
  })
})

describe('validateRole: edge a height', () => {
  it('přijme edge u slice a height u dělicí čáry', () => {
    expect(check({ image: 'frame', mode: 'slice', slice: 4, edge: 'repeat' }).role).toMatchObject({
      edge: 'repeat',
    })
    expect(check({ image: 'marble', mode: 'repeat-x', height: 8 }).role).toMatchObject({
      height: 8,
    })
  })
  it.each([
    ['neznámý edge', { image: 'frame', mode: 'slice', slice: 4, edge: 'cover' }],
    ['height nula', { image: 'marble', mode: 'repeat-x', height: 0 }],
    ['height nad mezí', { image: 'marble', mode: 'repeat-x', height: 9999 }],
    ['height desetinná', { image: 'marble', mode: 'repeat-x', height: 2.5 }],
  ])('odmítne: %s', (_n, raw) => {
    expect(check(raw).role).toBeNull()
  })
  it('edge mimo režim slice varuje', () => {
    const r = check({ image: 'marble', mode: 'repeat', edge: 'round' })
    expect(r.role).toEqual({ image: 'marble', mode: 'repeat' })
    expect(r.issues).toEqual([
      expect.objectContaining({ level: 'warning', path: 'roles.panel.edge' }),
    ])
  })
  it('height u jiné role než divider se ignoruje s varováním', () => {
    const issues: string[] = []
    const roles = validateRoles(
      {
        panel: { image: 'marble', mode: 'repeat', height: 5 },
        divider: { image: 'marble', mode: 'repeat-x', height: 5 },
      },
      'roles',
      ASSETS,
      (l, p) => issues.push(`${l}:${p}`),
    )
    expect(roles.panel).toEqual({ image: 'marble', mode: 'repeat' })
    expect(roles.divider).toMatchObject({ height: 5 })
    expect(issues).toEqual(['warning:roles.panel.height'])
  })
})

describe('validateRoles a mergeRoles', () => {
  const run = (raw: unknown, allowNull = false) => {
    const issues: string[] = []
    const roles = validateRoles(raw, 'roles', ASSETS, (l, p) => issues.push(`${l}:${p}`), allowNull)
    return { roles, issues }
  }

  it('neznámá role varuje, null je povolený jen ve variantě', () => {
    expect(run({ okno: { image: 'marble', mode: 'repeat' } }).issues).toEqual([
      'warning:roles.okno',
    ])
    expect(run({ panel: null }).issues).toEqual(['error:roles.panel'])
    expect(run({ panel: null }, true).roles).toEqual({ panel: null })
    expect(run(undefined).roles).toEqual({})
    expect(run([]).issues).toEqual(['error:roles'])
  })

  it('role pro viewport: varianta přepíše nebo vypne', () => {
    const marble: Role = { image: 'marble', mode: 'repeat' }
    const frame: Role = { image: 'frame', mode: 'slice', slice: [8, 8, 8, 8] }
    const base: Roles = { background: marble, panel: frame }
    expect(mergeRoles(base, [])).toEqual(base)
    expect(mergeRoles(base, [{ panel: null }])).toEqual({ background: marble })
    expect(mergeRoles(base, [{ panel: { ...frame, slice: [4, 4, 4, 4] } }]).panel!.slice).toEqual([
      4, 4, 4, 4,
    ])
    expect(mergeRoles(base, [{ panel: null }, { panel: frame }])).toEqual(base) // pozdější varianta vyhrává
    expect(base.panel).toBe(frame) // vstup se nemění
  })

  it('rolesImages vypíše použité obrázky', () => {
    expect(rolesImages({ background: { image: 'marble', mode: 'repeat' }, panel: null })).toEqual([
      'marble',
    ])
  })
})

describe('roleVariables', () => {
  const urls = { marble: 'blob:http://localhost/aaa', frame: 'blob:http://localhost/bbb' }

  it('dlaždice: obrázek, velikost, opakování a poloha', () => {
    const v = roleVariables({ background: { image: 'marble', mode: 'repeat', size: 128 } }, urls)
    expect(v).toEqual({
      '--drd-background-image': 'url("blob:http://localhost/aaa")',
      '--drd-background-size': '128px auto',
      '--drd-background-repeat': 'repeat',
      '--drd-background-position': '0 0',
      '--drd-background-render': 'auto',
    })
  })

  it.each([
    ['stretch', { mode: 'stretch' }, '100% 100%', 'no-repeat', 'center'],
    ['contain', { mode: 'contain' }, 'contain', 'no-repeat', 'center'],
    [
      'cover s polohou',
      { mode: 'cover', position: 'bottom right' },
      'cover',
      'no-repeat',
      'bottom right',
    ],
    ['repeat-x', { mode: 'repeat-x' }, 'auto', 'repeat-x', '0 0'],
    ['repeat-y s velikostí', { mode: 'repeat-y', size: 32 }, '32px auto', 'repeat-y', '0 0'],
  ])('režim %s', (_n, extra, size, repeat, position) => {
    const v = roleVariables({ tab: { image: 'marble', ...extra } as Role }, urls)
    expect(v['--drd-tab-size']).toBe(size)
    expect(v['--drd-tab-repeat']).toBe(repeat)
    expect(v['--drd-tab-position']).toBe(position)
    expect(v['--drd-tab-bi-source']).toBeUndefined()
  })

  it('rámeček: zdroj, řez a šířka (výchozí šířka = řez, tedy bez zvětšení)', () => {
    expect(
      roleVariables({ panel: { image: 'frame', mode: 'slice', slice: [16, 12, 16, 12] } }, urls),
    ).toEqual({
      '--drd-panel-bi-source': 'url("blob:http://localhost/bbb")',
      '--drd-panel-bi-slice': '16 12 16 12 fill',
      '--drd-panel-bi-width': '16px 12px 16px 12px',
      '--drd-panel-bi-repeat': 'stretch',
      '--drd-panel-bw': '16px 12px 16px 12px',
    })
    const v = roleVariables(
      {
        button: {
          image: 'frame',
          mode: 'slice',
          slice: [8, 8, 8, 8],
          width: [4, 4, 4, 4],
          fill: false,
        },
      },
      urls,
    )
    expect(v['--drd-button-bi-slice']).toBe('8 8 8 8') // bez fill: střed se nevyplní
    expect(v['--drd-button-bw']).toBe('4px 4px 4px 4px')
  })

  it('edge a výška dělicí čáry', () => {
    const v = roleVariables(
      { divider: { image: 'frame', mode: 'slice', slice: [4, 0, 0, 0], edge: 'round', height: 6 } },
      urls,
    )
    expect(v['--drd-divider-bi-repeat']).toBe('round')
    expect(v['--drd-divider-height']).toBe('6px')
    const t = roleVariables({ divider: { image: 'marble', mode: 'repeat-x', height: 10 } }, urls)
    expect(t['--drd-divider-height']).toBe('10px')
    expect(t['--drd-divider-bw']).toBe('0') // obrázek nahrazuje výchozí linku
    expect(v['--drd-divider-bw']).toBe('4px 0px 0px 0px') // u rámečku platí jeho šířka
  })

  it('pixelated se uplatní jen u pozadí', () => {
    expect(
      roleVariables({ background: { image: 'marble', mode: 'repeat', pixelated: true } }, urls)[
        '--drd-background-render'
      ],
    ).toBe('pixelated')
    expect(
      roleVariables({ panel: { image: 'marble', mode: 'repeat', pixelated: true } }, urls),
    ).not.toHaveProperty('--drd-background-render')
  })

  it('role bez adresy obrázku se vynechá', () => {
    expect(roleVariables({ panel: { image: 'frame', mode: 'repeat' } }, {})).toEqual({})
  })

  it.each([
    'javascript:alert(1)x y',
    'blob:x"y',
    'blob:x)y',
    'blob:x\\y',
    "blob:x'y",
    'neniurl',
    '',
    'blob:a\nb',
  ])('nebezpečnou adresu %j do CSS nevloží', (url) => {
    expect(
      roleVariables({ background: { image: 'marble', mode: 'repeat' } }, { marble: url }),
    ).toEqual({})
  })

  it('vyrobí jen proměnné --drd-*', () => {
    const v = roleVariables(
      {
        background: { image: 'marble', mode: 'repeat' },
        panel: { image: 'frame', mode: 'slice', slice: [8, 8, 8, 8] },
        button: { image: 'frame', mode: 'stretch' },
        tab: { image: 'marble', mode: 'repeat-x' },
        divider: { image: 'marble', mode: 'repeat-x' },
      },
      urls,
    )
    expect(Object.keys(v).every((k) => k.startsWith('--drd-'))).toBe(true)
  })
})
