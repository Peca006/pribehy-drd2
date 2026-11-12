import { registerModule } from '../../core/modules'
import Parties from './Parties.svelte'

registerModule({
  id: 'druziny',
  title: 'Družina',
  icon: '🛡️',
  order: 15,
  nav: true,
  component: Parties,
})
