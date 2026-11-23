# Dovednosti – návrh dials (type, environment, target, target-attribute, source-zs)

Pravidlové odvození (`dovednosti.mjs`), k posouzení. `target` z názvu je jistý, z prvního bodu popisu označen „?“. `source-zs` je u všech prázdné: dovednosti
Příručky patří povolání, žádná není podmíněna konkrétní ZS. `target-attribute` jen u dovedností, které léčí či obnovují konkrétní vlastnost.

| dovednost | povolání | type | environment | target | target-attribute |
|---|---|---|---|---|---|
| Běžný boj zblízka | zakladni / Bojovník | Boj | – | – | – |
| Síla | zakladni / Bojovník | – | – | – | – |
| Bojovnické znalosti | zakladni / Bojovník | Znalosti | – | – | – |
| Sebedůvěra | zakladni / Bojovník | Jednání | – | – | – |
| Běžná střelba | zakladni / Lovec | Boj | – | – | – |
| Cestování | zakladni / Lovec | Pohyb | Divočina | – | – |
| Orientace v divočině | zakladni / Lovec | Pohyb, Znalosti | Divočina | – | – |
| Tábornictví | zakladni / Lovec | Výroba, Znalosti | Divočina | – | – |
| Lovecké znalosti | zakladni / Lovec | Znalosti | – | Zvířata ? | – |
| Ovlivňování zvířat | zakladni / Lovec | Jednání | – | Zvířata | – |
| Běžný vrh | zakladni / Kejklíř | Boj | – | – | – |
| Pohyblivost | zakladni / Kejklíř | Pohyb | – | – | – |
| Triky a kejkle | zakladni / Kejklíř | Skrývání | – | – | – |
| Orientace ve městě | zakladni / Kejklíř | Pohyb, Znalosti | Město | – | – |
| Charisma | zakladni / Kejklíř | Jednání | – | – | – |
| Převleky a předstírání | zakladni / Kejklíř | Jednání, Skrývání | – | – | – |
| Umění | zakladni / Kejklíř | Jednání | – | – | – |
| Odolnost a výdrž | zakladni / Mastičkář | – | – | – | – |
| Ošetřování lidského těla | zakladni / Mastičkář | Léčení | – | Lidé | Tělo |
| Masti a běžné jedy | zakladni / Mastičkář | Výroba, Léčení | – | – | – |
| Znalost lidí | zakladni / Mastičkář | Znalosti | – | Lidé | – |
| Vyjednávání s lidmi | zakladni / Mastičkář | Jednání | – | Lidé | – |
| Učenost | zakladni / Zaříkávač | Znalosti | – | – | – |
| Znalost nadpřirozena | zakladni / Zaříkávač | Znalosti | – | – | – |
| Ošetřování lidské duše | zakladni / Zaříkávač | Léčení | – | Lidé ? | Duše |
| Vůle | zakladni / Zaříkávač | – | – | – | – |
| Zaříkání | zakladni / Zaříkávač | Magie | – | Lidé, Zvířata ? | – |
| Vyjednávání s nadpřirozenem | zakladni / Zaříkávač | Jednání | – | Netvoři, Nemrtví a neživí, Běsi ? | – |
| Jízdní boj zblízka | pokrocile / Válečník | Boj | – | – | – |
| Kovářství | pokrocile / Válečník | Výroba | – | – | – |
| Válečnické znalosti | pokrocile / Válečník | Znalosti | – | – | – |
| Jednání s vyšší společností | pokrocile / Válečník | Jednání | – | – | – |
| Působení ve vyšší společnosti | pokrocile / Válečník | Jednání | – | – | – |
| Vedení lidí v boji | pokrocile / Válečník | Jednání | – | Lidé | – |
| Boj proti netvorům | pokrocile / Hraničář | Boj | – | Netvoři | – |
| Hraničářské znalosti | pokrocile / Hraničář | Znalosti | – | Netvoři ? | – |
| Tesařina | pokrocile / Hraničář | Výroba | – | – | – |
| Ovlivňování netvorů | pokrocile / Hraničář | Jednání | – | Netvoři | – |
| Vedení primitivních netvorů | pokrocile / Hraničář | Jednání | – | Netvoři | – |
| Výroba omamných látek a odvarů | pokrocile / Šaman | Výroba, Léčení | – | Lidé, Zvířata ? | – |
| Podávání omamných látek | pokrocile / Šaman | Výroba | – | Lidé, Zvířata ? | – |
| Hadačství | pokrocile / Šaman | Magie | – | – | – |
| Léčení zvířat | pokrocile / Šaman | Léčení | – | Zvířata | Tělo |
| Magie zvířat | pokrocile / Šaman | Magie | – | Zvířata | – |
| Magie kamene | pokrocile / Druid | Magie | – | – | – |
| Magie vody | pokrocile / Druid | Magie | – | – | – |
| Magie dřeva | pokrocile / Druid | Magie | – | – | – |
| Vzdušná akrobacie | pokrocile / Lupič | Pohyb | – | – | – |
| Mechanismy | pokrocile / Lupič | Výroba | – | – | – |
| Padělatelství | pokrocile / Lupič | Výroba | – | – | – |
| Výroba kontaktních jedů | pokrocile / Lupič | Výroba | – | – | – |
| Použití kontaktních jedů | pokrocile / Lupič | Výroba | – | – | – |
| Nektary | pokrocile / Lupič | Léčení, Výroba | – | – | Vliv |
| Působení v měšťanstvu a sedláctvu | pokrocile / Lupič | Jednání | – | – | – |
| Boj zdálky ze sedla i kozlíku | pokrocile / Zvěd | Boj | – | – | – |
| Kočáry a koráby | pokrocile / Zvěd | Pohyb | – | – | – |
| Utajování informací | pokrocile / Zvěd | Skrývání, Znalosti | – | – | – |
| Jednání s podsvětím | pokrocile / Zvěd | Jednání | – | – | – |
| Působení v podsvětí | pokrocile / Zvěd | Jednání | – | – | – |
| Vedení lidí mimo boj | pokrocile / Zvěd | Jednání | – | Lidé | – |
| Obnovování lidského vlivu | pokrocile / Zvěd | Léčení | – | Lidé | Vliv |
| Boj zblízka proti neživým | pokrocile / Vědmák | Boj | – | – | – |
| Vědmácké znalosti | pokrocile / Vědmák | Znalosti | – | Nemrtví a neživí ? | – |
| Znamení | pokrocile / Vědmák | Magie | – | Nemrtví a neživí ? | – |
| Ovlivňování neživých | pokrocile / Vědmák | Jednání | – | Nemrtví a neživí | – |
| Alchymické znalosti | pokrocile / Alchymista | Znalosti | – | – | – |
| Výroba třaskavin, žíravin a plynných jedů | pokrocile / Alchymista | Výroba | – | – | – |
| Používání třaskavin, žíravin a plynných jedů | pokrocile / Alchymista | Výroba | – | – | – |
| Výroba elixírů | pokrocile / Alchymista | Výroba | – | – | – |
| Umělý život | pokrocile / Alchymista | Magie | – | Oživení | – |
| Používání elixírů | pokrocile / Alchymista | Výroba | – | – | – |
| Magie ohně | pokrocile / Čaroděj | Magie | – | – | – |
| Magie větru | pokrocile / Čaroděj | Magie | – | – | – |
| Magie iluzí | pokrocile / Mág | Magie | – | – | – |
| Magie mysli | pokrocile / Mág | Magie | – | Lidé ? | – |
| Jednání s duchovenstvem a vzdělanci | pokrocile / Mág | Jednání | – | – | – |
| Působení mezi duchovenstvem a vzdělanci | pokrocile / Mág | Jednání | – | – | – |
