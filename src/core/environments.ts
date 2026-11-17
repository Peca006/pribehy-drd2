// Značky prostředí. V knihách je kreslí písmo „drd2-font“ (písmena b až h); my je ukazujeme jako vlastní ikony.
export const ENVIRONMENTS: Record<string, string> = {
  b: 'Lesy',
  c: 'Pláně',
  d: 'Skály',
  e: 'Voda',
  f: 'Udržovaná krajina',
  g: 'Lidská sídla',
  h: 'Ruiny',
}

/** Nadpis typu „Lesy b“ (písmeno značky na konci) → název a písmeno; jinak undefined. */
export function splitEnvHeading(text: string): { name: string; letter: string } | undefined {
  const m = /^(.+\S) ([b-h])$/.exec(text)
  if (!m) return undefined
  return ENVIRONMENTS[m[2]] === m[1] ? { name: m[1], letter: m[2] } : undefined
}
