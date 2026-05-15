/* ═══════════════════════════════════════════════════════════════════════
   data-loader.js — JSON cache + lazy loader
   - insights.json   : eager load at boot
   - students_geo    : lazy on Mongolia map section visible
   - destinations_geo: lazy on China map / globe arcs section visible
   - geojson         : lazy with map
   ═══════════════════════════════════════════════════════════════════════ */

const CACHE = new Map();
const PENDING = new Map();

async function _fetch(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  if (PENDING.has(url)) return PENDING.get(url);
  const p = fetch(url).then(r => {
    if (!r.ok) throw new Error(`Failed ${url}: ${r.status}`);
    return url.endsWith('.json') || url.endsWith('.geojson') ? r.json() : r.text();
  }).then(d => { CACHE.set(url, d); PENDING.delete(url); return d; });
  PENDING.set(url, p);
  return p;
}

export const loadInsights      = () => _fetch('data/insights.json');
export const loadStudentsGeo   = () => _fetch('data/students_geo.json');
export const loadDestinations  = () => _fetch('data/destinations_geo.json');
export const loadAimagCentroids= () => _fetch('data/aimag_centroids.json');
export const loadMongoliaGeo   = () => _fetch('assets/mongolia_aimags.geojson');
export const loadChinaGeo      = () => _fetch('assets/china_provinces.geojson');
export const loadWorldGeo      = () => _fetch('assets/world-110m.json');

export function cached(url) { return CACHE.get(url); }

/* Format helpers — Mongolian-locale numbers */
const fmtNum = new Intl.NumberFormat('mn-MN');
const fmtPct = (v, d=1) => `${v.toFixed(d)}%`;
const fmtBig = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}сая` : v >= 1e3 ? `${(v/1e3).toFixed(1)}мян` : fmtNum.format(v);

export { fmtNum, fmtPct, fmtBig };

/* Shared tooltip — single DOM node reused everywhere */
let ttEl = null;
export function tooltip() {
  if (ttEl) return ttEl;
  ttEl = document.createElement('div');
  ttEl.className = 'tt';
  document.body.appendChild(ttEl);
  return ttEl;
}
export function showTip(html, x, y) {
  const t = tooltip();
  t.innerHTML = html;
  t.style.left = (x + 14) + 'px';
  t.style.top  = (y - 8)  + 'px';
  t.classList.add('is-on');
}
export function hideTip() {
  if (ttEl) ttEl.classList.remove('is-on');
}
