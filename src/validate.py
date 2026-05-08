"""Validation script — runs after data_generator.py to verify generated data."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

students = pd.read_csv(DATA_DIR / "students.csv")
applications = pd.read_csv(DATA_DIR / "applications.csv")

# 1. Total students check
print("=" * 60)
print("STUDENT COUNT")
print("=" * 60)
print(f"Total students: {len(students)} (target: 1,500)")

# 2. Yearly volume by register_date
print("\n" + "=" * 60)
print("YEARLY VOLUME (registers)")
print("=" * 60)
students["register_year"] = pd.to_datetime(students["register_date"]).dt.year
yearly = students["register_year"].value_counts().sort_index()
print(yearly)

expected = {2019: 55, 2020: 10, 2021: 8, 2022: 17, 2023: 190, 2024: 460, 2025: 760}
print("\nExpected vs Actual:")
for year, exp in expected.items():
    actual = int(yearly.get(year, 0))
    diff_pct = (actual - exp) / exp * 100 if exp > 0 else 0
    status = "✓" if abs(diff_pct) < 20 else "✗"
    print(f"  {year}: expected {exp}, got {actual} ({diff_pct:+.1f}%) {status}")

# 3. Birth year validation
print("\n" + "=" * 60)
print("BIRTH YEAR LOGIC")
print("=" * 60)
students["age_at_register"] = students["register_year"] - students["birth_year"]
print("\nAge distribution:")
print(students["age_at_register"].value_counts().sort_index())
print(f"\nBirth year range: {students['birth_year'].min()} - {students['birth_year'].max()}")
impossible = ((students["age_at_register"] < 16) | (students["age_at_register"] > 35)).sum()
print(f"Impossible ages (<16 or >35): {impossible} {'✓' if impossible == 0 else '✗'}")

# 4. Cross-tab: register_year × age (sanity check)
print("\nRegister Year × Age (sanity check):")
print(pd.crosstab(students["register_year"], students["age_at_register"]))

# 5. COVID years pattern
print("\n" + "=" * 60)
print("COVID YEARS (2020-2022) APPLICATIONS BREAKDOWN")
print("=" * 60)
applications["apply_year"] = pd.to_datetime(applications["apply_date"]).dt.year
covid_apps = applications[applications["apply_year"].isin([2020, 2021, 2022])]
print(f"Total COVID-era applications: {len(covid_apps)}")
print("\nStatus distribution:")
print(covid_apps["status"].value_counts())
print("\nProgram type distribution:")
print(covid_apps["anko_program_type"].value_counts())
print("\nProgram type %:")
print((covid_apps["anko_program_type"].value_counts(normalize=True) * 100).round(1))

# 6. Sample records
print("\n" + "=" * 60)
print("SAMPLE: 2019 vs 2025 students")
print("=" * 60)
print("\n2019 registrants (5):")
print(
    students[students["register_year"] == 2019][
        ["name", "birth_year", "age_at_register", "aimag", "gpa_percent", "hsk_level", "hsk_score"]
    ]
    .head(5)
    .to_string(index=False)
)
print("\n2025 registrants (5):")
print(
    students[students["register_year"] == 2025][
        ["name", "birth_year", "age_at_register", "aimag", "gpa_percent", "hsk_level", "hsk_score"]
    ]
    .head(5)
    .to_string(index=False)
)

# 7. GPA + HSK score ranges
print("\n" + "=" * 60)
print("GPA% + HSK SCORE RANGES")
print("=" * 60)
print(f"GPA% range: {students['gpa_percent'].min():.1f} – {students['gpa_percent'].max():.1f}, mean {students['gpa_percent'].mean():.1f}")
print(f"\nHSK score by level:")
print(students.groupby("hsk_level")["hsk_score"].agg(["mean", "min", "max"]).round(1))

# 8. Application year distribution
print("\n" + "=" * 60)
print("APPLICATION VOLUME BY apply_year")
print("=" * 60)
print(applications["apply_year"].value_counts().sort_index())
print(f"\nTotal applications: {len(applications)}")
print(f"Avg apps per student: {len(applications) / len(students):.2f}")

# 9. Bachelor admission HSK rule check
print("\n" + "=" * 60)
print("FALL BACHELOR-Д HSK 4 + 120 ОНОО ШААРДЛАГА")
print("=" * 60)
joined = applications.merge(students[["student_id", "hsk_level", "hsk_score"]], on="student_id")
fb = joined[joined["anko_program_type"] == "Fall Bachelor"]
if len(fb) > 0:
    pass_rule = ((fb["hsk_level"] >= 4) & (fb["hsk_score"] >= 120)).mean() * 100
    print(f"Total Fall Bachelor apps: {len(fb)}")
    print(f"HSK 4 + score 120+ хангасан: {pass_rule:.1f}%  {'✓' if pass_rule >= 95 else '✗'}")
    print(f"HSK 4-аас дээш: {(fb['hsk_level'] >= 4).mean() * 100:.1f}%")
    violations = fb[(fb["hsk_level"] < 4) | (fb["hsk_score"] < 120)]
    if len(violations) > 0:
        print(f"\nVIOLATIONS ({len(violations)}):")
        print(violations[["app_id", "anko_program_type", "hsk_level", "hsk_score"]].head().to_string(index=False))

# 10. Scholarship HSK floor check
print("\n" + "=" * 60)
print("ТЭТГЭЛГИЙН HSK БОСГО ШАЛГАЛТ")
print("=" * 60)
scholarships = pd.read_csv(Path(__file__).resolve().parent.parent / "data/scholarships.csv")
sch_apps = scholarships.merge(applications[["app_id", "anko_program_type", "student_id"]], on="app_id")
sch_apps = sch_apps.merge(students[["student_id", "hsk_level"]], on="student_id")
print(f"Total scholarships: {len(sch_apps)}")
lang_prep = sch_apps[sch_apps["anko_program_type"].isin(["6+6", "1+4"])]
bachelor_grad = sch_apps[sch_apps["anko_program_type"].isin(["Fall Bachelor", "Master/PhD"])]
print(f"\nLanguage prep тэтгэлэгтэн: {len(lang_prep)}")
if len(lang_prep) > 0:
    pass1 = (lang_prep["hsk_level"] >= 3).mean() * 100
    print(f"  HSK 3+ хангасан: {pass1:.1f}%  {'✓' if pass1 >= 99 else '✗'}")
print(f"\nBachelor/Master/PhD тэтгэлэгтэн: {len(bachelor_grad)}")
if len(bachelor_grad) > 0:
    pass2 = (bachelor_grad["hsk_level"] >= 4).mean() * 100
    print(f"  HSK 4+ хангасан: {pass2:.1f}%  {'✓' if pass2 >= 99 else '✗'}")
