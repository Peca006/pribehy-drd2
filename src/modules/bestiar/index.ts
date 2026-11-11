import { registerModule } from '../../core/modules'
import Bestiary from './Bestiary.svelte'

registerModule({
  id: 'bestiar',
  title: 'Bestiář',
  icon: '🐺',
  order: 30,
  nav: true,
  component: Bestiary,
})
