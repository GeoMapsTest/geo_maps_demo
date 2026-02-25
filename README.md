# Static Map Catalog (GitHub Pages)

This is a zero-backend, static web catalog that reads an EAD3 XML file and provides:
- Search + browse by series
- Click-through item pages
- Automatic scan display (from /docs/scans or via <dao> links inside the EAD)

## Folder layout

- `docs/` → GitHub Pages site root
  - `index.html` → search/browse
  - `map.html` → item view
  - `assets/` → JS + CSS
  - `data/ead.xml` → your EAD3 file
  - `scans/` → image files

## Deploy to GitHub Pages

1. Create a GitHub repo and copy this project into it.
2. In GitHub: **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main`
5. Folder: `/docs`
6. Save.

Tip: `.nojekyll` is included so GitHub doesn't try to run Jekyll.

## Add scans

Put images in `docs/scans/`.

Naming convention (recommended):
- `itm001.jpg` or `itm001.png`
- Multi-image: `itm001_1.jpg`, `itm001_2.jpg`, ...

Alternative:
- Add `<dao href="scans/itm001.jpg"/>` inside the item-level `<did>` in the EAD.

## Customize

- Change the title/colors in `docs/assets/styles.css`
- Adjust parsing rules in `docs/assets/ead.js`
