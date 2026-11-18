import { describe, expect, it } from 'vitest'
import { nextBanner, type BannerWants } from './banners'

const none: BannerWants = { appUpdate: false, outdated: false, update: false, first: false, install: false }

describe('fronta pruhů', () => {
  it('bez požadavku není žádný pruh', () => {
    expect(nextBanner(none)).toBeUndefined()
  })
  it('vyhrává pruh s nejvyšší prioritou: aplikace, zastaralé, novější, první stažení, instalace', () => {
    const all = { appUpdate: true, outdated: true, update: true, first: true, install: true }
    expect(nextBanner(all)).toBe('app-update')
    expect(nextBanner({ ...all, appUpdate: false })).toBe('packs-outdated')
    expect(nextBanner({ ...all, appUpdate: false, outdated: false })).toBe('packs-update')
    expect(nextBanner({ ...none, first: true, install: true })).toBe('packs-first')
    expect(nextBanner({ ...none, install: true })).toBe('install')
  })
})
