# ANKO Bridge — Хятад дахь Монгол оюутны элсэлтийн чиг хандлага 2019–2025

> Сэдвийн ажил · Эдийн засгийн шинжилгээн дэх программын хэрэглээ

Энэхүү төсөл нь **ANKO Bridge** зуучлагч агентлагийн өгөгдлийг ашиглан Хятадын
их сургуулиудад өргөдөл өгсөн Монгол оюутнуудын чиг хандлагыг 2019-2025 онуудаар
хамруулан шинжилсэн **дата шинжилгээний бүрэн төсөл** юм.

Гол үр дүн нь NYT, Pudding.cool маягийн **scrollytelling вэбсайт** — өгөгдлөөр
дамжуулан түүх хүүрнэх дижитал бүтээгдэхүүн.

---

## 🎯 Сэдвийн үндэслэл

ANKO Bridge нь **2019 онд** үүсгэн байгуулагдаж, эхэн үедээ цөөн оюутантай ажиллаж байсан
ч 2020-2022 оны COVID-19 цар тахлын улмаас Хятадын хил хаагдан, ажил бараг зогссон.
2023 онд хил нээгдсэнээр **хүлээгдэж байсан эрэлт нэг дор тэсэж**, 2024-2025 онд хамгийн
өндөр түвшинд хүрсэн.

Энэхүү 7 жилийн хугацаанд:
- **1,500 оюутан** ANKO Bridge-аар дамжин Хятадын их сургуулиуд руу өргөдөл гаргасан
- Тэдний **70%** Улаанбаатараас ирсэн
- **17-19 настай** оюутнууд (12-р анги шинээр төгсөгчид) давамгайлсан
- **6+6 хөтөлбөр** хамгийн эрэлттэй болсон (2019: 35% → 2024: 55%)

---

## 📊 Өгөгдлийн бүтэц (5 хүснэгт)

| Хүснэгт | Мөр | Тайлбар |
|---|---:|---|
| `universities.csv` | 50 | Хятадын жинхэнэ их сургуулиуд (Tsinghua, Peking, Fudan, ..., Inner Mongolia) |
| `programs.csv` | 200 | Хөтөлбөрүүд — ANKO-гийн 4 төрлийг агуулсан (6+6, 1+4, Fall Bachelor, Master/PhD) |
| `students.csv` | 1,500 | Монгол оюутнууд — нэр, нас, аймаг/дүүрэг, сургуулийн төрөл, GPA%, HSK, орлого |
| `applications.csv` | 2,250 | Өргөдлүүд — оюутан тус бүр 1.5 өргөдөл дунджаар |
| `scholarships.csv` | ~500 | Тэтгэлгийн утга — CSC Full, CSC Partial, Confucius, University Merit гэх мэт |

Бүх өгөгдөл нь **синтетик**, ANKO Bridge-ийн жинхэнэ үйл ажиллагаатай нийцсэн
паттерныг тусгасан. `seed=42` ашигласан тул дахин үүсгэхэд яг ижил утгатай гарна.

### ANKO-гийн 4 хөтөлбөр (бодит дүрэм)

| Хөтөлбөр | Тайлбар | HSK шаардлага |
|---|---|---|
| **6+6** | 6 сар Монголд + 6-11 сар Хятадад хэлний бэлтгэл, дараа бакалавр | **Ямар ч HSK хамаагүй** |
| **1+4** | 1-2 семестр Хятад руу очиж хэлний бэлтгэл + 4 жил бакалавр | **Ямар ч HSK хамаагүй** |
| **Fall Bachelor** | Шууд намрын элсэлт, 4 жил бакалавр | **HSK 4 + 120 оноо** |
| **Master/PhD** | Магистр эсвэл доктор, CSC тэтгэлэгтэй боломжтой | HSK 4+ эсвэл Англи хувилбар |

### Тэтгэлгийн босго

- **Хэлний бэлтгэл (6+6, 1+4):** тэтгэлэг авахад HSK 3+ шаардана
- **Бакалавр / Магистр / Доктор:** тэтгэлэг авахад HSK 4+ шаардана

---

## 🚀 Хэрхэн ажиллуулах

### 1. Шаардлагатай орчин

- Python 3.10+
- Орчин үүсгэж шаардлагатай сангуудыг суулгах:

```bash
pip install -r requirements.txt
```

### 2. Өгөгдөл үүсгэх

```bash
python src/data_generator.py
```

Энэ нь `data/` хавтсанд 5 CSV болон SQLite файлыг үүсгэнэ.

### 3. Notebook-уудыг ажиллуулах

```bash
jupyter notebook notebooks/
```

Дарааллаар нь нээж ажиллуулах:
1. `01_data_generation.ipynb` — өгөгдөл үүсгэх
2. `02_eda.ipynb` — хайгуулын шинжилгээ (19 visualization)
3. `03_statistics.ipynb` — статистик шинжилгээ (t-test, χ², ANOVA, time-series)
4. `04_modeling.ipynb` — машин сурахуй (LogReg, RF, XGBoost, KMeans)
5. `05_insights_export.ipynb` — website-д зориулсан JSON үүсгэх

### 4. Scrollytelling вэбсайтыг харах

```bash
cd website
python -m http.server 8000
```

Дараа нь browser-т `http://localhost:8000` нээх.

---

## 🛠️ Технологийн стек

**Python (analysis):**
- pandas, numpy — өгөгдлийн боловсруулалт
- scipy, statsmodels — статистик шинжилгээ
- scikit-learn — Logistic Regression, Random Forest, KMeans
- xgboost — XGBoost загвар
- plotly, matplotlib, seaborn — visualization

**Frontend (website):**
- Vanilla JS, HTML5, CSS3
- D3.js v7 — өгөгдлөөр зургийг динамик зурах
- Scrollama.js — scroll-trigger animation
- Inter + Crimson Pro фонт (Cyrillic дэмжлэгтэй)

**Бусад:**
- SQLite — 5 хүснэгтийг FK constraint-тэй нэгтгэх
- Faker — нэр үүсгэх (handcrafted Mongolian Cyrillic pool)

---

## 📁 Төслийн бүтэц

```
anko-bridge-analysis/
├── README.md                   # Энэ файл
├── requirements.txt            # Python dependency-ууд
├── data/
│   ├── universities.csv
│   ├── programs.csv
│   ├── students.csv
│   ├── applications.csv
│   ├── scholarships.csv
│   └── anko.db                 # SQLite (FK constraint-тэй)
├── notebooks/
│   ├── 01_data_generation.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_statistics.ipynb
│   ├── 04_modeling.ipynb
│   └── 05_insights_export.ipynb
├── src/
│   ├── data_generator.py       # Бүх өгөгдлийг үүсгэгч
│   ├── analysis.py             # Notebook-уудын helper
│   ├── models.py               # ML загваруудын helper
│   ├── insights.py             # JSON export
│   ├── validate.py             # Data validation script
│   └── build_notebooks.py      # Notebook generator
├── website/
│   ├── index.html              # 12 хэсэгтэй scrollytelling сайт
│   ├── styles.css              # Design tokens (dark mode default)
│   ├── main.js                 # D3 + Scrollama
│   └── data/insights.json      # Pre-computed нэгтгэсэн тоо
├── powerbi/
│   └── README.md               # 5 хуудсат PowerBI dashboard заавар
└── presentation/
    └── outline.md              # 15 слайдын илтгэлийн төлөвлөгөө
```

---

## 🎬 Live demo

Github Pages дээр нийтэлбэл: `https://tsogjavkhlananko.github.io/anko-bridge-analysis/website/`

(Github Pages идэвхжүүлэхийн тулд: Settings → Pages → Source: `main` branch / `website` folder)

---

## 📈 Гол үр дүн

1. **COVID-19 нөлөө статистикаар баталгаажсан** — 2019 vs 2020 t-test-ээс p < 0.001
2. **2025 онд peak** — зөвхөн 6 сард 760 оюутан бүртгүүлж, 2019-тэй харьцуулахад **14 дахин** өссөн
3. **Улаанбаатарын давамгайлал** — оюутны 70%, дотроо **Хан-Уул дүүрэг** (#1, 20%)
4. **6+6 хөтөлбөрийн өсөлт** — 2019-аас 2024 хооронд 35% → 55% (+20pp)
5. **HSK 5+ оюутнууд** хамгийн өндөр элсэлтийн хувьтай (~78%)
6. **5 ялгаатай оюутны төрөл** машин сурахуйгаар олдсон:
   - Эрт эхлэгчид (6+6, 17-18 нас, UB private)
   - Тэтгэлгийн хайгуулчид (1+4, HSK 4-5)
   - Шууд элсэгчид (Fall Bachelor, GPA 88%+, HSK 5-6)
   - Аймгийн золтонгууд (6+6, аймаг, public school)
   - Судлаачид (Master/PhD, 22+ нас)

---

## 👤 Зохиогч

**tsogjavkhlananko** — Дата шинжээч

- 📧 investment@avtamata.com
- 🐙 [GitHub: tsogjavkhlananko](https://github.com/tsogjavkhlananko)

**Хичээл:** Эдийн засгийн шинжилгээн дэх программын хэрэглээ
**Огноо:** 2026 он

---

## 📜 Лиценз

MIT License — академик зорилгоор чөлөөтэй ашиглах.

> ⚠️ Анхааруулга: бүх өгөгдөл синтетик. ANKO Bridge-ийн нийтлэн зарласан бодит
> өгөгдөл биш — зөвхөн агентлагийн жинхэнэ үйл ажиллагааны паттерныг загварчилсан
> симуляци.
