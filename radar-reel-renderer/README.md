# Radar Reel Renderer

Isolierter Renderer für automatische Thriller-Radar-Facebook-Reels.

## Ablauf
GPT -> Reel Worker `/queue-reel` -> GitHub Actions `render-reel.yml` -> `render_reel.py` erzeugt `build/reel.mp4` -> Upload zurück an `/reel-upload` -> Meta Reel API -> `PUBLISHED` -> D1 90-Tage-Sperre.

## Dateien
- `render_reel.py` — 1080x1920 Renderer, Safe-Zone-Typografie, Farbpalette pro Buch, Sounddesign.
- `.github/workflows/render-reel.yml` — GitHub Actions Renderjob.
- `cloudflare/worker.js` — separater Cloudflare Reel Publisher.
- `cloudflare/d1_migration.sql` — zusätzliche Tabelle `reel_jobs` in der bestehenden `radar-product-history` D1.
- `gpt/gpt_action_schema.yaml` — Custom-GPT-Action.
- `gpt/compact_gpt_instruction.txt` — kompakter Reel-Block für die bestehende Masteranweisung.

## Cloudflare Variablen
- `PUBLISHER_API_KEY` secret
- `THRILLER_RADAR_PAGE_ID` text
- `THRILLER_RADAR_TOKEN` secret
- `GITHUB_TOKEN` secret
- `GITHUB_OWNER=chainreactionkdp`
- `GITHUB_REPO=fick-dich-avocado-landingpage`
- `GITHUB_WORKFLOW=render-reel.yml`
- `GITHUB_REF=main`
- `META_GRAPH_VERSION=v26.0`

Der bestehende `radar-affiliate-publisher` bleibt unverändert.
