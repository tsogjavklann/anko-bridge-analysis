#!/usr/bin/env python3
"""Move analytics sections from #analytics-root into between-stop gap zones."""
import io, sys

PATH = 'C:/tsogoo/Ajil/anko-bridge-analysis/website/index.html'
with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

# Split into three parts:
# A: head + body + topbar + preloader + canvas + open main + 7 stops (...up to </main>)
# B: analytics-root content (435..792 → without wrapper)
# C: scripts onward

A_END = '</main>'             # line 428 ends with this
B_OPEN = '<div id="analytics-root">'
B_CLOSE_MARKER = '</div>\n\n<script type="module">'

a_end_pos = src.index(A_END) + len(A_END)
header_block = src[:a_end_pos]
rest = src[a_end_pos:]

b_open_pos = rest.index(B_OPEN)
b_close_pos = rest.index(B_CLOSE_MARKER)
ar_content = rest[b_open_pos + len(B_OPEN):b_close_pos]
tail_block = rest[b_close_pos + len('</div>'):]

# Extract individual <section ...>...</section> blocks from analytics-root content
# Use a tag-aware split
import re
sec_pattern = re.compile(
    r'(<section\b[^>]*?>.*?</section>)',
    re.DOTALL,
)
sections = sec_pattern.findall(ar_content)
# Map by id/data-chapter
def section_key(s):
    m_chap = re.search(r'data-chapter="(\d+)"', s)
    if m_chap:
        return ('chap', m_chap.group(1))
    m_id = re.search(r'\bid="([^"]+)"', s)
    if m_id:
        return ('sec', m_id.group(1))
    m_class = re.search(r'class="([^"]+)"', s)
    if m_class:
        return ('cls', m_class.group(1).split()[0])
    return ('unk', '?')

sec_map = {}
for s in sections:
    k = section_key(s)
    sec_map.setdefault(k, []).append(s)

def take(k):
    items = sec_map.get(k, [])
    if not items: raise SystemExit(f'missing section: {k}')
    return items.pop(0)

# Distribution: gap after each stop → list of section keys
GAPS = {
    0: [('cls', 'marquee')],
    1: [('chap', '02'), ('sec', 'sec-map-mongolia')],
    2: [],
    3: [('chap', '03'), ('sec', 'sec-programs'), ('sec', 'sec-sankey')],
    4: [('sec', 'sec-race')],
    5: [('chap', '01'), ('sec', 'sec-map-china'),
        ('chap', '04'), ('sec', 'sec-personas'), ('sec', 'sec-predictor')],
    6: [('chap', '06'), ('sec', 'sec-ml-models'),
        ('sec', 'sec-corr-pca'), ('sec', 'sec-scholarship'),
        ('chap', '05'), ('sec', 'sec-bi'),
        ('sec', 'sec-conclusion')],
}

# Insert each gap RIGHT BEFORE the closing </main> AND right after that stop's closing
# We modify header_block by inserting <div class="dash-gap" data-after-stop="N"> ... </div>
# after each `<div class="stop-cards" data-cards="N"></div>\n  </section>` closing pattern.

for stop_n in sorted(GAPS.keys()):
    keys = GAPS[stop_n]
    if not keys: continue
    gap_inner = '\n\n'.join('  ' + s.replace('\n  ', '\n    ') for s in (take(k) for k in keys))
    gap_block = (
        f'\n\n  <!-- ─── Gap after Stop {stop_n} ──────────────────────────────────────── -->\n'
        f'  <div class="dash-gap" data-after-stop="{stop_n}">\n'
        f'{gap_inner}\n'
        f'  </div>'
    )
    needle = f'<div class="stop-cards" data-cards="{stop_n}"></div>\n  </section>'
    if needle not in header_block:
        raise SystemExit(f'cannot find closing of stop {stop_n}')
    header_block = header_block.replace(needle, needle + gap_block, 1)

# Verify all sections used
leftover = [k for k, v in sec_map.items() if v]
if leftover:
    print('WARNING leftover sections:', leftover, file=sys.stderr)

new_src = header_block + tail_block
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(new_src)
print(f'Wrote {len(new_src)} bytes ({new_src.count(chr(10))} lines)')
