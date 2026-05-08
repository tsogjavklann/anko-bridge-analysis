# PowerBI Dashboard — Бүтээх заавар

Энэхүү баримт нь `data/` хавтсанд байгаа 5 CSV-ээс **5 хуудсат интерактив
PowerBI dashboard** хийх алхам бүрийн заавар юм.

## Шаардлагатай орчин

- PowerBI Desktop (хамгийн сүүлийн хувилбар)
- `data/` хавтсанд: universities.csv, programs.csv, students.csv, applications.csv, scholarships.csv

## Өнгөний палет (вэбсайттай нийцсэн)

| Үүрэг | Hex |
|---|---|
| Үндсэн ягаан | `#7F77DD` |
| Нэмэлт ногоон | `#5DCAA5` |
| Сэрэмжлүүлэг улбар | `#F0997B` |
| Шар (peak) | `#F5D67B` |
| Гүн навтгар bg | `#0a0e1a` |
| Текст | `#e8ecf6` |

PowerBI-д View → Themes → Customize current theme → дээрх hex кодуудыг оруулна.

---

## Алхам 1 — Өгөгдөл ачаалах

1. **Get Data → Folder** → `data/` хавтсыг сонгох
2. PowerBI 5 CSV-г автоматаар таних. Combine and Load дарах.
3. Эхэндээ Power Query Editor нээгдвэл — багана тус бүрийн төрлийг шалгах:
   - `apply_date`, `register_date`, `enrollment_date` → **Date**
   - `gpa_percent`, `tuition_yuan` → **Decimal Number**
   - `family_income_mnt`, `hsk_score`, `agent_score` → **Whole Number**
   - бусад → **Text**

## Алхам 2 — Хүснэгтийн хоорондын холбоо (relationships)

Model view нээж дараах foreign key-уудыг тохируулна:

```
universities (uni_id) ──< programs (uni_id)
universities (uni_id) ──< applications (uni_id)
programs (program_id) ──< applications (program_id)
students (student_id) ──< applications (student_id)
applications (app_id) ──< scholarships (app_id)
```

Бүгд **One-to-Many**, **Single direction**.

## Алхам 3 — DAX measure-ууд (нийт хүснэгтийн хувьд)

Шинэ хоосон хүснэгт үүсгэх: **Modeling → New Table** → `Measures = ROW("dummy", 1)` → Hide.
Дараа нь хэмжүүрүүдийг тэр хүснэгтэд орлуулна:

```dax
Total Applications = COUNTROWS(applications)

Total Students = COUNTROWS(students)

Total Universities = COUNTROWS(universities)

Acceptance Rate =
DIVIDE(
    CALCULATE(COUNTROWS(applications), applications[status] IN {"Accepted", "Enrolled", "Enrolled (delayed)"}),
    COUNTROWS(applications)
)

Enrollment Rate =
DIVIDE(
    CALCULATE(COUNTROWS(applications), applications[status] IN {"Enrolled", "Enrolled (delayed)"}),
    COUNTROWS(applications)
)

Avg Tuition Yuan = AVERAGE(programs[tuition_yuan])

Total Scholarship Yuan = SUM(scholarships[amount_yuan])

Avg Scholarship Yuan = AVERAGE(scholarships[amount_yuan])

Six Six Share =
DIVIDE(
    CALCULATE(COUNTROWS(applications), applications[anko_program_type] = "6+6"),
    COUNTROWS(applications)
)

Fall Bachelor Share =
DIVIDE(
    CALCULATE(COUNTROWS(applications), applications[anko_program_type] = "Fall Bachelor"),
    COUNTROWS(applications)
)

UB Share =
DIVIDE(
    CALCULATE(COUNTROWS(students), students[aimag] = "Улаанбаатар"),
    COUNTROWS(students)
)

YoY Growth =
VAR cur =
    CALCULATE(COUNTROWS(applications))
VAR prev =
    CALCULATE(
        COUNTROWS(applications),
        DATEADD(applications[apply_date], -1, YEAR)
    )
RETURN DIVIDE(cur - prev, prev)

COVID Drop Pct =
VAR a2019 = CALCULATE(COUNTROWS(applications), YEAR(applications[apply_date]) = 2019)
VAR a2020 = CALCULATE(COUNTROWS(applications), YEAR(applications[apply_date]) = 2020)
RETURN DIVIDE(a2020 - a2019, a2019)
```

---

## Хуудас 1 — Үндсэн KPI

**Гарчиг:** *Хятад дахь Монгол оюутны элсэлт — Үзүүлэлт*

**Visual-ууд:**
1. **4 Card** дээр (баруун дээр):
   - Total Students = 1,500
   - Total Applications = 2,250
   - Acceptance Rate (% format)
   - Avg Tuition Yuan (¥ format)
2. **Slicer** (Year): `applications[apply_date]` (Year hierarchy)
3. **Donut chart** — Хөтөлбөрийн төрлийн эзлэх хувь
   - Legend: `applications[anko_program_type]`
   - Values: `Total Applications`
4. **Map (Bing) эсвэл Filled map** — оюутнуудын аймгийн тархалт
5. **Bar chart** — Топ 10 их сургууль
   - Axis: `universities[uni_name]`
   - Values: `Total Applications`
   - Top N filter: 10

## Хуудас 2 — Газарзүй

**Гарчиг:** *Хаанаас → Хаашаа?*

**Visual-ууд:**
1. **Mongolia map** (Filled map) — `students[aimag]` тус бүрийн оюутны тоогоор
2. **UB districts bar chart** — `students[district]` УБ-аас шүүсэн
3. **China cities bubble map** — `universities[city]` тус бүрийн өргөдлийн тоогоор
4. **Slicer** — Хөтөлбөрийн төрөл
5. **Card** — UB Share хэмжүүр

## Хуудас 3 — Чиг хандлага (Time series)

**Гарчиг:** *2019 → 2025 — Эргэн хараал*

**Visual-ууд:**
1. **Line chart** — `applications[apply_date]` (X) × `Total Applications` (Y)
   - Нэмэлт reference line: 2020 он дээр "COVID хил хаагдав"
2. **Stacked area chart** — Хөтөлбөрийн эзлэх хувь жилээр
   - X: Year(apply_date)
   - Y: Count of applications
   - Legend: `anko_program_type`
3. **Card** — COVID Drop Pct
4. **Card** — YoY Growth (хамгийн сүүлийн он)
5. **Slicer** — Сар (тус сард seasonal харах)

## Хуудас 4 — ANKO 4 хөтөлбөр + funnel

**Гарчиг:** *6+6, 1+4, Fall Bachelor, Master/PhD — Conversion funnel*

**Visual-ууд:**
1. **4 ширхэг Card** — Хөтөлбөрийн эзлэх хувь (`Six Six Share`, `Fall Bachelor Share` гэх мэт)
2. **Funnel chart** — Хөтөлбөр тус бүрийн status шилжилт:
   - "Submitted" → "Under Review" → "Accepted" → "Enrolled"
   - Бүлгээр (anko_program_type)
3. **Bar chart** — Хөтөлбөр тус бүрийн элсэлтийн хувь
4. **Heatmap (matrix)** — Хөтөлбөр × HSK түвшин (өргөдлийн тоо)
5. **Slicer** — Жил

DAX (Conversion):
```dax
Funnel Step =
SWITCH(TRUE(),
    applications[status] = "Submitted", 1,
    applications[status] = "Under Review", 2,
    applications[status] = "Accepted", 3,
    applications[status] IN {"Enrolled", "Enrolled (delayed)"}, 4,
    BLANK()
)
```

## Хуудас 5 — Оюутны сегмент + урьдчилсан таамаглал

**Гарчиг:** *Оюутны 5 төрөл + ML insights*

**Visual-ууд:**
1. **5 Card** — `Cluster_Name` бүрд тус тусдаа `Cluster Size`
2. **Scatter chart** — оюутнуудын HSK level (X) × GPA% (Y), бүл нь cluster ID
3. **Stacked bar** — Тэтгэлгийн төрөл бүрийн нийт мөнгөн дүн
4. **Card** — Total Scholarship Yuan
5. **Table** — топ 10 их магадлалтай оюутан (`agent_score` дээгүүр)

ML cluster ID-г оруулахын тулд `students.csv`-д `cluster_id` багана нэмэх хэрэгтэй.
Үүний тулд notebook 04 ажиллуулсны дараа `cluster_labels.csv` хадгалаад
PowerBI-д импортолно.

---

## Алхам 4 — Sync slicers

Settings → Sync slicers тохируулж "Year" болон "Program type" slicer-уудыг бүх
хуудаст ижил утгатай байлгана.

## Алхам 5 — Bookmark + tooltip

- Хуудас бүрд **Filter pane** дээр default slicer утга хадгалах bookmark үүсгэх
- Visual бүрд **Format → Tooltip** идэвхжүүлэх (бүл нэмэлт мэдээлэл)

## Алхам 6 — Export

`File → Export → PDF` сонгож **5 хуудсыг бүгдийг** PDF болгоно. Энэ
файлыг илтгэлд хавсаргана.

---

## Илтгэлийн screenshot-ууд

1. Page 1 — overview KPI (16:9)
2. Page 2 — UB district + China city map
3. Page 3 — COVID line chart (annotation-той)
4. Page 4 — funnel chart
5. Page 5 — cluster scatter

Бүгд `presentation/screenshots/` хавтсанд хадгална.
