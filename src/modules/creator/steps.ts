// Kroky průvodce tvorbou postavy. Pořadí kroků se mění jen tady; každý krok je samostatná komponenta.
import type { Component } from 'svelte'
import Koncept from './steps/Koncept.svelte'
import Povaha from './steps/Povaha.svelte'
import Povolani from './steps/Povolani.svelte'
import Rasa from './steps/Rasa.svelte'
import Schopnosti from './steps/Schopnosti.svelte'
import Shrnuti from './steps/Shrnuti.svelte'
import Vybava from './steps/Vybava.svelte'
import Zdatnost from './steps/Zdatnost.svelte'

export interface Step {
  id: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>
}

export const steps: Step[] = [
  { id: 'koncept', title: 'Koncept', component: Koncept },
  { id: 'rasa', title: 'Rasa', component: Rasa },
  { id: 'povolani', title: 'Povolání', component: Povolani },
  { id: 'zdatnost', title: 'Zdatnost', component: Zdatnost },
  { id: 'schopnosti', title: 'Schopnosti', component: Schopnosti },
  { id: 'povaha', title: 'Povaha', component: Povaha },
  { id: 'vybava', title: 'Výbava', component: Vybava },
  { id: 'shrnuti', title: 'Shrnutí', component: Shrnuti },
]
