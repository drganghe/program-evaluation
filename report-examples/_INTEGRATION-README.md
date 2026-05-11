# Evaluation Report Database — Integration Guide

## Files in this package

| File | Purpose |
|------|---------|
| `reports-database.qmd` | The Quarto page (add to your `_quarto.yml` nav) |
| `reports-data.js` | The data — **edit this to add/update reports** |
| `reports-database.js` | Filter engine (do not edit) |
| `reports-database.css` | Styles (safe to customize) |
| `reports-database.csv` | Excel-compatible copy of the data |

---

## Step 1 — Copy files to your Quarto project

Place all four files in the **same folder** (e.g. your project root or a `/reports/` subfolder):

```
my-course-website/
├── _quarto.yml
├── index.qmd
├── reports-database.qmd   ← add here
├── reports-database.js    ← same folder
├── reports-database.css   ← same folder
└── reports-data.js        ← same folder
```

---

## Step 2 — Add the page to your navigation

In `_quarto.yml`:

```yaml
website:
  navbar:
    right:
      - text: "Report Database"
        href: reports-database.qmd
```

---

## Step 3 — Render

```bash
quarto render
# or for live preview:
quarto preview
```

That's it. The page is fully self-contained — no R, Python, or server required.

---

## Adding a new report (two ways)

### Option A — Edit reports-data.js directly (recommended)

Open `reports-data.js`, scroll to the end of the `window.REPORTS_DATA` array,
and copy-paste any existing entry. Fill in the fields using the FIELD GUIDE
at the bottom of that file. The page picks up changes on the next `quarto render`.

### Option B — Edit the CSV in Excel, then convert back to JS

1. Open `reports-database.csv` in Excel / Google Sheets
2. Add rows, save as CSV
3. Run the helper script below to regenerate `reports-data.js`:

```bash
# Requires Node.js (one-time conversion):
node csv-to-js.cjs
```

*(A `csv-to-js.cjs` helper script is not included in this release —
for now, use Option A or write a simple Papa Parse converter.)*

---

## Customizing filters / tags

All filter options are **auto-generated** from whatever values are in `reports-data.js`.
Adding a new causal method tag to any report will automatically create a pill for it in
the "Causal Inference Method" filter section on next render.

---

## Theming to match your Quarto theme

The CSS uses custom properties (`--rdb-navy`, `--rdb-gold`, etc.) at the top of
`reports-database.css`. Override them to match your site palette:

```css
/* In your custom.css or at top of reports-database.css */
:root {
  --rdb-navy: #1a3a2a;   /* e.g. forest green for an env. program */
  --rdb-gold: #e07b39;   /* accent color */
}
```

---

## Embedding in an existing page

If you'd rather embed the database inside an existing `.qmd` page instead of a
dedicated page, replace the Quarto front matter and include just the HTML block:

```markdown
## Report Database

```{=html}
<script src="reports-data.js"></script>
<div id="rdb-root">...</div>  <!-- full block from reports-database.qmd -->
<script src="reports-database.js"></script>
```

---

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No build step,
no npm, no R packages required. Pure HTML + CSS + vanilla JS.
