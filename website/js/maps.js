/* ═══════════════════════════════════════════════════════════════════════
   maps.js — Leaflet газрын зураг (Монгол origin + Хятад destination)
   Хуучин _legacy/main.js-ээс шилжүүлсэн, цэвэр модулиар бичсэн.
   ═══════════════════════════════════════════════════════════════════════ */

import { loadInsights, loadStudentsGeo, loadDestinations,
         loadMongoliaGeo, loadChinaGeo, fmtNum } from './data-loader.js';

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_nomatter/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://carto.com/attribution">CARTO</a> · <a href="https://openstreetmap.org">OSM</a> · <a href="https://www.geoboundaries.org">geoBoundaries</a>';

const PROG_COLORS = { '6+6': '#d8a64a', '1+4': '#6e63e0', 'Fall Bachelor': '#2fae89', 'Master/PhD': '#ee6f46' };
const TIER_COLORS = { 'C9': '#d8a64a', '985': '#6e63e0', '211': '#2fae89', 'Provincial': '#8a90a8' };

let _initMn = false, _initCn = false;

export function mountMaps(insights, { ScrollTrigger }) {
  // Lazy: Mongolia map on first enter, China map on first enter.
  const mnTrigger = document.getElementById('sec-map-mongolia');
  if (mnTrigger) ScrollTrigger.create({
    trigger: mnTrigger, start: 'top 80%', once: true,
    onEnter: () => initMongolia(insights),
  });
  const cnTrigger = document.getElementById('sec-map-china');
  if (cnTrigger) ScrollTrigger.create({
    trigger: cnTrigger, start: 'top 80%', once: true,
    onEnter: () => initChina(insights),
  });
}

function waitForLeaflet() {
  return new Promise(res => {
    if (window.L && window.L.markerClusterGroup) return res();
    const i = setInterval(() => {
      if (window.L && window.L.markerClusterGroup) { clearInterval(i); res(); }
    }, 60);
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   MONGOLIA — aimag choropleth + student dots + filters
   ═══════════════════════════════════════════════════════════════════════ */
async function initMongolia(insights) {
  if (_initMn) return; _initMn = true;
  await waitForLeaflet();
  const L = window.L;
  const [geo, students] = await Promise.all([loadMongoliaGeo(), loadStudentsGeo()]);

  // aimag share lookup
  const share = Object.fromEntries(insights.aimag_share.map(d => [normalize(d.aimag), d.pct]));

  const host = document.getElementById('leaflet-mongolia');
  const map = L.map(host, {
    center: [47.0, 105.0], zoom: 5, minZoom: 4, maxZoom: 9,
    zoomControl: true, scrollWheelZoom: true, attributionControl: true,
    preferCanvas: true, tap: true,
  });
  L.tileLayer(TILE_DARK, { attribution: TILE_ATTR, subdomains: 'abcd' }).addTo(map);

  // colors — sequential gold by share
  const max = Math.max(...Object.values(share));
  const colorFor = (v) => {
    const t = Math.min(1, v / max);
    const a = 0.15 + t * 0.65;
    return `rgba(216, 166, 74, ${a})`;
  };

  const aimagLayer = L.geoJSON(geo, {
    style: feat => {
      const name = pickAimagName(feat.properties);
      const v = share[normalize(name)] || 0;
      return {
        fillColor: colorFor(v),
        fillOpacity: 0.95,
        weight: 1.2, color: 'rgba(216,166,74,0.65)',
        className: 'region-base',
      };
    },
    onEachFeature: (feat, layer) => {
      const name = pickAimagName(feat.properties);
      const v = share[normalize(name)] || 0;
      layer.bindPopup(`<b>${name}</b><br>${v.toFixed(1)}% оюутны эх үүсвэр`);
      layer.on('mouseover', () => layer.setStyle({ weight: 2.4, fillOpacity: 1.0 }));
      layer.on('mouseout',  () => aimagLayer.resetStyle(layer));
    },
  }).addTo(map);

  // student dots (1,500)
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 48,
    chunkedLoading: true,
  });
  function buildMarkers(filterProg, filterHsk) {
    cluster.clearLayers();
    let added = 0;
    students.forEach(s => {
      if (filterProg && filterProg !== 'all' && s.program && s.program !== filterProg) return;
      if (filterHsk !== 'all') {
        const [lo, hi] = filterHsk.split('-').map(Number);
        if (s.hsk < lo || s.hsk > hi) return;
      }
      const color = colorByHsk(s.hsk);
      const m = L.circleMarker([s.lat, s.lon], {
        radius: 4, color: 'rgba(255,255,255,0.7)', weight: 1,
        fillColor: color, fillOpacity: 0.85,
      });
      m.bindPopup(`<b>${s.name}</b><br>${s.aimag}${s.district ? ' · ' + s.district : ''}<br>HSK ${s.hsk} · GPA ${s.gpa} · ${s.school}`);
      cluster.addLayer(m);
      added++;
    });
    map.addLayer(cluster);
  }
  buildMarkers('all','all');

  // filters
  const fp = document.getElementById('mn-filter-program');
  const fh = document.getElementById('mn-filter-hsk');
  fp?.addEventListener('change', () => buildMarkers(fp.value, fh.value));
  fh?.addEventListener('change', () => buildMarkers(fp.value, fh.value));

  // legend (HSK)
  const leg = L.control({ position: 'bottomleft' });
  leg.onAdd = () => {
    const div = L.DomUtil.create('div','lf-legend');
    div.innerHTML = `<div style="font-weight:700;margin-bottom:4px">HSK түвшин</div>`
      + [1,2,3,4,5,6].map(l => `<div class="lg-row"><i class="lg-sw" style="background:${colorByHsk(l)}"></i> HSK ${l}</div>`).join('');
    return div;
  };
  leg.addTo(map);

  // ensure size correct (Leaflet sometimes mis-measures inside hidden parent)
  // Recompute Leaflet size after layout settles + on slide enter via ResizeObserver
  setTimeout(() => map.invalidateSize(), 250);
  setTimeout(() => map.invalidateSize(), 800);
  if (window.ResizeObserver) {
    new ResizeObserver(() => map.invalidateSize()).observe(host);
  }
}

function colorByHsk(h) {
  return ({1:'#8a90a8',2:'#a87d59',3:'#2fae89',4:'#6e63e0',5:'#d8a64a',6:'#ee6f46'})[h] || '#8a90a8';
}

function pickAimagName(props) {
  // geoBoundaries-ийн properties: shapeName | NAME_1 | name
  return props.shapeName || props.NAME_1 || props.NAME || props.name || 'unknown';
}

function normalize(s) {
  if (!s) return '';
  return s.replace(/\s+/g,'').toLowerCase().replace('-уул','уул').replace('ǔ','у');
}

/* ═══════════════════════════════════════════════════════════════════════
   CHINA — province outline + city bubbles + filters + top-10 sidebar
   ═══════════════════════════════════════════════════════════════════════ */
async function initChina(insights) {
  if (_initCn) return; _initCn = true;
  await waitForLeaflet();
  const L = window.L;
  const [geo, dest] = await Promise.all([loadChinaGeo(), loadDestinations()]);

  const host = document.getElementById('leaflet-china');
  const map = L.map(host, {
    center: [33.0, 110.0], zoom: 4, minZoom: 3, maxZoom: 9,
    zoomControl: true, scrollWheelZoom: true, preferCanvas: true, tap: true,
  });
  L.tileLayer(TILE_DARK, { attribution: TILE_ATTR, subdomains: 'abcd' }).addTo(map);

  // province polygons — neutral fill
  L.geoJSON(geo, {
    style: () => ({
      fillColor: 'rgba(110, 99, 224, 0.08)',
      fillOpacity: 0.9,
      weight: 0.8, color: 'rgba(110, 99, 224, 0.35)',
    }),
    onEachFeature: (feat, layer) => {
      const name = pickAimagName(feat.properties);
      layer.on('mouseover', () => layer.setStyle({ weight: 1.6, fillOpacity: 1.0 }));
      layer.on('mouseout',  () => layer.setStyle({ weight: 0.8, fillOpacity: 0.9 }));
      layer.bindPopup(`<b>${name}</b>`);
    },
  }).addTo(map);

  // city bubbles — aggregate by city
  let bubbleLayer = L.layerGroup().addTo(map);
  function build(filterTier, filterYear) {
    bubbleLayer.clearLayers();
    const filtered = dest.filter(d => {
      if (filterTier !== 'all' && d.tier !== filterTier) return false;
      if (filterYear !== 'all' && String(d.apply_year) !== filterYear) return false;
      return true;
    });
    // city groupings (avg lat/lon per city, count)
    const grouped = d3rollup(filtered, v => ({
      count: v.length,
      lat: avg(v, x => x.lat),
      lon: avg(v, x => x.lon),
      universities: [...new Set(v.map(x => x.uni))],
    }), x => x.city);
    const max = Math.max(0, ...[...grouped.values()].map(g => g.count));
    grouped.forEach((g, city) => {
      if (!g.count) return;
      const r = Math.max(4, Math.sqrt(g.count) * 2.2);
      const isBeijing = city === 'Beijing';
      const m = L.circleMarker([g.lat, g.lon], {
        radius: r,
        color: isBeijing ? 'rgba(216,166,74,0.95)' : 'rgba(110, 99, 224, 0.95)',
        weight: 1.4,
        fillColor: isBeijing ? 'rgba(216,166,74,0.7)' : 'rgba(110, 99, 224, 0.6)',
        fillOpacity: 0.75,
      });
      m.bindPopup(`<b>${city}</b><br>${fmtNum.format(g.count)} оюутан · ${g.universities.length} их сургууль<br><span style="opacity:0.7">${g.universities.slice(0, 4).join(', ')}${g.universities.length > 4 ? '...' : ''}</span>`);
      bubbleLayer.addLayer(m);
    });
  }
  build('all','all');

  const ft = document.getElementById('cn-filter-tier');
  const fy = document.getElementById('cn-filter-year');
  ft?.addEventListener('change', () => build(ft.value, fy.value));
  fy?.addEventListener('change', () => build(ft.value, fy.value));

  // legend (tier)
  const leg = L.control({ position: 'bottomleft' });
  leg.onAdd = () => {
    const div = L.DomUtil.create('div','lf-legend');
    div.innerHTML = `<div style="font-weight:700;margin-bottom:4px">Зэрэглэл</div>`
      + Object.entries(TIER_COLORS).map(([k, c]) => `<div class="lg-row"><i class="lg-sw" style="background:${c}"></i> ${k}</div>`).join('');
    return div;
  };
  leg.addTo(map);

  setTimeout(() => map.invalidateSize(), 250);
  setTimeout(() => map.invalidateSize(), 800);
  if (window.ResizeObserver) {
    new ResizeObserver(() => map.invalidateSize()).observe(host);
  }
}

/* tiny utility — d3.rollup polyfill (don't pull d3 just for this) */
function d3rollup(arr, reducer, key) {
  const m = new Map();
  arr.forEach(d => {
    const k = key(d);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(d);
  });
  const out = new Map();
  m.forEach((v, k) => out.set(k, reducer(v)));
  return out;
}
function avg(arr, f) { return arr.reduce((s, x) => s + f(x), 0) / arr.length; }
