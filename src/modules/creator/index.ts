import { registerModule } from '../../core/modules'
import Creator from './Creator.svelte'

registerModule({
  id: 'tvorba',
  title: 'Nová postava',
  icon: '✨',
  order: 20,
  nav: false,
  component: Creator,
})
