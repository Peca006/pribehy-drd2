import { registerModule } from '../../core/modules'
import Wardrobe from './Wardrobe.svelte'

// Šatník (vzhled aplikace). V hlavní navigaci není, otevírá se odkazem z Dílny (`#/satnik`).
registerModule({
  id: 'satnik',
  title: 'Šatník',
  icon: '👘',
  order: 95,
  nav: false,
  component: Wardrobe,
})
