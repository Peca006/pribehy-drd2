// Ukázkové předpisy do Grimoáru (kouzla, lektvary, nástrahy a výrobky). Názvy jsou obecné a běžné ve fantasy hrách
// na hrdiny (některé se podobají předpisům v Dračí hlídce); veškeré popisy jsou naše vlastní, nic z cizích textů se
// nepřebírá. Hodnoty (obor, dosah, cena, vlastnost) jsou jen ukázkové, ať je vidět, jak se předpis zapisuje. Druhy výrobků vycházejí
// z kapitoly Kouzla, nástrahy a léčení v pravidlech (lektvary, elixíry, jedy, třaskaviny, esence, šémy, ochranné obrazce).
import { potionFrom } from '../core/character/potions'
import { trapFrom } from '../core/character/traps'
import { potionToRecipe, trapToRecipe } from '../core/recipes/kinds'
import type { RecipeInput } from '../core/recipes/model'
import { spellToParams, type SpellParams } from '../core/recipes/spells'

/** ID všech ukázkových předpisů začínají touto předponou, takže jdou odstranit najednou. */
export const DEMO_RECIPE_PREFIX = 'demo-'

const spell = (name: string, description: string, p: Partial<SpellParams>): RecipeInput => ({
  kind: 'kouzlo',
  name,
  description,
  params: spellToParams(p),
})

const potion = (name: string, attribute: string, scar: string, description: string): RecipeInput => ({
  ...potionToRecipe(potionFrom({ attribute, scar, name, description, count: 0, note: '' })!),
})

const trap = (t: Record<string, unknown>): RecipeInput => trapToRecipe(trapFrom({ count: 1, note: '', ...t })!)

const item = (name: string, description: string): RecipeInput => ({ kind: 'vyrobek', name, description })

export const DEMO_RECIPES: (RecipeInput & { id: string })[] = (
  [
    // Kouzla
    spell(
      'Magická střela',
      'Čistá střela divoké síly, která zasáhne jednoho protivníka v dohledu. Hodí se na přerušení cizího kouzla nebo na zastavení utíkajícího.',
      { obor: 'Magie větru', zvuky: true, gesta: true, dosah: 'dohled' },
    ),
    spell(
      'Ohnivá koule',
      'Zářící koule ohně, která při dopadu zachvátí celou chýši nebo tábor. Náročné kouzlo, ohrozí i kouzelníkovy přátele, stojí-li blízko.',
      { obor: 'Magie ohně', zvuky: true, gesta: true, dosah: 'dohled', rozsah: 'chyse', narocne: true },
    ),
    spell(
      'Uspání',
      'Jemný šepot a pohyb dlaně, po kterém dotčený jedinec upadne do spánku. Nepůsobí na toho, kdo se právě brání, a každé zatřesení spáče probudí.',
      { obor: 'Magie mysli', zvuky: true, gesta: true, dosah: 'dotyk', trvani: 'dlouho' },
    ),
    spell(
      'Neviditelnost',
      'Přikryje cíl závojem iluze, aby ho oči okolí přehlédly. Prozradí ho hluk, dotek nebo pronikavý pach. Potřebuje špetku stříbrného prachu.',
      { obor: 'Magie iluzí', gesta: true, substance: true, suroviny: 1, dosah: 'dotyk', trvani: 'dlouho', narocne: true },
    ),
    spell(
      'Léčivý pramen',
      'Kouzelník nechá vyvěrat čistou vodu, která zavírá drobné rány a zahání horečku. Pro těžká zranění nestačí, jen jim uleví.',
      { obor: 'Magie vody', zvuky: true, dosah: 'dotyk' },
    ),

    // Lektvary
    potion('Mast ranhojiče', 'Tělo', 'sečné poranění', 'Lepkavá mast z jitrocelu a vosku. Natírá se na ránu pod obvaz a zpomaluje krvácení.'),
    potion('Odvar jasné mysli', 'Duše', 'fobie', 'Hořký odvar z kozlíku a mečíku. Pomáhá zvládnout záchvat strachu, jen se nesmí pít na lačno.'),
    potion('Elixír pálivé síly', 'Tělo', 'omrzlina', 'Po vypití zahřeje prochladlé tělo. V obkladech podpoří hojení omrzlin.'),
    potion('Nektar řečníka', 'Vliv', 'ostuda', 'Sladký lektvar z medu a lipového květu. Uleví po veřejném ponížení a vrací sebejistotu.'),

    // Nástrahy
    trap({
      name: 'Jáma s kůly',
      type: 'jednoducha',
      attribute: 'Tělo',
      effect: 'jizva',
      weakness: 'čerstvě rozházené listí',
      description: 'Hluboká jáma maskovaná chrastím a listím. Na dně jsou ostré kůly, kdo spadne, odnese si Jizvu.',
    }),
    trap({
      name: 'Poplašné zvonce',
      type: 'mechanicka',
      attribute: 'Duše',
      effect: 'ohrozeni',
      weakness: 'tenký drát u země',
      description: 'Drátek či motouzek přes chodbu spojený se zvonkem. Cinkne i na kočku a každého, kdo se plíží kolem, prozradí.',
    }),
    trap({
      name: 'Pálivý prášek',
      type: 'trask',
      attribute: 'Tělo',
      effect: 'ohrozeni',
      maneuver: 'rozsahle',
      weakness: 'ostrý pach',
      description: 'Poprašek s drceným ledkem a sírou. Po rozšlapání vytvoří ohnivý oblak, který zasáhne všechny v okolí.',
    }),
    trap({
      name: 'Spavý jed na čepeli',
      type: 'jed',
      attribute: 'Tělo',
      effect: 'vyrazeni',
      weakness: 'sladká vůně',
      description: 'Jed z máku a blínu natřený na čepel nebo hrot šípu. Zasažený upadne do těžkého spánku.',
    }),

    // Výrobky
    item(
      'Univerzální protijed',
      'Šedavý nápoj z dřevěného uhlí a pelyňku. Přidává se otráveným do pití, aby tělo jed rychleji vyloučilo.',
    ),
    item(
      'Esence mrštnosti',
      'Několik kapek lesklé tekutiny z pavoučího hedvábí a mléka. Dočasně dodá obratnost, po odeznění přijde únava.',
    ),
    item(
      'Ochranný obrazec: znak Oka',
      'Základní obrazec Zaříkání, který stráží vchod do jeskyně, truhlu nebo batoh. Zanikne s nejbližším soumrakem či úsvitem.',
    ),
    item(
      'Šéma hlídacího psa',
      'Mosazná figurka, která se při slovu probudí a střeží místo, dokud jí nedojde síla. Hlídá, ale neútočí.',
    ),
    item(
      'Rituální dýka',
      'Úzká dýka s vyrytými znaky, kterou kouzelník používá při obřadech. Pro boj se nehodí, jen zesiluje rituál při kouzlení.',
    ),
  ] as RecipeInput[]
).map((r, i) => ({ ...r, id: `${DEMO_RECIPE_PREFIX}recipe-${i + 1}` }))
