import { registerModule } from '../../core/modules'
import Characters from './Characters.svelte'

registerModule({
  id: 'postavy',
  title: 'Postava',
  icon: '🧙',
  order: 10,
  nav: true,
  component: Characters,
})
