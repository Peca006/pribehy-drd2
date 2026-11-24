// Který vzhled se právě použije: volba uživatele + nainstalované Hávy + systémové schéma + viewport.
// Čistá funkce, bez DOM; napojení na okno je v `runtime.ts`.
import type { Theme } from '../theme'
import { darkTheme, lightTheme } from '../../themes/default'
import { BUILTIN_SKINS } from '../../themes/havy'
import { skinTheme, type Skin, type Viewport } from './skin'

export const SYSTEM_CHOICE = 'system'

/** Vestavěné volby (výchozí skiny a vestavěné Hávy); ostatní hodnoty jsou `id` nainstalovaných Hávů. */
export const BUILTIN_CHOICES: { id: string; name: string }[] = [
  { id: SYSTEM_CHOICE, name: 'Podle systému' },
  { id: lightTheme.id, name: lightTheme.name },
  { id: darkTheme.id, name: darkTheme.name },
  ...BUILTIN_SKINS.map((s) => ({ id: s.id, name: s.name })),
]

export const isBuiltinChoice = (id: string) => BUILTIN_CHOICES.some((c) => c.id === id)

export type SystemScheme = 'light' | 'dark'

/**
 * Náhled Hávu v rámečku zařízení (Šatník): aplikace v `<iframe>` dostane `?hav=<volba>` a použije ji místo uložené
 * volby, takže Háv jde prohlížet bez aktivace. Vrací volbu, nebo null (běžné spuštění či neplatná hodnota).
 */
export function previewChoiceFromSearch(search: string): string | null {
  const v = new URLSearchParams(search).get('hav')
  return v !== null && /^[a-z0-9-]{1,40}$/.test(v) ? v : null
}

/**
 * Viewport pro výběr vzhledu. Při psaní do pole se na telefonu vysune klávesnice a zmenší se výška okna; to nesmí
 * přepnout orientaci ani „nízký“ viewport (vzhled by se mihotal), takže se tyto dva údaje ponechají z posledního stavu.
 * Šířka se bere vždy z měření.
 */
export function effectiveViewport(
  measured: Viewport,
  last: Viewport | null,
  typing: boolean,
): Viewport {
  return last && typing ? { ...measured, orientation: last.orientation, low: last.low } : measured
}

/** Háv podle volby: vestavěné mají přednost (Háv ze souboru jejich id nesmí mít, ale pro jistotu); jinak null. */
export function findSkin(choice: string, installed: readonly Skin[]): Skin | null {
  return (
    BUILTIN_SKINS.find((s) => s.id === choice) ?? installed.find((s) => s.id === choice) ?? null
  )
}

/**
 * Téma pro volbu. `assetUrls` jsou adresy obrázků zvoleného Hávu (název → `blob:`); dokud nejsou načtené, použijí se
 * jen barvy.
 */
export function pickTheme(
  choice: string,
  installed: readonly Skin[],
  system: SystemScheme,
  viewport: Viewport,
  assetUrls: Readonly<Record<string, string>> = {},
): Theme {
  if (choice === lightTheme.id) return lightTheme
  if (choice === darkTheme.id) return darkTheme
  const skin = findSkin(choice, installed)
  if (skin) return skinTheme(skin, viewport, assetUrls)
  // „podle systému“, ale i smazaný či neplatný Háv: aplikace musí vždy zůstat použitelná
  return system === 'light' ? lightTheme : darkTheme
}
