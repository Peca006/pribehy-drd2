// Co z vzhledu musí znát komponenty (ne jen CSS): ikony záložek z Hávu. Plní ho `runtime.ts`; prázdné ikony znamenají,
// že se použijí původní znaky (emoji). Adresy jsou `blob:` a patří právě používanému Hávu.
import type { NavPosition } from './tokens'

export const appearance = $state<{
  /** id modulu → adresa obrázku ikony */
  icons: Record<string, string>
  /** ostré zvětšení ikon (pixelart) */
  pixelatedIcons: boolean
  /** poloha hlavní lišty podle Hávu pro aktuální viewport (uživatel ji může přebít v nastavení) */
  navPosition: NavPosition
}>({ icons: {}, pixelatedIcons: false, navPosition: 'bottom' })
