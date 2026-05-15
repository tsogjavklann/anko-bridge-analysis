#!/usr/bin/env python3
"""Rebuild website/index.html into uniform 100vh slide deck.

- Remove .stop-cards overlays from cinematic stops (clean 3D-only)
- Remove .dash-gap wrappers + marquee stripe
- Each .dash-section / .chapter-intro becomes a standalone .slide
- Add NEW extra slides for ex-overlay analytics (KPI, donut+top, HSK area,
  COVID big callout, growth multi-line)
- Order: cinematic stops interleaved with analytics slides
"""
import re, sys

PATH = 'C:/tsogoo/Ajil/anko-bridge-analysis/website/index.html'
with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

# ── Extract existing sections by id / chapter / class ─────────────────────
sec_pattern = re.compile(r'(<section\b[^>]*?>.*?</section>)', re.DOTALL)
sections = sec_pattern.findall(src)

by_id   = {}
by_chap = {}
stop_secs = {}
for s in sections:
    m_stop = re.search(r'data-stop="(\d+)"', s)
    if m_stop:
        stop_secs[int(m_stop.group(1))] = s
        continue
    m_chap = re.search(r'data-chapter="(\d+)"', s)
    if m_chap:
        by_chap[m_chap.group(1)] = s
        continue
    m_id = re.search(r'\bid="([^"]+)"', s)
    if m_id:
        by_id[m_id.group(1)] = s

# Strip .stop-cards from each cinematic stop, add class="slide"
def clean_stop(s):
    s = re.sub(r'\s*<div class="stop-cards"[^>]*></div>\n?', '', s)
    s = re.sub(r'<section class="stop"', '<section class="slide stop"', s)
    return s

# Wrap an analytics section with class="slide ..."
def to_slide(s, extra_cls=''):
    cls_extra = ' ' + extra_cls if extra_cls else ''
    s = re.sub(r'<section class="dash-section"',
               f'<section class="slide dash-section{cls_extra}"', s)
    s = re.sub(r'<section class="chapter-intro"',
               f'<section class="slide chapter-intro{cls_extra}"', s)
    return s

# ── NEW extra slides for ex-overlay analytics ─────────────────────────────
EXTRA_SLIDES = {
    'kpi-1500': '''  <section class="slide dash-section slide-kpi" id="sec-kpi-1500">
    <div class="kpi-hero">
      <div class="ds-eyebrow">2019 → 2025</div>
      <div class="big-kpi-num"><span id="bigkpi-students">1,500</span></div>
      <div class="big-kpi-lbl">Монгол оюутан · 7 жил · 14× өсөлт</div>
      <div id="bigkpi-spark" class="big-kpi-spark"></div>
      <div class="big-kpi-meta">Жил бүрийн өргөдөл: <strong>2,250</strong> · нийт элсэлт: <strong>1,500</strong></div>
    </div>
  </section>''',

    'aimag-breakdown': '''  <section class="slide dash-section slide-split" id="sec-aimag-breakdown">
    <div class="ds-head">
      <span class="ds-eyebrow">Аймгийн хувь</span>
      <h3 class="ds-title">Монголын 21 аймгаас, Улаанбаатар 70.1%</h3>
    </div>
    <div class="ds-body split-grid">
      <div id="aimag-donut-wrap" class="aimag-donut-wrap"></div>
      <div id="aimag-list" class="aimag-list"></div>
    </div>
  </section>''',

    'hsk-deep': '''  <section class="slide dash-section slide-split" id="sec-hsk-deep">
    <div class="ds-head">
      <span class="ds-eyebrow">HSK · Хэлний бэлтгэл</span>
      <h3 class="ds-title">HSK 4-аас HSK 6 рүү: жил бүр түвшин өсчээ</h3>
      <p class="ds-lede">Жижиг түвшнүүд (HSK 1–3) буурч, HSK 5–6 түвшний оюутан 2019-аас 2025 онд 16× өсчээ. Хэлний түвшин элсэлтэнд шууд нөлөөлдөг.</p>
    </div>
    <div class="ds-body split-grid">
      <div id="hsk-area-wrap" class="chart-wrap" style="height:60vh"></div>
      <div id="hsk-funnel-wrap" class="chart-wrap" style="height:60vh"></div>
    </div>
  </section>''',

    'covid-callout': '''  <section class="slide dash-section slide-kpi" id="sec-covid-callout">
    <div class="kpi-hero kpi-hero-coral">
      <div class="ds-eyebrow">2020 · COVID-19</div>
      <div class="big-kpi-num big-kpi-coral"><span>−41.5%</span></div>
      <div class="big-kpi-lbl">Жилийн өргөдөл 53-аас 31-руу унасан</div>
      <div id="covid-line" class="big-kpi-spark big-kpi-spark-coral"></div>
      <div class="big-kpi-meta">3 жил хил хаалттай · 2023 онд эргэн нээгдсэн</div>
    </div>
  </section>''',

    'growth-callout': '''  <section class="slide dash-section slide-kpi" id="sec-growth-callout">
    <div class="kpi-hero">
      <div class="ds-eyebrow">2019 → 2025</div>
      <div class="big-kpi-num"><span>×14</span></div>
      <div class="big-kpi-lbl">2025 онд 1,371 өргөдөл — оргил жил</div>
      <div id="growth-multiline" class="big-kpi-spark"></div>
      <div class="big-kpi-meta">Бүртгүүлсэн 760 оюутан · 2019 онд 55 байсан</div>
    </div>
  </section>''',
}

# ── Compose new <main> ────────────────────────────────────────────────────
parts = []
def add_stop(n):
    parts.append(clean_stop(stop_secs[n]))
def add_chap(n):
    parts.append(to_slide(by_chap[n]))
def add_id(i, cls=''):
    parts.append(to_slide(by_id[i], cls))
def add_extra(key):
    parts.append(EXTRA_SLIDES[key])

# Chapter intros are dropped — each 3D stop's "bigword" inside the scene already
# acts as the chapter title. Analytics flow directly after each cinematic stop.

# 0. Stop 0 — ger (bigword: ЭХЛЭЛ)
add_stop(0)
# 1. KPI big number — 1,500 / 14× / sparkline
add_extra('kpi-1500')

# 2. Stop 1 — globe (bigword: МӨРӨӨДӨЛ → origin theme)
add_stop(1)
# 3. Aimag breakdown
add_extra('aimag-breakdown')
# 4. Mongolia map
add_id('sec-map-mongolia', 'slide-map')

# 5. Stop 2 — hsk gauge (bigword: ХЭЛ)
add_stop(2)
# 6. HSK deep dive
add_extra('hsk-deep')

# 7. Stop 3 — funnel (bigword: БҮРТГЭЛ → programs/funnel theme)
add_stop(3)
# 8. Programs (4 cards + area + field)
add_id('sec-programs')
# 9. Sankey
add_id('sec-sankey', 'slide-tall')

# 10. Stop 4 — greatwall (bigword: ХИЛ → COVID theme)
add_stop(4)
# 11. COVID callout
add_extra('covid-callout')
# 12. Bar chart race
add_id('sec-race', 'slide-tall')

# 13. Stop 5 — gradcap (bigword: СУРГУУЛЬ → destination theme)
add_stop(5)
# 14. China map
add_id('sec-map-china', 'slide-map')
# 15. Personas
add_id('sec-personas')
# 16. Predictor
add_id('sec-predictor', 'slide-tall')

# 17. Stop 6 — growth (bigword: ХАНДЛАГА → trends/analytics theme)
add_stop(6)
# 18. Growth callout
add_extra('growth-callout')
# 19. ML tabs
add_id('sec-ml-models', 'slide-tall')
# 20. Correlation + PCA
add_id('sec-corr-pca')
# 21. Scholarship boxplot
add_id('sec-scholarship')
# 22. BI cards
add_id('sec-bi', 'slide-tall')
# 23. Conclusion
add_id('sec-conclusion', 'slide-tall')

new_main = '<main id="scrollMain">\n' + '\n\n'.join(parts) + '\n</main>'

# ── Replace old <main>…</main> + .dash-gap wrappers ───────────────────────
# The old layout had <main> with stops and dash-gap inserts. Replace the whole
# <main> block (between first <main and matching </main>).
m_start = src.index('<main id="scrollMain">')
m_end   = src.index('</main>') + len('</main>')
new_src = src[:m_start] + new_main + src[m_end:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(new_src)

# Quick stats
slide_count = new_main.count('<section class="slide')
stop_count  = new_main.count('class="slide stop"')
print(f'wrote {len(new_src)} bytes')
print(f'slides total: {slide_count}')
print(f'cinematic stops: {stop_count}')
print(f'analytics slides: {slide_count - stop_count}')
