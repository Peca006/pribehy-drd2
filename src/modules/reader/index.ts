import { registerModule } from '../../core/modules'
import Reader from './Reader.svelte'

registerModule({
  id: 'ctenar',
  title: 'Příručka',
  icon: '📖',
  order: 40,
  nav: true,
  component: Reader,
})
