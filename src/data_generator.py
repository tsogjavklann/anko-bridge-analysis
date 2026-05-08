"""
ANKO Bridge — Synthetic Data Generator
Хятад дахь Монгол оюутны элсэлтийн өгөгдөл (2019-2025).

Run:
    python src/data_generator.py

Output:
    data/universities.csv
    data/programs.csv
    data/students.csv
    data/applications.csv
    data/scholarships.csv
    data/anko.db
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

# Ensure Mongolian Cyrillic prints correctly on Windows consoles (cp1251 default)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd
from sqlalchemy import create_engine

SEED = 42
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)


# ============================================================
# 1. UNIVERSITIES — 50 real Chinese universities
# ============================================================
# (name, city, province, tier, qs_rank, established_year)
UNIVERSITIES: list[tuple] = [
    ("Tsinghua University", "Beijing", "Beijing", "C9", 12, 1911),
    ("Peking University", "Beijing", "Beijing", "C9", 14, 1898),
    ("Fudan University", "Shanghai", "Shanghai", "C9", 39, 1905),
    ("Shanghai Jiao Tong University", "Shanghai", "Shanghai", "C9", 47, 1896),
    ("Zhejiang University", "Hangzhou", "Zhejiang", "C9", 44, 1897),
    ("University of Science and Technology of China", "Hefei", "Anhui", "C9", 133, 1958),
    ("Nanjing University", "Nanjing", "Jiangsu", "C9", 145, 1902),
    ("Harbin Institute of Technology", "Harbin", "Heilongjiang", "C9", 217, 1920),
    ("Xi'an Jiaotong University", "Xi'an", "Shaanxi", "C9", 145, 1896),
    ("Renmin University of China", "Beijing", "Beijing", "985", 318, 1937),
    ("Beijing Normal University", "Beijing", "Beijing", "985", 244, 1902),
    ("Beihang University", "Beijing", "Beijing", "985", 308, 1952),
    ("Tongji University", "Shanghai", "Shanghai", "985", 216, 1907),
    ("Wuhan University", "Wuhan", "Hubei", "985", 194, 1893),
    ("Sun Yat-sen University", "Guangzhou", "Guangdong", "985", 267, 1924),
    ("Sichuan University", "Chengdu", "Sichuan", "985", 395, 1896),
    ("Jilin University", "Changchun", "Jilin", "985", 415, 1946),
    ("Nankai University", "Tianjin", "Tianjin", "985", 396, 1919),
    ("Tianjin University", "Tianjin", "Tianjin", "985", 466, 1895),
    ("Shandong University", "Jinan", "Shandong", "985", 543, 1901),
    ("Xiamen University", "Xiamen", "Fujian", "985", 469, 1921),
    ("Southeast University", "Nanjing", "Jiangsu", "985", 405, 1902),
    ("Central South University", "Changsha", "Hunan", "985", 537, 1952),
    ("Hunan University", "Changsha", "Hunan", "985", 624, 1926),
    ("South China University of Technology", "Guangzhou", "Guangdong", "985", 313, 1952),
    ("Beijing Institute of Technology", "Beijing", "Beijing", "985", 412, 1940),
    ("Northwestern Polytechnical University", "Xi'an", "Shaanxi", "985", 411, 1938),
    ("Dalian University of Technology", "Dalian", "Liaoning", "985", 426, 1949),
    ("Lanzhou University", "Lanzhou", "Gansu", "985", 700, 1909),
    ("North China Electric Power University", "Beijing", "Beijing", "211", 700, 1958),
    ("China Agricultural University", "Beijing", "Beijing", "211", 609, 1905),
    ("Beijing Forestry University", "Beijing", "Beijing", "211", 800, 1952),
    ("Beijing Foreign Studies University", "Beijing", "Beijing", "211", 700, 1941),
    ("Beijing Language and Culture University", "Beijing", "Beijing", "211", 850, 1962),
    ("Capital Normal University", "Beijing", "Beijing", "211", 900, 1954),
    ("Communication University of China", "Beijing", "Beijing", "211", 800, 1954),
    ("Northeast Normal University", "Changchun", "Jilin", "211", 700, 1946),
    ("Heilongjiang University", "Harbin", "Heilongjiang", "211", 950, 1941),
    ("Liaoning University", "Shenyang", "Liaoning", "211", 1000, 1948),
    ("Northeast Forestry University", "Harbin", "Heilongjiang", "211", 1100, 1952),
    ("Yanbian University", "Yanji", "Jilin", "211", 1100, 1949),
    ("Hebei University", "Baoding", "Hebei", "211", 1200, 1921),
    ("Inner Mongolia University", "Hohhot", "Inner Mongolia", "211", 850, 1957),
    ("Inner Mongolia Normal University", "Hohhot", "Inner Mongolia", "Provincial", 1200, 1952),
    ("Inner Mongolia University of Technology", "Hohhot", "Inner Mongolia", "Provincial", 1300, 1951),
    ("Inner Mongolia Agricultural University", "Hohhot", "Inner Mongolia", "Provincial", 1400, 1952),
    ("Inner Mongolia Medical University", "Hohhot", "Inner Mongolia", "Provincial", 1500, 1956),
    ("Inner Mongolia University for Nationalities", "Tongliao", "Inner Mongolia", "Provincial", 1500, 1958),
    ("Hohhot Minzu College", "Hohhot", "Inner Mongolia", "Provincial", 1700, 1953),
    ("Shenyang Normal University", "Shenyang", "Liaoning", "Provincial", 1500, 1951),
]
assert len(UNIVERSITIES) == 50


def generate_universities() -> pd.DataFrame:
    rows = []
    for i, (name, city, province, tier, qs, est) in enumerate(UNIVERSITIES, start=1):
        # Mongolian-friendliness — Beijing/Shanghai elites top, Inner Mongolia provincial unis
        # only attractive to northern-aimag students (handled at app-time).
        if city in ("Beijing", "Shanghai"):
            score = 9
        elif province == "Inner Mongolia":
            score = 8 if tier == "211" else 6  # IM University is 211, others Provincial
        elif city in ("Tianjin", "Hangzhou", "Nanjing", "Harbin", "Changchun"):
            score = 7
        elif tier == "Provincial":
            score = 4
        else:
            score = 5
        rows.append({
            "uni_id": i,
            "uni_name": name,
            "city": city,
            "province": province,
            "qs_rank": qs,
            "tier": tier,
            "established_year": est,
            "mn_student_friendly_score": score,
        })
    return pd.DataFrame(rows)


# ============================================================
# 2. PROGRAMS — 200 programs across the 50 unis (4 per uni)
# ============================================================
PROGRAM_CATALOG: dict[str, list[str]] = {
    "Engineering": [
        "Computer Science and Technology", "Software Engineering",
        "Information Engineering", "Electrical Engineering",
        "Mechanical Engineering", "Civil Engineering", "Architecture",
        "Chemical Engineering", "Materials Science and Engineering",
        "Automation", "Industrial Engineering",
    ],
    "Medicine": [
        "Medicine (MBBS)", "Pharmacy", "Dentistry", "Nursing",
        "Public Health", "Traditional Chinese Medicine",
    ],
    "Business": [
        "International Business", "Finance", "Economics",
        "Accounting", "Marketing", "Management Science",
    ],
    "Humanities": [
        "International Relations", "Law", "Journalism",
        "Education", "Psychology", "Sociology",
    ],
    "Science": [
        "Mathematics", "Physics", "Chemistry", "Biology",
        "Environmental Science", "Geology",
    ],
    "Arts": ["Music", "Visual Arts", "Design", "Film and Television"],
    "Language": ["Chinese Language and Literature"],
}
FIELDS = list(PROGRAM_CATALOG.keys())
FIELD_WEIGHTS = np.array([0.30, 0.20, 0.20, 0.12, 0.10, 0.05, 0.03])
FIELD_WEIGHTS = FIELD_WEIGHTS / FIELD_WEIGHTS.sum()

ANKO_TYPES = ["6+6", "1+4", "Fall Bachelor", "Master/PhD"]
ANKO_TYPE_PROBS = [0.40, 0.30, 0.20, 0.10]


def _program_attrs(rng: np.random.Generator, anko_type: str, program_name: str) -> dict:
    """Derive duration, tuition, language, HSK requirement from anko_program_type.

    HSK requirements (per ANKO Bridge real-world rules):
      - 6+6, 1+4 (language prep tracks): no HSK requirement (min_hsk=0, score=0).
      - Fall Bachelor: HSK 4 with score >= 120.
      - Master/PhD: HSK 4 (or English-track equivalent).
    """
    if anko_type == "6+6":
        attrs = {
            "degree_level": "Language Prep + Bachelor Track",
            "duration_years": round(float(rng.uniform(1.0, 1.5)), 1),
            "tuition_yuan": int(rng.integers(18000, 26001)),
            "language": "Chinese",
            "min_hsk_required": 0,
            "min_hsk_score_required": 0,
        }
    elif anko_type == "1+4":
        attrs = {
            "degree_level": "Language Prep + Bachelor",
            "duration_years": 5.0,
            "tuition_yuan": int(rng.integers(20000, 35001)),
            "language": "Chinese",
            "min_hsk_required": 0,
            "min_hsk_score_required": 0,
        }
    elif anko_type == "Fall Bachelor":
        attrs = {
            "degree_level": "Bachelor",
            "duration_years": 4.0,
            "tuition_yuan": int(rng.integers(22000, 40001)),
            "language": "Chinese" if rng.random() < 0.85 else "Both",
            "min_hsk_required": 4,
            "min_hsk_score_required": 120,
        }
    else:  # Master/PhD
        is_phd = rng.random() < 0.3
        lang = rng.choice(["Chinese", "English", "Both"], p=[0.35, 0.35, 0.30])
        attrs = {
            "degree_level": "PhD" if is_phd else "Master",
            "duration_years": float(rng.integers(3, 5)) if is_phd else float(rng.integers(2, 4)),
            "tuition_yuan": int(rng.integers(30000, 60001)),
            "language": str(lang),
            "min_hsk_required": 4 if lang != "English" else 0,
            "min_hsk_score_required": 180 if lang != "English" else 0,
        }
    if "MBBS" in program_name:
        attrs["tuition_yuan"] = int(rng.integers(40000, 60001))
    return attrs


def generate_programs(rng: np.random.Generator, universities_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    pid = 1
    for _, uni in universities_df.iterrows():
        used_names: set[str] = set()
        for _ in range(4):
            field = str(rng.choice(FIELDS, p=FIELD_WEIGHTS))
            # avoid same program name twice in one uni
            for _try in range(6):
                name = str(rng.choice(PROGRAM_CATALOG[field]))
                if name not in used_names:
                    used_names.add(name)
                    break
            anko_type = str(rng.choice(ANKO_TYPES, p=ANKO_TYPE_PROBS))
            attrs = _program_attrs(rng, anko_type, name)
            rows.append({
                "program_id": pid,
                "uni_id": int(uni["uni_id"]),
                "program_name": name,
                "anko_program_type": anko_type,
                "field": field,
                **attrs,
            })
            pid += 1
    return pd.DataFrame(rows)


# ============================================================
# 3. STUDENTS — 1,500 Mongolian students
# ============================================================
# Mongolian aimag distribution (UB-centric)
AIMAG_WEIGHTS: dict[str, float] = {
    "Улаанбаатар": 0.70,
    "Дархан-Уул": 0.06,
    "Орхон": 0.05,
    "Сэлэнгэ": 0.03,
    "Ховд": 0.02,
    "Увс": 0.02,
    "Баян-Өлгий": 0.02,
    "Хэнтий": 0.02,
    "Дорнод": 0.02,
    "Архангай": 0.008,
    "Баянхонгор": 0.007,
    "Булган": 0.007,
    "Говь-Алтай": 0.005,
    "Дорноговь": 0.006,
    "Дундговь": 0.005,
    "Завхан": 0.006,
    "Өвөрхангай": 0.008,
    "Өмнөговь": 0.007,
    "Сүхбаатар": 0.006,
    "Төв": 0.008,
    "Хөвсгөл": 0.007,
}
# normalize (already sums to 1.0)
_aimag_keys = list(AIMAG_WEIGHTS.keys())
_aimag_probs = np.array(list(AIMAG_WEIGHTS.values()))
_aimag_probs = _aimag_probs / _aimag_probs.sum()

UB_DISTRICTS = [
    "Хан-Уул", "Сүхбаатар", "Чингэлтэй", "Баянгол",
    "Сонгинохайрхан", "Баянзүрх", "Налайх", "Багануур",
]
UB_DISTRICT_WEIGHTS = np.array([0.18, 0.16, 0.14, 0.13, 0.13, 0.18, 0.04, 0.04])

# Northern aimags (preferred for Inner Mongolia universities)
NORTHERN_AIMAGS = {"Дорнод", "Сүхбаатар", "Хэнтий", "Сэлэнгэ", "Дархан-Уул", "Орхон"}

# Mongolian name pools (handcrafted — faker has no Mongolian Cyrillic locale)
FATHER_NAMES = [
    "Бат-Эрдэнэ", "Дорж", "Чулуун", "Цагаан", "Болд", "Содном",
    "Цэрэн", "Энхбат", "Эрдэнэ", "Жамбал", "Лхагва", "Хүрэлбаатар",
    "Сүхбаатар", "Сэр-Од", "Жамьян", "Очир", "Ганбат", "Ёндон",
    "Дамдин", "Дашням", "Балдан", "Цэдэв", "Гомбо", "Цэвээн",
    "Лхагвасүрэн", "Мөнхбат", "Ариунбат", "Энхболд", "Цогт",
    "Батбаяр", "Алтанхуяг", "Цэцэгээ", "Бямбаа", "Очирбат",
]
MALE_NAMES = [
    "Батбаяр", "Баярсайхан", "Мөнхбат", "Эрдэнэбат", "Ганбат",
    "Бат-Эрдэнэ", "Чулуунбаатар", "Энхбат", "Болд", "Дорж",
    "Цогт", "Алтанхуяг", "Цэрэн", "Жаргал", "Сүхбат", "Бямбадорж",
    "Тэмүүлэн", "Ананд", "Бат-Ирээдүй", "Бямбасүрэн", "Ариунболд",
    "Энхтайван", "Мөнхтөр", "Хосбаяр", "Үүрцайх", "Тэмүүжин",
    "Бат-Орших", "Хүлэг", "Чингис", "Ган-Эрдэнэ", "Гэрэлт",
    "Сүхбат", "Уртнасан", "Анар", "Цэвэлмаа", "Эрх-Очир",
    "Сайнбаяр", "Доржсүрэн", "Ариунбаатар", "Идэрбат",
]
FEMALE_NAMES = [
    "Оюунбилэг", "Эрдэнэцэцэг", "Баярцэцэг", "Цэцэгмаа", "Сараа",
    "Долгор", "Мөнхзул", "Энхтуяа", "Туяа", "Алтантуяа",
    "Бямбажав", "Цэрэндулам", "Ариунаа", "Уранцэцэг", "Долгорсүрэн",
    "Ариунзаяа", "Цэцгээ", "Ундраа", "Ариунтуяа", "Сарантуяа",
    "Мөнхцэцэг", "Энхжаргал", "Намуун", "Энхжин", "Анударь",
    "Хулан", "Номин-Эрдэнэ", "Тэмүүлэн", "Алтанзул", "Болормаа",
    "Сэлэнгэ", "Цолмон", "Гэрэлмаа", "Дөлгөөн", "Туул",
    "Нандинцэцэг", "Ариунсувд", "Энхтуул", "Билгүүн", "Маралмаа",
]


def _sample_aimag(rng: np.random.Generator) -> str:
    return str(rng.choice(_aimag_keys, p=_aimag_probs))


def _sample_apply_age(rng: np.random.Generator) -> int:
    # 18:55%, 17:15%, 19:15%, 20:4%, 21:3%, 22:3%, 23-28: 1% each (small)
    ages = np.array([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28])
    probs = np.array([0.15, 0.55, 0.15, 0.04, 0.03, 0.03, 0.013, 0.011, 0.009, 0.007, 0.005, 0.003])
    probs = probs / probs.sum()
    return int(rng.choice(ages, p=probs))


def _sample_school_type(rng: np.random.Generator, aimag: str, district: str | None) -> str:
    if aimag != "Улаанбаатар":
        return str(rng.choice(["Public", "Private"], p=[0.92, 0.08]))
    # UB
    rich_districts = {"Хан-Уул", "Сүхбаатар"}
    if district in rich_districts:
        return str(rng.choice(["Public", "Private", "International"], p=[0.45, 0.40, 0.15]))
    return str(rng.choice(["Public", "Private", "International"], p=[0.70, 0.25, 0.05]))


def _sample_hsk(rng: np.random.Generator, school_type: str, aimag: str) -> int:
    # Higher HSK for UB + International/Private
    if school_type == "International":
        probs = np.array([0.02, 0.04, 0.10, 0.30, 0.34, 0.20])  # HSK 1..6
    elif school_type == "Private":
        probs = np.array([0.03, 0.05, 0.17, 0.35, 0.28, 0.12])
    elif aimag == "Улаанбаатар":
        probs = np.array([0.05, 0.07, 0.22, 0.36, 0.22, 0.08])
    else:
        probs = np.array([0.08, 0.12, 0.30, 0.34, 0.12, 0.04])
    probs = probs / probs.sum()
    return int(rng.choice([1, 2, 3, 4, 5, 6], p=probs))


def _sample_gpa(rng: np.random.Generator, aimag: str, school_type: str) -> float:
    """Sample high-school GPA on Mongolian 0–100% scale (хувийн үнэлгээ).
    UB and Private/International schools have higher means."""
    loc = 78.0
    if aimag == "Улаанбаатар":
        loc += 3.0
    if school_type == "Private":
        loc += 4.0
    elif school_type == "International":
        loc += 6.0
    val = rng.normal(loc, 7.0)
    return float(np.clip(val, 50.0, 99.0))


def _sample_hsk_score(rng: np.random.Generator, hsk_level: int, gpa_pct: float) -> int:
    """Sample HSK exam score. Range depends on level:
      HSK 1-2: 0-200 (passing ~120),
      HSK 3-6: 0-300 (typical pass ~180).
    Higher-GPA students tend to score higher."""
    quality_boost = (gpa_pct - 80.0) * 1.5  # roughly ±30 points
    if hsk_level <= 2:
        score = rng.normal(150 + quality_boost, 22)
        return int(np.clip(score, 60, 200))
    score = rng.normal(190 + quality_boost, 28)
    return int(np.clip(score, 90, 300))


def _sample_income(rng: np.random.Generator, aimag: str) -> int:
    median = 3_500_000 if aimag == "Улаанбаатар" else 1_800_000
    val = rng.lognormal(mean=np.log(median), sigma=0.55)
    return int(np.clip(val, 400_000, 50_000_000))


def _sample_english(rng: np.random.Generator, school_type: str, aimag: str) -> str:
    """English proficiency. Note: "No English" not literal "None" — pandas treats
    the string "None" as NaN when reading CSV by default."""
    if school_type == "International":
        probs = np.array([0.0, 0.05, 0.30, 0.65])
    elif school_type == "Private":
        probs = np.array([0.02, 0.20, 0.50, 0.28])
    elif aimag == "Улаанбаатар":
        probs = np.array([0.10, 0.40, 0.40, 0.10])
    else:
        probs = np.array([0.30, 0.45, 0.22, 0.03])
    return str(rng.choice(["No English", "Basic", "Intermediate", "Advanced"], p=probs))


# Student-level register_year volumes — reflects ANKO Bridge's actual operating
# history: founded 2019, COVID border closures 2020-2022, recovery 2023-2024,
# peak 2025 (Jan-June only since dataset ends 2025-06-30).
STUDENT_YEAR_VOLUMES: dict[int, int] = {
    2019: 55,    # founding year
    2020: 10,    # COVID — borders closed
    2021: 8,     # borders still closed
    2022: 17,    # gradual reopening
    2023: 190,   # borders open — pent-up demand
    2024: 460,   # strong growth
    2025: 760,   # peak (Jan-Jun only)
}
assert sum(STUDENT_YEAR_VOLUMES.values()) == 1500


def _random_register_date(rng: np.random.Generator, year: int) -> date:
    """Random day in given year. 2025 capped at June 30 (dataset cutoff)."""
    if year == 2025:
        doy = int(rng.integers(1, 182))  # Jan 1 .. Jun 30
    else:
        doy = int(rng.integers(1, 366))
    try:
        return date(year, 1, 1) + timedelta(days=doy - 1)
    except ValueError:
        return date(year, 12, 31)


def generate_students(rng: np.random.Generator) -> pd.DataFrame:
    """Generate exactly 1500 students with per-year register_date volumes."""
    rows = []
    sid = 1
    for year, count in STUDENT_YEAR_VOLUMES.items():
        for _ in range(count):
            aimag = _sample_aimag(rng)
            if aimag == "Улаанбаатар":
                district = str(rng.choice(UB_DISTRICTS, p=UB_DISTRICT_WEIGHTS / UB_DISTRICT_WEIGHTS.sum()))
            else:
                district = None
            school_type = _sample_school_type(rng, aimag, district)
            gender = str(rng.choice(["F", "M"], p=[0.52, 0.48]))
            father = str(rng.choice(FATHER_NAMES))
            given = str(rng.choice(FEMALE_NAMES if gender == "F" else MALE_NAMES))
            name = f"{father} {given}"
            register_d = _random_register_date(rng, year)
            apply_age = _sample_apply_age(rng)
            birth_year = year - apply_age
            gpa_pct = _sample_gpa(rng, aimag, school_type)
            hsk = _sample_hsk(rng, school_type, aimag)
            hsk_score = _sample_hsk_score(rng, hsk, gpa_pct)
            income = _sample_income(rng, aimag)
            english = _sample_english(rng, school_type, aimag)
            is_senior = bool(rng.random() < 0.85) if apply_age <= 19 else False
            rows.append({
                "student_id": sid,
                "name": name,
                "birth_year": birth_year,
                "gender": gender,
                "aimag": aimag,
                "district": district,
                "school_type": school_type,
                "gpa_percent": round(gpa_pct, 1),
                "hsk_level": hsk,
                "hsk_score": hsk_score,
                "family_income_mnt": income,
                "register_date": register_d.isoformat(),
                "english_level": english,
                "is_high_school_senior": is_senior,
            })
            sid += 1
    return pd.DataFrame(rows)


# ============================================================
# 4. APPLICATIONS — ~2,250, student-driven (each student ~1.5 apps)
# ============================================================
TOTAL_APPS = 2250
DATA_END = date(2025, 6, 30)


def _year_program_type_dist(year: int) -> np.ndarray:
    """Normal-year ANKO program type share. 6+6 grows 35%→55% (2019→2024+)."""
    t = max(0.0, min((year - 2019) / 5.0, 1.0))
    six_six = 0.35 + 0.20 * t
    masters = 0.08
    rest = 1.0 - six_six - masters
    one_four = rest * 0.60
    fall_b = rest * 0.40
    return np.array([six_six, one_four, fall_b, masters])


# COVID era — small cohort that stayed in MN for language prep or pursued online
# Master/PhD research. Borders closed → most non-language programs collapsed.
COVID_TYPE_PROBS = np.array([0.45, 0.10, 0.05, 0.40])  # 6+6, 1+4, Fall B, M/PhD
COVID_STATUSES = ["Withdrawn", "Cancelled", "Enrolled (delayed)", "Accepted"]
COVID_STATUS_PROBS = [0.35, 0.20, 0.25, 0.20]


def _seasonal_month(rng: np.random.Generator, anko_type: str) -> int:
    if anko_type == "Master/PhD":
        return int(rng.choice([8, 9, 10], p=[0.25, 0.50, 0.25]))
    if anko_type == "Fall Bachelor":
        if rng.random() < 0.80:
            return int(rng.choice([8, 9, 10]))
        return int(rng.choice([5, 6, 7, 11]))
    if anko_type == "1+4":
        if rng.random() < 0.70:
            return int(rng.choice([1, 2, 3, 4]))
        return int(rng.choice(list(range(5, 12))))
    return int(rng.integers(1, 13))  # 6+6 year-round


def _apply_date_for_student(
    rng: np.random.Generator,
    register_d: date,
    anko_type: str,
) -> date:
    """Pick apply_date 0–9 months after register_date, seasonal by program type.
    Always >= register_date and <= DATA_END (2025-06-30)."""
    # 85% apply in register_year, 15% next year
    year_offset = 0 if rng.random() < 0.85 else 1
    apply_year = register_d.year + year_offset
    if apply_year > DATA_END.year:
        apply_year = DATA_END.year
    month = _seasonal_month(rng, anko_type)
    if apply_year == DATA_END.year and month > DATA_END.month:
        month = int(rng.choice([1, 2, 3, 4, 5, 6]))
    day = int(rng.integers(1, 29))
    apply_d = date(apply_year, month, day)
    if apply_d < register_d:
        # bump forward by 7-180 days (still respecting cutoff)
        apply_d = register_d + timedelta(days=int(rng.integers(7, 181)))
    if apply_d > DATA_END:
        apply_d = DATA_END
    return apply_d


def _accept_prob(hsk: int, gpa_pct: float, tier: str, income_mnt: int) -> float:
    """Compute acceptance probability calibrated to spec targets.

    Targets (averaged over tiers):
      HSK 1-2 ≈ 20%, HSK 3 ≈ 45%, HSK 4 ≈ 60%, HSK 5+ ≈ 78%.
      C9 ≈ 25%, 985 ≈ 40%, 211/Provincial higher.
    GPA on 0–100% scale (mean ~80).
    """
    base = 0.55
    if hsk == 1:
        base += -0.45
    elif hsk == 2:
        base += -0.38
    elif hsk == 3:
        base += -0.08
    elif hsk == 4:
        base += 0.08
    elif hsk == 5:
        base += 0.28
    else:  # 6
        base += 0.32
    base += 0.005 * (gpa_pct - 80.0)  # +/- 0.10 across the GPA range
    if tier == "C9":
        base -= 0.20
    elif tier == "985":
        base -= 0.08
    elif tier == "211":
        base -= 0.02
    else:  # Provincial
        base += 0.05
    base += 0.02 * np.log10(max(income_mnt, 100_000) / 1_000_000)
    return float(np.clip(base, 0.05, 0.95))


def _pick_university(
    rng: np.random.Generator,
    candidate_programs: pd.DataFrame,
    universities_df: pd.DataFrame,
    student: pd.Series,
) -> int:
    """Pick a program_id weighted by uni friendliness, tier, and Inner-Mongolia preference."""
    merged = candidate_programs.merge(
        universities_df[["uni_id", "tier", "province", "mn_student_friendly_score"]],
        on="uni_id",
    )
    weights = merged["mn_student_friendly_score"].astype(float).values.copy()
    # tier prestige adds base attractiveness
    tier_arr = merged["tier"].values
    weights = weights + np.select(
        [tier_arr == "C9", tier_arr == "985", tier_arr == "211"],
        [3.0, 2.0, 1.0],
        default=0.0,
    )
    # northern aimag students get a meaningful bonus for IM unis
    if student["aimag"] in NORTHERN_AIMAGS:
        weights = weights + np.where(merged["province"].values == "Inner Mongolia", 5.0, 0.0)
    # high-GPA, high-HSK students bias toward C9/985
    if student["gpa_percent"] >= 88 and student["hsk_level"] >= 5:
        weights = weights + np.where(tier_arr == "C9", 4.0, 0.0)
        weights = weights + np.where(tier_arr == "985", 2.0, 0.0)
    elif student["hsk_level"] <= 3:
        # weak HSK biases away from C9 (rejection cost)
        weights = np.where(tier_arr == "C9", weights * 0.25, weights)
    weights = np.clip(weights, 0.5, None)
    probs = weights / weights.sum()
    idx = int(rng.choice(len(merged), p=probs))
    return int(merged.iloc[idx]["program_id"])


def _allocate_apps_per_student(
    rng: np.random.Generator, n_students: int, target: int = TOTAL_APPS
) -> np.ndarray:
    """Poisson(1.5) capped to [0, 5], adjusted to exactly hit target sum."""
    apps = np.clip(rng.poisson(1.5, size=n_students), 0, 5)
    # adjust toward target
    diff = target - int(apps.sum())
    if diff > 0:
        for _ in range(diff):
            cands = np.where(apps < 5)[0]
            apps[rng.choice(cands)] += 1
    elif diff < 0:
        for _ in range(-diff):
            cands = np.where(apps > 0)[0]
            apps[rng.choice(cands)] -= 1
    return apps


def generate_applications(
    rng: np.random.Generator,
    students_df: pd.DataFrame,
    programs_df: pd.DataFrame,
    universities_df: pd.DataFrame,
) -> pd.DataFrame:
    """Each student draws Poisson(1.5) applications. Apply_date follows
    register_date by 0–9 months, seasonal by program type.
    COVID era (apply_year ∈ {2020,2021,2022}) uses a special program/status mix."""
    rows = []
    app_id = 1
    apps_per_student = _allocate_apps_per_student(rng, len(students_df))

    programs_by_type: dict[str, pd.DataFrame] = {
        t: programs_df[programs_df["anko_program_type"] == t].reset_index(drop=True)
        for t in ANKO_TYPES
    }

    for i, student in students_df.iterrows():
        n_apps = int(apps_per_student[i])
        if n_apps == 0:
            continue
        register_d = date.fromisoformat(student["register_date"])
        for _ in range(n_apps):
            # First decide apply_year (so we know which dist to use)
            year_offset = 0 if rng.random() < 0.85 else 1
            apply_year_guess = min(register_d.year + year_offset, DATA_END.year)

            # Pick program type — COVID years vs normal years
            if apply_year_guess in (2020, 2021, 2022):
                anko_type = str(rng.choice(ANKO_TYPES, p=COVID_TYPE_PROBS))
            else:
                anko_type = str(rng.choice(ANKO_TYPES, p=_year_program_type_dist(apply_year_guess)))

            # Age × program-type consistency
            apply_age = apply_year_guess - int(student["birth_year"])
            if apply_age >= 23:
                # 23+ year olds → only Master/PhD makes sense
                anko_type = "Master/PhD"
            elif anko_type == "Master/PhD" and apply_age < 22:
                # young person can't reasonably do Master — re-bucket
                anko_type = "1+4" if int(student["hsk_level"]) >= 4 else "6+6"

            # HSK × program-type consistency (real ANKO Bridge rules):
            #   Fall Bachelor: HSK 4 with score >= 120 required.
            #   6+6 / 1+4 (хэлний бэлтгэл): no HSK requirement at all.
            #   Master/PhD: HSK 4+ (or English-track allowed).
            # Students who don't meet bachelor requirements get downgraded to
            # language prep (6+6 most common, 1+4 if their HSK is closer).
            hsk = int(student["hsk_level"])
            hsk_score_val = int(student["hsk_score"])
            if anko_type == "Fall Bachelor" and not (hsk >= 4 and hsk_score_val >= 120):
                # downgrade to 1+4 if HSK 3 already, else 6+6 (ground floor)
                anko_type = "1+4" if hsk >= 3 else "6+6"
            if anko_type == "Master/PhD" and hsk < 4:
                # Master/PhD also needs HSK 4 (English track skipped here for simplicity)
                anko_type = "1+4" if hsk >= 3 else "6+6"

            # Now compute final apply_date with seasonal month
            apply_d = _apply_date_for_student(rng, register_d, anko_type)
            apply_year = apply_d.year

            # Pick program of chosen type → uni_id, tier
            type_progs = programs_by_type[anko_type]
            program_id = _pick_university(rng, type_progs, universities_df, student)
            uni_id = int(programs_df.loc[programs_df["program_id"] == program_id, "uni_id"].iloc[0])
            tier = str(universities_df.loc[universities_df["uni_id"] == uni_id, "tier"].iloc[0])

            # Status
            if apply_year in (2020, 2021, 2022):
                status = str(rng.choice(COVID_STATUSES, p=COVID_STATUS_PROBS))
            else:
                p_accept = _accept_prob(
                    int(student["hsk_level"]),
                    float(student["gpa_percent"]),
                    tier,
                    int(student["family_income_mnt"]),
                )
                if rng.random() < p_accept:
                    status = "Enrolled" if rng.random() < 0.85 else "Accepted"
                else:
                    r2 = rng.random()
                    if r2 < 0.65:
                        status = "Rejected"
                    elif r2 < 0.85:
                        status = "Withdrawn"
                    elif r2 < 0.95:
                        status = "Under Review"
                    else:
                        status = "Submitted"

            decision_days = int(np.clip(rng.normal(45, 20), 10, 120))

            # Visa
            if status in ("Accepted", "Enrolled", "Enrolled (delayed)"):
                visa = str(rng.choice(["Approved", "Rejected", "Pending"], p=[0.90, 0.05, 0.05]))
            elif status == "Under Review":
                visa = "Pending"
            elif status == "Cancelled":
                visa = "N/A"
            else:
                visa = "N/A"

            # Enrollment date
            if status == "Enrolled":
                enroll = apply_d + timedelta(days=decision_days + int(rng.integers(60, 121)))
                if enroll > date(2025, 12, 31):
                    enroll = date(2025, 12, 31)
                enroll_str = enroll.isoformat()
            elif status == "Enrolled (delayed)":
                # waited 1–3 years until borders reopened
                delay_days = int(rng.integers(365, 365 * 3 + 90))
                enroll = apply_d + timedelta(days=delay_days)
                # cap at end of dataset window
                if enroll > date(2025, 12, 31):
                    enroll = date(2025, 12, 31)
                enroll_str = enroll.isoformat()
            else:
                enroll_str = None

            # Internal ANKO score (1-100). Combines HSK level, HSK exam score, GPA%.
            base_score = (
                30
                + 6 * (int(student["hsk_level"]) - 3)
                + 0.05 * (int(student["hsk_score"]) - 180)
                + 0.5 * (float(student["gpa_percent"]) - 80)
            )
            agent_score = int(np.clip(base_score + rng.normal(0, 8), 1, 100))

            rows.append({
                "app_id": app_id,
                "student_id": int(student["student_id"]),
                "uni_id": uni_id,
                "program_id": program_id,
                "anko_program_type": anko_type,
                "apply_date": apply_d.isoformat(),
                "status": status,
                "decision_days": decision_days,
                "visa_status": visa,
                "enrollment_date": enroll_str,
                "agent_score": agent_score,
            })
            app_id += 1
    return pd.DataFrame(rows)


# ============================================================
# 5. SCHOLARSHIPS — ~600 awards
# ============================================================
SCHOLARSHIP_TYPES = [
    "CSC Full", "CSC Partial", "Confucius Institute",
    "University Merit", "Provincial", "ANKO Bridge",
]
SCHOLARSHIP_TYPE_PROBS = [0.15, 0.25, 0.15, 0.25, 0.10, 0.10]

SCHOLARSHIP_META = {
    "CSC Full":           {"sponsor": "China Scholarship Council",  "coverage": "Full tuition + stipend", "amount_range": (55000, 65000)},
    "CSC Partial":        {"sponsor": "China Scholarship Council",  "coverage": "Tuition only",           "amount_range": (15000, 30000)},
    "Confucius Institute":{"sponsor": "Confucius Institute HQ",     "coverage": "Living stipend",         "amount_range": (8000, 18000)},
    "University Merit":   {"sponsor": "Host University",            "coverage": "Tuition only",           "amount_range": (5000, 25000)},
    "Provincial":         {"sponsor": "Province Government",        "coverage": "Tuition only",           "amount_range": (8000, 20000)},
    "ANKO Bridge":        {"sponsor": "ANKO Bridge Agency",         "coverage": "Living stipend",         "amount_range": (3000, 10000)},
}


def generate_scholarships(
    rng: np.random.Generator,
    applications_df: pd.DataFrame,
    students_df: pd.DataFrame,
    universities_df: pd.DataFrame,
) -> pd.DataFrame:
    """Scholarship eligibility (ANKO Bridge real rules):
      - 6+6 / 1+4 (хэлний бэлтгэл): scholarship needs HSK 3+.
      - Fall Bachelor / Master/PhD: scholarship needs HSK 4+.
    """
    eligible = applications_df[applications_df["status"].isin(["Accepted", "Enrolled", "Enrolled (delayed)"])].copy()
    eligible = eligible.merge(students_df[["student_id", "hsk_level", "gpa_percent"]], on="student_id")
    eligible = eligible.merge(universities_df[["uni_id", "tier"]], on="uni_id")
    # HSK floor by program type — apps below floor are ineligible
    is_lang_prep = eligible["anko_program_type"].isin(["6+6", "1+4"])
    is_bachelor_or_grad = eligible["anko_program_type"].isin(["Fall Bachelor", "Master/PhD"])
    eligible = eligible[
        (is_lang_prep & (eligible["hsk_level"] >= 3))
        | (is_bachelor_or_grad & (eligible["hsk_level"] >= 4))
    ].copy()
    # probability of award (among eligible)
    p = 0.30 + 0.05 * (eligible["hsk_level"] - 3) + 0.005 * (eligible["gpa_percent"] - 80)
    p = np.where(eligible["tier"] == "C9", p + 0.10, p)
    p = np.where(eligible["tier"] == "985", p + 0.05, p)
    p = np.clip(p, 0.05, 0.85)
    awarded_mask = rng.random(len(eligible)) < p
    awarded = eligible[awarded_mask].copy()
    rows = []
    for sid_idx, app in enumerate(awarded.itertuples(index=False), start=1):
        stype = str(rng.choice(SCHOLARSHIP_TYPES, p=SCHOLARSHIP_TYPE_PROBS))
        meta = SCHOLARSHIP_META[stype]
        amount = int(rng.integers(meta["amount_range"][0], meta["amount_range"][1] + 1))
        rows.append({
            "scholarship_id": sid_idx,
            "app_id": int(app.app_id),
            "scholarship_type": stype,
            "amount_yuan": amount,
            "sponsor": meta["sponsor"],
            "coverage": meta["coverage"],
        })
    return pd.DataFrame(rows)


# ============================================================
# 6. SQLite assembly with FK constraints
# ============================================================
def build_sqlite(dfs: dict[str, pd.DataFrame]) -> Path:
    db_path = DATA_DIR / "anko.db"
    if db_path.exists():
        db_path.unlink()
    # Use raw sqlite3 for FK + schema control
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")
    cur.executescript("""
    CREATE TABLE universities (
        uni_id INTEGER PRIMARY KEY,
        uni_name TEXT NOT NULL,
        city TEXT,
        province TEXT,
        qs_rank INTEGER,
        tier TEXT,
        established_year INTEGER,
        mn_student_friendly_score INTEGER
    );
    CREATE TABLE programs (
        program_id INTEGER PRIMARY KEY,
        uni_id INTEGER NOT NULL,
        program_name TEXT,
        anko_program_type TEXT,
        degree_level TEXT,
        field TEXT,
        duration_years REAL,
        tuition_yuan INTEGER,
        language TEXT,
        min_hsk_required INTEGER,
        min_hsk_score_required INTEGER,
        FOREIGN KEY (uni_id) REFERENCES universities(uni_id)
    );
    CREATE TABLE students (
        student_id INTEGER PRIMARY KEY,
        name TEXT,
        birth_year INTEGER,
        gender TEXT,
        aimag TEXT,
        district TEXT,
        school_type TEXT,
        gpa_percent REAL,
        hsk_level INTEGER,
        hsk_score INTEGER,
        family_income_mnt INTEGER,
        register_date TEXT,
        english_level TEXT,
        is_high_school_senior INTEGER
    );
    CREATE TABLE applications (
        app_id INTEGER PRIMARY KEY,
        student_id INTEGER NOT NULL,
        uni_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        anko_program_type TEXT,
        apply_date TEXT,
        status TEXT,
        decision_days INTEGER,
        visa_status TEXT,
        enrollment_date TEXT,
        agent_score INTEGER,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (uni_id) REFERENCES universities(uni_id),
        FOREIGN KEY (program_id) REFERENCES programs(program_id)
    );
    CREATE TABLE scholarships (
        scholarship_id INTEGER PRIMARY KEY,
        app_id INTEGER NOT NULL,
        scholarship_type TEXT,
        amount_yuan INTEGER,
        sponsor TEXT,
        coverage TEXT,
        FOREIGN KEY (app_id) REFERENCES applications(app_id)
    );
    """)
    conn.commit()
    # Bulk insert via pandas to_sql with append mode (preserves schema)
    for table, df in dfs.items():
        df.to_sql(table, conn, if_exists="append", index=False)
    conn.commit()
    conn.close()
    return db_path


# ============================================================
# 7. Main pipeline + summary
# ============================================================
def _print_section(title: str) -> None:
    print(f"\n{'─' * 70}")
    print(f"  {title}")
    print("─" * 70)


def main() -> None:
    rng = np.random.default_rng(SEED)
    print("\nANKO Bridge — синтетик өгөгдөл үүсгэж байна (seed=42)")

    universities = generate_universities()
    universities.to_csv(DATA_DIR / "universities.csv", index=False, encoding="utf-8")
    print(f"  ✓ universities.csv  ({len(universities)} мөр)")

    programs = generate_programs(rng, universities)
    programs.to_csv(DATA_DIR / "programs.csv", index=False, encoding="utf-8")
    print(f"  ✓ programs.csv      ({len(programs)} мөр)")

    students = generate_students(rng)
    students.to_csv(DATA_DIR / "students.csv", index=False, encoding="utf-8")
    print(f"  ✓ students.csv      ({len(students)} мөр)")

    applications = generate_applications(rng, students, programs, universities)
    applications.to_csv(DATA_DIR / "applications.csv", index=False, encoding="utf-8")
    print(f"  ✓ applications.csv  ({len(applications)} мөр)")

    scholarships = generate_scholarships(rng, applications, students, universities)
    scholarships.to_csv(DATA_DIR / "scholarships.csv", index=False, encoding="utf-8")
    print(f"  ✓ scholarships.csv  ({len(scholarships)} мөр)")

    db_path = build_sqlite({
        "universities": universities,
        "programs": programs,
        "students": students,
        "applications": applications,
        "scholarships": scholarships,
    })
    print(f"  ✓ anko.db           ({db_path.name})")

    # ──────────────── Summary statistics ────────────────
    _print_section("ЖИЛЭЭР ӨРГӨДӨЛ (тоо)")
    yearly = applications.assign(year=pd.to_datetime(applications["apply_date"]).dt.year).groupby("year").size()
    for y, n in yearly.items():
        bar = "█" * int(n / 15)
        print(f"  {y}: {n:>4}  {bar}")

    _print_section("АNKO ХӨТӨЛБӨРИЙН ЭЗЛЭХ ХУВЬ ЖИЛЭЭР (%)")
    pivot = applications.assign(year=pd.to_datetime(applications["apply_date"]).dt.year)
    pivot = pivot.groupby(["year", "anko_program_type"]).size().unstack(fill_value=0)
    pivot_pct = pivot.div(pivot.sum(axis=1), axis=0) * 100
    print(pivot_pct.round(1).to_string())

    _print_section("АЙМАГЫН ХУВААРЬ (топ 6)")
    aimag_counts = students["aimag"].value_counts(normalize=True).head(6) * 100
    for a, pct in aimag_counts.items():
        print(f"  {a:<14} {pct:5.1f}%")

    _print_section("УБ ДҮҮРГҮҮД")
    ub_districts = students[students["aimag"] == "Улаанбаатар"]["district"].value_counts(normalize=True) * 100
    for d, pct in ub_districts.items():
        print(f"  {d:<16} {pct:5.1f}%")

    _print_section("HSK ТҮВШИНГЭЭР ЭЛСЭЛТИЙН ХУВЬ")
    merged = applications.merge(students[["student_id", "hsk_level"]], on="student_id")
    merged["accepted"] = merged["status"].isin(["Accepted", "Enrolled"])
    by_hsk = merged.groupby("hsk_level")["accepted"].mean() * 100
    for h, rate in by_hsk.items():
        print(f"  HSK {h}: {rate:5.1f}%")

    _print_section("НАСНЫ ТҮВШИН (өргөдөл өгөх үеийн нас)")
    students["age_at_register"] = pd.to_datetime(students["register_date"]).dt.year - students["birth_year"]
    age_dist = students["age_at_register"].value_counts(normalize=True).sort_index() * 100
    for a, pct in age_dist.items():
        if pct >= 1:
            print(f"  {a} нас: {pct:5.1f}%")

    _print_section("ХӨТӨЛБӨР × HSK ХАРИЛЦАА (HSK дундаж)")
    merged_full = applications.merge(students[["student_id", "hsk_level", "hsk_score", "gpa_percent"]], on="student_id")
    by_type_hsk = merged_full.groupby("anko_program_type")["hsk_level"].mean()
    by_type_score = merged_full.groupby("anko_program_type")["hsk_score"].mean()
    by_type_gpa = merged_full.groupby("anko_program_type")["gpa_percent"].mean()
    for t in by_type_hsk.index:
        print(f"  {t:<14} HSK дундаж: {by_type_hsk[t]:.2f} | HSK оноо: {by_type_score[t]:5.1f} | GPA%: {by_type_gpa[t]:5.1f}")

    _print_section("FALL BACHELOR-Т HSK 4+ & 120+ ОНООТОЙ ОЮУТНУУД ЭЗЛЭХ")
    fb_apps = merged_full[merged_full["anko_program_type"] == "Fall Bachelor"]
    if len(fb_apps) > 0:
        meets = ((fb_apps["hsk_level"] >= 4) & (fb_apps["hsk_score"] >= 120)).mean() * 100
        print(f"  Шаардлага хангасан: {meets:.1f}% ({len(fb_apps)} өргөдлөөс)")

    _print_section("ТОП 10 СУРГУУЛЬ (өргөдлийн тоогоор)")
    top10 = applications.merge(universities[["uni_id", "uni_name"]], on="uni_id")
    top10_counts = top10["uni_name"].value_counts().head(10)
    for u, n in top10_counts.items():
        print(f"  {u:<48} {n:>4}")

    _print_section("ТЭТГЭЛГИЙН ТӨРЛҮҮД")
    sch_counts = scholarships["scholarship_type"].value_counts()
    for s, n in sch_counts.items():
        print(f"  {s:<24} {n:>4}")

    print("\n✓ Бүх өгөгдөл амжилттай үүсгэгдлээ.\n")


if __name__ == "__main__":
    main()
