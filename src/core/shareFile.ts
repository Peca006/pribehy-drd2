// Název souboru se sdílenou postavou nebo družinou: `postava-brokan-rudovous.drd2.txt`. Stejný název se používá
// při stažení i při Sdílet, aby šlo v telefonu (WhatsApp, e-mail, Soubory) poznat, který soubor je který.
import { slugify } from './creatures/bundle'

export const shareFileName = (kind: 'postava' | 'druzina', name: string): string =>
  `${kind}-${slugify(name).slice(0, 40).replace(/-+$/, '') || 'drd2'}.drd2.txt`
