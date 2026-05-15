# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Data analysis project on Mongolian student enrollment trends in Chinese universities (2019–2025) for the agency "ANKO Bridge". All data is **synthetic** but modeled on real ANKO Bridge operational patterns. The headline deliverable is a NYT/Pudding-style **scrollytelling website**. Documentation, notebook narration, and most code comments are in **Mongolian (Cyrillic)** — keep that convention.

## Pipeline

The project is a linear data pipeline. Run stages in order; each consumes the previous stage's output:

```bash
pip install -r requirements.txt          # Python 3.10+

python src/data_generator.py             # → data/*.csv + data/anko.db (5 tables, FK constraints)
python src/validate.py                   # sanity-checks generated CSVs against target distributions
python src/insights.py                   # CSVs + fitted models → website/data/insights.json
python src/export_geo_dots.py            # students.csv → website/data/students_geo.json (per-student lat/lon)
```

`SEED = 42` is fixed in `data_generator.py`, so regeneration is deterministic. `data/` is committed, so the website can be served without re-running Python.

Notebooks (`notebooks/01`–`05`) are the academic-report face of the same pipeline; they `import` the `src/` helpers rather than duplicating logic. Run with `jupyter notebook notebooks/`.

## Serving the website

```bash
cd website && python -m http.server 8000   # http://localhost:8000
```

The site is **static, vanilla JS** — no build step. Vercel deploys `website/` directly (`vercel.json`: `framework: null`, `outputDirectory: website`, no build/install command). `.vercelignore` excludes all Python/notebook/data-source files from deploy.

## Architecture

**`src/` is the single source of truth for analysis logic.** Notebooks, `insights.py`, and `export_geo_dots.py` all import from here — never fork logic into a notebook.

- `analysis.py` — CSV loading, table joins, and the ANKO domain-rule filters (the 4 programs: 6+6, 1+4, Fall Bachelor, Master/PhD; HSK thresholds for admission and scholarship eligibility). This is where the business rules live.
- `models.py` — feature engineering + the ML models (LogReg, Random Forest, XGBoost, KMeans, hierarchical). Called by notebook 04 and `insights.py`.
- `data_generator.py` — generates the 5 related tables (universities → programs → students → applications → scholarships) with FK integrity into both CSV and SQLite.
- `insights.py` / `export_geo_dots.py` — the bridge from Python analysis to the JS frontend; their only output is JSON under `website/data/`.

**Frontend** (`website/`): `main.js` drives the main scrollytelling sections with D3.js v7 + Scrollama; `agency.js`/`agency.css` is a separate section. Data is read at runtime from the pre-computed JSON in `website/data/` — the frontend never touches CSVs. 3D `.glb` models live in `website/models/`, geo assets in `website/assets/`.

## Domain rules to preserve

When touching analysis or generator code, the ANKO program/HSK rules in `analysis.py` are load-bearing for the project's correctness:

- **6+6** and **1+4** (language-prep programs): no HSK required for admission; HSK 3+ required to receive a scholarship.
- **Fall Bachelor**: requires HSK 4 + 120 points.
- **Master/PhD**: HSK 4+ or an English-track variant; scholarship requires HSK 4+.

## Other outputs

`powerbi/README.md` and `presentation/outline.md` are static documentation deliverables (PowerBI dashboard spec, 15-slide presentation outline) — not code.
