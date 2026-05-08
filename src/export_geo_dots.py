"""
Оюутан бүрийг газарзүйн координаттай (lat/lon) JSON болгож экспортлох.

For Leaflet interactive map. Each student is placed at:
- UB students → district centroid + small random jitter (~1.5km)
- Aimag students → aimag centroid + larger jitter (~30km radius)

Run: python src/export_geo_dots.py
Output: website/data/students_geo.json
"""
from __future__ import annotations

import json
import math
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
DATA = ROOT / "data"
ASSETS = ROOT / "website" / "assets"
OUT = ROOT / "website" / "data" / "students_geo.json"


# Aimag English → Mongolian
AIMAG_MN = {
    "Arkhangai": "Архангай", "Bayan-Ölgii": "Баян-Өлгий", "Bayankhongor": "Баянхонгор",
    "Bulgan": "Булган", "Darkhan-Uul": "Дархан-Уул", "Dornod": "Дорнод",
    "Dornogovi": "Дорноговь", "Dundgovi": "Дундговь", "Govi-Altai": "Говь-Алтай",
    "Govisumber": "Говьсүмбэр", "Hovsgel": "Хөвсгөл", "Khentii": "Хэнтий",
    "Khovd": "Ховд", "Orkhon": "Орхон", "Selenge": "Сэлэнгэ",
    "Sükhbaatar": "Сүхбаатар", "Töv": "Төв", "Ulaanbaatar": "Улаанбаатар",
    "Uvs": "Увс", "Zavkhan": "Завхан", "Ömnögovi": "Өмнөговь", "Övörkhangai": "Өвөрхангай",
}

# Chinese university city coordinates (lat, lon) — matches main.js CITY_COORDS
CITY_COORDS = {
    "Beijing":     (39.90, 116.40),
    "Shanghai":    (31.23, 121.47),
    "Hangzhou":    (30.27, 120.15),
    "Hefei":       (31.82, 117.23),
    "Nanjing":     (32.06, 118.80),
    "Harbin":      (45.80, 126.53),
    "Xi'an":       (34.34, 108.94),
    "Wuhan":       (30.59, 114.31),
    "Guangzhou":   (23.13, 113.27),
    "Chengdu":     (30.67, 104.07),
    "Changchun":   (43.82, 125.32),
    "Tianjin":     (39.08, 117.20),
    "Jinan":       (36.65, 117.00),
    "Xiamen":      (24.48, 118.09),
    "Changsha":    (28.23, 112.94),
    "Hohhot":      (40.84, 111.74),
    "Tongliao":    (43.65, 122.27),
    "Lanzhou":     (36.06, 103.83),
    "Yanji":       (42.91, 129.51),
    "Dalian":      (38.91, 121.61),
    "Shenyang":    (41.81, 123.43),
    "Baoding":     (38.87, 115.48),
}

# UB district approximate centroids (lat, lon)
UB_DISTRICTS = {
    "Хан-Уул":         (47.860, 106.915),
    "Сүхбаатар":       (47.928, 106.918),
    "Чингэлтэй":       (47.926, 106.910),
    "Баянгол":         (47.922, 106.875),
    "Сонгинохайрхан":  (47.918, 106.780),
    "Баянзүрх":        (47.917, 106.978),
    "Налайх":          (47.776, 107.270),
    "Багануур":        (47.829, 108.366),
}


def polygon_centroid(coords: list) -> tuple[float, float]:
    """Simple area-weighted centroid for a Polygon's outer ring."""
    pts = coords  # list of [lon, lat]
    if len(pts) < 3:
        return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    sx = sy = sa = 0.0
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        a = x0 * y1 - x1 * y0
        sa += a
        sx += (x0 + x1) * a
        sy += (y0 + y1) * a
    if abs(sa) < 1e-9:
        return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    sa *= 0.5
    return (sx / (6 * sa), sy / (6 * sa))


def aimag_centroids() -> dict[str, tuple[float, float]]:
    """Compute centroid (lat, lon) for each aimag from geojson."""
    with open(ASSETS / "mongolia_aimags.geojson", encoding="utf-8") as f:
        gj = json.load(f)
    out: dict[str, tuple[float, float]] = {}
    for feat in gj["features"]:
        en = feat["properties"]["shapeName"]
        mn = AIMAG_MN.get(en)
        if not mn:
            continue
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            ring = geom["coordinates"][0]
        elif geom["type"] == "MultiPolygon":
            # use the largest polygon
            polys = geom["coordinates"]
            ring = max(polys, key=lambda p: len(p[0]))[0]
        else:
            continue
        lon, lat = polygon_centroid(ring)
        out[mn] = (lat, lon)
    return out


def jitter_within_radius(rng, center_lat: float, center_lon: float, radius_km: float) -> tuple[float, float]:
    """Random point within radius_km of center, uniformly in disk."""
    # ~111 km per degree of latitude
    r = radius_km * math.sqrt(rng.random())
    theta = rng.random() * 2 * math.pi
    dlat = (r / 111.0) * math.cos(theta)
    dlon = (r / (111.0 * math.cos(math.radians(center_lat)))) * math.sin(theta)
    return (center_lat + dlat, center_lon + dlon)


def main() -> None:
    print("Оюутны geo-цэгүүдийг үүсгэж байна...")
    students = pd.read_csv(DATA / "students.csv")
    print(f"  {len(students)} оюутан ачаалсан")

    aimag_c = aimag_centroids()
    print(f"  {len(aimag_c)} аймгийн centroid тооцоолсон")

    rng = np.random.default_rng(42)
    rows = []
    skipped = 0
    for _, s in students.iterrows():
        aimag = s["aimag"]
        district = s.get("district") if pd.notna(s.get("district")) else None
        if aimag == "Улаанбаатар" and district and district in UB_DISTRICTS:
            base = UB_DISTRICTS[district]
            radius = 1.8  # km
        elif aimag in aimag_c:
            base = aimag_c[aimag]
            radius = 28  # km — aimags are large
        else:
            skipped += 1
            continue
        lat, lon = jitter_within_radius(rng, base[0], base[1], radius)
        rows.append({
            "id": int(s["student_id"]),
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "aimag": aimag,
            "district": district,
            "school": s["school_type"],
            "gpa": float(s["gpa_percent"]),
            "hsk": int(s["hsk_level"]),
            "hsk_score": int(s["hsk_score"]),
            "gender": s["gender"],
            "age": int(2025 - s["birth_year"]),
            "name": s["name"],
        })
    print(f"  {len(rows)} цэг үүссэн, {skipped} алгассан")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = OUT.stat().st_size // 1024
    print(f"\n  ✓ {OUT.relative_to(ROOT)} ({size_kb} KB)")

    # Also export aimag centroids for label placement
    centroids_out = ROOT / "website" / "data" / "aimag_centroids.json"
    with open(centroids_out, "w", encoding="utf-8") as f:
        json.dump({k: {"lat": v[0], "lon": v[1]} for k, v in aimag_c.items()},
                  f, ensure_ascii=False, indent=2)
    print(f"  ✓ {centroids_out.relative_to(ROOT)}")

    # ─── Destinations: each enrolled application as a dot at its uni's city ───
    print("\nХүрэх газрын geo-цэгүүдийг үүсгэж байна (Хятад)...")
    apps = pd.read_csv(DATA / "applications.csv")
    unis = pd.read_csv(DATA / "universities.csv")
    student_lookup = students.set_index("student_id").to_dict("index")
    uni_lookup = unis.set_index("uni_id").to_dict("index")

    UNI_TO_CITY = {
        "Tsinghua University": "Beijing", "Peking University": "Beijing",
        "Renmin University of China": "Beijing", "Beijing Normal University": "Beijing",
        "Beihang University": "Beijing", "Beijing Institute of Technology": "Beijing",
        "China Agricultural University": "Beijing", "Beijing Forestry University": "Beijing",
        "Beijing Foreign Studies University": "Beijing",
        "Beijing Language and Culture University": "Beijing",
        "Capital Normal University": "Beijing", "Communication University of China": "Beijing",
        "North China Electric Power University": "Beijing",
        "Fudan University": "Shanghai", "Shanghai Jiao Tong University": "Shanghai",
        "Tongji University": "Shanghai",
        "Zhejiang University": "Hangzhou",
        "University of Science and Technology of China": "Hefei",
        "Nanjing University": "Nanjing", "Southeast University": "Nanjing",
        "Harbin Institute of Technology": "Harbin", "Heilongjiang University": "Harbin",
        "Northeast Forestry University": "Harbin",
        "Xi'an Jiaotong University": "Xi'an", "Northwestern Polytechnical University": "Xi'an",
        "Wuhan University": "Wuhan",
        "Sun Yat-sen University": "Guangzhou", "South China University of Technology": "Guangzhou",
        "Sichuan University": "Chengdu",
        "Jilin University": "Changchun", "Northeast Normal University": "Changchun",
        "Nankai University": "Tianjin", "Tianjin University": "Tianjin",
        "Shandong University": "Jinan",
        "Xiamen University": "Xiamen",
        "Central South University": "Changsha", "Hunan University": "Changsha",
        "Lanzhou University": "Lanzhou",
        "Yanbian University": "Yanji",
        "Hebei University": "Baoding",
        "Inner Mongolia University": "Hohhot", "Inner Mongolia Normal University": "Hohhot",
        "Inner Mongolia University of Technology": "Hohhot",
        "Inner Mongolia Agricultural University": "Hohhot",
        "Inner Mongolia Medical University": "Hohhot",
        "Hohhot Minzu College": "Hohhot",
        "Inner Mongolia University for Nationalities": "Tongliao",
        "Dalian University of Technology": "Dalian",
        "Liaoning University": "Shenyang", "Shenyang Normal University": "Shenyang",
    }

    enrolled_statuses = {"Accepted", "Enrolled", "Enrolled (delayed)"}
    dest_rows = []
    skipped = 0
    rng2 = np.random.default_rng(43)
    for _, app in apps.iterrows():
        if app["status"] not in enrolled_statuses:
            continue
        uni = uni_lookup.get(int(app["uni_id"]))
        if not uni:
            skipped += 1
            continue
        city = UNI_TO_CITY.get(uni["uni_name"])
        if not city or city not in CITY_COORDS:
            skipped += 1
            continue
        base = CITY_COORDS[city]
        # Smaller jitter (~3 km) since cities are dense
        lat, lon = jitter_within_radius(rng2, base[0], base[1], 3.5)
        st = student_lookup.get(int(app["student_id"]), {})
        dest_rows.append({
            "id": int(app["app_id"]),
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "uni": uni["uni_name"],
            "city": city,
            "tier": uni["tier"],
            "program": app["anko_program_type"],
            "apply_year": int(pd.to_datetime(app["apply_date"]).year),
            "status": app["status"],
            "student_name": st.get("name", "?"),
            "student_aimag": st.get("aimag", "?"),
            "hsk": int(st.get("hsk_level", 0)),
            "gpa": float(st.get("gpa_percent", 0)),
            "gender": st.get("gender", "?"),
        })
    print(f"  {len(dest_rows)} цэг үүссэн, {skipped} алгассан")

    dest_out = ROOT / "website" / "data" / "destinations_geo.json"
    with open(dest_out, "w", encoding="utf-8") as f:
        json.dump(dest_rows, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = dest_out.stat().st_size // 1024
    print(f"  ✓ {dest_out.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
