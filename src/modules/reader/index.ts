import { registerModule } from '../../core/modules'
import Reader from './Reader.svelte'

registerModule({
  id: 'ctenar',
  title: 'Příručka',
  icon: '📖',
  order: 30,
  nav: true,
  component: Reader,
})
