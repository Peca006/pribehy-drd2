import { registerModule } from '../../core/modules'
import Library from './Library.svelte'

registerModule({
  id: 'knihovna',
  title: 'Knihovna',
  icon: '📚',
  order: 90,
  nav: true,
  component: Library,
})
