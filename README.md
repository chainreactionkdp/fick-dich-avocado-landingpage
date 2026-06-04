# Fick dich, Avocado! Landingpage

Statische, responsive Werbe-Landingpage für das Amazon-KDP-Buch **Fick dich, Avocado!**.

Das Design orientiert sich am echten Buchcover: kräftiges Magenta, Gelb, Cyan, harte schwarze Konturen und ein frecher Pop-Art-/Social-Ad-Look.

## Dateien

- `index.html` - Seitenstruktur, SEO-Metadaten, Open-Graph-Tags und Inhalte
- `styles.css` - responsives Cover-basiertes Design ohne Framework
- `script.js` - kleines JavaScript für Jahreszahl und CTA-Hook
- `assets/book-cover.jpg` - echtes Buchcover und zentrales Hero-Bild

## Coverbild

Das Cover wird unter diesem Pfad geladen:

```text
assets/book-cover.jpg
```

Wichtig:

- Der Dateiname muss `book-cover.jpg` bleiben
- Empfohlenes Format: JPG
- Empfohlenes Seitenverhältnis: etwa 2:3
- Gute Größe: ca. 1000 x 1500 px bis 1600 x 2400 px
- Das Cover ist das zentrale visuelle Element der Landingpage

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
