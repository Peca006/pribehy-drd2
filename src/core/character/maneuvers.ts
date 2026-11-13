// Manévry: platí se 1 Zdrojem vlastnosti použité dovednosti, a to až ve chvíli použití. V jedné akci nejvýš jeden
// manévr a nikdy dvakrát týž. Zde jen názvy, okamžik použití a číselný dopad; popisy jsou v balíčku pravidel.

export type ManeuverId = 'obrana' | 'rozsahle' | 'presne' | 'mocne' | 'lstive'

export interface Maneuver {
  id: ManeuverId
  name: string
  /** kdy se hlásí: před hodem (platí se při hodu), nebo po hodu a vítězství */
  when: 'pred' | 'po'
  /** krátká nápověda k číselnému dopadu */
  hint: string
}

export const MANEUVERS: Maneuver[] = [
  { id: 'presne', name: 'Přesně', when: 'pred', hint: '3 kostky, počítají se dvě nejvyšší' },
  { id: 'mocne', name: 'Mocně', when: 'po', hint: 'poražený musí vyčerpat o 1 Zdroj víc' },
  { id: 'lstive', name: 'Lstivě', when: 'po', hint: 'ohlášený následek je o 1 větší (2)' },
  { id: 'rozsahle', name: 'Rozsáhle', when: 'pred', hint: 'zasáhne víc cílů, stejný následek' },
  { id: 'obrana', name: 'Obrana', when: 'pred', hint: 'podmínka akce z obrany' },
]

export const maneuver = (id: ManeuverId | undefined): Maneuver | undefined =>
  MANEUVERS.find((m) => m.id === id)

/** Přesně: ze tří kostek se počítají dvě nejvyšší. */
export const bestTwo = (dice: number[]): [number, number] => {
  const s = [...dice].sort((a, b) => b - a)
  return [s[0] ?? 0, s[1] ?? 0]
}
