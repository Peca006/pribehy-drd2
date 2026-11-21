// Od kterého bodu historie se postava sdílí: změny od posledního odeslání, od zvolené revize, nebo celá historie.
// Poslední odeslání si aplikace pamatuje jen v tomto zařízení, což nemusí odpovídat tomu, co potřebuje příjemce
// (třeba když si hráč postavu poslal do jiného prostředí), proto jde začátek zvolit.
export type ShareMode = 'nove' | 'bod' | 'cela'

/**
 * Index revize, na kterou sdílené revize navazují (`-1` = od začátku, bez navazování).
 * `nove`: za poslední odeslanou; `bod`: sdílí se od zvolené revize včetně; `cela`: od začátku.
 */
export function sinceIndex(
  revs: readonly { id: string }[],
  mode: ShareMode,
  sentUpTo?: string,
  fromId?: string,
): number {
  if (mode === 'nove' && sentUpTo) return revs.findIndex((r) => r.id === sentUpTo)
  if (mode === 'bod' && fromId) {
    const i = revs.findIndex((r) => r.id === fromId)
    return i > 0 ? i - 1 : -1
  }
  return -1
}
