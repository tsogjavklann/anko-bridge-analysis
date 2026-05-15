/* ═══════════════════════════════════════════════════════════════════════
   charts.js — analytical-section D3 charts
   - bar chart race (top 10 universities 2019–2025)
   - program evolution stacked area + 4 program cards
   - field-of-study tall bars
   - Sankey alluvial (aimag → tier → city)
   - 5 persona cards with mini radar
   - UB district bar list (Mongolia map sidebar)
   - Top-10 ranked sidebar (China map sidebar)
   ═══════════════════════════════════════════════════════════════════════ */

import * as d3 from 'd3';
import { sankey as sankeyGen, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import { fmtNum, loadDestinations, showTip, hideTip } from './data-loader.js';

const PROG_COLORS = { '6+6': '#d8a64a', '1+4': '#6e63e0', 'Fall Bachelor': '#2fae89', 'Master/PhD': '#ee6f46' };
const FIELD_COLORS = {
  Arts: '#cf4fb5', Business: '#d8a64a', Engineering: '#6e63e0',
  Humanities: '#8a90a8', Language: '#bcd05b', Medicine: '#ee6f46', Science: '#2fae89',
};

export function mountCharts(insights, { gsap, ScrollTrigger }) {
  mountBarRace(insights);
  mountProgramCards(insights);
  mountProgramArea(insights);
  mountFieldBars(insights);
  mountSankey(insights);
  mountPersonaCards(insights);
  mountUbDistricts(insights);   // Mongolia map sidebar
  mountChinaTop10(insights);    // China map sidebar
}

/* ── bar chart race ─────────────────────────────────────────────────────── */
function mountBarRace(insights) {
  const host = document.getElementById('bar-race');
  if (!host) return;
  const data = insights.uni_race_by_year;  // dict year → [{name, count}]
  const years = Object.keys(data).map(Number).sort((a,b)=>a-b);
  const yMin = years[0], yMax = years[years.length-1];

  // Build cumulative top-10 across years for stable color mapping
  const allUnis = new Set();
  years.forEach(y => data[y].forEach(d => allUnis.add(d.name)));
  const color = d3.scaleOrdinal().domain([...allUnis])
    .range(d3.schemeTableau10.concat(d3.schemeSet3));

  const rect = host.getBoundingClientRect();
  const w = rect.width || 800, h = parseInt(host.style.height) || 520;
  const pad = { l: 220, r: 70, t: 20, b: 30 };

  const svg = d3.select(host).append('svg')
    .attr('width', '100%').attr('height', h)
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('preserveAspectRatio', 'xMinYMid meet');

  const yScale = d3.scaleBand().padding(0.18).range([pad.t, h - pad.b]);
  const xScale = d3.scaleLinear().range([pad.l, w - pad.r]);
  const xAxisG = svg.append('g').attr('class', 'axis x').attr('transform', `translate(0, ${pad.t})`);

  const yearLabel = svg.append('text')
    .attr('x', w - pad.r - 8).attr('y', h - 30)
    .attr('text-anchor', 'end')
    .attr('font-family', 'Inter Tight').attr('font-weight', 900)
    .attr('font-size', 64).attr('fill', 'rgba(216,166,74,0.18)');

  const barsG = svg.append('g');

  function render(year) {
    const list = (data[year] || []).slice(0, 10);
    yScale.domain(list.map(d => d.name));
    xScale.domain([0, d3.max(list, d => d.count) || 1]);

    yearLabel.text(year);

    const bars = barsG.selectAll('g.row').data(list, d => d.name);
    const enter = bars.enter().append('g').attr('class', 'row');
    enter.append('rect').attr('class', 'bar').attr('x', pad.l).attr('height', yScale.bandwidth());
    enter.append('text').attr('class', 'lbl').attr('x', pad.l - 10).attr('text-anchor', 'end').attr('font-family','Inter');
    enter.append('text').attr('class', 'num').attr('text-anchor', 'start').attr('font-family','Inter Tight').attr('font-weight', 700).attr('fill', '#d8a64a');

    const merged = enter.merge(bars);
    merged.transition().duration(800).ease(d3.easeCubicInOut)
      .attr('transform', d => `translate(0, ${yScale(d.name)})`);
    merged.select('rect.bar').transition().duration(800).ease(d3.easeCubicInOut)
      .attr('width', d => Math.max(0, xScale(d.count) - pad.l))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => color(d.name))
      .attr('opacity', 0.9)
      .attr('rx', 4);
    merged.select('text.lbl').transition().duration(800)
      .attr('y', yScale.bandwidth()/2 + 4)
      .attr('fill', 'rgba(242,243,247,0.85)')
      .attr('font-size', 12)
      .text(d => d.name);
    merged.select('text.num').transition().duration(800)
      .attr('x', d => xScale(d.count) + 8)
      .attr('y', yScale.bandwidth()/2 + 5)
      .attr('font-size', 14)
      .text(d => fmtNum.format(d.count));

    bars.exit().transition().duration(400).style('opacity', 0).remove();

    xAxisG.transition().duration(800).call(d3.axisTop(xScale).ticks(5).tickSize(-(h-pad.t-pad.b)));
    xAxisG.selectAll('text').attr('fill', 'rgba(242,243,247,0.5)');
    xAxisG.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)');
    xAxisG.select('.domain').remove();
  }

  // controls
  const slider = document.getElementById('race-year');
  const label  = document.getElementById('race-label');
  const playBtn = document.getElementById('race-play');
  let playing = false, tickI = null;
  function setYear(y) {
    slider.value = y; label.textContent = y; render(y);
  }
  slider.addEventListener('input', e => { stop(); setYear(+e.target.value); });
  playBtn.addEventListener('click', () => playing ? stop() : play());
  function play() {
    playing = true; playBtn.textContent = '⏸ Зогсоох'; playBtn.classList.add('playing');
    if (+slider.value >= yMax) setYear(yMin);
    tickI = setInterval(() => {
      const y = +slider.value + 1;
      if (y > yMax) { stop(); return; }
      setYear(y);
    }, 1400);
  }
  function stop() {
    playing = false; playBtn.textContent = '▶ Тоглуулах'; playBtn.classList.remove('playing');
    clearInterval(tickI);
  }
  setYear(yMin);
}

/* ── program cards (4) ──────────────────────────────────────────────────── */
function mountProgramCards(insights) {
  const host = document.getElementById('program-cards');
  if (!host) return;
  const ps = insights.program_share;
  const accs = Object.fromEntries(insights.acceptance_by_program.map(d => [d.type, d.rate]));
  const rev = insights.bi_program_revenue || {};
  ps.forEach(p => {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.dataset.prog = p.type;
    card.style.color = PROG_COLORS[p.type];
    const r = rev[p.type] || {};
    card.innerHTML = `
      <div class="pc-name">${p.type}</div>
      <div class="pc-share">${p.pct.toFixed(1)}<small style="font-size:0.4em;font-weight:700">%</small></div>
      <div class="pc-meta">${fmtNum.format(r.count || 0)} оюутан · Элсэх ${(accs[p.type]||0).toFixed(0)}%</div>
      <div class="pc-bar"><i style="width:${Math.min(100, p.pct * 1.7)}%"></i></div>
      <div class="pc-meta" style="font-size:0.74rem; opacity:0.7;">Дундаж сургалтын төлбөр: ${fmtNum.format(Math.round(r.avg_tuition_yuan || 0))} 元</div>
    `;
    host.appendChild(card);
  });
}

/* ── program evolution stacked area ─────────────────────────────────────── */
function mountProgramArea(insights) {
  const host = document.getElementById('program-area');
  if (!host) return;
  const by = insights.program_share_by_year;
  const years = Object.keys(by).map(Number).sort((a,b)=>a-b);
  const keys = ['6+6','1+4','Fall Bachelor','Master/PhD'];
  const data = years.map(y => ({ year: y, ...by[y] }));
  const stacked = d3.stack().keys(keys)(data);

  const w = host.clientWidth || 600, h = 320, pad = { l: 40, r: 16, t: 12, b: 30 };
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([pad.l, w-pad.r]);
  const y = d3.scaleLinear().domain([0, 100]).range([h-pad.b, pad.t]);
  const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveCatmullRom);

  stacked.forEach((layer, i) => {
    svg.append('path').attr('d', area(layer))
      .attr('fill', PROG_COLORS[keys[i]]).attr('opacity', 0.85);
  });

  svg.append('g').attr('class','axis').attr('transform', `translate(0, ${h-pad.b})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(7));
  svg.append('g').attr('class','axis').attr('transform', `translate(${pad.l}, 0)`)
    .call(d3.axisLeft(y).tickFormat(d => d+'%').ticks(5));

  // legend
  const leg = svg.append('g').attr('transform', `translate(${pad.l}, ${pad.t - 4})`);
  keys.forEach((k, i) => {
    leg.append('rect').attr('x', i*100).attr('y', -16).attr('width', 10).attr('height', 10).attr('fill', PROG_COLORS[k]);
    leg.append('text').attr('x', i*100 + 14).attr('y', -8).attr('font-size', 10).attr('fill', '#f2f3f7').text(k);
  });
}

/* ── field of study tall bars ───────────────────────────────────────────── */
function mountFieldBars(insights) {
  const host = document.getElementById('field-bars');
  if (!host) return;
  const by = insights.field_by_year;
  const years = Object.keys(by).map(Number).sort((a,b)=>a-b);
  const fields = ['Engineering','Business','Medicine','Humanities','Science','Arts','Language'];
  const last = by[years[years.length-1]];
  const arr = fields.map(f => ({ field: f, count: last[f] || 0 }));
  arr.sort((a,b) => b.count - a.count);

  const w = host.clientWidth || 600, h = 320, pad = { l: 110, r: 50, t: 12, b: 20 };
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
  const x = d3.scaleLinear().domain([0, d3.max(arr, d => d.count) * 1.1]).range([pad.l, w - pad.r]);
  const y = d3.scaleBand().domain(arr.map(d => d.field)).range([pad.t, h - pad.b]).padding(0.22);

  svg.selectAll('rect').data(arr).enter().append('rect')
    .attr('x', pad.l).attr('y', d => y(d.field))
    .attr('height', y.bandwidth()).attr('rx', 4)
    .attr('width', 0)
    .attr('fill', d => FIELD_COLORS[d.field])
    .attr('opacity', 0.85)
    .transition().duration(900).ease(d3.easeCubicOut)
    .attr('width', d => Math.max(0, x(d.count) - pad.l));

  svg.selectAll('text.lbl').data(arr).enter().append('text').attr('class','lbl')
    .attr('x', pad.l - 8).attr('y', d => y(d.field) + y.bandwidth()/2 + 4)
    .attr('text-anchor', 'end').attr('font-size', 12).attr('font-family', 'Inter')
    .attr('fill', 'rgba(242,243,247,0.85)')
    .text(d => mongolField(d.field));

  svg.selectAll('text.num').data(arr).enter().append('text').attr('class','num')
    .attr('x', d => x(d.count) + 6).attr('y', d => y(d.field) + y.bandwidth()/2 + 4)
    .attr('font-family','Inter Tight').attr('font-weight', 700)
    .attr('font-size', 12).attr('fill', d => FIELD_COLORS[d.field])
    .text(d => fmtNum.format(d.count));

  // subtle axis hint
  svg.append('text').attr('x', w/2).attr('y', h-4).attr('text-anchor','middle')
    .attr('font-size', 10).attr('fill', 'rgba(242,243,247,0.45)').text(`${years[years.length-1]} оны хувиарлал`);
}

function mongolField(f) {
  return ({
    Engineering: 'Инженерчлэл', Business: 'Бизнес', Medicine: 'Анагаах',
    Humanities: 'Хүмүүнлэг', Science: 'Шинжлэх ухаан', Arts: 'Урлаг', Language: 'Хэл',
  })[f] || f;
}

/* ── Sankey: aimag → tier → city ────────────────────────────────────────── */
async function mountSankey(insights) {
  const host = document.getElementById('sankey');
  if (!host) return;
  let dest;
  try { dest = await loadDestinations(); } catch (e) { console.warn('sankey dest fail', e); return; }

  // Build aggregates with top-N filtering to keep diagram readable
  const aimagCounts = d3.rollup(dest, v => v.length, d => d.student_aimag);
  const topAimags = [...aimagCounts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 6).map(d => d[0]);
  const cityCounts = d3.rollup(dest, v => v.length, d => d.city);
  const topCities = [...cityCounts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);

  function bucketAimag(a) { return topAimags.includes(a) ? a : 'Бусад аймаг'; }
  function bucketCity(c) { return topCities.includes(c) ? c : 'Бусад хот'; }

  // build node list — strict columns: aimag (col 0), tier (col 1), city (col 2)
  const tiers = ['C9','985','211','Provincial'];
  const aimagNodes = [...new Set(dest.map(d => bucketAimag(d.student_aimag)))];
  const cityNodes  = [...new Set(dest.map(d => bucketCity(d.city)))];
  const nodes = [
    ...aimagNodes.map(n => ({ name: n, group: 'aimag' })),
    ...tiers.map(n => ({ name: n, group: 'tier' })),
    ...cityNodes.map(n => ({ name: n, group: 'city' })),
  ];
  const idx = Object.fromEntries(nodes.map((n, i) => [n.group + '·' + n.name, i]));

  const linkMap = new Map();
  dest.forEach(d => {
    const a = bucketAimag(d.student_aimag);
    const t = d.tier;
    const c = bucketCity(d.city);
    if (!tiers.includes(t)) return;
    const k1 = `aimag·${a}|tier·${t}`;
    const k2 = `tier·${t}|city·${c}`;
    linkMap.set(k1, (linkMap.get(k1) || 0) + 1);
    linkMap.set(k2, (linkMap.get(k2) || 0) + 1);
  });
  const links = [...linkMap.entries()].map(([k, v]) => {
    const [s, t] = k.split('|');
    return { source: idx[s], target: idx[t], value: v };
  });

  const w = host.clientWidth || 900, h = 560;
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
  const sk = sankeyGen()
    .nodeWidth(14).nodePadding(10).nodeAlign(sankeyJustify)
    .extent([[12, 12], [w-12, h-12]]);

  const graph = sk({
    nodes: nodes.map(n => Object.assign({}, n)),
    links: links.map(l => Object.assign({}, l)),
  });

  // Color by group
  const groupColor = { aimag: '#6e63e0', tier: '#d8a64a', city: '#2fae89' };

  // links
  svg.append('g').attr('fill', 'none').attr('stroke-opacity', 0.45)
    .selectAll('path').data(graph.links).enter().append('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', d => d.source.group === 'aimag' ? '#6e63e0' : '#d8a64a')
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('opacity', 0.45)
    .on('mousemove', function(ev, d) {
      d3.select(this).attr('opacity', 0.85);
      showTip(`<b>${d.source.name} → ${d.target.name}</b><br>${fmtNum.format(d.value)} оюутан`, ev.clientX, ev.clientY);
    })
    .on('mouseleave', function() { d3.select(this).attr('opacity', 0.45); hideTip(); });

  // nodes
  const node = svg.append('g').selectAll('g').data(graph.nodes).enter().append('g');
  node.append('rect')
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', d => Math.max(1, d.y1 - d.y0))
    .attr('fill', d => groupColor[d.group]).attr('opacity', 0.9).attr('rx', 2);
  node.append('text')
    .attr('x', d => d.x0 < w / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < w / 2 ? 'start' : 'end')
    .attr('fill', '#f2f3f7').attr('font-size', 12).attr('font-family','Inter')
    .text(d => d.name);
}

/* ── persona cards (5) — mini radar ─────────────────────────────────────── */
// Refined persona names per editorial review
const PERSONA_NAMES = {
  'Орон нутгийн боломжит сурагчид':       'Орон нутгаас өндөр боломжтой суралцагчид',
  'Орон нутгийн дэмжлэг хэрэгтэй сурагчид':'Орон нутгаас нэмэлт дэмжлэг шаардлагатай суралцагчид',
  'Ахисан түвшний суралцагчид':           'Ахисан түвшний суралцагчид',
  'Тэтгэлэгт төвлөрсөн сурагчид':         'Тэтгэлэгт төвлөрсөн өндөр гүйцэтгэлтэй суралцагчид',
  'Хэлний бэлтгэлээс эхлэгчид':           'Хэлний бэлтгэлээс эхэлж буй суралцагчид',
};

function mountPersonaCards(insights) {
  const host = document.getElementById('persona-cards');
  if (!host) return;
  const ps = insights.personas;
  const RADAR_KEYS = ['HSK','HSK_оноо','GPA','Нас','Орлого'];
  ps.forEach(p => {
    const card = document.createElement('article');
    card.className = 'persona-card';
    card.dataset.pn = p.id;
    const radar = makeRadar(p.radar, RADAR_KEYS, p.id);
    const displayName = PERSONA_NAMES[p.name] || p.name;
    card.innerHTML = `
      <div class="pn-head">
        <span class="pn-name">${displayName}</span>
        <span class="pn-size">${fmtNum.format(p.size)} ш</span>
      </div>
    `;
    card.appendChild(radar);
    const meta = document.createElement('div'); meta.className = 'pn-meta';
    meta.innerHTML = `
      <span>HSK</span><strong>${p.avg_hsk.toFixed(1)}</strong>
      <span>HSK оноо</span><strong>${Math.round(p.avg_hsk_score)}</strong>
      <span>GPA</span><strong>${p.avg_gpa.toFixed(1)}</strong>
      <span>Нас</span><strong>${p.avg_age.toFixed(1)}</strong>
      <span>Орлого</span><strong>${(p.avg_income_mnt/1e6).toFixed(1)}сая ₮</strong>
    `;
    card.appendChild(meta);
    host.appendChild(card);
  });
}

function makeRadar(radar, keys, pid) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class','pn-radar');
  svg.setAttribute('viewBox','0 0 200 200');
  const cx = 100, cy = 100, R = 80;
  const N = keys.length;
  const color = ['#d8a64a','#6e63e0','#2fae89','#ee6f46','#cf4fb5'][pid % 5];

  // grid rings
  [0.25, 0.5, 0.75, 1.0].forEach(r => {
    const c = document.createElementNS(ns,'polygon');
    let pts = '';
    for (let i=0;i<N;i++){
      const a = -Math.PI/2 + i*2*Math.PI/N;
      pts += `${cx + Math.cos(a)*R*r},${cy + Math.sin(a)*R*r} `;
    }
    c.setAttribute('points', pts.trim());
    c.setAttribute('fill','none');
    c.setAttribute('stroke','rgba(255,255,255,0.08)');
    c.setAttribute('stroke-width', 1);
    svg.appendChild(c);
  });
  // axes
  keys.forEach((k, i) => {
    const a = -Math.PI/2 + i*2*Math.PI/N;
    const x = cx + Math.cos(a)*R, y = cy + Math.sin(a)*R;
    const l = document.createElementNS(ns,'line');
    l.setAttribute('x1', cx); l.setAttribute('y1', cy);
    l.setAttribute('x2', x); l.setAttribute('y2', y);
    l.setAttribute('stroke','rgba(255,255,255,0.06)');
    svg.appendChild(l);
    // label
    const t = document.createElementNS(ns,'text');
    t.setAttribute('x', cx + Math.cos(a)*(R+12));
    t.setAttribute('y', cy + Math.sin(a)*(R+12) + 4);
    t.setAttribute('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end'));
    t.setAttribute('font-size', 9.5);
    t.setAttribute('fill', 'rgba(242,243,247,0.6)');
    t.setAttribute('font-family','Inter');
    t.textContent = k;
    svg.appendChild(t);
  });
  // polygon
  let pts = '';
  keys.forEach((k, i) => {
    const v = Math.max(0.05, Math.min(1, radar[k] || 0));
    const a = -Math.PI/2 + i*2*Math.PI/N;
    pts += `${cx + Math.cos(a)*R*v},${cy + Math.sin(a)*R*v} `;
  });
  const poly = document.createElementNS(ns,'polygon');
  poly.setAttribute('points', pts.trim());
  poly.setAttribute('fill', color);
  poly.setAttribute('fill-opacity', 0.35);
  poly.setAttribute('stroke', color);
  poly.setAttribute('stroke-width', 1.6);
  svg.appendChild(poly);
  return svg;
}

/* ── UB district sidebar bars ────────────────────────────────────────────── */
function mountUbDistricts(insights) {
  const host = document.getElementById('mn-ub-districts');
  if (!host) return;
  const ds = insights.ub_districts.slice().sort((a,b) => b.pct - a.pct);
  const max = ds[0].pct;
  ds.forEach(d => {
    const r = document.createElement('div'); r.className = 'bl-row';
    r.innerHTML = `<span class="bl-name">${d.district}</span><span class="bl-val">${d.pct.toFixed(1)}%</span>`;
    const bar = document.createElement('div'); bar.className = 'bl-bar';
    bar.innerHTML = `<i style="width:${(d.pct/max)*100}%"></i>`;
    host.appendChild(r);
    host.appendChild(bar);
  });
}

/* ── China Top-10 sidebar ranked list ────────────────────────────────────── */
function mountChinaTop10(insights) {
  const host = document.getElementById('cn-top10');
  if (!host) return;
  const top = insights.top_universities.slice(0, 10);
  top.forEach(u => {
    const row = document.createElement('div'); row.className = 'rk';
    row.innerHTML = `<span class="rk-name">${u.name}</span><span class="rk-val">${u.count}</span>`;
    host.appendChild(row);
  });
}
