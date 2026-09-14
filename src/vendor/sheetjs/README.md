# SheetJS (xlsx) 0.20.3 – mitgeliefert, nicht aus npm

`xlsx.min.js` ist die unveränderte SheetJS-Community-Build in Version **0.20.3**.
Sie liest die Excel-Listen von PP und schreibt die Restliste `*_offen.xlsx`.

## Warum nicht `npm install xlsx`

Drei Gründe, in dieser Reihenfolge:

1. **Gleiche Version = gleiche Ausgabe.** Die Zusage an den Chef ist, dass
   „Offene (xlsx)" strukturgleich zum alten Tool herauskommt. Das alte
   Kampagnen-Lookup (`kampagnen_lookup_v1.1.0.html`) hat genau diese 0.20.3
   eingebettet. Eine andere Version schreibt die Datei möglicherweise anders –
   und damit wäre die Zusage gebrochen.
2. **Sicherheit.** Auf der npm-Registry steht `xlsx` seit Jahren auf 0.18.5.
   Diese Version ist von CVE-2023-30533 (Prototype Pollution beim Einlesen)
   und CVE-2024-22363 (ReDoS) betroffen. Beide sind in 0.20.3 behoben.
   0.18.5 wäre also ein Rückschritt gegenüber dem, was heute im Einsatz ist.
3. **Es ist derselbe Code, der ohnehin läuft.** Die Datei ist aus dem Tool
   extrahiert, das die Vertriebler heute im Browser öffnen. Kein neues Stück
   Fremdcode, dem vertraut werden muss.

SheetJS veröffentlicht Versionen ab 0.19 ausschließlich über die eigene
Registry, nicht mehr über npm:

```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Sobald `cdn.sheetjs.com` aus der Build-Umgebung erreichbar ist, kann dieser
Ordner durch die Abhängigkeit ersetzt werden. Die Importe hängen an
`src/lib/lookup/xlsx.ts` – dort ist genau eine Zeile zu ändern.

## Herkunft prüfen

```bash
node -e "console.log(require('./src/vendor/sheetjs/xlsx.min.js').version)"   # 0.20.3
```

Die Datei wird bewusst **nicht** formatiert oder gelintet
(siehe `.prettierignore` und `eslint.config.mjs`). Sie ist Fremdcode und
bleibt Byte für Byte so, wie sie ausgeliefert wurde.

## Lizenz

Apache License 2.0, © 2013-present SheetJS LLC – <https://sheetjs.com>
