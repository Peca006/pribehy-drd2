import { registerModule } from '../../core/modules'
import WardrobeRoot from './WardrobeRoot.svelte'

// Šatník (vzhled aplikace). V hlavní navigaci není, otevírá se odkazem z Dílny (`#/satnik`); `#/satnik/svadlena[/<id>]` je editor Hávů (Švadlena).
registerModule({
  id: 'satnik',
  title: 'Šatník',
  icon: '👘',
  order: 95,
  nav: false,
  component: WardrobeRoot,
})
