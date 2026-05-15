/* ═══════════════════════════════════════════════════════════════════════
   analytics-cards.js — extra-slide renderers (ex-overlay content)
   Renders chart content into the dedicated full-slide containers:
     #sec-kpi-1500       → 7-year sparkline + big number
     #sec-aimag-breakdown→ aimag donut + ranking list
     #sec-hsk-deep       → HSK stacked area + acceptance funnel
     #sec-covid-callout  → 2019-2022 line with COVID marker
     #sec-growth-callout → multi-line apps vs registrations 2019-2025
   ═══════════════════════════════════════════════════════════════════════ */

import * as d3 from 'd3';
import { fmtNum } from './data-loader.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

export function mountStopCards(insights) {
  mountKpi1500(insights);
  mountAimagBreakdown(insights);
  mountHskDeep(insights);
  mountCovidCallout(insights);
  mountGrowthCallout(insights);
}

/* ── 1. KPI: 1,500 / 7yr sparkline ──────────────────────────────────────── */
function mountKpi1500(insights) {
  const host = document.getElementById('bigkpi-spark');
  if (!host) return;
  const apps = insights.yearly_apps;
  const w = 680, h = 160, pad = 18;
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet', width: '100%', height: '100%' });
  const x = d3.scaleLinear().domain(d3.extent(apps, d => d.year)).range([pad, w - pad]);
  const y = d3.scaleLinear().domain([0, d3.max(apps, d => d.count) * 1.1]).range([h - pad - 14, pad]);
  const area = d3.area().x(d => x(d.year)).y0(h - pad - 14).y1(d => y(d.count)).curve(d3.curveCatmullRom);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.count)).curve(d3.curveCatmullRom);
  svg.appendChild(svgEl('path', { d: area(apps), fill: 'rgba(216,166,74,0.18)' }));
  svg.appendChild(svgEl('path', { d: line(apps), fill: 'none', stroke: '#d8a64a', 'stroke-width': 2.6 }));
  apps.forEach(d => {
    svg.appendChild(svgEl('circle', { cx: x(d.year), cy: y(d.count), r: 3.5, fill: '#d8a64a' }));
    const t = svgEl('text', { x: x(d.year), y: h - 4, 'text-anchor': 'middle', fill: 'rgba(242,243,247,0.55)', 'font-size': 11, 'font-family': 'Inter Tight', 'font-weight': 600 });
    t.textContent = d.year;
    svg.appendChild(t);
    if (d.year === 2025) {
      const tn = svgEl('text', { x: x(d.year), y: y(d.count) - 10, 'text-anchor': 'middle', fill: '#d8a64a', 'font-size': 14, 'font-family': 'Inter Tight', 'font-weight': 800 });
      tn.textContent = fmtNum.format(d.count);
      svg.appendChild(tn);
    }
  });
  host.appendChild(svg);
}

/* ── 2. Aimag breakdown: donut + ranking list ───────────────────────────── */
function mountAimagBreakdown(insights) {
  const dHost = document.getElementById('aimag-donut-wrap');
  const lHost = document.getElementById('aimag-list');
  if (!dHost || !lHost) return;

  const arr = insights.aimag_share.slice();
  const top5 = arr.slice(0, 5);
  const others = arr.slice(5).reduce((s, d) => s + d.pct, 0);
  const parts = [...top5, { aimag: 'Бусад аймгууд', pct: others }];
  const colors = ['#d8a64a','#6e63e0','#2fae89','#ee6f46','#cf4fb5','#8a90a8'];

  // donut SVG
  const sz = 380, r = sz/2 - 12, ir = r * 0.58, cx = sz/2, cy = sz/2;
  const svg = svgEl('svg', { viewBox: `0 0 ${sz} ${sz}`, width: '100%' });
  let a0 = -Math.PI / 2;
  const total = parts.reduce((s, p) => s + p.pct, 0);
  parts.forEach((p, i) => {
    const a1 = a0 + (p.pct / total) * Math.PI * 2;
    const x0 = cx + Math.cos(a0)*r, y0 = cy + Math.sin(a0)*r;
    const x1 = cx + Math.cos(a1)*r, y1 = cy + Math.sin(a1)*r;
    const ix0 = cx + Math.cos(a0)*ir, iy0 = cy + Math.sin(a0)*ir;
    const ix1 = cx + Math.cos(a1)*ir, iy1 = cy + Math.sin(a1)*ir;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix0} ${iy0} Z`;
    svg.appendChild(svgEl('path', { d, fill: colors[i], opacity: 0.95 }));
    a0 = a1;
  });
  // center number
  const big = svgEl('text', { x: cx, y: cy - 8, 'text-anchor': 'middle', 'font-family': 'Inter Tight', 'font-weight': 900, 'font-size': 56, fill: '#d8a64a' });
  big.textContent = '70.1%';
  svg.appendChild(big);
  const small = svgEl('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', 'font-family': 'Inter Tight', 'font-weight': 600, 'font-size': 13, fill: 'rgba(242,243,247,0.6)' });
  small.textContent = 'Улаанбаатараас';
  svg.appendChild(small);
  dHost.appendChild(svg);

  // list of top-6 destinations / aimags
  parts.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'al-row';
    row.innerHTML = `<span class="al-rk">${i + 1}</span><span class="al-name">${p.aimag}</span><span class="al-pct">${p.pct.toFixed(1)}%</span>
      <div class="al-bar"><i style="width:${(p.pct/70.1)*100}%; background:${colors[i]}"></i></div>`;
    lHost.appendChild(row);
  });
}

/* ── 3. HSK deep: stacked area (by year) + acceptance funnel (by HSK) ────── */
function mountHskDeep(insights) {
  const aHost = document.getElementById('hsk-area-wrap');
  const fHost = document.getElementById('hsk-funnel-wrap');
  if (aHost) renderHSKArea(insights, aHost);
  if (fHost) renderHSKFunnel(insights, fHost);
}

function renderHSKArea(insights, host) {
  const by = insights.hsk_by_year;
  const years = Object.keys(by).map(Number).sort((a, b) => a - b);
  const keys = ['HSK 1','HSK 2','HSK 3','HSK 4','HSK 5','HSK 6'];
  const data = years.map(y => ({ year: y, ...by[y] }));
  const stack = d3.stack().keys(keys)(data);
  const w = host.clientWidth || 500, h = host.clientHeight || 380, pad = { l: 36, r: 16, t: 30, b: 28 };
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', '100%').attr('viewBox', `0 0 ${w} ${h}`);
  svg.append('text').attr('x', pad.l).attr('y', 18).attr('font-family', 'Inter Tight').attr('font-weight', 700).attr('fill', '#f2f3f7').attr('font-size', 13).text('HSK түвшин жилээр');
  const x = d3.scaleLinear().domain(d3.extent(years)).range([pad.l, w - pad.r]);
  const max = d3.max(stack[stack.length - 1], d => d[1]);
  const y = d3.scaleLinear().domain([0, max]).range([h - pad.b, pad.t]);
  const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveCatmullRom);
  const colors = ['#8a90a8','#a87d59','#2fae89','#6e63e0','#d8a64a','#ee6f46'];
  stack.forEach((layer, i) => svg.append('path').attr('d', area(layer)).attr('fill', colors[i]).attr('opacity', 0.88));
  svg.append('g').attr('transform', `translate(0, ${h - pad.b})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(7)).selectAll('text').attr('fill', 'rgba(242,243,247,0.6)').attr('font-size', 10);
  svg.append('g').attr('transform', `translate(${pad.l}, 0)`).call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', 'rgba(242,243,247,0.6)').attr('font-size', 10);
  // legend
  const leg = svg.append('g').attr('transform', `translate(${pad.l}, ${h - 8})`);
  keys.forEach((k, i) => {
    leg.append('rect').attr('x', i * 64).attr('y', -4).attr('width', 10).attr('height', 8).attr('fill', colors[i]);
    leg.append('text').attr('x', i * 64 + 14).attr('y', 4).attr('font-size', 10).attr('fill', 'rgba(242,243,247,0.7)').text(k);
  });
}

function renderHSKFunnel(insights, host) {
  const f = insights.bi_hsk_funnel;
  const keys = ['1','2','3','4','5','6'];
  const w = host.clientWidth || 500, h = host.clientHeight || 380, pad = { l: 40, r: 36, t: 30, b: 30 };
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', '100%').attr('viewBox', `0 0 ${w} ${h}`);
  svg.append('text').attr('x', pad.l).attr('y', 18).attr('font-family', 'Inter Tight').attr('font-weight', 700).attr('fill', '#f2f3f7').attr('font-size', 13).text('Элсэлтийн магадлал HSK түвшингээр');

  const max = Math.max(...keys.map(k => f[k].applied));
  const barH = (h - pad.t - pad.b - 8 * (keys.length - 1)) / keys.length;
  keys.forEach((k, i) => {
    const d = f[k];
    const y0 = pad.t + i * (barH + 8);
    const aW = (d.applied / max) * (w - pad.l - pad.r - 60);
    const cW = aW * (d.rate / 100);
    svg.append('rect').attr('x', pad.l + 30).attr('y', y0).attr('width', aW).attr('height', barH).attr('fill', '#6e63e0').attr('opacity', 0.32).attr('rx', 4);
    svg.append('rect').attr('x', pad.l + 30).attr('y', y0).attr('width', cW).attr('height', barH).attr('fill', '#d8a64a').attr('rx', 4);
    svg.append('text').attr('x', pad.l + 24).attr('y', y0 + barH/2 + 4).attr('text-anchor', 'end').attr('font-family', 'Inter Tight').attr('font-weight', 700).attr('font-size', 12).attr('fill', '#f2f3f7').text('HSK ' + k);
    svg.append('text').attr('x', pad.l + 30 + aW + 6).attr('y', y0 + barH/2 + 4).attr('font-family', 'Inter Tight').attr('font-weight', 800).attr('font-size', 12).attr('fill', '#d8a64a').text(d.rate.toFixed(1) + '%');
  });
}

/* ── 4. COVID callout — 2019-2022 line with 2020 marker ─────────────────── */
function mountCovidCallout(insights) {
  const host = document.getElementById('covid-line');
  if (!host) return;
  const span = insights.yearly_apps.filter(d => d.year <= 2022);
  const w = 680, h = 160, pad = 18;
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', height: '100%' });
  const x = d3.scaleLinear().domain(d3.extent(span, d => d.year)).range([pad, w - pad]);
  const y = d3.scaleLinear().domain([0, d3.max(span, d => d.count) * 1.2]).range([h - pad - 14, pad]);
  const area = d3.area().x(d => x(d.year)).y0(h - pad - 14).y1(d => y(d.count)).curve(d3.curveCatmullRom);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.count)).curve(d3.curveCatmullRom);
  svg.appendChild(svgEl('path', { d: area(span), fill: 'rgba(238,111,70,0.20)', class: 'area' }));
  svg.appendChild(svgEl('path', { d: line(span), fill: 'none', stroke: '#ee6f46', 'stroke-width': 2.6, class: 'line' }));
  span.forEach(d => {
    const isC = d.year === 2020;
    svg.appendChild(svgEl('circle', { cx: x(d.year), cy: y(d.count), r: isC ? 6 : 4, fill: isC ? '#ee6f46' : '#d8a64a' }));
    const t = svgEl('text', { x: x(d.year), y: h - 4, 'text-anchor': 'middle', fill: 'rgba(242,243,247,0.55)', 'font-size': 11, 'font-family': 'Inter Tight', 'font-weight': 600 });
    t.textContent = d.year;
    svg.appendChild(t);
    const num = svgEl('text', { x: x(d.year), y: y(d.count) - 10, 'text-anchor': 'middle', fill: isC ? '#ee6f46' : '#d8a64a', 'font-size': isC ? 14 : 11, 'font-family': 'Inter Tight', 'font-weight': 800 });
    num.textContent = fmtNum.format(d.count);
    svg.appendChild(num);
  });
  host.appendChild(svg);
}

/* ── 5. Growth callout — multi-line apps vs registrations ───────────────── */
function mountGrowthCallout(insights) {
  const host = document.getElementById('growth-multiline');
  if (!host) return;
  const apps = insights.yearly_apps;
  const regs = insights.yearly_registrations;
  const w = 680, h = 160, pad = 18;
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', height: '100%' });
  const max = Math.max(d3.max(apps, d => d.count), d3.max(regs, d => d.count));
  const x = d3.scaleLinear().domain(d3.extent(apps, d => d.year)).range([pad, w - pad]);
  const y = d3.scaleLinear().domain([0, max * 1.1]).range([h - pad - 14, pad]);
  const area = d3.area().x(d => x(d.year)).y0(h - pad - 14).y1(d => y(d.count)).curve(d3.curveCatmullRom);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.count)).curve(d3.curveCatmullRom);
  svg.appendChild(svgEl('path', { d: area(apps), fill: 'rgba(216,166,74,0.16)' }));
  svg.appendChild(svgEl('path', { d: line(apps), fill: 'none', stroke: '#d8a64a', 'stroke-width': 2.6 }));
  svg.appendChild(svgEl('path', { d: line(regs), fill: 'none', stroke: '#6e63e0', 'stroke-width': 2.2, 'stroke-dasharray': '5 4' }));
  apps.forEach(d => {
    svg.appendChild(svgEl('circle', { cx: x(d.year), cy: y(d.count), r: 3.5, fill: '#d8a64a' }));
    const t = svgEl('text', { x: x(d.year), y: h - 4, 'text-anchor': 'middle', fill: 'rgba(242,243,247,0.55)', 'font-size': 10, 'font-family': 'Inter Tight', 'font-weight': 600 });
    t.textContent = d.year;
    svg.appendChild(t);
  });
  // legend
  const lg = svgEl('text', { x: pad + 4, y: pad + 4, fill: '#d8a64a', 'font-size': 10, 'font-family': 'Inter Tight', 'font-weight': 700 });
  lg.textContent = '— Өргөдөл';
  svg.appendChild(lg);
  const lg2 = svgEl('text', { x: pad + 80, y: pad + 4, fill: '#6e63e0', 'font-size': 10, 'font-family': 'Inter Tight', 'font-weight': 700 });
  lg2.textContent = '·· Бүртгүүлсэн';
  svg.appendChild(lg2);
  host.appendChild(svg);
}
