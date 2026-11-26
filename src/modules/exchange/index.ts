import { registerModule } from '../../core/modules'
import Receive from './Receive.svelte'

// Přijmout obsah (`#/prijmout`): jedno místo pro příjem souboru, kódu či QR (výprava, dobrodružství, cizí postavy,
// bytosti, Háv; postavy a družiny se předají do Importu postav). V hlavní navigaci není, odkaz je v Dílně.
registerModule({
  id: 'prijmout',
  title: 'Přijmout obsah',
  icon: '📥',
  order: 96,
  nav: false,
  component: Receive,
})
