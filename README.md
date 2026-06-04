# Fick dich, Avocado! Landingpage

Statische, responsive Werbe-Landingpage für das Amazon-KDP-Buch **Fick dich, Avocado!**.

## Dateien

- `index.html` - Seitenstruktur, SEO-Metadaten, Open-Graph-Tags und Inhalte
- `styles.css` - responsives Design ohne Framework
- `script.js` - kleines JavaScript für Jahreszahl, Cover-Fallback und CTA-Hook
- `assets/.gitkeep` - hält den vorbereiteten Asset-Ordner im Repository
- `assets/book-cover.jpg` - vorgesehener Pfad für dein echtes Buchcover

## Coverbild einfügen

Lege dein echtes Buchcover unter diesem Pfad ab:

```text
assets/book-cover.jpg
```

Wichtig:

- Der Dateiname sollte gleich bleiben: `book-cover.jpg`
- Empfohlenes Format: JPG
- Empfohlenes Seitenverhältnis: etwa 2:3
- Gute Größe: ca. 1000 x 1500 px oder kleiner, damit die Seite schnell lädt

Solange noch kein Cover vorhanden ist, zeigt die Website automatisch einen grafischen Platzhalter im Hero-Bereich.

## Amazon-Link ändern

Öffne `index.html` und suche nach:

```text
https://www.amazon.de/Fick-dich-Avocado-Geschenkbuch-Kurzgeschichten/dp/B0H2RN38DP/
```

Ersetze alle Vorkommen durch deinen neuen Link. Der Link steht in den CTA-Buttons und im strukturierten `Book`-Snippet im `<head>`.

## Website lokal öffnen

Du kannst `index.html` direkt im Browser öffnen.

Alternativ startest du im Projektordner einen kleinen lokalen Server:

```bash
python -m http.server 8080
```

Dann öffnest du:

```text
http://localhost:8080
```

## Bei Netlify veröffentlichen

1. Verbinde dieses GitHub-Repository mit Netlify.
2. Build Command: leer lassen.
3. Publish Directory: `/` oder leer lassen, da `index.html` im Root liegt.
4. Vor der Veröffentlichung Impressum und Datenschutzerklärung ergänzen.

## Bei Vercel veröffentlichen

1. Importiere dieses Repository in Vercel.
2. Framework Preset: `Other`.
3. Build Command: leer lassen.
4. Output Directory: leer lassen oder `/` verwenden.
5. Vor der Veröffentlichung Impressum und Datenschutzerklärung ergänzen.

## Hinweise

Die Seite verwendet keine Amazon-Logos, keine Preisangaben und keine erfundenen Bewertungen. Falls du später Affiliate-Links nutzt, kennzeichne diese sichtbar.
