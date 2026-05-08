"""
ANKO Bridge — Data analysis helpers.

Notebook-ууд эдгээр функцыг import хийж ашиглана. Энд CSV ачаалах,
залгаас (join) хийх, ANKO-н дүрэмд тохирсон шүүлтүүр-ийн логик байрлана.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def load_all() -> dict[str, pd.DataFrame]:
    """5 CSV-г бүгдийг ачаалаад dict болгож буцаана."""
    out = {}
    for name in ("universities", "programs", "students", "applications", "scholarships"):
        out[name] = pd.read_csv(DATA_DIR / f"{name}.csv")
    return out


def applications_enriched(dfs: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """applications-д students + universities + programs-аас баганууд нэмж буцаана."""
    apps = dfs["applications"].copy()
    apps["apply_date"] = pd.to_datetime(apps["apply_date"])
    apps["apply_year"] = apps["apply_date"].dt.year
    apps["apply_month"] = apps["apply_date"].dt.month
    apps = apps.merge(
        dfs["students"][[
            "student_id", "name", "gender", "aimag", "district", "school_type",
            "gpa_percent", "hsk_level", "hsk_score",
            "family_income_mnt", "english_level", "is_high_school_senior",
            "birth_year", "register_date",
        ]],
        on="student_id", how="left",
    )
    apps["apply_age"] = apps["apply_year"] - apps["birth_year"]
    apps = apps.merge(
        dfs["universities"][["uni_id", "uni_name", "city", "province", "tier", "qs_rank"]],
        on="uni_id", how="left",
    )
    apps = apps.merge(
        dfs["programs"][["program_id", "program_name", "field", "tuition_yuan", "language"]],
        on="program_id", how="left", suffixes=("", "_prog"),
    )
    apps["is_accepted"] = apps["status"].isin(["Accepted", "Enrolled", "Enrolled (delayed)"])
    apps["is_enrolled"] = apps["status"].isin(["Enrolled", "Enrolled (delayed)"])
    return apps


def students_enriched(dfs: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """students-д register_year + age_at_register + applied_count нэмнэ."""
    stu = dfs["students"].copy()
    stu["register_date"] = pd.to_datetime(stu["register_date"])
    stu["register_year"] = stu["register_date"].dt.year
    stu["age_at_register"] = stu["register_year"] - stu["birth_year"]
    counts = dfs["applications"].groupby("student_id").size().rename("applied_count")
    stu = stu.merge(counts, on="student_id", how="left")
    stu["applied_count"] = stu["applied_count"].fillna(0).astype(int)
    return stu


def yearly_application_volume(apps: pd.DataFrame) -> pd.Series:
    return apps.groupby("apply_year").size().rename("applications")


def yearly_program_share(apps: pd.DataFrame) -> pd.DataFrame:
    pivot = apps.groupby(["apply_year", "anko_program_type"]).size().unstack(fill_value=0)
    return (pivot.div(pivot.sum(axis=1), axis=0) * 100).round(1)


def acceptance_by_hsk(apps: pd.DataFrame) -> pd.Series:
    return (apps.groupby("hsk_level")["is_accepted"].mean() * 100).round(1)


def aimag_breakdown(students: pd.DataFrame) -> pd.Series:
    return (students["aimag"].value_counts(normalize=True) * 100).round(1)


def ub_district_breakdown(students: pd.DataFrame) -> pd.Series:
    ub = students[students["aimag"] == "Улаанбаатар"]
    return (ub["district"].value_counts(normalize=True) * 100).round(1)
