// Potvrzovací dialog ve stylu aplikace (místo systémového `confirm`). `ask` vrátí, zda uživatel potvrdil.
export interface AskOptions {
  /** nadpis dialogu */
  title?: string
  /** text hlavního tlačítka, např. „Smazat“ */
  ok?: string
  cancel?: string
}

interface Pending extends Required<AskOptions> {
  message: string
  resolve: (ok: boolean) => void
}

export const confirmState = $state<{ pending?: Pending }>({})

export function ask(message: string, opts: AskOptions = {}): Promise<boolean> {
  confirmState.pending?.resolve(false)
  return new Promise((resolve) => {
    confirmState.pending = {
      message,
      title: opts.title ?? 'Potvrďte',
      ok: opts.ok ?? 'Potvrdit',
      cancel: opts.cancel ?? 'Zrušit',
      resolve,
    }
  })
}

export function answer(ok: boolean) {
  const p = confirmState.pending
  confirmState.pending = undefined
  p?.resolve(ok)
}
