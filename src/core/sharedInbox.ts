// Kód sdílený do aplikace z jiné aplikace (cíl sdílení, viz public/share-target.js). Service worker ho uloží
// do cache; Import ho jednorázově vyzvedne.
export async function takeShared(): Promise<string | undefined> {
  try {
    const cache = await caches.open('drd2-shared')
    const r = await cache.match('shared')
    if (!r) return undefined
    await cache.delete('shared')
    return (await r.text()) || undefined
  } catch {
    return undefined
  }
}
