// Registr funkčních modulů. Každá funkce aplikace (knihovna, čtečka, tvorba postavy, deníky, …)
// je samostatný modul, který se zaregistruje; pořadí a viditelnost v navigaci se mění jen zde
// (a v `src/modules/index.ts`), moduly na sobě navzájem nezávisejí – volají se přes směrovač (`go`).
import type { Component } from 'svelte'

export interface AppModule {
  id: string
  title: string
  /** krátký symbol do navigace */
  icon: string
  /** pořadí v navigaci (menší = dříve) */
  order: number
  /** zobrazit v hlavní navigaci; jinak jen jako cíl odkazu */
  nav: boolean
  /** komponenta modulu; dostane `params` (zbytek cesty) */
  component: Component<{ params: string[] }> | Component<Record<string, never>>
}

const registry = new Map<string, AppModule>()

export const registerModule = (m: AppModule) => void registry.set(m.id, m)
export const getModule = (id: string) => registry.get(id)
export const allModules = () => [...registry.values()].sort((a, b) => a.order - b.order)
