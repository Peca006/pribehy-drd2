// Předání rozpoznané zásilky jinému postupu v aplikaci (např. balíček postavy z „Přijmout“ do Importu postav),
// aby ji uživatel nemusel vkládat znovu. Jednorázové, drží se jen v paměti stránky.
let pending: string | undefined

export const setHandoff = (text: string) => {
  pending = text
}

export function takeHandoff(): string | undefined {
  const t = pending
  pending = undefined
  return t
}
