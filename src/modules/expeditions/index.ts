import { registerModule } from '../../core/modules'
import Expeditions from './Expeditions.svelte'

// Výpravy: příprava dobrodružství a výprav pro Průvodce (vedení rozehraných výprav je u družin).
registerModule({
  id: 'vypravy',
  title: 'Výpravy',
  icon: '🗺️',
  order: 25,
  nav: true,
  component: Expeditions,
})
