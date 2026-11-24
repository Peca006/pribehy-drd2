// Který vzhled se právě použije: volba uživatele + nainstalované Hávy + systémové schéma + viewport.
// Čistá funkce, bez DOM; napojení na okno je v `runtime.ts`.
import type { Theme } from '../theme'
import { darkTheme, lightTheme } from '../../themes/default'
import { skinTheme, type Skin, type Viewport } from './skin'

export const SYSTEM_CHOICE = 'system'

/** Vestavěné volby; ostatní hodnoty jsou `id` nainstalovaných Hávů. */
export const BUILTIN_CHOICES: { id: string; name: string }[] = [
  { id: SYSTEM_CHOICE, name: 'Podle systému' },
  { id: lightTheme.id, name: lightTheme.name },
  { id: darkTheme.id, name: darkTheme.name },
]

export const isBuiltinChoice = (id: string) => BUILTIN_CHOICES.some((c) => c.id === id)

export type SystemScheme = 'light' | 'dark'

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

export function pickTheme(
  choice: string,
  installed: readonly Skin[],
  system: SystemScheme,
  viewport: Viewport,
): Theme {
  if (choice === lightTheme.id) return lightTheme
  if (choice === darkTheme.id) return darkTheme
  const skin = installed.find((s) => s.id === choice)
  if (skin) return skinTheme(skin, viewport)
  // „podle systému“, ale i smazaný či neplatný Háv: aplikace musí vždy zůstat použitelná
  return system === 'light' ? lightTheme : darkTheme
}
