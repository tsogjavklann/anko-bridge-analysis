/* ═════════════════════════════════════════════════════════════
   ANKO Bridge — premium scrollytelling main.js (v2)
   Жинхэнэ газрын зураг, 3D глоб, tilt, counter animation.
   ═════════════════════════════════════════════════════════════ */

const COLOR = {
  purple: "#7F77DD",
  purple2: "#A78AFF",
  teal:   "#5DCAA5",
  coral:  "#F0997B",
  yellow: "#F5D67B",
  pink:   "#E07BC7",
  text:   "#ecf0fa",
  muted:  "#9aa3b8",
};

// ═════ English → Mongolian aimag name mapping (geoBoundaries shapeName) ═════
const AIMAG_MN = {
  "Arkhangai": "Архангай",
  "Bayan-Ölgii": "Баян-Өлгий",
  "Bayankhongor": "Баянхонгор",
  "Bulgan": "Булган",
  "Darkhan-Uul": "Дархан-Уул",
  "Dornod": "Дорнод",
  "Dornogovi": "Дорноговь",
  "Dundgovi": "Дундговь",
  "Govi-Altai": "Говь-Алтай",
  "Govisumber": "Говьсүмбэр",
  "Hovsgel": "Хөвсгөл",
  "Khentii": "Хэнтий",
  "Khovd": "Ховд",
  "Orkhon": "Орхон",
  "Selenge": "Сэлэнгэ",
  "Sükhbaatar": "Сүхбаатар",
  "Töv": "Төв",
  "Ulaanbaatar": "Улаанбаатар",
  "Uvs": "Увс",
  "Zavkhan": "Завхан",
  "Ömnögovi": "Өмнөговь",
  "Övörkhangai": "Өвөрхангай",
};

// ═════ Chinese university → city coordinates (lat, lon) ═════
const CITY_COORDS = {
  "Beijing":     [39.90, 116.40],
  "Shanghai":    [31.23, 121.47],
  "Hangzhou":    [30.27, 120.15],
  "Hefei":       [31.82, 117.23],
  "Nanjing":     [32.06, 118.80],
  "Harbin":      [45.80, 126.53],
  "Xi'an":       [34.34, 108.94],
  "Wuhan":       [30.59, 114.31],
  "Guangzhou":   [23.13, 113.27],
  "Chengdu":     [30.67, 104.07],
  "Changchun":   [43.82, 125.32],
  "Tianjin":     [39.08, 117.20],
  "Jinan":       [36.65, 117.00],
  "Xiamen":      [24.48, 118.09],
  "Changsha":    [28.23, 112.94],
  "Hohhot":      [40.84, 111.74],
  "Tongliao":    [43.65, 122.27],
  "Lanzhou":     [36.06, 103.83],
  "Yanji":       [42.91, 129.51],
  "Dalian":      [38.91, 121.61],
  "Shenyang":    [41.81, 123.43],
  "Baoding":     [38.87, 115.48],
};

// ═════ Program type → color ═════
const PROGRAM_COLOR = {
  "6+6":           "#7F77DD",
  "1+4":           "#5DCAA5",
  "Fall Bachelor": "#F0997B",
  "Master/PhD":    "#F5D67B",
};

// Display label for program type (Mongolian). Internal keys stay as raw data values.
const PROGRAM_LABEL_MN = {
  "6+6":           "6+6",
  "1+4":           "1+4",
  "Fall Bachelor": "Fall Bachelor",
  "Master/PhD":    "Магистр / Доктор",
};
const progLabel = (k) => PROGRAM_LABEL_MN[k] || k;

// ═════ State ═════
let INSIGHTS = null;
let MN_GEO = null;
let CN_GEO = null;
let WORLD = null;
let STUDENTS_GEO = null;
let DESTINATIONS_GEO = null;
let LEAFLET_MAP = null;
let LEAFLET_CLUSTER = null;
let LEAFLET_ALL_MARKERS = [];
let MAP_FILTERS = { program: "all", hsk: "all", school: "all" };
let CN_LEAFLET_MAP = null;
let CN_LEAFLET_CLUSTER = null;
let CN_ALL_MARKERS = [];
let CN_FILTERS = { program: "all", tier: "all", year: "all" };
let TIMELINE_STATE = 1;

// ═════ Fix ring winding for geoBoundaries data (it's reversed from GeoJSON spec) ═════
function rewindGeoJSON(geojson) {
  for (const f of geojson.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      f.geometry.coordinates.forEach(ring => ring.reverse());
    } else if (f.geometry.type === "MultiPolygon") {
      f.geometry.coordinates.forEach(poly => poly.forEach(ring => ring.reverse()));
    }
  }
  return geojson;
}

// ═════ Bootstrap ═════
const _cacheBust = "?_=" + Date.now();
Promise.all([
  fetch("data/insights.json" + _cacheBust).then(r => r.json()),
  fetch("assets/mongolia_aimags.geojson").then(r => r.json()),
  fetch("assets/china_provinces.geojson").then(r => r.json()),
  fetch("assets/world-110m.json").then(r => r.json()),
  fetch("data/students_geo.json").then(r => r.json()),
  fetch("data/destinations_geo.json").then(r => r.json()),
]).then(([insights, mn, cn, world, sgeo, dgeo]) => {
  INSIGHTS = insights;
  MN_GEO = rewindGeoJSON(mn);
  CN_GEO = rewindGeoJSON(cn);
  WORLD = world;
  STUDENTS_GEO = sgeo;
  DESTINATIONS_GEO = dgeo;
  // Expose to window so agency.js loader can detect readiness
  window.INSIGHTS = INSIGHTS;
  window.STUDENTS_GEO = STUDENTS_GEO;
  window.DESTINATIONS_GEO = DESTINATIONS_GEO;
  window.MN_GEO = MN_GEO;
  window.CN_GEO = CN_GEO;
  try {
    initEverything();
  } catch (err) {
    // Render-ийн алдаа: файл ачаалагдсан, гэхдээ chart render-ийн дунд унасан.
    // Бусад chart, scroll, BI render-ийг хаахгүйгээр console-д л үлдээнэ.
    console.error("[render] алдаа:", err);
  }
}).catch(err => {
  console.error("Файл ачаалахад алдаа гарлаа", err);
  document.body.insertAdjacentHTML("afterbegin",
    `<div style="padding:20px;background:#3a1a1a;color:#fff;text-align:center;">
     Шаардлагатай файл (insights.json эсвэл geojson) ачааллагдсангүй.
     Эхлээд <code>python src/insights.py</code>-г ажиллуулж, дараа нь
     <code>python -m http.server</code>-ээр serve хийнэ үү (file:// биш).
     </div>`);
});

function initEverything() {
  const safe = (name, fn, ...args) => {
    try { fn(...args); }
    catch (e) { console.error(`[${name}] алдаа:`, e); }
  };
  safe("initTheme", initTheme);
  safe("initScrollProgress", initScrollProgress);
  safe("initSectionNav", initSectionNav);
  safe("initSvgDefs", initSvgDefs);
  safe("renderTimeline", renderTimeline, 1);
  safe("renderChinaLeaflet", renderChinaLeaflet);
  safe("initChinaFilters", initChinaFilters);
  safe("renderChinaList", renderChinaList);
  safe("renderMongoliaLeaflet", renderMongoliaLeaflet);
  safe("initMapFilters", initMapFilters);
  safe("renderUBDistricts", renderUBDistricts);
  safe("renderHSKArea", renderHSKArea);
  safe("renderProgramCards", renderProgramCards);
  safe("renderProgramEvolution", renderProgramEvolution);
  safe("renderFieldLines", renderFieldLines);
  safe("renderPersonas", renderPersonas);
  safe("initPredictor", initPredictor);
  safe("renderBarChartRace", renderBarChartRace);
  safe("renderPersonaRadar", renderPersonaRadar);
  safe("renderSankey", renderSankey);
  safe("renderBusinessIntelligence", renderBusinessIntelligence);
  if (typeof window.initAdvancedCharts === "function") {
    safe("initAdvancedCharts", window.initAdvancedCharts);
  }
  safe("fillKPIs", fillKPIs);
  safe("initHeroCounter", initHeroCounter);
  safe("initCursorGlow", initCursorGlow);
  safe("initRevealOnScroll", initRevealOnScroll);
  safe("initCardTilt", initCardTilt);
  safe("setupScrollama", setupScrollama);
}

function initHeroCounter() {
  const el = document.getElementById("hero-num");
  if (!el) return;
  const target = +el.dataset.target;
  setTimeout(() => animateNumber(el, target, { duration: 2200 }), 400);
}

function initCursorGlow() {
  const el = document.getElementById("cursorGlow");
  if (!el) return;
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let tx = x, ty = y;
  window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  window.addEventListener("mouseout", () => el.style.opacity = 0);
  window.addEventListener("mouseover", () => el.style.opacity = 1);
  function tick() {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();
}

// ═════ SVG defs (gradients, filters) — used by all charts ═════
function initSvgDefs() {
  const defs = d3.select("body").append("svg")
    .attr("width", 0).attr("height", 0)
    .style("position", "absolute")
    .style("opacity", 0)
    .append("defs");

  const grads = [
    ["grad-purple", COLOR.purple, COLOR.purple2],
    ["grad-teal",   COLOR.teal,   "#7FE0BA"],
    ["grad-coral",  COLOR.coral,  "#FFB89A"],
    ["grad-yellow", COLOR.yellow, "#F0BC5B"],
    ["grad-pink",   COLOR.pink,   "#C961AC"],
  ];
  for (const [id, c1, c2] of grads) {
    const g = defs.append("linearGradient").attr("id", id)
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    g.append("stop").attr("offset", "0%").attr("stop-color", c2);
    g.append("stop").attr("offset", "100%").attr("stop-color", c1);
  }

  // Glow filter
  const glow = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");
}

// ═════ Theme + scroll progress + section nav ═════
function initTheme() {
  const btn = document.querySelector(".theme-toggle");
  btn?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });
}

function initScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;
  const update = () => {
    const sc = document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (sc / h * 100).toFixed(2) + "%";
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function initSectionNav() {
  const buttons = document.querySelectorAll(".section-nav button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      const sec = document.getElementById(`sec-${target}`);
      sec?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Update active dot on scroll
  const sections = Array.from(document.querySelectorAll("section[id^='sec-']"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace("sec-", "");
        buttons.forEach(b => b.classList.toggle("active", b.dataset.target === id));
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => observer.observe(s));
}

// ═════ Reveal on scroll ═════
function initRevealOnScroll() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18 });
  els.forEach(el => io.observe(el));
}

// ═════ 3D Card tilt ═════
function initCardTilt() {
  const cards = document.querySelectorAll(".program-card, .persona-card, .kpi");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = -y * 8;
      const ry = x * 10;
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// ═════ Number counter animation ═════
function animateNumber(el, target, opts = {}) {
  const dur = opts.duration ?? 1400;
  const decimals = opts.decimals ?? 0;
  const suffix = opts.suffix ?? "";
  const prefix = opts.prefix ?? "";
  const start = performance.now();
  const fmt = (n) => prefix + n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + suffix;
  function tick(t) {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(tick);
}

// ═════════════════════════════════════════════════════════════
// 1. Hero — 3D rotating globe with Mongolia → China arcs
// ═════════════════════════════════════════════════════════════
function drawGlobe() {
  const svg = d3.select("#globe");
  if (!svg.node()) return;
  const W = svg.node().clientWidth || window.innerWidth;
  const H = svg.node().clientHeight || window.innerHeight;
  svg.attr("viewBox", `0 0 ${W} ${H}`)
     .attr("preserveAspectRatio", "xMidYMid meet");
  svg.selectAll("*").remove();

  const radius = Math.min(W, H) * 0.32;
  const projection = d3.geoOrthographic()
    .scale(radius)
    .translate([W / 2, H / 2])
    .rotate([-105, -38, 0])
    .clipAngle(90);

  const path = d3.geoPath(projection);
  const countries = topojson.feature(WORLD, WORLD.objects.countries).features;

  // Defs — gradient for ocean
  const defs = svg.append("defs");
  const oceanGrad = defs.append("radialGradient").attr("id", "ocean-grad");
  oceanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#1a2138").attr("stop-opacity", 0.9);
  oceanGrad.append("stop").attr("offset", "70%").attr("stop-color", "#11172a").attr("stop-opacity", 0.6);
  oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#07090f").attr("stop-opacity", 0);

  // Sphere (ocean)
  svg.append("circle")
    .attr("cx", W / 2).attr("cy", H / 2).attr("r", radius)
    .attr("fill", "url(#ocean-grad)")
    .attr("stroke", "rgba(127, 119, 221, 0.3)")
    .attr("stroke-width", 1);

  // Graticule (latitude/longitude lines)
  const graticule = d3.geoGraticule10();
  const graticulePath = svg.append("path")
    .attr("class", "graticule")
    .attr("d", path(graticule))
    .attr("fill", "none")
    .attr("stroke", "rgba(127, 119, 221, 0.12)")
    .attr("stroke-width", 0.5);

  // Countries
  const countryPaths = svg.selectAll(".country")
    .data(countries)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.name;
      if (name === "Mongolia") return "rgba(127, 119, 221, 0.6)";
      if (name === "China")    return "rgba(127, 119, 221, 0.25)";
      return "rgba(35, 44, 74, 0.55)";
    })
    .attr("stroke", "rgba(127, 119, 221, 0.25)")
    .attr("stroke-width", 0.4);

  // Arc connections — UB → top destinations
  const UB = [106.92, 47.92];  // Ulaanbaatar lon/lat
  const destinations = [
    { name: "Beijing",  lonlat: [116.40, 39.90], color: COLOR.purple2 },
    { name: "Shanghai", lonlat: [121.47, 31.23], color: COLOR.teal },
    { name: "Hohhot",   lonlat: [111.74, 40.84], color: COLOR.coral },
    { name: "Hangzhou", lonlat: [120.15, 30.27], color: COLOR.yellow },
    { name: "Harbin",   lonlat: [126.53, 45.80], color: COLOR.pink },
    { name: "Wuhan",    lonlat: [114.31, 30.59], color: COLOR.purple },
  ];

  // Helper: visible only on the front hemisphere
  const isVisible = (lonlat) => {
    const center = projection.invert([W / 2, H / 2]);
    return d3.geoDistance(lonlat, center) < Math.PI / 2;
  };

  // City dots
  svg.selectAll(".dest-dot")
    .data(destinations).join("circle")
    .attr("class", "dest-dot")
    .attr("cx", d => projection(d.lonlat)[0])
    .attr("cy", d => projection(d.lonlat)[1])
    .attr("r", 4)
    .attr("fill", d => d.color)
    .attr("filter", "url(#glow)")
    .attr("opacity", d => isVisible(d.lonlat) ? 1 : 0);

  // UB dot
  svg.append("circle")
    .attr("class", "ub-dot")
    .attr("cx", projection(UB)[0])
    .attr("cy", projection(UB)[1])
    .attr("r", 6)
    .attr("fill", COLOR.coral)
    .attr("filter", "url(#glow)")
    .attr("opacity", isVisible(UB) ? 1 : 0);

  // Animated arcs
  const arcGen = d3.geoPath(projection);
  destinations.forEach((d, i) => {
    const great = { type: "LineString", coordinates: [UB, d.lonlat] };
    const totalLen = 800;
    svg.append("path")
      .datum(great)
      .attr("class", "arc-path")
      .attr("d", arcGen)
      .attr("fill", "none")
      .attr("stroke", d.color)
      .attr("stroke-width", 1.4)
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", `${totalLen} ${totalLen}`)
      .attr("stroke-dashoffset", totalLen)
      .attr("opacity", 0.85)
      .transition().delay(900 + i * 250).duration(1400).ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);
  });

  // Auto-rotation
  let rotating = true;
  let lon = -105;
  function rotate() {
    if (!rotating) return;
    lon -= 0.12;
    projection.rotate([lon, -38, 0]);
    countryPaths.attr("d", path);
    svg.selectAll(".dest-dot")
      .attr("cx", d => projection(d.lonlat)[0])
      .attr("cy", d => projection(d.lonlat)[1])
      .attr("opacity", d => isVisible(d.lonlat) ? 1 : 0);
    svg.select(".ub-dot")
      .attr("cx", projection(UB)[0])
      .attr("cy", projection(UB)[1])
      .attr("opacity", isVisible(UB) ? 1 : 0);
    graticulePath.attr("d", path(graticule));
    svg.selectAll(".arc-path").attr("d", arcGen);
    requestAnimationFrame(rotate);
  }
  rotate();

  // Pause on hover
  svg.on("mouseenter", () => rotating = false)
     .on("mouseleave", () => { rotating = true; rotate(); });
}

// ═════════════════════════════════════════════════════════════
// 2. Timeline (Sections 2-4) — premium stacked area + milestones + scrubber
// ═════════════════════════════════════════════════════════════
function renderTimeline(activeStep) {
  const mount = document.getElementById("chart-timeline");
  if (!mount) return;

  const yearly = INSIGHTS.yearly_apps;          // [{year, count}]
  const progByYear = INSIGHTS.program_share_by_year || {};  // {year: {type: pct}}
  const types = ["6+6", "1+4", "Fall Bachelor", "Master/PhD"];

  // Build series: for each year, count broken down by program type
  const data = yearly.map(d => {
    const row = { year: d.year, total: d.count };
    const shares = progByYear[String(d.year)] || {};
    types.forEach(t => row[t] = Math.round((shares[t] || 0) / 100 * d.count));
    // patch up rounding so sum equals total
    let s = types.reduce((a, t) => a + row[t], 0);
    if (s !== d.count && row["6+6"] != null) row["6+6"] += (d.count - s);
    return row;
  });

  const W = Math.max(mount.clientWidth, 480);
  const H = 460;
  const margin = { top: 38, right: 36, bottom: 56, left: 56 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("font-family", "var(--sans)");

  // ═══ Defs: stacked-area gradient fills + glow + line gradient ═══
  const defs = svg.append("defs");
  const gradStops = {
    "6+6":           ["#7F77DD", "#5d56a8"],
    "1+4":           ["#5DCAA5", "#3d9275"],
    "Fall Bachelor": ["#F0997B", "#C66B4F"],
    "Master/PhD":    ["#F5D67B", "#C9A648"],
  };
  for (const [t, [c1, c2]] of Object.entries(gradStops)) {
    const id = "grad-area-" + t.replace(/[^a-z0-9]/gi, "");
    const lg = defs.append("linearGradient").attr("id", id)
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    lg.append("stop").attr("offset", "0%").attr("stop-color", c1).attr("stop-opacity", 0.92);
    lg.append("stop").attr("offset", "100%").attr("stop-color", c2).attr("stop-opacity", 0.55);
  }
  // Total line gradient
  const lineGrad = defs.append("linearGradient").attr("id", "grad-total-line")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  lineGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.8);
  lineGrad.append("stop").attr("offset", "70%").attr("stop-color", "#A78AFF").attr("stop-opacity", 0.95);
  lineGrad.append("stop").attr("offset", "100%").attr("stop-color", "#5DCAA5").attr("stop-opacity", 1);
  // Glow filter
  const glow = defs.append("filter").attr("id", "tl-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // ═══ Scales ═══
  const years = data.map(d => d.year);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const yMax = d3.max(data, d => d.total) * 1.15;
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

  // ═══ Grid + axes ═══
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""));
  g.append("g").attr("class", "axis-x")
    .attr("transform", `translate(0, ${innerH})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")).tickSize(0))
    .call(sel => sel.selectAll("text").attr("dy", "1.5em").attr("font-size", 12).attr("fill", "var(--text-muted)"))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class", "axis-y")
    .call(d3.axisLeft(y).ticks(6).tickSize(0))
    .call(sel => sel.selectAll("text").attr("dx", "-0.5em").attr("font-size", 11).attr("fill", "var(--text-muted)"))
    .call(sel => sel.select(".domain").remove());

  // ═══ Stacked area ═══
  const stack = d3.stack().keys(types).order(d3.stackOrderNone);
  const series = stack(data);
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.55));

  // Determine reveal mask width based on activeStep
  const lastYearByStep = { 1: 2019, 2: 2022, 3: 2025 };
  const revealUntilYear = lastYearByStep[activeStep] ?? 2025;
  const revealW = x(revealUntilYear) + (revealUntilYear === 2025 ? 30 : 0);

  // Clip-path that grows left → right based on step
  const clipId = "tl-reveal-clip";
  defs.append("clipPath").attr("id", clipId)
    .append("rect").attr("class", "reveal-rect")
    .attr("x", 0).attr("y", -10)
    .attr("width", 0).attr("height", innerH + 20);

  // Animate reveal width
  svg.select("#" + clipId).select("rect")
    .transition().duration(1100).ease(d3.easeCubicInOut)
    .attr("width", revealW);

  // Areas
  g.selectAll("path.tl-area")
    .data(series).enter()
    .append("path")
    .attr("class", "tl-area")
    .attr("clip-path", `url(#${clipId})`)
    .attr("fill", d => `url(#grad-area-${d.key.replace(/[^a-z0-9]/gi, "")})`)
    .attr("d", area)
    .attr("stroke", d => gradStops[d.key][0])
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 0.8);

  // ═══ Total line on top with glow ═══
  const lineGen = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.total))
    .curve(d3.curveCatmullRom.alpha(0.55));

  // Glow underlay
  g.append("path").datum(data)
    .attr("class", "tl-line-glow")
    .attr("clip-path", `url(#${clipId})`)
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("stroke-opacity", 0.18)
    .attr("stroke-width", 7)
    .attr("filter", "url(#tl-glow)")
    .attr("d", lineGen);
  // Main line
  g.append("path").datum(data)
    .attr("class", "tl-line")
    .attr("clip-path", `url(#${clipId})`)
    .attr("fill", "none")
    .attr("stroke", "url(#grad-total-line)")
    .attr("stroke-width", 2.4)
    .attr("stroke-linejoin", "round")
    .attr("d", lineGen);

  // Total dots with pulse on peak
  const dots = g.append("g").attr("clip-path", `url(#${clipId})`);
  dots.selectAll("circle")
    .data(data).enter()
    .append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.total))
    .attr("r", d => d.year === 2025 ? 6 : 3.5)
    .attr("fill", d => d.year === 2020 ? "#F0997B" : (d.year === 2025 ? "#5DCAA5" : "#fff"))
    .attr("stroke", "rgba(255,255,255,0.5)")
    .attr("stroke-width", 1.2)
    .attr("filter", "url(#tl-glow)");

  // Peak pulse ring
  const peak = data.find(d => d.year === 2025);
  if (peak) {
    g.append("circle")
      .attr("class", "tl-peak-pulse")
      .attr("clip-path", `url(#${clipId})`)
      .attr("cx", x(peak.year)).attr("cy", y(peak.total))
      .attr("r", 6).attr("fill", "none")
      .attr("stroke", "#5DCAA5").attr("stroke-width", 2)
      .style("transform-origin", `${x(peak.year)}px ${y(peak.total)}px`)
      .style("animation", "pulse-ring 2s cubic-bezier(0,0,0.2,1) infinite");
  }

  // ═══ Year value labels — anchored properly to avoid clipping ═══
  const lastYr = data[data.length - 1].year;
  g.selectAll("text.tl-yval")
    .data(data).enter()
    .append("text")
    .attr("class", "tl-yval")
    .attr("clip-path", `url(#${clipId})`)
    .attr("x", d => x(d.year) + (d.year === years[0] ? 6 : (d.year === lastYr ? -6 : 0)))
    .attr("y", d => y(d.total) - 14)
    .attr("text-anchor", d => d.year === years[0] ? "start" : (d.year === lastYr ? "end" : "middle"))
    .attr("font-family", "var(--serif)")
    .attr("font-weight", 700)
    .attr("font-size", d => d.year === 2025 ? 18 : 13)
    .attr("fill", d => d.year === 2025 ? "#5DCAA5" : (d.year === 2020 ? "#F0997B" : "#fff"))
    .text(d => d.total);

  // ═══ Milestone vertical lines + labels ═══
  const milestones = [
    { year: 2019, label: "ANKO Bridge байгуулагдав", color: "#A78AFF", yPct: 0.18, anchor: "start", dx: 8 },
    { year: 2020, label: "COVID — хил хаагдав",      color: "#F0997B", yPct: 0.55, anchor: "middle", dx: 0 },
    { year: 2023, label: "Хил нээгдэв",              color: "#5DCAA5", yPct: 0.30, anchor: "middle", dx: 0 },
    { year: 2025, label: "Peak ✦",                   color: "#5DCAA5", yPct: 0.05, anchor: "end",  dx: -8 },
  ];
  const mGroup = g.append("g").attr("class", "tl-milestones").attr("clip-path", `url(#${clipId})`);
  milestones.forEach(m => {
    const mx = x(m.year);
    mGroup.append("line")
      .attr("x1", mx).attr("x2", mx)
      .attr("y1", y(0)).attr("y2", innerH * m.yPct)
      .attr("stroke", m.color).attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 4").attr("opacity", 0.5);
    const lab = mGroup.append("g")
      .attr("transform", `translate(${mx + m.dx}, ${innerH * m.yPct - 8})`);
    const text = lab.append("text")
      .attr("text-anchor", m.anchor)
      .attr("font-size", 10.5).attr("font-weight", 700)
      .attr("fill", m.color)
      .text(m.label);
    // Background pill
    const bbox = text.node().getBBox();
    lab.insert("rect", "text")
      .attr("x", bbox.x - 6).attr("y", bbox.y - 3)
      .attr("width", bbox.width + 12).attr("height", bbox.height + 6)
      .attr("rx", 10).attr("ry", 10)
      .attr("fill", "rgba(7, 9, 15, 0.88)")
      .attr("stroke", m.color).attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1);
  });

  // ═══ Title + legend ═══
  svg.append("text")
    .attr("x", margin.left).attr("y", 18)
    .attr("font-size", 11.5)
    .attr("font-weight", 600)
    .attr("fill", "var(--text-muted)")
    .attr("letter-spacing", "0.1em")
    .text("ӨРГӨДЛИЙН ДИНАМИК — ХӨТӨЛБӨРӨӨР");

  const legendG = svg.append("g").attr("transform", `translate(${margin.left}, 30)`);
  let lx = 0;
  types.forEach((t, i) => {
    const item = legendG.append("g").attr("transform", `translate(${lx}, 0)`);
    item.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2)
      .attr("fill", gradStops[t][0]);
    item.append("text").attr("x", 14).attr("y", 9).attr("font-size", 10).attr("fill", "var(--text)")
      .text(t);
    lx += 12 + t.length * 6.5 + 14;
  });

  // ═══ Hover scrubber ═══
  const scrub = g.append("g").attr("class", "tl-scrub").style("display", "none");
  scrub.append("line").attr("class", "scrub-line")
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "rgba(255,255,255,0.4)").attr("stroke-width", 1).attr("stroke-dasharray", "3 3");
  const scrubDot = scrub.append("circle").attr("r", 6)
    .attr("fill", "#A78AFF").attr("stroke", "#fff").attr("stroke-width", 2);

  const tooltip = d3.select(mount).append("div").attr("class", "tooltip");

  // Overlay rect for mouse capture
  g.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mouseenter", () => scrub.style("display", null))
    .on("mouseleave", () => { scrub.style("display", "none"); tooltip.classed("visible", false); })
    .on("mousemove", function(event) {
      const [mx] = d3.pointer(event);
      // snap to nearest year
      const yr = Math.round(x.invert(mx));
      const d = data.find(r => r.year === yr);
      if (!d) return;
      const px = x(yr), py = y(d.total);
      scrub.select(".scrub-line").attr("x1", px).attr("x2", px);
      scrubDot.attr("cx", px).attr("cy", py);
      // Tooltip
      const [tx, ty] = d3.pointer(event, mount);
      const breakdown = types.map(t => `<div style="display:flex;justify-content:space-between;gap:14px;"><span style="color:${gradStops[t][0]};">${progLabel(t)}</span><strong>${d[t]}</strong></div>`).join("");
      tooltip.html(`
        <div style="font-size:0.95rem;font-weight:700;margin-bottom:6px;">${yr} он</div>
        <div style="font-size:1.4rem;font-family:var(--serif);font-weight:700;color:#A78AFF;line-height:1;margin-bottom:8px;">${d.total.toLocaleString()}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${breakdown}</div>
      `).style("left", (tx + 18) + "px")
        .style("top", (ty - 30) + "px")
        .classed("visible", true);
    });
}

// ═════════════════════════════════════════════════════════════
// 3. Mongolia — Leaflet zoomable map with 1,500 student dots
// ═════════════════════════════════════════════════════════════
function renderMongoliaLeaflet() {
  const mountEl = document.getElementById("leaflet-mongolia");
  if (!mountEl || !window.L || !STUDENTS_GEO) return;

  // Initialize Leaflet centered on Mongolia
  const map = L.map(mountEl, {
    center: [46.86, 103.84],
    zoom: 5,
    minZoom: 4,
    maxZoom: 14,
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,  // canvas renderer = much faster for 1500 markers
  });
  LEAFLET_MAP = map;

  // ═══ Dark tile layer — CartoDB Dark Matter (no API key needed) ═══
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
    detectRetina: true,
  }).addTo(map);

  // ═══ Aimag boundaries overlay ═══
  L.geoJSON(MN_GEO, {
    style: {
      color: "#7F77DD",
      weight: 0.8,
      fillColor: "#7F77DD",
      fillOpacity: 0.04,
      opacity: 0.55,
    },
    onEachFeature: (feat, layer) => {
      const en = feat.properties.shapeName;
      const mn = AIMAG_MN[en] || en;
      layer.bindTooltip(mn, { sticky: true, direction: "center", className: "aimag-hover-tooltip" });
      layer.on("mouseover", function() { this.setStyle({ weight: 2, fillOpacity: 0.12 }); });
      layer.on("mouseout",  function() { this.setStyle({ weight: 0.8, fillOpacity: 0.04 }); });
    },
  }).addTo(map);

  // ═══ Build student markers (CircleMarker — fast canvas renders) ═══
  const cluster = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 50,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: (cluster) => {
      const n = cluster.getChildCount();
      let cls = "marker-cluster marker-cluster-";
      if (n < 10) cls += "small";
      else if (n < 100) cls += "medium";
      else cls += "large";
      return L.divIcon({
        html: `<div><span>${n}</span></div>`,
        className: cls,
        iconSize: L.point(40, 40),
      });
    },
  });
  LEAFLET_CLUSTER = cluster;

  // Apply program colors when sampling — also store on marker
  LEAFLET_ALL_MARKERS = STUDENTS_GEO.map(s => {
    // assign a program type per student via deterministic hash on id (fake mapping for demo)
    // We don't have anko_program_type per student in students_geo; sample from HSK band
    const prog = inferProgramType(s);
    const color = PROGRAM_COLOR[prog] || "#7F77DD";
    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 4,
      color: "#fff",
      weight: 0.6,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.85,
    });
    marker._student = s;
    marker._program = prog;
    marker.bindPopup(buildStudentPopup(s, prog), { maxWidth: 260, className: "student-popup" });
    marker.on("mouseover", function() { this.setStyle({ radius: 7, fillOpacity: 1 }); });
    marker.on("mouseout",  function() { this.setStyle({ radius: 4, fillOpacity: 0.85 }); });
    return marker;
  });

  // Add all markers initially
  cluster.addLayers(LEAFLET_ALL_MARKERS);
  map.addLayer(cluster);
  updateMapVisibleCount(LEAFLET_ALL_MARKERS.length);

  // Expose for debugging / external control
  window.__map = map;
  window.__cluster = cluster;

  // ═══ Update UB callout + senior share (re-used from old code) ═══
  if (INSIGHTS.ub_share) {
    const el = document.getElementById("ub-share-num");
    if (el) animateNumber(el, INSIGHTS.ub_share.share, { decimals: 1, suffix: "%" });
  }
  if (INSIGHTS.high_school_seniors) {
    const el = document.getElementById("senior-share");
    if (el) el.textContent = INSIGHTS.high_school_seniors.share + "%";
  }
}

// Heuristic program-type inference (since students_geo lacks anko_program_type).
// Match the data generator's logic approximately.
function inferProgramType(s) {
  // Bachelor admission gate: HSK 4+ AND score 120+
  const elig_bachelor = s.hsk >= 4 && s.hsk_score >= 120;
  // 23+ → Master/PhD
  if (s.age >= 23) return "Master/PhD";
  if (elig_bachelor && s.hsk >= 5 && s.gpa >= 85) return "Fall Bachelor";
  if (s.hsk >= 4) return "1+4";
  return "6+6";
}

function buildStudentPopup(s, prog) {
  const district = s.district ? `, ${s.district}` : "";
  return `
    <div style="line-height:1.5;">
      <div style="font-family:'Crimson Pro',serif;font-size:1.1rem;font-weight:600;margin-bottom:6px;">
        ${s.name}
      </div>
      <div style="color:var(--text-muted);font-size:0.82rem;margin-bottom:10px;">
        ${s.aimag}${district} · ${s.gender === "M" ? "Эр" : "Эм"} · ${s.age} нас
      </div>
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 16px;font-size:0.85rem;">
        <span style="color:var(--text-muted);">Сургуулийн төрөл</span><span><strong>${s.school}</strong></span>
        <span style="color:var(--text-muted);">GPA</span><span><strong>${s.gpa}%</strong></span>
        <span style="color:var(--text-muted);">HSK</span><span><strong>${s.hsk} (${s.hsk_score} оноо)</strong></span>
        <span style="color:var(--text-muted);">Хөтөлбөр</span><span><strong style="color:${PROGRAM_COLOR[prog]};">${prog}</strong></span>
      </div>
    </div>
  `;
}

function updateMapVisibleCount(n) {
  const el = document.getElementById("map-visible-count");
  if (el) el.textContent = n.toLocaleString("en-US");
}

// ═════ Map filters (chips) ═════
function initMapFilters() {
  for (const groupId of ["filter-program", "filter-hsk", "filter-school"]) {
    const group = document.getElementById(groupId);
    if (!group) continue;
    group.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const filterKey = groupId.replace("filter-", "");
        MAP_FILTERS[filterKey] = chip.dataset.value;
        applyMapFilters();
      });
    });
  }
}

function applyMapFilters() {
  if (!LEAFLET_CLUSTER) return;
  const { program, hsk, school } = MAP_FILTERS;
  const visible = LEAFLET_ALL_MARKERS.filter(m => {
    const s = m._student;
    if (program !== "all" && m._program !== program) return false;
    if (school !== "all" && s.school !== school) return false;
    if (hsk !== "all") {
      const [lo, hi] = hsk.split("-").map(Number);
      if (s.hsk < lo || s.hsk > hi) return false;
    }
    return true;
  });
  LEAFLET_CLUSTER.clearLayers();
  LEAFLET_CLUSTER.addLayers(visible);
  updateMapVisibleCount(visible.length);
}

// ═════════════════════════════════════════════════════════════
// 4. China — Leaflet zoomable map with destination dots
// ═════════════════════════════════════════════════════════════
function renderChinaLeaflet() {
  const mountEl = document.getElementById("leaflet-china");
  if (!mountEl || !window.L || !DESTINATIONS_GEO) return;

  const map = L.map(mountEl, {
    center: [35.5, 110.0],
    zoom: 4,
    minZoom: 3,
    maxZoom: 14,
    zoomControl: true,
    preferCanvas: true,
  });
  CN_LEAFLET_MAP = map;
  window.__cnMap = map;

  // Dark CartoDB base
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
    detectRetina: true,
  }).addTo(map);

  // China province overlay — Inner Mongolia highlighted
  const cnFeatures = CN_GEO.features.filter(f => {
    const n = f.properties.shapeName;
    return !["Hong Kong Special Administrative Region", "Macau Special Administrative Region"].includes(n);
  });
  L.geoJSON({ type: "FeatureCollection", features: cnFeatures }, {
    style: feat => {
      const isIM = feat.properties.shapeName.includes("Inner Mongolia");
      return {
        color: isIM ? "#A78AFF" : "#7F77DD",
        weight: isIM ? 1.6 : 0.6,
        fillColor: isIM ? "#7F77DD" : "#7F77DD",
        fillOpacity: isIM ? 0.18 : 0.04,
        opacity: 0.55,
      };
    },
    onEachFeature: (feat, layer) => {
      const name = feat.properties.shapeName.replace(" Province", "")
        .replace(" Municipality", "").replace(" Autonomous Region", "")
        .replace(" Hui Autonomous Region", "").replace(" Zhuang Autonomous Region", "")
        .replace(" Uyghur Autonomous Region", "").replace(" Special Administrative Region", "");
      const isIM = feat.properties.shapeName.includes("Inner Mongolia");
      layer.bindTooltip(isIM ? "Өвөрмонгол" : name, { sticky: true, className: "aimag-hover-tooltip" });
    },
  }).addTo(map);

  // Marker cluster
  const cluster = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 50,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: (cl) => {
      const n = cl.getChildCount();
      let cls = "marker-cluster marker-cluster-";
      if (n < 10) cls += "small";
      else if (n < 100) cls += "medium";
      else cls += "large";
      return L.divIcon({ html: `<div><span>${n}</span></div>`, className: cls, iconSize: L.point(40, 40) });
    },
  });
  CN_LEAFLET_CLUSTER = cluster;

  CN_ALL_MARKERS = DESTINATIONS_GEO.map(d => {
    const color = PROGRAM_COLOR[d.program] || "#7F77DD";
    const marker = L.circleMarker([d.lat, d.lon], {
      radius: 4,
      color: "#fff",
      weight: 0.6,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.85,
    });
    marker._dest = d;
    marker.bindPopup(buildDestPopup(d), { maxWidth: 280, className: "student-popup" });
    marker.on("mouseover", function() { this.setStyle({ radius: 7, fillOpacity: 1 }); });
    marker.on("mouseout",  function() { this.setStyle({ radius: 4, fillOpacity: 0.85 }); });
    return marker;
  });

  cluster.addLayers(CN_ALL_MARKERS);
  map.addLayer(cluster);
  updateCnVisibleCount(CN_ALL_MARKERS.length);
}

function buildDestPopup(d) {
  const tierColor = { "C9": "#A78AFF", "985": "#7F77DD", "211": "#5DCAA5", "Provincial": "#9aa3b8" };
  return `
    <div style="line-height:1.5;">
      <div style="font-family:'Crimson Pro',serif;font-size:1.05rem;font-weight:600;margin-bottom:4px;">
        ${d.uni}
      </div>
      <div style="color:var(--text-muted);font-size:0.78rem;margin-bottom:10px;">
        ${d.city} ·
        <span style="color:${tierColor[d.tier] || '#9aa3b8'};font-weight:700;">${d.tier}</span>
        · ${d.apply_year} ${d.status}
      </div>
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 16px;font-size:0.83rem;">
        <span style="color:var(--text-muted);">Оюутан</span><span><strong>${d.student_name}</strong></span>
        <span style="color:var(--text-muted);">Аймаг</span><span><strong>${d.student_aimag}</strong></span>
        <span style="color:var(--text-muted);">HSK / GPA</span><span><strong>HSK ${d.hsk} · ${d.gpa}%</strong></span>
        <span style="color:var(--text-muted);">Хөтөлбөр</span><span><strong style="color:${PROGRAM_COLOR[d.program]};">${d.program}</strong></span>
      </div>
    </div>
  `;
}

function updateCnVisibleCount(n) {
  const el = document.getElementById("cn-visible-count");
  if (el) el.textContent = n.toLocaleString("en-US");
}

// China filter chips
function initChinaFilters() {
  for (const groupId of ["cn-filter-program", "cn-filter-tier", "cn-filter-year"]) {
    const group = document.getElementById(groupId);
    if (!group) continue;
    group.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const filterKey = groupId.replace("cn-filter-", "");
        CN_FILTERS[filterKey] = chip.dataset.value;
        applyChinaFilters();
      });
    });
  }
}

function applyChinaFilters() {
  if (!CN_LEAFLET_CLUSTER) return;
  const { program, tier, year } = CN_FILTERS;
  const visible = CN_ALL_MARKERS.filter(m => {
    const d = m._dest;
    if (program !== "all" && d.program !== program) return false;
    if (tier !== "all" && d.tier !== tier) return false;
    if (year !== "all" && String(d.apply_year) !== year) return false;
    return true;
  });
  CN_LEAFLET_CLUSTER.clearLayers();
  CN_LEAFLET_CLUSTER.addLayers(visible);
  updateCnVisibleCount(visible.length);
}

function uniToCity(uniName) {
  const map = {
    "Tsinghua University": "Beijing", "Peking University": "Beijing",
    "Renmin University of China": "Beijing", "Beijing Normal University": "Beijing",
    "Beihang University": "Beijing", "Beijing Institute of Technology": "Beijing",
    "China Agricultural University": "Beijing", "Beijing Forestry University": "Beijing",
    "Beijing Foreign Studies University": "Beijing", "Beijing Language and Culture University": "Beijing",
    "Capital Normal University": "Beijing", "Communication University of China": "Beijing",
    "North China Electric Power University": "Beijing",
    "Fudan University": "Shanghai", "Shanghai Jiao Tong University": "Shanghai", "Tongji University": "Shanghai",
    "Zhejiang University": "Hangzhou",
    "University of Science and Technology of China": "Hefei",
    "Nanjing University": "Nanjing", "Southeast University": "Nanjing",
    "Harbin Institute of Technology": "Harbin", "Heilongjiang University": "Harbin",
    "Northeast Forestry University": "Harbin",
    "Xi'an Jiaotong University": "Xi'an", "Northwestern Polytechnical University": "Xi'an",
    "Wuhan University": "Wuhan",
    "Sun Yat-sen University": "Guangzhou", "South China University of Technology": "Guangzhou",
    "Sichuan University": "Chengdu",
    "Jilin University": "Changchun", "Northeast Normal University": "Changchun",
    "Nankai University": "Tianjin", "Tianjin University": "Tianjin",
    "Shandong University": "Jinan",
    "Xiamen University": "Xiamen",
    "Central South University": "Changsha", "Hunan University": "Changsha",
    "Lanzhou University": "Lanzhou",
    "Yanbian University": "Yanji",
    "Hebei University": "Baoding",
    "Inner Mongolia University": "Hohhot", "Inner Mongolia Normal University": "Hohhot",
    "Inner Mongolia University of Technology": "Hohhot",
    "Inner Mongolia Agricultural University": "Hohhot", "Inner Mongolia Medical University": "Hohhot",
    "Hohhot Minzu College": "Hohhot",
    "Inner Mongolia University for Nationalities": "Tongliao",
    "Dalian University of Technology": "Dalian",
    "Liaoning University": "Shenyang", "Shenyang Normal University": "Shenyang",
  };
  return map[uniName];
}

function renderChinaList() {
  const mount = document.getElementById("china-list-items");
  if (!mount) return;
  const top = INSIGHTS.top_universities.slice(0, 10);
  mount.innerHTML = top.map(u => `
    <li>
      <span class="uni-name">${u.name}</span>
      <span class="uni-count">${u.count}</span>
    </li>
  `).join("");
}

// ═════════════════════════════════════════════════════════════
// 5. UB districts bar
// ═════════════════════════════════════════════════════════════
function renderUBDistricts() {
  const mount = document.getElementById("chart-ub-districts");
  if (!mount) return;
  const data = INSIGHTS.ub_districts;
  const W = mount.clientWidth || 800;
  const H = 320;
  const margin = { top: 30, right: 30, bottom: 50, left: 140 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  const y = d3.scaleBand().domain(data.map(d => d.district)).range([0, innerH]).padding(0.2);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.pct) * 1.1]).range([0, innerW]);

  g.append("g").attr("transform", `translate(0, ${innerH})`).call(d3.axisBottom(x).tickFormat(d => d + "%"));
  g.append("g").call(d3.axisLeft(y).tickSize(0));

  const tooltip = d3.select(mount).append("div").attr("class", "tooltip");

  g.selectAll("rect")
    .data(data).enter().append("rect")
    .attr("y", d => y(d.district))
    .attr("height", y.bandwidth())
    .attr("x", 0).attr("width", 0)
    .attr("fill", "url(#grad-coral)")
    .attr("rx", 5)
    .style("filter", "drop-shadow(0 4px 8px rgba(240, 153, 123, 0.25))")
    .on("mousemove", function(event, d) {
      const [mx, my] = d3.pointer(event, mount);
      tooltip.html(`<strong>${d.district}</strong><br/>${d.pct}% оюутнаас`)
        .style("left", (mx + 14) + "px")
        .style("top", (my - 14) + "px")
        .classed("visible", true);
    })
    .on("mouseleave", () => tooltip.classed("visible", false))
    .transition().duration(900).delay((d, i) => i * 70).ease(d3.easeCubicOut)
    .attr("width", d => x(d.pct));

  g.selectAll("text.bar-num")
    .data(data).enter().append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.pct) + 8)
    .attr("y", d => y(d.district) + y.bandwidth() / 2 + 4)
    .text(d => d.pct + "%")
    .style("opacity", 0)
    .transition().delay((d, i) => 600 + i * 70).style("opacity", 1);

  svg.append("text").attr("class", "axis-label").attr("x", margin.left).attr("y", 18)
    .text("УБ-ийн дүүргүүд (оюутны эзлэх хувь)");
}

// ═════════════════════════════════════════════════════════════
// 6. HSK ridgeline plot — Joy Division style
// ═════════════════════════════════════════════════════════════
function renderHSKArea() {
  const mount = document.getElementById("chart-hsk");
  if (!mount) return;
  const raw = INSIGHTS.hsk_by_year;
  const years = Object.keys(raw).sort().map(Number);
  const levels = [1, 2, 3, 4, 5, 6];

  // For each year, build a density curve over HSK levels
  const data = years.map(y => {
    const counts = levels.map(l => (raw[y][`HSK ${l}`] || 0));
    const total = counts.reduce((a, b) => a + b, 0);
    return { year: y, counts, total, dist: counts.map(c => total ? c / total : 0) };
  });

  const W = Math.max(mount.clientWidth, 700);
  const H = 540;
  const margin = { top: 40, right: 60, bottom: 40, left: 60 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Defs: ridgeline gradient
  const defs = svg.append("defs");
  const ridgeGrad = defs.append("linearGradient").attr("id", "ridge-grad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  ridgeGrad.append("stop").attr("offset", "0%").attr("stop-color", "#5d56a8").attr("stop-opacity", 0.7);
  ridgeGrad.append("stop").attr("offset", "30%").attr("stop-color", "#7F77DD").attr("stop-opacity", 0.85);
  ridgeGrad.append("stop").attr("offset", "60%").attr("stop-color", "#A78AFF").attr("stop-opacity", 0.85);
  ridgeGrad.append("stop").attr("offset", "85%").attr("stop-color", "#5DCAA5").attr("stop-opacity", 0.85);
  ridgeGrad.append("stop").attr("offset", "100%").attr("stop-color", "#F0997B").attr("stop-opacity", 0.85);

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // X scale = HSK levels (interpolated for smoother curves)
  const x = d3.scaleLinear().domain([0.5, 6.5]).range([0, innerW]);
  // Each year has a row, ridgeline height
  const rowH = innerH / years.length;
  const ridgeH = rowH * 1.7;  // overlap

  // For each year, expand counts into a smoothed density via kernel-like interpolation
  // We'll just draw a smooth area through the 6 HSK level data points
  const area = d3.area()
    .x((d, i) => x(i + 1))
    .y0(rowH)
    .y1(d => rowH - d * ridgeH * 1.3)
    .curve(d3.curveCatmullRom.alpha(0.55));

  // Find global max for consistent scaling
  const maxFreq = d3.max(data, d => d3.max(d.dist));

  data.forEach((d, i) => {
    const yPos = i * rowH;
    const rowG = g.append("g")
      .attr("transform", `translate(0, ${yPos})`);
    const normDist = d.dist.map(v => v / maxFreq);
    // Add padding points at edges for cleaner curve start/end
    const extended = [0, ...normDist, 0];
    const a2 = d3.area()
      .x((dd, idx) => x(idx + 0.5))
      .y0(rowH)
      .y1(dd => rowH - dd * ridgeH * 1.3)
      .curve(d3.curveCatmullRom.alpha(0.55));
    rowG.append("path")
      .datum(extended)
      .attr("d", a2)
      .attr("fill", "url(#ridge-grad)")
      .attr("stroke", "#A78AFF")
      .attr("stroke-width", 1.4)
      .attr("opacity", 0)
      .transition().delay(i * 110).duration(800)
      .attr("opacity", 0.85);
    // Year label on left
    rowG.append("text")
      .attr("x", -10).attr("y", rowH - 4)
      .attr("text-anchor", "end")
      .attr("font-size", 12).attr("font-weight", 700)
      .attr("fill", "var(--text)")
      .attr("font-family", "var(--serif)")
      .text(d.year);
    // Total count label on right
    rowG.append("text")
      .attr("x", innerW + 10).attr("y", rowH - 4)
      .attr("font-size", 11)
      .attr("fill", "var(--text-muted)")
      .text(`${d.total} оюутан`);
  });

  // X axis (HSK levels)
  const axis = g.append("g").attr("transform", `translate(0, ${innerH + 8})`);
  levels.forEach(l => {
    axis.append("text")
      .attr("x", x(l)).attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", 12).attr("font-weight", 600)
      .attr("fill", l >= 5 ? "#5DCAA5" : (l <= 2 ? "#F0997B" : "var(--text-muted)"))
      .text(`HSK ${l}`);
  });

  // Title
  svg.append("text")
    .attr("x", margin.left).attr("y", 22)
    .attr("font-size", 11.5).attr("font-weight", 600)
    .attr("letter-spacing", "0.1em")
    .attr("fill", "var(--text-muted)")
    .text("HSK ТҮВШНИЙ ТАРХАЛТ ЖИЛЭЭР — RIDGELINE");

  // Annotation: highlight HSK 4 dominant
  svg.append("text")
    .attr("x", x(4) + margin.left).attr("y", margin.top - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", 10).attr("fill", "#A78AFF")
    .attr("font-weight", 700)
    .text("Хамгийн нийтлэг");
}

// ═════════════════════════════════════════════════════════════
// 7. Program cards (with counter)
// ═════════════════════════════════════════════════════════════
function renderProgramCards() {
  const mount = document.getElementById("chart-programs");
  if (!mount) return;
  const cards = [
    { type: "6+6",            desc: "Хамгийн эрэлттэй. Ямар ч HSK түвшинтэй байсан хамаагүй. 12-р анги шинэ төгссөн оюутнуудад.", tag: "Хэлний бэлтгэл" },
    { type: "1+4",            desc: "1-2 семестр хэлний бэлтгэл + 4 жил бакалавр. Тэтгэлгийн боломжтой.", tag: "Хэлний бэлтгэл + Бакалавр" },
    { type: "Fall Bachelor",  desc: "Шууд намрын элсэлт. HSK 4 + 120 онооноос дээш шаардлагатай.", tag: "Бакалавр" },
    { type: "Master/PhD",     desc: "Магистр, доктор. CSC болон бусад тэтгэлгийн дэмжлэгтэй.", tag: "Магистр / Доктор" },
  ];
  const shareMap = Object.fromEntries(INSIGHTS.program_share.map(d => [d.type, d.pct]));
  mount.innerHTML = "";
  cards.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "program-card";
    div.dataset.type = c.type;
    const pct = shareMap[c.type] ?? 0;
    div.innerHTML = `
      <div class="pc-tag">${c.tag}</div>
      <div class="pc-name">${progLabel(c.type)}</div>
      <div class="pc-pct" data-target="${pct}">0%</div>
      <div class="pc-desc">${c.desc}</div>
    `;
    mount.appendChild(div);
    setTimeout(() => div.classList.add("is-visible"), 200 + i * 130);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll(".pc-pct").forEach(el => {
          animateNumber(el, +el.dataset.target, { decimals: 1, suffix: "%" });
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(mount);
}

// ═════════════════════════════════════════════════════════════
// 8. Program evolution stacked area
// ═════════════════════════════════════════════════════════════
function renderProgramEvolution() {
  const mount = document.getElementById("chart-program-evolution");
  if (!mount) return;
  const raw = INSIGHTS.program_share_by_year;
  const years = Object.keys(raw).sort().map(Number);
  const types = ["6+6", "1+4", "Fall Bachelor", "Master/PhD"];
  const data = years.map(y => {
    const r = { year: y };
    types.forEach(t => r[t] = raw[String(y)][t] || 0);
    return r;
  });

  const W = mount.clientWidth || 800;
  const H = 380;
  const margin = { top: 24, right: 130, bottom: 40, left: 50 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  const stack = d3.stack().keys(types);
  const series = stack(data);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
  const palette = { "6+6": COLOR.purple, "1+4": COLOR.teal, "Fall Bachelor": COLOR.coral, "Master/PhD": COLOR.yellow };

  const area = d3.area()
    .x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveCatmullRom);

  g.selectAll("path").data(series).enter().append("path")
    .attr("fill", d => palette[d.key]).attr("opacity", 0.9).attr("d", area);

  g.append("g").attr("transform", `translate(0, ${innerH})`).call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")));
  g.append("g").call(d3.axisLeft(y).tickFormat(d => d + "%"));

  const legend = svg.append("g").attr("transform", `translate(${W - 110}, ${margin.top + 6})`);
  types.forEach((t, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
    row.append("rect").attr("width", 14).attr("height", 14).attr("fill", palette[t]).attr("rx", 3);
    row.append("text").attr("x", 22).attr("y", 11).attr("fill", COLOR.text).attr("font-size", 12).text(progLabel(t));
  });

  const get = (yr, key) => raw[String(yr)] && raw[String(yr)][key] != null ? raw[String(yr)][key].toFixed(0) + "%" : "—";
  const e2019 = document.getElementById("six-six-2019");
  const e2024 = document.getElementById("six-six-2024");
  if (e2019) e2019.textContent = get(2019, "6+6");
  if (e2024) e2024.textContent = get(2024, "6+6");
}

// ═════════════════════════════════════════════════════════════
// 9. Field of study lines
// ═════════════════════════════════════════════════════════════
function renderFieldLines() {
  // ─── Streamgraph (NYT-style) — curved offset baseline, no axis ─────────
  const mount = document.getElementById("chart-fields");
  if (!mount) return;
  const raw = INSIGHTS.field_by_year;
  const years = Object.keys(raw).sort().map(Number);
  const fields = Array.from(new Set(Object.values(raw).flatMap(v => Object.keys(v))));

  // Build wide-format dataset for d3.stack
  const wide = years.map(y => {
    const row = { year: y };
    fields.forEach(f => row[f] = raw[String(y)][f] || 0);
    return row;
  });

  const W = Math.max(mount.clientWidth, 700);
  const H = 520;
  const margin = { top: 50, right: 30, bottom: 60, left: 30 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Defs for vibrant gradient fills
  const defs = svg.append("defs");
  const palette = {
    "Engineering":  ["#7F77DD", "#A78AFF"],
    "Medicine":     ["#F0997B", "#FF6B5C"],
    "Business":     ["#5DCAA5", "#7FE0BA"],
    "Humanities":   ["#F5D67B", "#FFC857"],
    "Science":      ["#E07BC7", "#FF7AB6"],
    "Arts":         ["#7BC9F5", "#5DA9E5"],
    "Language":     ["#9aa3b8", "#c5cdd9"],
  };
  fields.forEach((f, i) => {
    const cols = palette[f] || ["#7F77DD", "#A78AFF"];
    const id = "stream-grad-" + i;
    const lg = defs.append("linearGradient").attr("id", id)
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    lg.append("stop").attr("offset", "0%").attr("stop-color", cols[1]).attr("stop-opacity", 0.95);
    lg.append("stop").attr("offset", "100%").attr("stop-color", cols[0]).attr("stop-opacity", 0.7);
  });

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // d3.stack with WIGGLE offset = streamgraph (centered baseline)
  const stack = d3.stack()
    .keys(fields)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);
  const series = stack(wide);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const yExtent = [
    d3.min(series, s => d3.min(s, d => d[0])),
    d3.max(series, s => d3.max(s, d => d[1])),
  ];
  const y = d3.scaleLinear().domain(yExtent).range([innerH, 0]);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.7));

  // Tooltip
  const tooltip = d3.select(mount).append("div").attr("class", "tooltip");

  // Streams
  g.selectAll("path.stream")
    .data(series).enter().append("path")
    .attr("class", "stream")
    .attr("fill", (d, i) => `url(#stream-grad-${i})`)
    .attr("stroke", (d, i) => (palette[d.key] || ["#7F77DD"])[1])
    .attr("stroke-width", 0.6)
    .attr("stroke-opacity", 0.4)
    .attr("d", area)
    .style("opacity", 0)
    .on("mousemove", function(event, d) {
      const [mx, my] = d3.pointer(event, mount);
      // find year nearest mouse
      const yearAt = Math.round(x.invert(mx - margin.left));
      const value = (raw[String(yearAt)] || {})[d.key] || 0;
      tooltip.html(`<strong>${d.key}</strong><br/>${yearAt}: ${value} өргөдөл`)
        .style("left", (mx + 14) + "px")
        .style("top", (my - 14) + "px")
        .classed("visible", true);
      d3.select(this).attr("stroke-width", 2).attr("stroke-opacity", 1);
    })
    .on("mouseleave", function() {
      tooltip.classed("visible", false);
      d3.select(this).attr("stroke-width", 0.6).attr("stroke-opacity", 0.4);
    })
    .transition().duration(1100).delay((d, i) => i * 80).ease(d3.easeCubicOut)
    .style("opacity", 0.92);

  // Year labels at bottom (no axes — just text markers)
  const yearLabels = g.append("g").attr("class", "year-labels");
  years.forEach(yr => {
    yearLabels.append("text")
      .attr("x", x(yr))
      .attr("y", innerH + 26)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--serif)")
      .attr("font-size", 13).attr("font-weight", 600)
      .attr("fill", "var(--text-muted)")
      .attr("font-variant-numeric", "tabular-nums")
      .text(yr);
  });

  // Inline labels — name in middle of biggest stream (where field has max value)
  series.forEach((s, i) => {
    let maxIdx = 0, maxBand = 0;
    s.forEach((point, idx) => {
      const band = point[1] - point[0];
      if (band > maxBand) { maxBand = band; maxIdx = idx; }
    });
    const point = s[maxIdx];
    const cy = (y(point[0]) + y(point[1])) / 2;
    const cx = x(s[maxIdx].data.year);
    if (maxBand > 30) {  // only label larger streams
      g.append("text")
        .attr("x", cx).attr("y", cy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .attr("fill", "#fff")
        .attr("font-family", "var(--sans)")
        .style("paint-order", "stroke fill")
        .style("stroke", "#0a0e1a")
        .style("stroke-width", "3")
        .text(s.key.toUpperCase())
        .style("opacity", 0)
        .transition().delay(1400 + i * 80).duration(500).style("opacity", 0.95);
    }
  });

  // Title
  svg.append("text")
    .attr("x", margin.left).attr("y", 22)
    .attr("font-size", 11.5).attr("font-weight", 600)
    .attr("letter-spacing", "0.1em")
    .attr("fill", "var(--text-muted)")
    .text("МЭРГЭЖЛИЙН ЧИГ ХАНДЛАГА — STREAMGRAPH");

  // Subtitle annotation
  svg.append("text")
    .attr("x", margin.left).attr("y", 40)
    .attr("font-size", 12)
    .attr("fill", "var(--text-muted)")
    .text("Поток бүхэн нэг чиглэлийн өргөдлийн тоог илэрхийлнэ. Зузаан нь эрэлтийн хэмжээг харуулна.");
}

// ═════════════════════════════════════════════════════════════
// 10. Personas
// ═════════════════════════════════════════════════════════════
function renderPersonas() {
  const mount = document.getElementById("chart-personas");
  if (!mount) return;
  const personas = INSIGHTS.personas || [];
  mount.innerHTML = "";
  personas.forEach((p) => {
    const card = document.createElement("div");
    card.className = "persona-card";
    const initial = p.name.charAt(0);
    card.innerHTML = `
      <div class="persona-avatar">${initial}</div>
      <div class="persona-name">${p.name}</div>
      <div class="persona-stats">
        <div><strong>${p.avg_age}</strong>Дундаж нас</div>
        <div><strong>HSK ${p.avg_hsk}</strong>HSK түвшин</div>
        <div><strong>${p.avg_gpa}%</strong>Дундаж GPA</div>
        <div><strong>${(p.avg_income_mnt/1_000_000).toFixed(1)}M₮</strong>Өрхийн сарын орлого</div>
      </div>
      <div class="persona-size">${p.size} оюутан · ${(p.size/15).toFixed(1)}%</div>
    `;
    mount.appendChild(card);
  });
}

// ═════════════════════════════════════════════════════════════
// 11. Predictor
// ═════════════════════════════════════════════════════════════
function initPredictor() {
  const inputs = {
    hsk: document.getElementById("in-hsk"),
    score: document.getElementById("in-hsk-score"),
    gpa: document.getElementById("in-gpa"),
    income: document.getElementById("in-income"),
    program: document.getElementById("in-program"),
  };
  const outputs = {
    hsk: document.getElementById("out-hsk"),
    score: document.getElementById("out-hsk-score"),
    gpa: document.getElementById("out-gpa"),
    income: document.getElementById("out-income"),
  };
  const result = document.getElementById("result-prob");
  const bar = document.getElementById("result-bar");
  const note = document.getElementById("result-note");

  function predict() {
    const hsk = +inputs.hsk.value;
    const score = +inputs.score.value;
    const gpa = +inputs.gpa.value;
    const income = +inputs.income.value;
    const program = inputs.program.value;
    outputs.hsk.value = hsk;
    outputs.score.value = score;
    outputs.gpa.value = gpa;
    outputs.income.value = income.toLocaleString();

    let p = 0.55;
    const hskBoost = { 1: -0.45, 2: -0.38, 3: -0.08, 4: 0.08, 5: 0.28, 6: 0.32 };
    p += hskBoost[hsk] || 0;
    p += 0.005 * (gpa - 80);
    p += 0.02 * Math.log10(Math.max(income, 100000) / 1_000_000);
    const progEffect = { "6+6": 0.05, "1+4": 0.02, "Fall Bachelor": -0.05, "Master/PhD": -0.08 };
    p += progEffect[program] || 0;
    if (program === "Fall Bachelor" && (hsk < 4 || score < 120)) p -= 0.5;
    p = Math.max(0.02, Math.min(0.98, p));
    const pct = (p * 100).toFixed(1);
    result.textContent = pct + "%";
    bar.style.width = pct + "%";

    let n = "";
    if (program === "Fall Bachelor" && (hsk < 4 || score < 120)) {
      n = "⚠️ Намрын шууд бакалаврт элсэхийн тулд HSK 4 + 120 оноо шаардлагатай.";
    } else if (p > 0.75) {
      n = "Маш сайн. Шилдэг сургуулиудад өргөдөл өгөх боломжтой.";
    } else if (p > 0.5) {
      n = "Дундаж. Сургуулийн сонголтоо болгоомжтой хийгээрэй.";
    } else if (p > 0.3) {
      n = "Тааруу. HSK эсвэл GPA-аа сайжруулах хэрэгтэй.";
    } else {
      n = "Бэлтгэлээ илүү сайн хийх шаардлагатай байна.";
    }
    note.textContent = n;

    // Find 5 similar students using Euclidean distance on (hsk, score, gpa, log10 income)
    findSimilarStudents({ hsk, score, gpa, income, program });
  }

  Object.values(inputs).forEach(el => el && el.addEventListener("input", predict));
  predict();
}

function findSimilarStudents(input) {
  const grid = document.getElementById("similar-grid");
  if (!grid || !STUDENTS_GEO) return;
  const tinp = {
    hsk: input.hsk,
    score: input.score,
    gpa: input.gpa,
    incomeL: Math.log10(Math.max(input.income, 100000)),
  };
  // Compute distance for each student
  const scored = STUDENTS_GEO.map(s => {
    const dHsk = (s.hsk - tinp.hsk) * 0.4;
    const dScore = (s.hsk_score - tinp.score) / 100;
    const dGpa = (s.gpa - tinp.gpa) / 20;
    const dInc = (Math.log10(s.id ? 3000000 : 3000000) - tinp.incomeL); // student doesn't have income exposed; placeholder
    return { s, dist: Math.sqrt(dHsk*dHsk + dScore*dScore + dGpa*dGpa + dInc*dInc) };
  });
  scored.sort((a, b) => a.dist - b.dist);
  const top5 = scored.slice(0, 5).map(x => x.s);

  grid.innerHTML = top5.map(s => `
    <div class="similar-card">
      <div class="name">${s.name}</div>
      <div class="meta">${s.aimag}${s.district ? " · " + s.district : ""} · ${s.gender === "M" ? "Эр" : "Эм"} · ${s.age} нас</div>
      <div class="stats">
        <span class="lbl">GPA</span><span class="val">${s.gpa}%</span>
        <span class="lbl">HSK</span><span class="val">${s.hsk} (${s.hsk_score})</span>
        <span class="lbl">Сургуулийн төрөл</span><span class="val">${s.school}</span>
        <span class="lbl">Хүйс</span><span class="val">${s.gender}</span>
      </div>
    </div>
  `).join("");
}

// ═════════════════════════════════════════════════════════════
// 12. KPI counters
// ═════════════════════════════════════════════════════════════
function fillKPIs() {
  const totalApps = INSIGHTS.yearly_apps.reduce((s, d) => s + d.count, 0);
  const accs = INSIGHTS.acceptance_by_program || [];
  const meanAcc = accs.length ? (accs.reduce((s, d) => s + d.rate, 0) / accs.length) : 0;
  const accEl = document.getElementById("kpi-acceptance");

  // Animate when KPI grid enters view
  const kpiGrid = document.querySelector(".kpi-grid");
  if (!kpiGrid) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        kpiGrid.querySelectorAll(".counter[data-target]").forEach(el => {
          animateNumber(el, +el.dataset.target);
        });
        if (accEl) animateNumber(accEl, meanAcc, { decimals: 1, suffix: "%" });
        observer.unobserve(kpiGrid);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(kpiGrid);
}

// ═════════════════════════════════════════════════════════════
// 12.5. Bar Chart Race — top 10 universities cumulative by year
// ═════════════════════════════════════════════════════════════
function renderBarChartRace() {
  const mount = document.getElementById("chart-race");
  if (!mount || !INSIGHTS.uni_race_by_year) return;

  const raw = INSIGHTS.uni_race_by_year;
  const years = Object.keys(raw).map(Number).sort();
  const W = Math.max(mount.clientWidth, 700);
  const H = 540;
  const margin = { top: 30, right: 80, bottom: 30, left: 280 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Defs — gradient bars
  const defs = svg.append("defs");
  const lg = defs.append("linearGradient").attr("id", "race-grad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  lg.append("stop").attr("offset", "0%").attr("stop-color", "#5d56a8");
  lg.append("stop").attr("offset", "100%").attr("stop-color", "#A78AFF");

  // Big year display in background
  const yearText = svg.append("text")
    .attr("x", W - margin.right - 10).attr("y", H - 30)
    .attr("text-anchor", "end")
    .attr("font-family", "var(--serif)").attr("font-weight", 800)
    .attr("font-size", 88).attr("fill", "rgba(127, 119, 221, 0.10)")
    .text(years[0]);

  // Render frame for given year
  function renderFrame(year) {
    const data = (raw[year] || []).slice(0, 10);
    if (!data.length) return;

    const yScale = d3.scaleBand()
      .domain(data.map((d, i) => i))
      .range([0, innerH])
      .padding(0.18);
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) * 1.05])
      .range([0, innerW]);

    yearText.text(year);

    const t = d3.transition().duration(500).ease(d3.easeCubicInOut);

    // Bars
    const bars = g.selectAll("rect.race-bar-rect").data(data, d => d.name);
    bars.enter().append("rect")
      .attr("class", "race-bar-rect")
      .attr("y", innerH).attr("height", 0)
      .attr("x", 0).attr("width", 0)
      .attr("fill", "url(#race-grad)")
      .attr("rx", 4)
      .merge(bars)
      .transition(t)
      .attr("y", (d, i) => yScale(i))
      .attr("height", yScale.bandwidth())
      .attr("width", d => xScale(d.count));
    bars.exit().transition(t).attr("width", 0).attr("opacity", 0).remove();

    // Names (left side)
    const names = g.selectAll("text.race-bar-label").data(data, d => d.name);
    names.enter().append("text")
      .attr("class", "race-bar-label")
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("x", -10)
      .attr("y", innerH)
      .merge(names)
      .text(d => d.name)
      .transition(t)
      .attr("y", (d, i) => yScale(i) + yScale.bandwidth() / 2);
    names.exit().transition(t).attr("opacity", 0).remove();

    // Values (right of bar)
    const vals = g.selectAll("text.race-value").data(data, d => d.name);
    vals.enter().append("text")
      .attr("class", "race-value")
      .attr("dominant-baseline", "middle")
      .merge(vals)
      .transition(t)
      .attr("x", d => xScale(d.count) + 8)
      .attr("y", (d, i) => yScale(i) + yScale.bandwidth() / 2)
      .tween("text", function(d) {
        const node = this;
        const prev = +(node.textContent || 0);
        const interp = d3.interpolateNumber(prev, d.count);
        return t => node.textContent = Math.round(interp(t));
      });
    vals.exit().transition(t).attr("opacity", 0).remove();
  }

  // Initial frame
  renderFrame(years[0]);

  // Slider control + auto play
  const slider = document.getElementById("raceYear");
  const yearLabel = document.getElementById("raceYearLabel");
  const toggle = document.getElementById("raceToggle");
  let auto = true;
  let timer = null;
  let cur = years[0];

  function setYear(y) {
    cur = y;
    if (slider) slider.value = y;
    if (yearLabel) yearLabel.textContent = y;
    renderFrame(y);
  }

  function startAuto() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      const idx = years.indexOf(cur);
      const next = years[(idx + 1) % years.length];
      setYear(next);
    }, 1400);
  }

  if (slider) {
    slider.addEventListener("input", () => {
      auto = false;
      if (toggle) toggle.classList.remove("active");
      if (toggle) toggle.textContent = "▶ Автоматаар тоглуулах";
      if (timer) clearInterval(timer);
      setYear(+slider.value);
    });
  }
  if (toggle) {
    toggle.addEventListener("click", () => {
      auto = !auto;
      if (auto) {
        toggle.classList.add("active");
        toggle.textContent = "⏸ Зогсоох";
        startAuto();
      } else {
        toggle.classList.remove("active");
        toggle.textContent = "▶ Автоматаар тоглуулах";
        if (timer) clearInterval(timer);
      }
    });
  }

  // Auto-start when section comes into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && auto) startAuto();
      else if (!e.isIntersecting && timer) clearInterval(timer);
    });
  }, { threshold: 0.3 });
  observer.observe(mount);
}

// ═════════════════════════════════════════════════════════════
// 12.6. Persona Radar Chart — 5 mini radars side-by-side
// ═════════════════════════════════════════════════════════════
function renderPersonaRadar() {
  const personasGrid = document.getElementById("chart-personas");
  if (!personasGrid || !INSIGHTS.personas) return;
  // Insert radar wrap right after personas grid
  let wrap = document.querySelector(".persona-radar-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "persona-radar-wrap reveal";
    wrap.innerHTML = `
      <div class="persona-radar-title">📡 Архетип бүрийн хэв шинж — DNA RADAR</div>
      <div class="persona-radar-subtitle">Бүл бүрд 5 хувьсагч (HSK, HSK оноо, GPA, нас, орлого) 0–100% хэмжээгээр.</div>
      <div class="persona-radar-grid" id="persona-radar-grid"></div>
    `;
    personasGrid.parentNode.insertBefore(wrap, personasGrid.nextSibling);
  }

  const grid = document.getElementById("persona-radar-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const personas = INSIGHTS.personas;
  const axes = ["HSK", "HSK_оноо", "GPA", "Нас", "Орлого"];
  const colors = ["#7F77DD", "#5DCAA5", "#F0997B", "#F5D67B", "#E07BC7"];

  personas.forEach((p, i) => {
    if (!p.radar) return;
    const color = colors[i % colors.length];
    const card = document.createElement("div");
    card.className = "persona-mini-radar";

    // Inner SVG dimensions
    const W = 220, H = 220;
    const cx = W / 2, cy = H / 2 + 6;
    const R = 72;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    // Gradient defs
    svg += `<defs><radialGradient id="rad-grad-${i}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.15"/>
    </radialGradient></defs>`;
    svg += `<g transform="translate(${cx}, ${cy})">`;

    // Concentric rings
    for (let r = 1; r <= 4; r++) {
      svg += `<circle class="radar-grid-circle" r="${R * r / 4}"/>`;
    }
    // Axes + labels
    axes.forEach((axis, ai) => {
      const angle = (ai / axes.length) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * R;
      const y = Math.sin(angle) * R;
      svg += `<line class="radar-axis-line" x1="0" y1="0" x2="${x}" y2="${y}"/>`;
      const lx = Math.cos(angle) * (R + 14);
      const ly = Math.sin(angle) * (R + 14);
      svg += `<text class="radar-axis-label" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="9">${axis.replace("_", " ")}</text>`;
    });

    // Persona polygon
    const pts = axes.map((axis, ai) => {
      const angle = (ai / axes.length) * 2 * Math.PI - Math.PI / 2;
      const v = p.radar[axis] || 0;
      return [Math.cos(angle) * R * v, Math.sin(angle) * R * v];
    });
    const polyPath = "M" + pts.map(pt => pt.join(",")).join("L") + "Z";
    svg += `<path d="${polyPath}" fill="url(#rad-grad-${i})" stroke="${color}" stroke-width="2"/>`;
    pts.forEach(pt => {
      svg += `<circle cx="${pt[0]}" cy="${pt[1]}" r="3.2" fill="${color}"/>`;
    });

    svg += `</g></svg>`;

    card.innerHTML = `
      <div class="mini-radar-header">
        <span class="mini-radar-dot" style="background:${color};"></span>
        <span class="mini-radar-name">${p.name}</span>
      </div>
      <div class="mini-radar-svg">${svg}</div>
      <div class="mini-radar-stats">
        <div><span>HSK</span><strong>${p.avg_hsk}</strong></div>
        <div><span>GPA</span><strong>${p.avg_gpa}%</strong></div>
        <div><span>Нас</span><strong>${p.avg_age}</strong></div>
        <div><span>n</span><strong>${p.size}</strong></div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ═════════════════════════════════════════════════════════════
// 13. Student Journey Sankey diagram
// ═════════════════════════════════════════════════════════════
function renderSankey() {
  const mount = document.getElementById("chart-sankey");
  if (!mount || !window.d3 || !d3.sankey) return;

  // Build sankey data: Aimag(top 6) → Program → Tier → Status
  // Use applications + students/uni info that we already have computed.
  // Approximate from STUDENTS_GEO + DESTINATIONS_GEO (since we don't have full apps in JS).
  // Simpler: use precomputed buckets.

  const W = Math.max(mount.clientWidth, 800);
  const H = 540;

  d3.select(mount).selectAll("*").remove();
  const svg = d3.select(mount).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Aimag → Program flow (using DESTINATIONS_GEO + STUDENTS_GEO)
  // For each enrolled application, we have program + student aimag (via name lookup).
  // STUDENTS_GEO has aimag; DESTINATIONS_GEO links student via student_aimag.

  // Build aimag aggregation
  const TOP_AIMAGS = ["Улаанбаатар", "Дархан-Уул", "Орхон", "Сэлэнгэ", "Ховд", "Бусад"];
  const PROGRAM_TYPES = ["6+6", "1+4", "Fall Bachelor", "Master/PhD"];
  const TIERS = ["C9", "985", "211", "Provincial"];
  const STATUSES = ["Enrolled", "Accepted", "Enrolled (delayed)"];

  // For each destination, build chain:
  const aimagToProg = {};      // {aimag: {prog: count}}
  const progToTier = {};       // {prog: {tier: count}}
  const tierToStatus = {};     // {tier: {status: count}}

  for (const d of DESTINATIONS_GEO) {
    const aimag = TOP_AIMAGS.includes(d.student_aimag) ? d.student_aimag : "Бусад";
    const prog = d.program;
    const tier = d.tier;
    const status = d.status;
    aimagToProg[aimag] = aimagToProg[aimag] || {};
    aimagToProg[aimag][prog] = (aimagToProg[aimag][prog] || 0) + 1;
    progToTier[prog] = progToTier[prog] || {};
    progToTier[prog][tier] = (progToTier[prog][tier] || 0) + 1;
    tierToStatus[tier] = tierToStatus[tier] || {};
    tierToStatus[tier][status] = (tierToStatus[tier][status] || 0) + 1;
  }

  // Build node + link arrays
  const nodes = [];
  const nodeIdx = {};
  function addNode(name, layer) {
    const key = `${layer}|${name}`;
    if (nodeIdx[key] != null) return nodeIdx[key];
    nodeIdx[key] = nodes.length;
    nodes.push({ name, layer });
    return nodes.length - 1;
  }
  TOP_AIMAGS.forEach(a => addNode(a, 0));
  PROGRAM_TYPES.forEach(p => addNode(p, 1));
  TIERS.forEach(t => addNode(t, 2));
  STATUSES.forEach(s => addNode(s, 3));

  const links = [];
  for (const [aimag, byProg] of Object.entries(aimagToProg)) {
    for (const [prog, cnt] of Object.entries(byProg)) {
      links.push({ source: nodeIdx[`0|${aimag}`], target: nodeIdx[`1|${prog}`], value: cnt });
    }
  }
  for (const [prog, byTier] of Object.entries(progToTier)) {
    for (const [tier, cnt] of Object.entries(byTier)) {
      links.push({ source: nodeIdx[`1|${prog}`], target: nodeIdx[`2|${tier}`], value: cnt });
    }
  }
  for (const [tier, byStatus] of Object.entries(tierToStatus)) {
    for (const [status, cnt] of Object.entries(byStatus)) {
      links.push({ source: nodeIdx[`2|${tier}`], target: nodeIdx[`3|${status}`], value: cnt });
    }
  }

  // Layout
  const sk = d3.sankey()
    .nodeWidth(18)
    .nodePadding(14)
    .extent([[20, 30], [W - 130, H - 20]]);

  const validLinks = links.filter(l => l.source != null && l.target != null && l.value > 0);
  if (validLinks.length === 0) { console.warn("[sankey] no valid links"); return; }
  const graph = sk({ nodes: nodes.map(d => Object.assign({}, d)), links: validLinks.map(d => Object.assign({}, d)) });

  // Color helpers
  const layerColor = (layer) => ["#7F77DD", "#5DCAA5", "#F0997B", "#F5D67B"][layer] || "#9aa3b8";
  const programColorMap = { "6+6": "#7F77DD", "1+4": "#5DCAA5", "Fall Bachelor": "#F0997B", "Master/PhD": "#F5D67B" };

  // Defs for link gradients
  const defs = svg.append("defs");
  graph.links.forEach((link, i) => {
    const id = `sk-grad-${i}`;
    const lg = defs.append("linearGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", link.source.x1).attr("x2", link.target.x0);
    const sColor = link.source.layer === 1 ? programColorMap[link.source.name] : layerColor(link.source.layer);
    const tColor = link.target.layer === 1 ? programColorMap[link.target.name] : layerColor(link.target.layer);
    lg.append("stop").attr("offset", "0%").attr("stop-color", sColor);
    lg.append("stop").attr("offset", "100%").attr("stop-color", tColor);
    link.gradId = id;
  });

  const tooltip = d3.select(mount).append("div").attr("class", "tooltip");

  // Links
  svg.append("g").selectAll(".sankey-link")
    .data(graph.links).enter()
    .append("path")
    .attr("class", "sankey-link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => `url(#${d.gradId})`)
    .attr("stroke-width", d => Math.max(1, d.width))
    .on("mousemove", function(event, d) {
      const [mx, my] = d3.pointer(event, mount);
      const sName = d.source.layer === 1 ? progLabel(d.source.name) : d.source.name;
      const tName = d.target.layer === 1 ? progLabel(d.target.name) : d.target.name;
      tooltip.html(`<strong>${sName} → ${tName}</strong><br/>${d.value} оюутан`)
        .style("left", (mx + 14) + "px")
        .style("top", (my - 14) + "px")
        .classed("visible", true);
    })
    .on("mouseleave", () => tooltip.classed("visible", false));

  // Nodes
  svg.append("g").selectAll(".sankey-node")
    .data(graph.nodes).enter()
    .append("rect")
    .attr("class", "sankey-node")
    .attr("x", d => d.x0).attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => d.layer === 1 ? programColorMap[d.name] : layerColor(d.layer))
    .attr("rx", 3)
    .on("mousemove", function(event, d) {
      const [mx, my] = d3.pointer(event, mount);
      tooltip.html(`<strong>${d.layer === 1 ? progLabel(d.name) : d.name}</strong><br/>${d.value} оюутан`)
        .style("left", (mx + 14) + "px").style("top", (my - 14) + "px")
        .classed("visible", true);
    })
    .on("mouseleave", () => tooltip.classed("visible", false));

  // Labels
  svg.append("g").selectAll(".sankey-label")
    .data(graph.nodes).enter()
    .append("text")
    .attr("class", "sankey-label")
    .attr("x", d => d.x0 < W / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("text-anchor", d => d.x0 < W / 2 ? "start" : "end")
    .attr("dominant-baseline", "middle")
    .text(d => `${d.layer === 1 ? progLabel(d.name) : d.name} ${d.value ? "(" + d.value + ")" : ""}`);

  // Layer titles
  ["Аймаг", "Хөтөлбөр", "Их сургуулийн tier", "Үр дүн"].forEach((label, i) => {
    const xPos = i === 0 ? 30 : (i === 3 ? W - 130 : 30 + i * (W - 160) / 3);
    svg.append("text")
      .attr("x", xPos).attr("y", 18)
      .attr("font-size", 11).attr("font-weight", 700)
      .attr("letter-spacing", "0.08em")
      .attr("fill", "var(--text-muted)")
      .text(label.toUpperCase());
  });
}

// ═════════════════════════════════════════════════════════════
// 14. Business Intelligence — 5 strategic recommendations
// ═════════════════════════════════════════════════════════════
function renderBusinessIntelligence() {
  const mount = document.getElementById("bi-reco-grid");
  if (!mount) return;

  const aimagGrowth = INSIGHTS.bi_aimag_growth || [];
  const schoolAcc = INSIGHTS.bi_school_acceptance || [];
  const progRev = INSIGHTS.bi_program_revenue || {};
  const hskFunnel = INSIGHTS.bi_hsk_funnel || {};
  const volatility = INSIGHTS.bi_yearly_volatility || {};

  // Compute key insights
  const nonUbAimags = aimagGrowth.filter(a => a.aimag !== "Улаанбаатар").slice(0, 5);
  const darkhanRow = aimagGrowth.find(a => a.aimag === "Дархан-Уул") || {};
  const orhonRow = aimagGrowth.find(a => a.aimag === "Орхон") || {};
  const intlAcc = (schoolAcc.find(s => s.school === "International") || {}).rate;
  const publicAcc = (schoolAcc.find(s => s.school === "Public") || {}).rate;
  const hsk12 = (hskFunnel[1]?.applied || 0) + (hskFunnel[2]?.applied || 0);
  const hsk12rate = ((hskFunnel[1]?.applied || 0) + (hskFunnel[2]?.applied || 0)) > 0
    ? Math.round(((hskFunnel[1]?.accepted || 0) + (hskFunnel[2]?.accepted || 0)) /
                 ((hskFunnel[1]?.applied || 0) + (hskFunnel[2]?.applied || 0)) * 100)
    : 0;
  const masterPhdAvg = progRev["Master/PhD"]?.avg_tuition_yuan || 0;
  const sixSixAvg = progRev["6+6"]?.avg_tuition_yuan || 0;
  const sixSixCount = progRev["6+6"]?.count || 0;

  const recos = [
    {
      num: "01", icon: "🏢", impact: "high", tag: "Газарзүйн өргөтгөл",
      title: "Дархан-Уул, Эрдэнэтэд салбар нээх",
      action: `Хойд Монголд салбар байгуулсан тохиолдолд <strong>+30–40% оюутан</strong> нэмэх боломжтой. Эдгээр аймгууд нь Өвөр Монголын их сургуулиудад газарзүйн хувьд ойролцоо, оюутнуудын дундаж GPA 80%+ байна.`,
      data: [
        { label: "Дархан-Уулын эзлэх хувь", value: `${(darkhanRow.recent + darkhanRow.older) / 15} %`.slice(0, 4) + "%", cls: "purple" },
        { label: "Орхон (Эрдэнэт)", value: `${orhonRow.recent || 0} оюутан 2024-25`, cls: "purple" },
        { label: "Дундаж GPA", value: `${darkhanRow.gpa_avg || "?"}%`, cls: "teal" },
        { label: "Ойрхон Өвөр Монголын их сургууль", value: "8 ширхэг", cls: "" },
      ],
      confidence: 4,
    },
    {
      num: "02", icon: "🎯", impact: "high", tag: "Сегмент өсгөх",
      title: "Улаанбаатарын хувийн болон олон улсын сургуулиудад чиглэсэн 6+6 төв",
      action: `Олон улсын болон хувийн сургуулиудын сурагчид <strong>${(intlAcc || 0).toFixed(0)}%</strong> элсэх магадлалтай. Эдгээр сурагчид GPA 88%+, HSK 5+ түвшинтэй. Тэдний 6+6 хөтөлбөрт татах нарийн зорилтот хамтын ажиллагаа хэрэгжүүлэх боломжтой.`,
      data: [
        { label: "Олон улсын сургуулийн элсэлт", value: `${(intlAcc || 0).toFixed(0)}% accept`, cls: "coral" },
        { label: "Улсын сургуулийн элсэлт", value: `${(publicAcc || 0).toFixed(0)}% accept`, cls: "" },
        { label: "6+6 хөтөлбөрийн нийт оюутан", value: `${sixSixCount}`, cls: "purple" },
        { label: "Хан-Уул дүүргийн эзлэх хувь", value: "20.3%", cls: "" },
      ],
      confidence: 5,
    },
    {
      num: "03", icon: "🎓", impact: "medium", tag: "Ахисан түвшний онцгой үйлчилгээ",
      title: "Магистр, докторын CSC тэтгэлгийн ахисан түвшний зөвлөх үйлчилгээ",
      action: `Магистр, докторын оюутан 8% л байгаа боловч <strong>тэтгэлгийн дундаж 60,000 юань/жил</strong>. CSC тэтгэлэгт төвлөрсөн ахисан түвшний зөвлөх үйлчилгээ нь өрсөлдөгчдөөс ялгарах давуу тал болно.`,
      data: [
        { label: "Магистр/Докторын эзлэх хувь", value: `${progRev["Master/PhD"]?.share || 0}%`, cls: "" },
        { label: "Дундаж төлбөр / жил", value: `${(masterPhdAvg / 1000).toFixed(0)}k yuan`, cls: "purple" },
        { label: "6+6 төлбөртэй харьцуулсан", value: `${(sixSixAvg / 1000).toFixed(0)}k yuan`, cls: "" },
        { label: "CSC Full дундаж", value: "60k yuan/жил", cls: "teal" },
      ],
      confidence: 4,
    },
    {
      num: "04", icon: "📚", impact: "medium", tag: "Шатлал сайжруулах",
      title: "HSK 1–2 түвшинтэй сурагчдад урьдчилсан бэлтгэлийн анги",
      action: `HSK 1–2 түвшинтэй <strong>${hsk12} оюутан</strong>-аас ердөө <strong>${hsk12rate}%</strong> нь элсдэг. 3 сарын урьдчилсан HSK бэлтгэлийн анги нь тэднийг HSK 3+ болгож, 6+6 хөтөлбөрт нэвтрүүлнэ. Шийдвэр гаргах шатанд байгаа сурагчдыг алдахгүй хадгалах боломж.`,
      data: [
        { label: "HSK 1–2 өргөдөл", value: `${hsk12}`, cls: "" },
        { label: "Одоогийн элсэлтийн хувь", value: `${hsk12rate}%`, cls: "coral" },
        { label: "Боломжит хувь (HSK 3+)", value: "~45%", cls: "teal" },
        { label: "3 сарын бэлтгэлийн төлбөр", value: "1.5M MNT", cls: "purple" },
      ],
      confidence: 3,
    },
    {
      num: "05", icon: "⚠️", impact: "low", tag: "Эрсдэлийн удирдлага",
      title: "Хятадаас бусад зах зээл рүү 15–20% төрөлжүүлэх",
      action: `2020–2022 онд 100% Хятадаас хамаарч ажилласан тул <strong>${Math.abs(volatility.max_drop_pct || 0).toFixed(0)}% хямрал</strong> учирсан. Солонгос, Япон, Оросын төрийн их сургуулиудтай хамтран ажилласнаар КОВИД-19 шиг гадаад эрсдэлийн нөлөөг бууруулна.`,
      data: [
        { label: "КОВИД-19 3 жилийн нийт", value: `${volatility.covid_years_total || 0} оюутан`, cls: "coral" },
        { label: "2019 → 2021 уналт", value: `${volatility.max_drop_pct || 0}%`, cls: "coral" },
        { label: "Хятадаас хамаарал", value: "100%", cls: "coral" },
        { label: "Зорилтот төрөлжүүлэлт", value: "→ 80% / 20%", cls: "teal" },
      ],
      confidence: 3,
    },
  ];

  mount.innerHTML = "";
  recos.forEach(r => {
    const card = document.createElement("div");
    card.className = "reco-card";
    card.dataset.impact = r.impact;
    card.innerHTML = `
      <div class="reco-tag">${r.tag} · ${r.impact === "high" ? "Өндөр нөлөө" : r.impact === "medium" ? "Дунд нөлөө" : "Бага нөлөө"}</div>
      <div class="reco-header">
        <div class="reco-num">${r.num}</div>
        <div class="reco-icon">${r.icon}</div>
      </div>
      <div class="reco-title">${r.title}</div>
      <div class="reco-action">${r.action}</div>
      <ul class="reco-data-list">
        ${r.data.map(d => `<li><span class="label">${d.label}</span><span class="value ${d.cls}">${d.value}</span></li>`).join("")}
      </ul>
      <div class="reco-confidence">
        Итгэлийн түвшин:
        <span class="bars">
          ${[1,2,3,4,5].map(i => `<span class="${i <= r.confidence ? 'on' : ''}"></span>`).join("")}
        </span>
      </div>
    `;
    mount.appendChild(card);
  });

  // ROI summary block
  const roi = document.getElementById("bi-roi-grid");
  if (roi) {
    roi.innerHTML = `
      <div class="item">
        <div class="big" style="background:var(--grad-purple);-webkit-background-clip:text;background-clip:text;color:transparent;">+30–40%</div>
        <div class="lab">Хойд аймагт өргөтгөл</div>
      </div>
      <div class="item">
        <div class="big" style="background:var(--grad-teal);-webkit-background-clip:text;background-clip:text;color:transparent;">${(intlAcc || 0).toFixed(0)}%</div>
        <div class="lab">Олон улсын сургуулийн элсэлтийн хувь</div>
      </div>
      <div class="item">
        <div class="big" style="color:var(--coral);">${hsk12}</div>
        <div class="lab">HSK 1–2 шатлалаас алдсан</div>
      </div>
      <div class="item">
        <div class="big" style="color:var(--yellow);">60K</div>
        <div class="lab">CSC Full тэтгэлгийн дундаж юань/жил</div>
      </div>
    `;
  }
}

// ═════════════════════════════════════════════════════════════
// Scrollama
// ═════════════════════════════════════════════════════════════
function setupScrollama() {
  const scroller = scrollama();
  scroller
    .setup({ step: "#timeline-scrolly .step", offset: 0.5, debug: false })
    .onStepEnter(({ index, element, direction }) => {
      element.classList.add("is-active");
      const step = +element.dataset.step;
      if (TIMELINE_STATE !== step) {
        TIMELINE_STATE = step;
        renderTimeline(step);
      }
    })
    .onStepExit(({ element, direction }) => {
      if (direction === "up") element.classList.remove("is-active");
    });

  scrollama()
    .setup({ step: "section:not(#sec-1) .step", offset: 0.7, debug: false })
    .onStepEnter(({ element }) => element.classList.add("is-active"))
    .onStepExit(({ element, direction }) => {
      if (direction === "up") element.classList.remove("is-active");
    });

  window.addEventListener("resize", () => scroller.resize());
}
