/** Pruhy nad navigací; ukazuje se vždy nejvýš jeden, podle priority shora dolů. */
export type BannerKind = 'app-update' | 'packs-outdated' | 'packs-update' | 'packs-first' | 'install'

/** Které pruhy se zrovna mají nabídnout (po odečtení těch, které uživatel skryl). */
export type BannerWants = Record<'appUpdate' | 'outdated' | 'update' | 'first' | 'install', boolean>

const ORDER: [keyof BannerWants, BannerKind][] = [
  ['appUpdate', 'app-update'],
  ['outdated', 'packs-outdated'],
  ['update', 'packs-update'],
  ['first', 'packs-first'],
  ['install', 'install'],
]

export const nextBanner = (w: BannerWants): BannerKind | undefined =>
  ORDER.find(([key]) => w[key])?.[1]
