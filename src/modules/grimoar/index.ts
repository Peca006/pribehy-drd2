import { registerModule } from '../../core/modules'
import Grimoar from './Grimoar.svelte'

// Grimoár: sklad předpisů hráče (kouzla, lektvary, nástrahy, výrobky), mezi Bestiářem a Více.
registerModule({
  id: 'grimoar',
  title: 'Grimoár',
  icon: '📕',
  order: 50,
  nav: true,
  component: Grimoar,
})
