// Odkazy na veřejné SRD Dračího doupěte II (jediné místo s adresou).
export const SRD_BASE = 'https://drd2srd.d20.cz/'

/** Adresa v SRD z cesty (s kotvou), např. `zakladni-prirucka/25-zakladni-povolani.html#bojovnik`. */
export const srdUrl = (path = ''): string => SRD_BASE + path

/** Kapitola Základní příručky v SRD, volitelně s kotvou. */
export const srdChapterUrl = (chapter: string, anchor?: string): string =>
  `${SRD_BASE}zakladni-prirucka/${chapter}.html${anchor ? '#' + anchor : ''}`
