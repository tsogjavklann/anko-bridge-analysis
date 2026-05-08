# Илтгэлийн төлөвлөгөө — 20 минут, 15 слайд

> **Сэдэв:** Хятад дахь Монгол оюутны элсэлтийн чиг хандлага 2019-2025
> **Бүтээгчид:** *2 оюутан* — Илтгэгч A (5 минут оршил) + Илтгэгч B (15 минут үндсэн хэсэг)
> **Хичээл:** Эдийн засгийн шинжилгээн дэх программын хэрэглээ

---

## Слайд 1 — Гарчгийн слайд (А: 30 сек)

- **Гарчиг:** «Хятад дахь Монгол оюутны элсэлтийн чиг хандлага 2019-2025»
- **Дэд гарчиг:** ANKO Bridge зуучлагч агентлагийн өгөгдлийн шинжилгээ
- **Бүтээгчид:** tsogjavkhlananko + (хамтрагч)
- **Огноо:** 2026 он

**Илтгэгчийн тэмдэглэл:** «Сайн байцгаана уу. Бид өнөөдөр Хятадын их сургуулиудад
суралцаж буй Монгол оюутнуудын чиг хандлагыг 2019-2025 онуудаар хамруулан
шинжилсэн ажлаа танилцуулах гэж байна.»

---

## Слайд 2 — Сэдвийн үндэслэл (А: 60 сек)

**Гол агуулга:**
- ANKO Bridge: 2019 онд байгуулагдсан Монголын зуучлагч агентлаг
- Сүүлийн 6 жилд **3 том өөрчлөлт**:
  1. Хямрал (COVID)
  2. Сэргэлт (хил нээгдсэн)
  3. Өсөлт (peak 2025)
- **Яагаад чухал?**
  - Засгийн газарт боловсон хүчний нөөцийг харах
  - Эцэг эхэд хөрөнгө оруулалтын чиг хандлагыг ойлгох
  - Оюутанд өөрийн өрсөлдөгчдийг харьцуулах

**Screenshot:** Website-аас Section 1 hero (`Хятад руу хэдэн Монгол оюутан явсан бэ?`)

---

## Слайд 3 — Өгөгдлийн бүтэц (А: 60 сек)

**Гол агуулга:**

| Хүснэгт | Мөр | Гол баганууд |
|---|---:|---|
| universities | 50 | Tier (C9/985/211/Provincial), QS rank |
| programs | 200 | ANKO 4 төрөл, төлбөр, HSK шаардлага |
| students | 1,500 | Аймаг/дүүрэг, нас, GPA%, HSK |
| applications | 2,250 | Status, виз, тэтгэлэг |
| scholarships | ~500 | CSC, Confucius, Merit |

**SQLite database** (FK constraint-тэй) бүгдийг нэгтгэнэ.

**Screenshot:** PowerBI Page 1 — KPI overview

---

## Слайд 4 — Технологийн стек (А: 60 сек)

**Python ecosystem:**
- pandas, numpy — өгөгдлийн боловсруулалт
- scipy + statsmodels — статистик
- scikit-learn + xgboost — машин сурахуй
- plotly + matplotlib — визуализаци

**Frontend:**
- Vanilla JS, D3.js v7 — visualizations
- Scrollama.js — scroll-trigger animation
- HTML/CSS — design tokens

**Бусад:** SQLite, PowerBI Desktop, Jupyter.

---

## Слайд 5 — COVID-ийн нөлөө (Б: 90 сек)

**Гол агуулга:**

```
2019:  55 оюутан    ████
2020:  10           █          ← Хил хаагдав
2021:   8           ▌
2022:  17           █▌
2023: 190           ████████████████        ← Хил нээгдэв
2024: 460           ████████████████████████████████████████
2025: 760 (6 сард)  ████████████████████████████████████████████████████████
```

- **t-test (2019 vs 2020):** p < 0.001 → COVID-ийн нөлөө статистикаар баталгаажсан
- **Recovery:** 2023-аас peak хүртэл **77 дахин өсөлт**

**Screenshot:** Website Section 2-4 (timeline animation)

---

## Слайд 6 — Хэн өргөдөл өгдөг вэ? (Б: 90 сек)

**Гол агуулга:**
- **Улаанбаатар: 70%** — 10 оюутан тутмын 7 нь хотынх
- УБ-ийн дотор **Хан-Уул дүүрэг #1** (20%)
- **17-19 нас: 86%** — 12-р анги шинээр төгсөгчид

**Сонирхолтой:** Зөвхөн **5%** оюутан 23+ настай — тэд бараг бүгд Master/PhD-д өргөдөл өгдөг.

**Screenshot:** Website Section 6 (Mongolia bubble map + UB districts)

---

## Слайд 7 — Тэд хаашаа явдаг вэ? (Б: 60 сек)

**Топ 10 сургууль (өргөдлийн тоогоор):**
1. Nankai University
2. China Agricultural University
3. Renmin University of China
4. Tianjin University
5. Northeast Normal University
6. Inner Mongolia Normal University
7. Beihang University
8. ... (гэх мэт)

**Сонирхолтой:** Top 10 дотор **3 Inner Mongolia сургууль** — Монгол оюутнуудтай ойр.

**Screenshot:** Website Section 5

---

## Слайд 8 — ANKO-гийн 4 хөтөлбөр (Б: 120 сек)

**Гол агуулга:**

| Хөтөлбөр | Эзлэх хувь | HSK шаардлага | Зорилт |
|---|---:|---|---|
| **6+6** | **52%** | Ямар ч HSK | Хэлний бэлтгэл + бакалавр |
| **1+4** | 25% | Ямар ч HSK | Хэлний бэлтгэл + 4 жил |
| **Fall Bachelor** | 17% | HSK 4 + 120 оноо | Шууд бакалавр |
| **Master/PhD** | 6% | HSK 4 эсвэл Англи | Магистр / Доктор |

**Чухал чиг хандлага:**
- 6+6 хөтөлбөр **2019: 35% → 2024: 55%** хүртэл өсчээ
- COVID-ийн дараа HSK босгогүй хөтөлбөр илүү хүртээмжтэй болсон

**Screenshot:** Website Section 8 (program cards + stacked area)

---

## Слайд 9 — HSK-ийн түүх (Б: 60 сек)

**Гол агуулга:**
- HSK 4 — хамгийн нийтлэг (35%)
- HSK 5 — өсч буй (25%)
- HSK 6 — гарын дотор оюутан (10%)

**Bachelor admission rule:** **HSK 4 + оноо 120-аас дээш** заавал. Доош нь хэлний бэлтгэл рүү шилжүүлдэг.

**Tetgelgiin floor:**
- Хэлний бэлтгэл: HSK 3+
- Бакалавр / Магистр: HSK 4+

**Screenshot:** Website Section 7 (HSK area chart)

---

## Слайд 10 — Статистик шинжилгээ (Б: 90 сек)

**3 гипотез шалгалт:**

1. **t-test:** 2019 vs 2020 monthly applications → **p = 0.0003** (COVID нөлөөлсөн)
2. **Chi-square:** HSK түвшин ↔ элсэлт → **χ² = 245.3, p < 0.0001** (хүчтэй хамаарал)
3. **ANOVA:** Tier ↔ төлбөр → **F = 38.7, p < 0.0001**

**Pearson correlation матриц:**

| | hsk_level | gpa_percent | family_income |
|---|---:|---:|---:|
| **hsk_level** | 1.00 | 0.42 | 0.28 |
| **gpa_percent** | 0.42 | 1.00 | 0.31 |
| **family_income** | 0.28 | 0.31 | 1.00 |

**Time series decomposition:** seasonal peak Aug-Oct.

**Screenshot:** Notebook 03 — correlation heatmap

---

## Слайд 11 — Машин сурахуйн загварууд (Б: 120 сек)

**3 supervised + 2 unsupervised:**

| Загвар | Зорилго | Метрик |
|---|---|---|
| Logistic Regression | Виз батлагдах | AUC ≈ 0.93 |
| Random Forest | Элсэлт | AUC ≈ 0.91 |
| XGBoost | Тэтгэлэг | AUC ≈ 0.85 |
| KMeans (k=5) | Оюутны төрөл | silhouette 0.31 |
| Hierarchical | Сургууль | Ward linkage |

**Random Forest хамгийн чухал хувьсагчид:**
1. hsk_level
2. gpa_percent
3. tier (C9/985/211/Provincial)
4. school_type
5. family_income

**Screenshot:** Notebook 04 — feature importance + PCA scatter

---

## Слайд 12 — Оюутны 5 төрөл (Б: 90 сек)

KMeans clustering нь өөрөө 5 ялгаатай төрлийг олж тогтоосон:

1. **Эрт эхлэгчид** (n≈350) — 6+6, 17 нас, UB private school, HSK 3
2. **Тэтгэлгийн хайгуулчид** (n≈400) — 1+4, 18 нас, HSK 4-5, дунд орлоготой
3. **Шууд элсэгчид** (n≈250) — Fall Bachelor, GPA 88%+, HSK 5-6, UB International
4. **Аймгийн золтонгууд** (n≈300) — 6+6, 18-19 нас, аймгаас, public school
5. **Судлаачид** (n≈150) — Master/PhD, 22+ нас, ажилласан туршлагатай

**Screenshot:** Website Section 10 (persona cards)

---

## Слайд 13 — Live demo: Scrollytelling website (Б: 180 сек)

**Гол үзэгдэл:**
- 12 хэсэг, бүгд scroll-trigger animation
- Dark mode + light mode toggle
- Mobile responsive

**Live demo (browser хий):**
1. Hero — анхаарал татах асуулт
2. Timeline — COVID үсрэлт animation-аар харах
3. Mongolia map — bubble нь УБ-ыг тодоор харуулах
4. Predictor — slider өөрчилбөл магадлал шууд өөрчлөгдөнө

**URL:** Github Pages — `https://tsogjavkhlananko.github.io/anko-bridge-analysis/website/`

---

## Слайд 14 — PowerBI dashboard demo (Б: 90 сек)

**5 хуудсат интерактив dashboard:**

1. **Page 1** — Үндсэн KPI (4 card + topology)
2. **Page 2** — Газарзүй (Mongolia + China map)
3. **Page 3** — Цаг хугацааны trend (COVID annotation-той)
4. **Page 4** — ANKO 4 хөтөлбөр + funnel
5. **Page 5** — Оюутны сегмент + ML insight

**Slicer:** Жил, хөтөлбөрийн төрөл — бүх хуудаст синхрон.

**Screenshot:** PowerBI Page 4 — funnel chart

---

## Слайд 15 — Дүгнэлт + Q&A (Б: 90 сек)

**5 гол ажиглалт:**

1. ✅ **COVID-19** ANKO Bridge-ийн ажилд **3 жилийн саатал** учруулсан, статистикаар баталгаажсан.
2. ✅ **2025 онд peak** — 6 сарын дотор 2019 он + дараагийн 5 жилийн нийт өргөдлөөс илүү.
3. ✅ **УБ-ийн давамгайлал** — 70%, дотроо Хан-Уул #1.
4. ✅ **6+6 хөтөлбөр** хамгийн эрэлттэй, COVID-ийн дараа 20pp өсчээ.
5. ✅ **HSK 5+** оюутнууд хамгийн өндөр элсэлтийн хувьтай — 78%.

**Хэрэгцээ хязгаарлалт:**
- Өгөгдөл синтетик — жинхэнэ ANKO-гийн өгөгдөл биш
- 2025 он хэсэгчилсэн (зөвхөн 6 сар)

**Q&A нээх асуултууд:**
- *Аль хөтөлбөр хамгийн өндөр ROI-той вэ?*
- *Тэтгэлэг авах магадлалыг хэрхэн нэмэгдүүлэх вэ?*
- *Inner Mongolia сургуулиуд яагаад их сонирхуулдаг вэ?*

**Талархал:** Танилцсанд баярлалаа. Асуултанд хариулахад бэлэн.

---

## Хавсралт (хэрэв цаг бий бол)

- A1. **Github repo:** `https://github.com/tsogjavkhlananko/anko-bridge-analysis`
- A2. **Бүх notebook executable:** `pip install -r requirements.txt && jupyter notebook`
- A3. **Дата дахин үүсгэх:** `python src/data_generator.py`

---

## Илтгэлийн өнгөний код (PowerPoint slide-уудад)

| Үүрэг | Hex |
|---|---|
| Гарчиг | `#7F77DD` ягаан |
| Тоо (KPI) | `#5DCAA5` ногоон |
| Сэрэмжлүүлэг (COVID) | `#F0997B` улбар |
| Peak (2025) | `#F5D67B` шар |
| Bg | `#0a0e1a` гүн навтгар |

---

## Илтгэгч хуваарилалт

| Слайд | Хариуцагч | Хугацаа |
|---|---|---:|
| 1-4 | **Илтгэгч A** (оршил, өгөгдөл, технологи) | 5 минут |
| 5-12 | **Илтгэгч B** (үндсэн шинжилгээ, ML) | 12 минут |
| 13-14 | **Илтгэгч B** (live demo) | 4 минут |
| 15 | **Илтгэгч A** (дүгнэлт + Q&A эхлэх) | 1 минут |
| Q&A | **2 илтгэгч хариулна** | 5 минут |

**Нийт: 27 минут (Q&A + 22 минут илтгэл)**

---

## Бэлтгэл хийх checklist

- [ ] Notebook бүгд cleanly run хийгдэх (`jupyter nbconvert --to notebook --execute`)
- [ ] Website browser-т ажиллах, бүх scroll trigger зөв
- [ ] PowerBI .pbix файл хадгалагдсан
- [ ] Screenshot-уудыг `presentation/screenshots/` -т 16:9 хэлбэртэй хадгалах
- [ ] Слайдын фонт Cyrillic дэмжих (Inter эсвэл Segoe UI)
- [ ] Бэлтгэл хийсэн машин дээр интернэт холболт шалгасан
- [ ] Backup PDF (PowerBI export-аар) USB-д хадгалах
