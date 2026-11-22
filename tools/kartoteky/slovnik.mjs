// Slovník hodnot kartoték: stabilní anglické id, český popisek a alias na hodnotu z Kostky (xlsx „Přehledy dials“,
// Fafrinova sada). Aliasy slouží k exportu ve formátu Kostky; jedna hodnota Kostky může odpovídat více našim id.
// Pravidlo: `kostka` je pole, první prvek je preferovaný zápis při exportu.

export const MECHANISM = {
  'skill-proficiency': { cs: 'Zběhlost v dovednosti', kostka: ['Zběhlost'] },
  'skill-mastery': { cs: 'Bravurní ovládání dovednosti', kostka: ['Bravura'] },
  aptitude: { cs: 'Nadání', kostka: ['Nadání'] },
  'free-maneuver': { cs: 'Manévr zdarma (rozsáhle ap.)', kostka: ['Rozsáhle zdarma'] },
  'free-defense': { cs: 'Obrana zdarma', kostka: ['Obrana zdarma'] },
  'free-approach': { cs: 'Přístup zdarma', kostka: ['Přístupy zdarma'] },
  'defend-others': { cs: 'Obrana za jiné', kostka: ['Rozšířená obrana'] },
  'grant-resources': { cs: 'Poskytnutí Zdrojů jiné postavě', kostka: ['Sdílení zdrojů'] },
  'natural-protection': { cs: 'Přirozená ochrana (sleva na vyčerpání)', kostka: ['Přirozená ochrana'] },
  'scar-effect': { cs: 'Účinek na Jizvy', kostka: ['Silnější Jizvy'] },
  'narrative-authority': { cs: 'Obsahová pravomoc', kostka: ['Obsahová pravomoc'] },
  craft: { cs: 'Posílená výroba', kostka: ['Posílení dovednosti'] },
  'spell-enhance': { cs: 'Posílené kouzlo', kostka: ['Posílení dovednosti'] },
  'ward-sign': { cs: 'Ochranný obrazec', kostka: ['Posílení dovednosti'] },
  'unusual-sense': { cs: 'Neobvyklý smysl', kostka: ['Neobvyklý smysl'] },
  'gain-advantage': { cs: 'Zisk Výhod', kostka: ['Zisk zdrojů'] },
  'gain-resources': { cs: 'Zisk Zdrojů (Surovin)', kostka: ['Zisk zdrojů'] },
  'assess-abilities': { cs: 'Odhad zvláštních schopností', kostka: ['Posílení dovednosti'] },
  heal: { cs: 'Léčení', kostka: ['Posílené léčení'] },
  companion: { cs: 'Pomocník', kostka: ['Jiný'] },
  'stealth-evasion': { cs: 'Ukrytí a únik', kostka: ['Posílení dovednosti'] },
  'mark-detect': { cs: 'Označení či odhalení', kostka: ['Jiný'] },
  dominate: { cs: 'Ovládnutí', kostka: ['Posílení dovednosti'] },
  'special-effect': { cs: 'Zvláštní účinek (jednotlivé případy)', kostka: ['Jiný'] },
  // bestiářové schopnosti (schváleno 22. 11. 2026)
  'group-rule': { cs: 'Skupinové pravidlo bytostí', kostka: ['Jiný'] },
  'against-being': { cs: 'Pravidlo „proti bytosti“', kostka: ['Jiný'] },
};
// jednotlivé hodnoty (1 záznam) se slučují do special-effect
export const SINGLETONS = ['improvised-gear', 'disguise', 'tracking', 'transform', 'spell-reflect', 'animate-construct'];

export const DOMAIN = {
  combat: { cs: 'Boj', kostka: ['Boj'] }, social: { cs: 'Jednání', kostka: ['Jednání'] }, stealth: { cs: 'Skrývání', kostka: ['Skrývání'] },
  knowledge: { cs: 'Znalosti', kostka: ['Znalosti'] }, magic: { cs: 'Magie', kostka: ['Magie'] }, healing: { cs: 'Léčení', kostka: ['Léčení'] },
  craft: { cs: 'Výroba', kostka: ['Výroba'] }, movement: { cs: 'Pohyb', kostka: ['Pohyb'] }, companions: { cs: 'Pomocníci', kostka: ['Pomocníci'] },
  assessment: { cs: 'Odhad', kostka: ['Odhad'] },
};
export const SUBJECT = {
  wards: { cs: 'Obrazce', kostka: ['Obrazce'] }, poisons: { cs: 'Jedy', kostka: ['Jedy'] }, traps: { cs: 'Pasti', kostka: ['Pasti'] },
  salves: { cs: 'Masti', kostka: ['Masti'] }, trophies: { cs: 'Trofeje', kostka: ['Trofeje'] }, springs: { cs: 'Zřídla', kostka: ['Zřídla'] },
  'ritual-items': { cs: 'Rituální předměty', kostka: ['Rituální předměty'] },
};
export const TARGET_KIND = {
  people: { cs: 'Lidé', kostka: ['Lidé'] }, animals: { cs: 'Zvířata', kostka: ['Zvířata'] }, monsters: { cs: 'Netvoři', kostka: ['Netvoři'] },
  undead: { cs: 'Nemrtví a neživí', kostka: ['Nemrtví a neživí', 'Nemrtví', 'Neživí'] }, fiends: { cs: 'Běsi', kostka: ['Běsi'] }, constructs: { cs: 'Oživení', kostka: ['Oživení'] },
};
export const ATTRIBUTE = { body: 'Tělo', soul: 'Duše', influence: 'Vliv' };
// zdroje: id, jména v exportu (Kostka: „Duše: 1“)
export const RESOURCE = { body: 'Tělo', soul: 'Duše', influence: 'Vliv', material: 'Suroviny' };
export const MANEUVER = { defense: 'Obrana', wide: 'Rozsáhle', precise: 'Přesně', mighty: 'Mocně', cunning: 'Lstivě' };
export const RACE = { Lidé: 'člověk', Elfové: 'elf', Trpaslíci: 'trpaslík', Hobiti: 'hobit', Krollové: 'kroll', společné: 'všechny' };
