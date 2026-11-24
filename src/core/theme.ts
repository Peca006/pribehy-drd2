// Skin = sada design tokenů (CSS proměnných). Komponenty nesmí mít pevné rozměry ani barvy;
// vše čerpají z proměnných `--drd-*`. Další skiny (i od komunity) jen dodají jinou mapu tokenů.

export type ThemeTokens = Record<`--drd-${string}`, string>

export interface Theme {
  id: string
  name: string
  /** základní schéma, ze kterého skin vychází */
  scheme: 'light' | 'dark'
  tokens: ThemeTokens
}

export function tokensToCss(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([k, v]) => `${k}:${v};`)
    .join('')
}

// Proměnné, které `applyTheme` posledně nastavil, aby šly při změně tématu odebrat: Háv s obrázky (role) nastavuje
// proměnné, které jiný Háv nemá, a staré by jinak zůstaly viset a obrázky by zůstaly vidět.
const applied = new WeakMap<HTMLElement, Set<string>>()

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme.id
  root.style.colorScheme = theme.scheme
  const previous = applied.get(root)
  if (previous) for (const k of previous) if (!(k in theme.tokens)) root.style.removeProperty(k)
  for (const [k, v] of Object.entries(theme.tokens)) root.style.setProperty(k, v)
  applied.set(root, new Set(Object.keys(theme.tokens)))
}
