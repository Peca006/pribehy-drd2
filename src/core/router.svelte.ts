// Jednoduchý směrovač nad `location.hash`: `#/modul/parametr/…`. Tlačítko „Zpět“ prohlížeče
// i telefonu tak funguje samo a každé místo v aplikaci má odkaz, který lze sdílet či uložit.
export interface Route {
  module: string
  params: string[]
}

export const parseHash = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  return { module: parts[0] ?? '', params: parts.slice(1) }
}

export const toHash = (module: string, ...params: string[]): string =>
  '#/' + [module, ...params].map(encodeURIComponent).join('/')

export const router = $state<Route>({ module: '', params: [] })

function sync() {
  const r = parseHash(location.hash)
  router.module = r.module
  router.params = r.params
}

export function startRouter() {
  sync()
  addEventListener('hashchange', sync)
}

export const go = (module: string, ...params: string[]) => {
  location.hash = toHash(module, ...params)
}
export const back = () => history.back()
