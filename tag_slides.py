#!/usr/bin/env python3
"""Tag every <section class="slide ..."> with data-stop="N" (DOM order)
and add 'stop' to its class list so it becomes a cinematic-style camera
anchor in the 3D world. Preserves any existing data-stop on the 7 GLB
slides — they remain at their original indices."""
import re

PATH = 'C:/tsogoo/Ajil/anko-bridge-analysis/website/index.html'
with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

# Find all <section class="slide..."> openings IN ORDER, replace with data-stop=N
pattern = re.compile(r'<section class="(slide[^"]*)"([^>]*)>')
i = [0]
def replace(m):
    cls = m.group(1)
    rest = m.group(2)
    n = i[0]; i[0] += 1
    # ensure 'stop' is in class list
    if 'stop' not in cls.split():
        cls = cls + ' stop'
    # strip any existing data-stop="..." from rest
    rest = re.sub(r'\s*data-stop="\d+"', '', rest)
    return f'<section class="{cls}" data-stop="{n}"{rest}>'
new = pattern.sub(replace, src)
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(new)
print(f'tagged {i[0]} slide sections')
