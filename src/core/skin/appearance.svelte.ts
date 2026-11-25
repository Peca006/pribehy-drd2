// Co z vzhledu musí znát komponenty (ne jen CSS): ikony záložek z Hávu. Plní ho `runtime.ts`; prázdné ikony znamenají,
// že se použijí původní znaky (emoji). Adresy jsou `blob:` a patří právě používanému Hávu.
import type { OrnamentAnchor } from './ornaments'
import type { NavPosition } from './tokens'

export const appearance = $state<{
  /** id modulu → adresa obrázku ikony */
  icons: Record<string, string>
  /** ostré zvětšení ikon (pixelart) */
  pixelatedIcons: boolean
  /** poloha hlavní lišty podle Hávu pro aktuální viewport (uživatel ji může přebít v nastavení) */
  navPosition: NavPosition
  /** záhlaví z Hávu pro aktuální viewport (role `header` s načteným obrázkem); jinak false */
  header: boolean
  /** ozdoby Hávu s adresami obrázků (zobrazí se jen ty, které se vejdou do volného okraje) */
  ornaments: { url: string; anchor: OrnamentAnchor; width: number }[]
}>({ icons: {}, pixelatedIcons: false, navPosition: 'bottom', header: false, ornaments: [] })
