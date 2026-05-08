"""
ANKO Bridge — Insights export for the scrollytelling website.

`python src/insights.py` running this script reads the CSVs, fits the
models, and writes `website/data/insights.json`.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from analysis import (  # noqa: E402
    aimag_breakdown,
    applications_enriched,
    load_all,
    students_enriched,
    ub_district_breakdown,
)
from models import (  # noqa: E402
    build_feature_matrix,
    cluster_students,
    fit_logreg,
    fit_random_forest,
    fit_xgboost,
    label_personas,
)

OUT = ROOT / "website" / "data" / "insights.json"


def _round(x: float, n: int = 1) -> float:
    return float(round(float(x), n))


def main() -> None:
    print("ANKO Bridge — insights.json үүсгэж байна...")
    dfs = load_all()
    apps = applications_enriched(dfs)
    students = students_enriched(dfs)
    out: dict = {}

    # ─── Yearly application volumes (apply_year) ───
    yearly = apps.groupby("apply_year").size()
    out["yearly_apps"] = [{"year": int(y), "count": int(n)} for y, n in yearly.items()]

    # ─── Yearly student registrations ───
    yearly_reg = students.groupby("register_year").size()
    out["yearly_registrations"] = [{"year": int(y), "count": int(n)} for y, n in yearly_reg.items()]

    # ─── COVID drop ───
    a2019 = int(yearly.get(2019, 0))
    a2020 = int(yearly.get(2020, 0))
    out["covid_drop"] = {
        "year": 2020,
        "before": a2019,
        "after": a2020,
        "pct": _round((a2020 - a2019) / max(a2019, 1) * 100, 1),
    }

    # ─── Recovery / peak year ───
    peak_year = int(yearly.idxmax())
    out["peak_year"] = {"year": peak_year, "count": int(yearly.max())}

    # ─── Top universities (overall + per year) ───
    top_unis = apps["uni_name"].value_counts().head(10)
    out["top_universities"] = [{"name": n, "count": int(c)} for n, c in top_unis.items()]
    out["top_universities_by_year"] = {
        str(y): apps[apps["apply_year"] == y]["uni_name"].value_counts().head(5).to_dict()
        for y in sorted(apps["apply_year"].unique())
    }

    # ─── Aimag breakdown ───
    aimag_pct = aimag_breakdown(students)
    out["aimag_share"] = [{"aimag": a, "pct": _round(p)} for a, p in aimag_pct.items()]
    out["ub_share"] = {"name": "Улаанбаатар", "share": _round(aimag_pct.get("Улаанбаатар", 0))}

    # ─── UB districts ───
    ub_pct = ub_district_breakdown(students)
    out["ub_districts"] = [{"district": d, "pct": _round(p)} for d, p in ub_pct.items()]
    if len(ub_pct) > 0:
        out["top_ub_district"] = {"name": ub_pct.index[0], "share": _round(ub_pct.iloc[0])}

    # ─── HSK distribution by year ───
    hsk_year = (
        students.groupby(["register_year", "hsk_level"]).size().unstack(fill_value=0)
    )
    out["hsk_by_year"] = {
        str(y): {f"HSK {lvl}": int(hsk_year.loc[y, lvl]) for lvl in hsk_year.columns}
        for y in hsk_year.index
    }

    # ─── Age distribution + high school senior share ───
    age_dist = students["age_at_register"].value_counts(normalize=True).sort_index() * 100
    out["age_distribution"] = [{"age": int(a), "pct": _round(p)} for a, p in age_dist.items()]
    out["high_school_seniors"] = {
        "share": _round(students["is_high_school_senior"].mean() * 100, 1),
        "median_age": int(students["age_at_register"].median()),
    }

    # ─── Gender ratios ───
    gender = students["gender"].value_counts(normalize=True) * 100
    out["gender_share"] = {g: _round(p) for g, p in gender.items()}

    # ─── Field of study evolution ───
    field_year = apps.groupby(["apply_year", "field"]).size().unstack(fill_value=0)
    out["field_by_year"] = {
        str(y): {f: int(field_year.loc[y, f]) for f in field_year.columns}
        for y in field_year.index
    }

    # ─── ANKO program type breakdown ───
    prog_share = (apps["anko_program_type"].value_counts(normalize=True) * 100).round(1)
    out["program_share"] = [{"type": t, "pct": _round(p)} for t, p in prog_share.items()]
    prog_by_year = (
        apps.groupby(["apply_year", "anko_program_type"]).size().unstack(fill_value=0)
    )
    prog_pct = prog_by_year.div(prog_by_year.sum(axis=1), axis=0) * 100
    out["program_share_by_year"] = {
        str(y): {t: _round(prog_pct.loc[y, t], 1) for t in prog_pct.columns}
        for y in prog_pct.index
    }
    accept_by_prog = (apps.groupby("anko_program_type")["is_accepted"].mean() * 100).round(1)
    out["acceptance_by_program"] = [{"type": t, "rate": _round(r)} for t, r in accept_by_prog.items()]

    # Most popular program + its growth
    most_pop = prog_share.idxmax()
    growth_2019 = float(prog_pct.loc[2019, most_pop]) if 2019 in prog_pct.index else 0.0
    growth_2024 = float(prog_pct.loc[2024, most_pop]) if 2024 in prog_pct.index else 0.0
    out["most_popular_program"] = {
        "type": most_pop,
        "share": _round(prog_share.max()),
        "growth_2019_to_2024_pp": _round(growth_2024 - growth_2019, 1),
    }
    out["highest_acceptance_program"] = {
        "type": str(accept_by_prog.idxmax()),
        "rate": _round(accept_by_prog.max() / 100, 3),
    }

    # ─── Acceptance by HSK ───
    accept_hsk = (apps.groupby("hsk_level")["is_accepted"].mean() * 100).round(1)
    out["acceptance_by_hsk"] = [{"hsk": int(h), "rate": _round(r)} for h, r in accept_hsk.items()]

    # ─── Scholarship statistics ───
    sch = dfs["scholarships"]
    sch_type = sch["scholarship_type"].value_counts()
    out["scholarship_types"] = [{"type": t, "count": int(c)} for t, c in sch_type.items()]
    out["scholarship_total_yuan"] = int(sch["amount_yuan"].sum())
    out["scholarship_avg_yuan"] = int(sch["amount_yuan"].mean())

    # ─── Models ───
    print("  Random Forest fit-лэж байна...")
    X, _ = build_feature_matrix(apps)
    rf = fit_random_forest(X, apps["is_accepted"].astype(int))
    out["models"] = {
        "random_forest_acceptance": {
            "accuracy": _round(rf["accuracy"], 3),
            "f1": _round(rf["f1"], 3),
            "auc": _round(rf["auc"], 3),
            "feature_importances": rf["feature_importances"][:10],
        },
    }

    print("  Logistic Regression (visa) fit-лэж байна...")
    visa_apps = apps[apps["visa_status"].isin(["Approved", "Rejected"])].copy()
    if len(visa_apps) > 50:
        Xv, _ = build_feature_matrix(visa_apps)
        yv = (visa_apps["visa_status"] == "Approved").astype(int)
        if yv.nunique() == 2:
            lr = fit_logreg(Xv, yv)
            out["models"]["logreg_visa"] = {
                "accuracy": _round(lr["accuracy"], 3),
                "f1": _round(lr["f1"], 3),
                "auc": _round(lr["auc"], 3),
                "intercept": _round(lr["intercept"], 4),
                "coefs": {k: _round(v, 4) for k, v in lr["coefs"].items()},
                "feature_means": {k: _round(v, 3) for k, v in lr["feature_means"].items()},
                "feature_stds": {k: _round(v, 3) for k, v in lr["feature_stds"].items()},
            }

    print("  XGBoost (scholarship) fit-лэж байна...")
    sch_app_ids = set(sch["app_id"].tolist())
    apps["got_scholarship"] = apps["app_id"].isin(sch_app_ids).astype(int)
    accepted_apps = apps[apps["is_accepted"]].copy()
    if len(accepted_apps) > 50 and accepted_apps["got_scholarship"].nunique() == 2:
        Xs, _ = build_feature_matrix(accepted_apps)
        ys = accepted_apps["got_scholarship"]
        xgb = fit_xgboost(Xs, ys)
        if "error" not in xgb:
            out["models"]["xgb_scholarship"] = {
                "accuracy": _round(xgb["accuracy"], 3),
                "f1": _round(xgb["f1"], 3),
                "auc": _round(xgb["auc"], 3),
                "feature_importances": xgb["feature_importances"][:10],
            }

    # ─── Clustering — student personas ───
    print("  KMeans clustering хийж байна...")
    cl = cluster_students(students, k=5)
    persona_names = label_personas(cl["summary"])
    out["personas"] = []
    for cid, stats in cl["summary"].items():
        out["personas"].append({
            "id": int(cid),
            "name": persona_names[cid],
            "size": int(cl["sizes"][cid]),
            "avg_hsk": _round(stats["hsk_level"], 1),
            "avg_hsk_score": _round(stats["hsk_score"], 0),
            "avg_gpa": _round(stats["gpa_percent"], 1),
            "avg_age": _round(stats["age_at_register"], 1),
            "avg_income_mnt": int(stats["family_income_mnt"]),
        })

    # ─── BAR CHART RACE — top universities by year (cumulative) ───
    apps_with_uni = apps[["apply_year", "uni_name"]].copy()
    race = {}
    cumulative = {}
    for yr in sorted(apps_with_uni["apply_year"].unique()):
        subset = apps_with_uni[apps_with_uni["apply_year"] <= yr]
        counts = subset["uni_name"].value_counts().head(10)
        race[int(yr)] = [{"name": n, "count": int(c)} for n, c in counts.items()]
    out["uni_race_by_year"] = race

    # ─── PERSONAS RADAR DATA — normalized 0-1 attributes per cluster ───
    # Add to existing personas: hsk_norm, hsk_score_norm, gpa_norm, age_norm, income_norm
    if "personas" in out:
        for p in out["personas"]:
            p["radar"] = {
                "HSK":      round(p["avg_hsk"] / 6, 3),
                "HSK_оноо": round(p["avg_hsk_score"] / 300, 3),
                "GPA":      round(p["avg_gpa"] / 100, 3),
                "Нас":      round((p["avg_age"] - 17) / (28 - 17), 3),
                "Орлого":   round(min(p["avg_income_mnt"], 8_000_000) / 8_000_000, 3),
            }

    # ─── BUSINESS INTELLIGENCE — actionable recommendations ───
    # 1. Aimag market opportunity
    aimag_growth = {}  # last_yr count vs first 3 yrs avg
    students_with_year = students.copy()
    s2024_25 = students_with_year[students_with_year["register_year"] >= 2024]
    s2019_22 = students_with_year[students_with_year["register_year"] <= 2022]
    aimag_recent = s2024_25.groupby("aimag").size()
    aimag_old = s2019_22.groupby("aimag").size()
    out["bi_aimag_growth"] = []
    for aimag in aimag_recent.index:
        recent = int(aimag_recent.get(aimag, 0))
        old = int(aimag_old.get(aimag, 0))
        gpa_avg = float(students_with_year[students_with_year["aimag"] == aimag]["gpa_percent"].mean())
        hsk_avg = float(students_with_year[students_with_year["aimag"] == aimag]["hsk_level"].mean())
        out["bi_aimag_growth"].append({
            "aimag": aimag,
            "recent": recent,
            "older": old,
            "growth_x": round(recent / max(old, 1), 1),
            "gpa_avg": round(gpa_avg, 1),
            "hsk_avg": round(hsk_avg, 2),
        })
    out["bi_aimag_growth"].sort(key=lambda x: x["recent"], reverse=True)

    # 2. School type × acceptance — UB private/international funnel
    ub_apps = apps[apps["aimag"] == "Улаанбаатар"]
    accept_by_school = (ub_apps.groupby("school_type")["is_accepted"].mean() * 100).round(1)
    out["bi_school_acceptance"] = [{"school": s, "rate": float(r)} for s, r in accept_by_school.items()]

    # 3. Revenue (estimated) per program type
    prog_revenue = {}
    for ptype in ["6+6", "1+4", "Fall Bachelor", "Master/PhD"]:
        ptype_apps = apps[(apps["anko_program_type"] == ptype) & apps["is_accepted"]]
        # Estimated avg cost (yuan / year) × duration — simplistic
        avg_tuition = float(ptype_apps["tuition_yuan"].mean()) if len(ptype_apps) else 0
        count = int(len(ptype_apps))
        prog_revenue[ptype] = {
            "count": count,
            "avg_tuition_yuan": round(avg_tuition, 0),
            "share": round(count / max(len(apps[apps["is_accepted"]]), 1) * 100, 1),
        }
    out["bi_program_revenue"] = prog_revenue

    # 4. HSK funnel
    hsk_funnel = {}
    for hsk in [1, 2, 3, 4, 5, 6]:
        hsk_apps = apps[apps["hsk_level"] == hsk]
        hsk_funnel[hsk] = {
            "applied": int(len(hsk_apps)),
            "accepted": int(hsk_apps["is_accepted"].sum()),
            "rate": round(hsk_apps["is_accepted"].mean() * 100, 1) if len(hsk_apps) else 0,
        }
    out["bi_hsk_funnel"] = hsk_funnel

    # 5. COVID concentration risk — yearly volatility
    yearly_var = apps.groupby("apply_year").size()
    out["bi_yearly_volatility"] = {
        "max_drop_pct": round((yearly_var.min() / yearly_var.iloc[0] - 1) * 100, 1),
        "covid_years_total": int(yearly_var[[2020, 2021, 2022]].sum()) if all(y in yearly_var.index for y in [2020, 2021, 2022]) else 0,
        "all_china_dependency": True,
    }

    # ─── Hand-crafted story moments ───
    out["story_moments"] = {
        "covid_drop": out["covid_drop"],
        "peak_year": out["peak_year"],
        "ub_share": out["ub_share"],
        "top_ub_district": out.get("top_ub_district"),
        "high_school_seniors": out["high_school_seniors"],
        "most_popular_program": out["most_popular_program"],
        "highest_acceptance_program": out["highest_acceptance_program"],
    }

    # Write
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
