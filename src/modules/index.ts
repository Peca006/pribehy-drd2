// Seznam modulů aplikace. Pořadí a viditelnost v navigaci určuje `order` a `nav` v každém modulu;
// nový modul se přidá jedním importem. Moduly se nevolají přímo, ale přes směrovač (`go`).
import './characters'
import './creator'
import './reader'
import './library'

export const DEFAULT_MODULE = 'postavy'
