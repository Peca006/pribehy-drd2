// Seznam modulů aplikace. Pořadí a viditelnost v navigaci určuje `order` a `nav` v každém modulu;
// nový modul se přidá jedním importem. Moduly se nevolají přímo, ale přes směrovač (`go`).
import './bestiar'
import './grimoar'
import './characters'
import './parties'
import './creator'
import './reader'
import './library'
import './wardrobe'

export const DEFAULT_MODULE = 'postavy'
