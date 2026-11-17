// Žádost o zkoušku nebo výzvu z jiné části přehledu postavy (výroba, nástrahy): panel Hod ji převezme,
// předvyplní záměr a Ohrožení a stránka se k němu posune.
export const rollRequest = $state<{ n: number; kind: 'zkouska' | 'vyzva'; intent: string }>({
  n: 0,
  kind: 'zkouska',
  intent: '',
})

export function requestRoll(kind: 'zkouska' | 'vyzva', intent: string) {
  rollRequest.kind = kind
  rollRequest.intent = intent
  rollRequest.n += 1
  // panel je už vykreslený; posun po dokončení změn v DOM
  queueMicrotask(() => document.getElementById('roll-panel')?.scrollIntoView({ block: 'start' }))
}
