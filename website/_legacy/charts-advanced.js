/* ═════════════════════════════════════════════════════════════
   ANKO Bridge — Дата шинжээчийн гүн шинжилгээ (advanced charts)
   Model explainability · Cohort funnel · Correlation & distribution
   · Geographic flow & growth.  main.js-ийн дараа ачаалагдана.
   ═════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── Shared helpers ───────────────────────────────────────────
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const fmtInt = (n) => d3.format(",")(Math.round(n));

  function clearMount(mount) {
    d3.select(mount).selectAll("*").remove();
  }

  function makeSvg(host, W, H) {
    return d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "presentation");
  }

  function makeTooltip(host) {
    return d3.select(host).append("div").attr("class", "tooltip");
  }

  // Prettify one-hot / raw feature names → readable Mongolian-ish labels
  const FEATURE_LABELS = {
    hsk_level: "HSK түвшин",
    hsk_score: "HSK оноо",
    gpa_percent: "GPA",
    family_income_mnt: "Гэр бүлийн орлого",
    apply_age: "Өргөдөл өгсөн нас",
    age_at_register: "Бүртгүүлэх нас",
    is_high_school_senior: "12-р анги төгсөгч",
  };
  function prettyFeature(name) {
    if (FEATURE_LABELS[name]) return FEATURE_LABELS[name];
    const parts = name.split("_");
    const prefixes = {
      aimag: "Аймаг",
      school: "Сургууль",
      anko: "Хөтөлбөр",
      tier: "Зэрэглэл",
      field: "Чиглэл",
    };
    if (prefixes[parts[0]]) {
      let val = name.substring(name.indexOf("_") + 1);
      val = val.replace(/^program_type_/, "").replace(/^type_/, "");
      return `${prefixes[parts[0]]}: ${val}`;
    }
    return name;
  }

  // Generic tab controller. tabs = [{ id, label, render(canvas) }]
  function buildTabs(mount, ariaPrefix, tabs) {
    clearMount(mount);
    const tabBar = document.createElement("div");
    tabBar.className = "chart-tabs";
    tabBar.setAttribute("role", "tablist");
    const canvas = document.createElement("div");
    canvas.className = "adv-canvas";
    mount.appendChild(tabBar);
    mount.appendChild(canvas);

    let active = tabs[0].id;
    function draw() {
      const tab = tabs.find((t) => t.id === active);
      d3.select(canvas).selectAll("*").remove();
      tab.render(canvas);
      mount.setAttribute("aria-label", `${ariaPrefix}: ${tab.label}`);
    }
    tabs.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "chart-tab";
      btn.type = "button";
      btn.textContent = t.label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(t.id === active));
      btn.addEventListener("click", () => {
        active = t.id;
        tabBar.querySelectorAll(".chart-tab").forEach((b, i) =>
          b.setAttribute("aria-selected", String(tabs[i].id === active)));
        draw();
      });
      tabBar.appendChild(btn);
    });
    draw();

    // Debounced redraw on resize
    let rt = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(draw, 180);
    });
    ro.observe(mount);
  }

  // Simple (no-tab) mount with resize redraw
  function buildSimple(mount, ariaLabel, render) {
    function draw() {
      clearMount(mount);
      render(mount);
    }
    mount.setAttribute("aria-label", ariaLabel);
    draw();
    let rt = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(draw, 180);
    });
    ro.observe(mount);
  }

  function legend(host, items) {
    const div = document.createElement("div");
    div.className = "chart-legend";
    div.innerHTML = items.map((it) =>
      `<span class="legend-item"><span class="legend-swatch ${it.round ? "round" : ""}" style="background:${it.color}"></span>${it.label}</span>`
    ).join("");
    host.appendChild(div);
  }

  function caption(host, html) {
    const div = document.createElement("div");
    div.className = "chart-caption";
    div.innerHTML = html;
    host.appendChild(div);
  }

  // ═══════════════════════════════════════════════════════════
  // (a) MODEL EXPLAINABILITY  →  #chart-model-explain
  // ═══════════════════════════════════════════════════════════
  function renderModelExplain() {
    const mount = document.getElementById("chart-model-explain");
    if (!mount || !INSIGHTS.models) return;
    const M = INSIGHTS.models;

    // ── feature importance (RF + XGB side by side) ──
    function renderImportance(canvas) {
      const models = [
        { key: "random_forest_acceptance", title: "Random Forest — элсэлт таамаглах", grad: "url(#grad-purple)", color: COLOR.purple },
        { key: "xgb_scholarship", title: "XGBoost — тэтгэлэг таамаглах", grad: "url(#grad-teal)", color: COLOR.teal },
      ].filter((m) => M[m.key] && M[m.key].feature_importances);

      const W = Math.max(canvas.clientWidth || 820, 640);
      const colW = W / models.length;
      const H = 360;
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);

      models.forEach((m, ci) => {
        const data = M[m.key].feature_importances.slice(0, 8);
        const margin = { top: 44, right: 56, bottom: 24, left: 150 };
        const innerW = colW - margin.left - margin.right;
        const innerH = H - margin.top - margin.bottom;
        const g = svg.append("g").attr("transform", `translate(${ci * colW + margin.left}, ${margin.top})`);

        svg.append("text").attr("class", "adv-title")
          .attr("x", ci * colW + margin.left).attr("y", 24).text(m.title);

        const y = d3.scaleBand().domain(data.map((d) => d.feature)).range([0, innerH]).padding(0.22);
        const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.importance) * 1.12]).range([0, innerW]);

        g.append("g").attr("class", "adv-axis")
          .call(d3.axisLeft(y).tickSize(0).tickFormat((f) => {
            const p = prettyFeature(f);
            return p.length > 20 ? p.slice(0, 19) + "…" : p;
          }))
          .select(".domain").remove();

        g.selectAll("rect").data(data).enter().append("rect")
          .attr("y", (d) => y(d.feature)).attr("height", y.bandwidth())
          .attr("x", 0).attr("rx", 4).attr("fill", m.grad)
          .attr("tabindex", 0)
          .attr("width", 0)
          .on("mousemove", function (e, d) {
            const [mx, my] = d3.pointer(e, canvas);
            tip.html(`<strong>${prettyFeature(d.feature)}</strong><br/>Ач холбогдол: ${(d.importance * 100).toFixed(1)}%`)
              .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
          })
          .on("mouseleave", () => tip.classed("visible", false))
          .transition().duration(750).delay((d, i) => i * 55).ease(d3.easeCubicOut)
          .attr("width", (d) => x(d.importance));

        g.selectAll("text.val").data(data).enter().append("text")
          .attr("class", "adv-value-label")
          .attr("x", (d) => x(d.importance) + 6)
          .attr("y", (d) => y(d.feature) + y.bandwidth() / 2 + 4)
          .text((d) => (d.importance * 100).toFixed(1) + "%")
          .style("opacity", 0).transition().delay((d, i) => 500 + i * 55).style("opacity", 1);
      });
      caption(canvas, "Загвар бүр аль хувьсагчид элсэлт / тэтгэлгийн шийдэлд хамгийн их нөлөөтэйг хэмжсэн. Урт багана = илүү чухал.");
    }

    // ── ROC curves (all models on one plot) ──
    function renderROC(canvas) {
      const curves = [
        { key: "random_forest_acceptance", label: "RF · элсэлт", color: COLOR.purple },
        { key: "logreg_visa", label: "LogReg · виз", color: COLOR.teal },
        { key: "xgb_scholarship", label: "XGB · тэтгэлэг", color: COLOR.coral },
      ].filter((c) => M[c.key] && M[c.key].roc);

      const W = Math.max(canvas.clientWidth || 820, 560);
      const H = 420;
      const margin = { top: 30, right: 30, bottom: 50, left: 56 };
      const innerW = W - margin.left - margin.right;
      const innerH = H - margin.top - margin.bottom;
      const svg = makeSvg(canvas, W, H);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
      const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

      g.append("g").attr("class", "adv-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5));
      g.append("g").attr("class", "adv-axis").call(d3.axisLeft(y).ticks(5));

      g.append("text").attr("class", "axis-label")
        .attr("x", innerW / 2).attr("y", innerH + 40).attr("text-anchor", "middle")
        .text("False Positive Rate (худал эерэг)");
      g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -40).attr("text-anchor", "middle")
        .text("True Positive Rate (зөв эерэг)");

      // diagonal reference
      g.append("line").attr("x1", 0).attr("y1", innerH).attr("x2", innerW).attr("y2", 0)
        .attr("stroke", cssVar("--chart-axis")).attr("stroke-dasharray", "4 5").attr("opacity", 0.6);

      const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1])).curve(d3.curveBasis);
      curves.forEach((c, i) => {
        const pts = M[c.key].roc.fpr.map((f, j) => [f, M[c.key].roc.tpr[j]]);
        const path = g.append("path").datum(pts)
          .attr("fill", "none").attr("stroke", c.color).attr("stroke-width", 2.6)
          .attr("d", line);
        const len = path.node().getTotalLength();
        path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().duration(1100).delay(i * 200).ease(d3.easeCubicInOut)
          .attr("stroke-dashoffset", 0);
      });

      legend(canvas, curves.map((c) => ({
        color: c.color,
        label: `${c.label} · AUC ${M[c.key].auc.toFixed(3)}`,
      })));
      caption(canvas, "ROC муруй загвар сайн / муу ангилж буйг харуулна. Зүүн дээд булан руу ойртох тусам, AUC 1.0-д ойртох тусам сайн. Тасархай шугам = санамсаргүй таамаг.");
    }

    // ── Confusion matrices (3 small grids) ──
    function renderConfusion(canvas) {
      const models = [
        { key: "random_forest_acceptance", title: "RF · элсэлт", neg: "Татгалзсан", pos: "Элссэн" },
        { key: "logreg_visa", title: "LogReg · виз", neg: "Татгалзсан", pos: "Зөвшөөрсөн" },
        { key: "xgb_scholarship", title: "XGB · тэтгэлэг", neg: "Аваагүй", pos: "Авсан" },
      ].filter((m) => M[m.key] && M[m.key].confusion_matrix);

      const W = Math.max(canvas.clientWidth || 820, 640);
      const colW = W / models.length;
      const H = 320;
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);

      models.forEach((m, ci) => {
        const cm = M[m.key].confusion_matrix; // [[TN,FP],[FN,TP]]
        const flat = cm.flat();
        const maxV = d3.max(flat) || 1;
        const color = d3.scaleSequential(d3.interpolatePurples).domain([0, maxV]);
        const cell = 76;
        const ox = ci * colW + (colW - cell * 2) / 2;
        const oy = 64;
        svg.append("text").attr("class", "adv-title")
          .attr("x", ci * colW + colW / 2).attr("y", 30).attr("text-anchor", "middle").text(m.title);

        const labels = [m.neg, m.pos];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const v = cm[r][c];
            const gx = ox + c * cell, gy = oy + r * cell;
            svg.append("rect").attr("x", gx).attr("y", gy).attr("width", cell - 3).attr("height", cell - 3)
              .attr("rx", 5).attr("fill", color(v)).attr("tabindex", 0)
              .on("mousemove", function (e) {
                const [mx, my] = d3.pointer(e, canvas);
                const kind = r === c ? (r === 1 ? "Зөв эерэг (TP)" : "Зөв сөрөг (TN)") : (r === 0 ? "Худал эерэг (FP)" : "Худал сөрөг (FN)");
                tip.html(`<strong>${kind}</strong><br/>${v} тохиолдол`)
                  .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
              })
              .on("mouseleave", () => tip.classed("visible", false));
            svg.append("text").attr("class", "adv-cell-label")
              .attr("x", gx + (cell - 3) / 2).attr("y", gy + (cell - 3) / 2 + 4)
              .attr("text-anchor", "middle")
              .attr("fill", v > maxV * 0.55 ? "#fff" : "#1a2138")
              .text(v);
          }
          // row label (actual)
          svg.append("text").attr("class", "adv-axis")
            .attr("x", ox - 8).attr("y", oy + r * cell + cell / 2)
            .attr("text-anchor", "end").attr("font-size", 10).attr("fill", cssVar("--chart-axis"))
            .text(labels[r]);
          // col label (predicted)
          svg.append("text").attr("class", "adv-axis")
            .attr("x", ox + r * cell + cell / 2).attr("y", oy + 2 * cell + 16)
            .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", cssVar("--chart-axis"))
            .text(labels[r]);
        }
        svg.append("text").attr("x", ci * colW + colW / 2).attr("y", oy - 12)
          .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", cssVar("--text-muted"))
          .text("→ Таамагласан");
      });
      caption(canvas, "Confusion matrix: мөр = бодит ангилал, багана = загварын таамаг. Диагональ нүд (бараан) = зөв таамаглал. <strong>FP / FN</strong> нь алдааны төрлийг харуулна.");
    }

    // ── LogReg coefficients (diverging bars) ──
    function renderCoefs(canvas) {
      const lr = M.logreg_visa;
      if (!lr || !lr.coefs) {
        canvas.innerHTML = "<div class='chart-caption'>Logistic regression коэффициент олдсонгүй.</div>";
        return;
      }
      const data = Object.entries(lr.coefs)
        .map(([f, v]) => ({ feature: f, value: v }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 12);

      const W = Math.max(canvas.clientWidth || 820, 560);
      const margin = { top: 20, right: 60, bottom: 40, left: 180 };
      const innerW = W - margin.left - margin.right;
      const rowH = 26;
      const innerH = data.length * rowH;
      const H = innerH + margin.top + margin.bottom;
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const mx = d3.max(data, (d) => Math.abs(d.value)) * 1.1;
      const x = d3.scaleLinear().domain([-mx, mx]).range([0, innerW]);
      const y = d3.scaleBand().domain(data.map((d) => d.feature)).range([0, innerH]).padding(0.25);

      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5));
      g.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", innerH)
        .attr("stroke", cssVar("--chart-axis")).attr("opacity", 0.7);

      g.append("g").attr("class", "adv-axis")
        .call(d3.axisLeft(y).tickSize(0).tickFormat((f) => {
          const p = prettyFeature(f);
          return p.length > 24 ? p.slice(0, 23) + "…" : p;
        }))
        .select(".domain").remove();

      g.selectAll("rect").data(data).enter().append("rect")
        .attr("y", (d) => y(d.feature)).attr("height", y.bandwidth())
        .attr("x", (d) => x(Math.min(0, d.value)))
        .attr("rx", 3)
        .attr("fill", (d) => d.value >= 0 ? cssVar("--chart-pos") : cssVar("--chart-neg"))
        .attr("tabindex", 0)
        .attr("width", 0)
        .on("mousemove", function (e, d) {
          const [px, py] = d3.pointer(e, canvas);
          tip.html(`<strong>${prettyFeature(d.feature)}</strong><br/>Коэффициент: ${d.value >= 0 ? "+" : ""}${d.value.toFixed(3)}<br/>${d.value >= 0 ? "Виз батлагдах магадлалыг нэмэгдүүлнэ" : "Виз батлагдах магадлалыг бууруулна"}`)
            .style("left", (px + 14) + "px").style("top", (py - 14) + "px").classed("visible", true);
        })
        .on("mouseleave", () => tip.classed("visible", false))
        .transition().duration(700).delay((d, i) => i * 40).ease(d3.easeCubicOut)
        .attr("width", (d) => Math.abs(x(d.value) - x(0)));

      g.selectAll("text.val").data(data).enter().append("text")
        .attr("class", "adv-value-label")
        .attr("x", (d) => d.value >= 0 ? x(d.value) + 6 : x(d.value) - 6)
        .attr("text-anchor", (d) => d.value >= 0 ? "start" : "end")
        .attr("y", (d) => y(d.feature) + y.bandwidth() / 2 + 4)
        .text((d) => (d.value >= 0 ? "+" : "") + d.value.toFixed(2))
        .style("opacity", 0).transition().delay((d, i) => 450 + i * 40).style("opacity", 1);

      legend(canvas, [
        { color: cssVar("--chart-pos"), label: "Эерэг — виз батлагдах магадлал ↑" },
        { color: cssVar("--chart-neg"), label: "Сөрөг — виз батлагдах магадлал ↓" },
      ]);
      caption(canvas, "Logistic regression-ийн стандартчилсан коэффициентүүд. Тэг шугамаас хол байх тусам тухайн хувьсагч виз батлагдах магадлалд илүү хүчтэй нөлөөтэй.");
    }

    buildTabs(mount, "Загварын тайлбарлагдах байдал", [
      { id: "imp", label: "Хүчин зүйлийн ач холбогдол", render: renderImportance },
      { id: "roc", label: "ROC муруй", render: renderROC },
      { id: "cm", label: "Confusion matrix", render: renderConfusion },
      { id: "coef", label: "LogReg коэффициент", render: renderCoefs },
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // (b) COHORT FUNNEL  →  #chart-cohort-funnel
  // ═══════════════════════════════════════════════════════════
  function renderCohortFunnel() {
    const mount = document.getElementById("chart-cohort-funnel");
    if (!mount || !INSIGHTS.bi_hsk_funnel) return;

    buildSimple(mount, "HSK түвшингээр элсэлтийн юүлүүр (funnel)", (host) => {
      const raw = INSIGHTS.bi_hsk_funnel;
      const data = Object.keys(raw).sort().map((k) => ({
        hsk: +k, applied: raw[k].applied, accepted: raw[k].accepted, rate: raw[k].rate,
      }));

      const W = Math.max(host.clientWidth || 820, 560);
      const margin = { top: 30, right: 150, bottom: 40, left: 70 };
      const innerW = W - margin.left - margin.right;
      const rowH = 56;
      const innerH = data.length * rowH;
      const H = innerH + margin.top + margin.bottom;
      const svg = makeSvg(host, W, H);
      const tip = makeTooltip(host);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const maxApplied = d3.max(data, (d) => d.applied);
      const x = d3.scaleLinear().domain([0, maxApplied]).range([0, innerW]);
      const y = d3.scaleBand().domain(data.map((d) => d.hsk)).range([0, innerH]).padding(0.32);
      const rateColor = d3.scaleSequential(d3.interpolateViridis).domain([0, 100]);

      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(fmtInt));
      g.append("g").attr("class", "adv-axis")
        .call(d3.axisLeft(y).tickSize(0).tickFormat((d) => "HSK " + d))
        .select(".domain").remove();

      const bh = y.bandwidth();
      // applied (track) bars — centred trapezoid feel
      data.forEach((d) => {
        const cy = y(d.hsk);
        g.append("rect").attr("class", "track")
          .attr("x", 0).attr("y", cy).attr("height", bh)
          .attr("width", x(d.applied)).attr("rx", 6)
          .attr("fill", cssVar("--chart-track")).attr("stroke", cssVar("--border-soft"));
      });
      // accepted bars
      g.selectAll("rect.acc").data(data).enter().append("rect")
        .attr("class", "acc")
        .attr("x", 0).attr("y", (d) => y(d.hsk)).attr("height", bh).attr("rx", 6)
        .attr("fill", (d) => rateColor(d.rate))
        .attr("tabindex", 0)
        .attr("width", 0)
        .on("mousemove", function (e, d) {
          const [mx, my] = d3.pointer(e, host);
          tip.html(`<strong>HSK ${d.hsk}</strong><br/>Өргөдөл: ${fmtInt(d.applied)}<br/>Элссэн: ${fmtInt(d.accepted)}<br/>Элсэлтийн хувь: <strong>${d.rate}%</strong>`)
            .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
        })
        .on("mouseleave", () => tip.classed("visible", false))
        .transition().duration(900).delay((d, i) => i * 90).ease(d3.easeCubicOut)
        .attr("width", (d) => x(d.accepted));

      // applied count label (end of track)
      g.selectAll("text.app").data(data).enter().append("text")
        .attr("class", "adv-value-label")
        .attr("x", (d) => x(d.applied) + 8).attr("y", (d) => y(d.hsk) + bh / 2 - 3)
        .text((d) => fmtInt(d.applied) + " өргөдөл")
        .style("opacity", 0).transition().delay(600).style("opacity", 1);
      // rate label
      g.selectAll("text.rt").data(data).enter().append("text")
        .attr("class", "adv-value-label")
        .attr("x", (d) => x(d.applied) + 8).attr("y", (d) => y(d.hsk) + bh / 2 + 13)
        .attr("fill", (d) => rateColor(d.rate))
        .text((d) => `${d.rate}% элссэн (${fmtInt(d.accepted)})`)
        .style("opacity", 0).transition().delay(700).style("opacity", 1);

      // color scale legend for acceptance rate
      const sc = document.createElement("div");
      sc.className = "color-scale-legend";
      sc.innerHTML = `<span>Элсэлтийн хувь 0%</span>
        <span class="scale-bar" style="background:linear-gradient(90deg, ${rateColor(0)}, ${rateColor(35)}, ${rateColor(70)}, ${rateColor(100)})"></span>
        <span>100%</span>`;
      host.appendChild(sc);
      caption(host, "Юүлүүр нь HSK түвшин бүрийн <strong>өргөдөл → элсэлт</strong> хувирлыг харуулна. Сул өнгөт зураас = нийт өргөдөл, дүүргэсэн багана = элссэн тоо. HSK дээшлэх тусам элсэлтийн хувь огцом нэмэгддэг.");
    });
  }

  // ═══════════════════════════════════════════════════════════
  // (c) CORRELATION & DISTRIBUTION  →  #chart-corr-distribution
  // ═══════════════════════════════════════════════════════════
  function renderCorrDistribution() {
    const mount = document.getElementById("chart-corr-distribution");
    if (!mount) return;

    // ── Heatmap ──
    function renderHeatmap(canvas) {
      const cm = INSIGHTS.correlation_matrix;
      if (!cm) { canvas.innerHTML = "<div class='chart-caption'>Корреляцийн матриц олдсонгүй.</div>"; return; }
      const labels = cm.labels;
      const n = labels.length;
      const W = Math.max(canvas.clientWidth || 620, 360);
      const grid = Math.min(W - 200, 440);
      const margin = { top: 86, left: 130 };
      const blockW = margin.left + grid + 24;
      const H = margin.top + grid + 30;
      const offX = Math.max(0, (W - blockW) / 2);
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);
      const g = svg.append("g").attr("transform", `translate(${offX + margin.left},${margin.top})`);

      const band = d3.scaleBand().domain(d3.range(n)).range([0, grid]).padding(0.06);
      const color = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const v = cm.matrix[r][c];
          g.append("rect")
            .attr("x", band(c)).attr("y", band(r))
            .attr("width", band.bandwidth()).attr("height", band.bandwidth())
            .attr("rx", 4).attr("fill", color(v)).attr("tabindex", 0)
            .on("mousemove", function (e) {
              const [mx, my] = d3.pointer(e, canvas);
              tip.html(`<strong>${labels[r]} ↔ ${labels[c]}</strong><br/>Pearson r = ${v.toFixed(3)}`)
                .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
            })
            .on("mouseleave", () => tip.classed("visible", false));
          g.append("text").attr("class", "adv-cell-label")
            .attr("x", band(c) + band.bandwidth() / 2)
            .attr("y", band(r) + band.bandwidth() / 2 + 4)
            .attr("text-anchor", "middle")
            .attr("fill", Math.abs(v) > 0.55 ? "#fff" : "#1a2138")
            .text(v.toFixed(2));
        }
      }
      // axis labels
      labels.forEach((lab, i) => {
        g.append("text").attr("x", band(i) + band.bandwidth() / 2).attr("y", -10)
          .attr("text-anchor", "start").attr("transform", `rotate(-40, ${band(i) + band.bandwidth() / 2}, -10)`)
          .attr("font-size", 11).attr("fill", cssVar("--chart-axis")).text(lab);
        g.append("text").attr("x", -8).attr("y", band(i) + band.bandwidth() / 2 + 4)
          .attr("text-anchor", "end").attr("font-size", 11).attr("fill", cssVar("--chart-axis")).text(lab);
      });

      const sc = document.createElement("div");
      sc.className = "color-scale-legend";
      sc.innerHTML = `<span>−1 (сөрөг)</span>
        <span class="scale-bar" style="background:linear-gradient(90deg, ${color(-1)}, ${color(0)}, ${color(1)})"></span>
        <span>+1 (эерэг)</span>`;
      canvas.appendChild(sc);
      caption(canvas, "Pearson корреляци: оюутны тоон үзүүлэлтүүд хоорондоо хэр уялдаатайг −1-ээс +1 хооронд хэмжинэ. Хүчтэй холбоо нь хэт давхардсан хувьсагчийг илрүүлнэ.");
    }

    // ── Box plots ──
    function renderBoxplots(canvas) {
      const boxes = INSIGHTS.scholarship_box;
      if (!boxes || !boxes.length) { canvas.innerHTML = "<div class='chart-caption'>Тэтгэлгийн тархалтын өгөгдөл олдсонгүй.</div>"; return; }
      const W = Math.max(canvas.clientWidth || 820, 560);
      const margin = { top: 30, right: 30, bottom: 90, left: 70 };
      const innerW = W - margin.left - margin.right;
      const innerH = 320;
      const H = innerH + margin.top + margin.bottom;
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().domain(boxes.map((b) => b.type)).range([0, innerW]).padding(0.4);
      const allVals = boxes.flatMap((b) => [b.whisker_lo, b.whisker_hi, ...b.outliers]);
      const y = d3.scaleLinear().domain([0, d3.max(allVals) * 1.05]).range([innerH, 0]).nice();

      g.append("g").attr("class", "adv-grid")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""));
      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-25)").attr("text-anchor", "end");
      g.append("g").attr("class", "adv-axis")
        .call(d3.axisLeft(y).ticks(6).tickFormat((d) => d3.format(",.0f")(d)));
      g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -54).attr("text-anchor", "middle")
        .text("Тэтгэлгийн дүн (юань)");

      const palette = [COLOR.purple, COLOR.teal, COLOR.coral, COLOR.yellow, COLOR.pink, COLOR.purple2];
      boxes.forEach((b, i) => {
        const cx = x(b.type) + x.bandwidth() / 2;
        const bw = x.bandwidth();
        const col = palette[i % palette.length];
        const gb = g.append("g").attr("tabindex", 0)
          .on("mousemove", function (e) {
            const [mx, my] = d3.pointer(e, canvas);
            tip.html(`<strong>${b.type}</strong><br/>Медиан: ${fmtInt(b.median)}¥<br/>Q1–Q3: ${fmtInt(b.q1)}–${fmtInt(b.q3)}¥<br/>Хязгаар: ${fmtInt(b.whisker_lo)}–${fmtInt(b.whisker_hi)}¥<br/>n = ${b.count}`)
              .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
          })
          .on("mouseleave", () => tip.classed("visible", false));
        // whisker
        gb.append("line").attr("x1", cx).attr("x2", cx).attr("y1", y(b.whisker_lo)).attr("y2", y(b.whisker_hi))
          .attr("stroke", col).attr("stroke-width", 1.6);
        gb.append("line").attr("x1", cx - bw / 4).attr("x2", cx + bw / 4).attr("y1", y(b.whisker_lo)).attr("y2", y(b.whisker_lo)).attr("stroke", col).attr("stroke-width", 1.6);
        gb.append("line").attr("x1", cx - bw / 4).attr("x2", cx + bw / 4).attr("y1", y(b.whisker_hi)).attr("y2", y(b.whisker_hi)).attr("stroke", col).attr("stroke-width", 1.6);
        // box
        gb.append("rect").attr("x", cx - bw / 2).attr("width", bw)
          .attr("y", y(b.q3)).attr("height", Math.max(2, y(b.q1) - y(b.q3)))
          .attr("rx", 4).attr("fill", col).attr("fill-opacity", 0.35).attr("stroke", col).attr("stroke-width", 1.6);
        // median
        gb.append("line").attr("x1", cx - bw / 2).attr("x2", cx + bw / 2).attr("y1", y(b.median)).attr("y2", y(b.median)).attr("stroke", col).attr("stroke-width", 2.6);
        // outliers
        (b.outliers || []).forEach((o) => {
          gb.append("circle").attr("cx", cx).attr("cy", y(o)).attr("r", 2.6).attr("fill", col).attr("fill-opacity", 0.7);
        });
      });
      caption(canvas, "Box plot: тэтгэлгийн төрөл бүрийн дүнгийн тархалт. Хайрцаг = Q1–Q3 (дунд 50%), голын зураас = медиан, сахал = хэвийн хязгаар, цэгүүд = гажуу утга (outlier).");
    }

    // ── PCA scatter ──
    function renderPCA(canvas) {
      const pca = INSIGHTS.personas_pca;
      if (!pca || !pca.points) { canvas.innerHTML = "<div class='chart-caption'>PCA проекц олдсонгүй.</div>"; return; }
      const W = Math.max(canvas.clientWidth || 820, 560);
      const H = 460;
      const margin = { top: 24, right: 24, bottom: 46, left: 50 };
      const innerW = W - margin.left - margin.right;
      const innerH = H - margin.top - margin.bottom;
      const svg = makeSvg(canvas, W, H);
      const tip = makeTooltip(canvas);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const xe = d3.extent(pca.points, (d) => d.x);
      const ye = d3.extent(pca.points, (d) => d.y);
      const padX = (xe[1] - xe[0]) * 0.06, padY = (ye[1] - ye[0]) * 0.06;
      const x = d3.scaleLinear().domain([xe[0] - padX, xe[1] + padX]).range([0, innerW]);
      const y = d3.scaleLinear().domain([ye[0] - padY, ye[1] + padY]).range([innerH, 0]);
      const palette = [COLOR.purple, COLOR.teal, COLOR.coral, COLOR.yellow, COLOR.pink];
      const color = (c) => palette[c % palette.length];

      g.append("g").attr("class", "adv-grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
      g.append("g").attr("class", "adv-grid").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickSize(-innerH).tickFormat(""));
      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
      g.append("g").attr("class", "adv-axis").call(d3.axisLeft(y).ticks(5));
      g.append("text").attr("class", "axis-label").attr("x", innerW / 2).attr("y", innerH + 38).attr("text-anchor", "middle").text("Үндсэн бүрэлдэхүүн 1 (PC1)");
      g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -36).attr("text-anchor", "middle").text("Үндсэн бүрэлдэхүүн 2 (PC2)");

      g.selectAll("circle.pt").data(pca.points).enter().append("circle")
        .attr("class", "pt")
        .attr("cx", (d) => x(d.x)).attr("cy", (d) => y(d.y))
        .attr("r", 0)
        .attr("fill", (d) => color(d.cluster)).attr("fill-opacity", 0.4)
        .transition().duration(600).delay((d, i) => Math.min(i * 0.5, 400)).attr("r", 3);

      // centroids
      Object.entries(pca.centroids).forEach(([cid, ct]) => {
        const c = +cid;
        g.append("circle").attr("cx", x(ct.x)).attr("cy", y(ct.y)).attr("r", 9)
          .attr("fill", color(c)).attr("stroke", "#fff").attr("stroke-width", 2)
          .attr("tabindex", 0)
          .on("mousemove", function (e) {
            const [mx, my] = d3.pointer(e, canvas);
            const cnt = pca.points.filter((p) => p.cluster === c).length;
            tip.html(`<strong>${pca.names[cid]}</strong><br/>Кластерын төв · ${cnt} оюутан`)
              .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
          })
          .on("mouseleave", () => tip.classed("visible", false));
      });

      legend(canvas, Object.entries(pca.names).map(([cid, name]) => ({
        color: color(+cid), label: name, round: true,
      })));
      caption(canvas, "PCA 1,500 оюутны 5 хэмжээст шинжийг 2 хэмжээст болгон шахаж зурлаа. Ойролцоо цэгүүд = төстэй оюутнууд. Том дугуй = K-Means кластерын төв (архетип).");
    }

    buildTabs(mount, "Корреляци ба тархалт", [
      { id: "heat", label: "Корреляцийн матриц", render: renderHeatmap },
      { id: "box", label: "Тэтгэлгийн тархалт (box plot)", render: renderBoxplots },
      { id: "pca", label: "PCA кластер scatter", render: renderPCA },
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // (d) GEOGRAPHIC FLOW & GROWTH
  // ═══════════════════════════════════════════════════════════
  function renderGeoFlow() {
    const mount = document.getElementById("chart-geo-flow");
    if (!mount || !window.DESTINATIONS_GEO) return;

    buildSimple(mount, "Аймаг → Хятад хот руух оюутны урсгал", (host) => {
      // Build aimag → city links
      const counts = new Map();
      DESTINATIONS_GEO.forEach((d) => {
        if (!d.student_aimag || !d.city) return;
        const key = d.student_aimag + "→" + d.city;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      // Top aimags & cities to keep readable
      const aimagTot = {}, cityTot = {};
      counts.forEach((v, k) => {
        const [a, c] = k.split("→");
        aimagTot[a] = (aimagTot[a] || 0) + v;
        cityTot[c] = (cityTot[c] || 0) + v;
      });
      const topAimags = new Set(Object.entries(aimagTot).sort((a, b) => b[1] - a[1]).slice(0, 8).map((d) => d[0]));
      const topCities = new Set(Object.entries(cityTot).sort((a, b) => b[1] - a[1]).slice(0, 9).map((d) => d[0]));

      const nodeNames = [];
      const nodeIndex = new Map();
      const addNode = (name) => {
        if (!nodeIndex.has(name)) { nodeIndex.set(name, nodeNames.length); nodeNames.push(name); }
        return nodeIndex.get(name);
      };
      const links = [];
      counts.forEach((v, k) => {
        let [a, c] = k.split("→");
        const an = topAimags.has(a) ? a : "Бусад аймаг";
        const cn = topCities.has(c) ? c : "Бусад хот";
        links.push({ source: addNode("◀ " + an), target: addNode(cn + " ▶"), value: v });
      });
      // merge duplicate links
      const merged = new Map();
      links.forEach((l) => {
        const key = l.source + "|" + l.target;
        merged.set(key, (merged.get(key) || 0) + l.value);
      });
      const finalLinks = [...merged.entries()].map(([key, value]) => {
        const [s, t] = key.split("|").map(Number);
        return { source: s, target: t, value };
      });

      const W = Math.max(host.clientWidth || 880, 600);
      const H = 540;
      const svg = makeSvg(host, W, H);
      const tip = makeTooltip(host);

      const sankey = d3.sankey()
        .nodeWidth(16).nodePadding(14)
        .extent([[8, 12], [W - 8, H - 12]]);
      const graph = sankey({
        nodes: nodeNames.map((name) => ({ name })),
        links: finalLinks.map((l) => ({ ...l })),
      });

      const palette = [COLOR.purple, COLOR.teal, COLOR.coral, COLOR.yellow, COLOR.pink, COLOR.purple2];
      const nodeColor = (d) => palette[d.index % palette.length];

      svg.append("g").selectAll("path").data(graph.links).enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", (d) => nodeColor(d.source))
        .attr("stroke-opacity", 0.32)
        .attr("stroke-width", (d) => Math.max(1, d.width))
        .on("mousemove", function (e, d) {
          const [mx, my] = d3.pointer(e, host);
          tip.html(`<strong>${d.source.name.replace("◀ ", "")} → ${d.target.name.replace(" ▶", "")}</strong><br/>${d.value} оюутан`)
            .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
          d3.select(this).attr("stroke-opacity", 0.6);
        })
        .on("mouseleave", function () { tip.classed("visible", false); d3.select(this).attr("stroke-opacity", 0.32); });

      const node = svg.append("g").selectAll("g").data(graph.nodes).enter().append("g");
      node.append("rect")
        .attr("x", (d) => d.x0).attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0).attr("height", (d) => Math.max(2, d.y1 - d.y0))
        .attr("rx", 3).attr("fill", nodeColor).attr("tabindex", 0)
        .on("mousemove", function (e, d) {
          const [mx, my] = d3.pointer(e, host);
          tip.html(`<strong>${d.name.replace("◀ ", "").replace(" ▶", "")}</strong><br/>${d.value} оюутан`)
            .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
        })
        .on("mouseleave", () => tip.classed("visible", false));
      node.append("text")
        .attr("x", (d) => d.x0 < W / 2 ? d.x1 + 7 : d.x0 - 7)
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => d.x0 < W / 2 ? "start" : "end")
        .attr("font-size", 11).attr("fill", cssVar("--text"))
        .text((d) => d.name.replace("◀ ", "").replace(" ▶", ""));

      caption(host, "Alluvial урсгал: зүүн талд Монголын аймаг, баруун талд Хятадын хот. Шугамын зузаан = тухайн замаар элссэн оюутны тоо. Улаанбаатарын давамгайлал тод харагдана.");
    });
  }

  function renderAimagGrowth() {
    const mount = document.getElementById("chart-aimag-growth-heat");
    if (!mount || !INSIGHTS.bi_aimag_growth) return;

    buildSimple(mount, "Аймгийн өсөлт ба чанарын дулааны зураг", (host) => {
      const data = INSIGHTS.bi_aimag_growth
        .filter((d) => d.recent + d.older > 0)
        .slice()
        .sort((a, b) => b.growth_x - a.growth_x)
        .slice(0, 14);

      const W = Math.max(host.clientWidth || 820, 560);
      const margin = { top: 20, right: 110, bottom: 44, left: 130 };
      const innerW = W - margin.left - margin.right;
      const rowH = 30;
      const innerH = data.length * rowH;
      const H = innerH + margin.top + margin.bottom;
      const svg = makeSvg(host, W, H);
      const tip = makeTooltip(host);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.growth_x) * 1.1]).range([0, innerW]);
      const y = d3.scaleBand().domain(data.map((d) => d.aimag)).range([0, innerH]).padding(0.25);
      const gpaExtent = d3.extent(data, (d) => d.gpa_avg);
      const color = d3.scaleSequential(d3.interpolateViridis).domain(gpaExtent);

      g.append("g").attr("class", "adv-axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat((d) => d + "×"));
      g.append("g").attr("class", "adv-axis")
        .call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
      g.append("text").attr("class", "axis-label")
        .attr("x", innerW / 2).attr("y", innerH + 38).attr("text-anchor", "middle")
        .text("Өсөлтийн коэффициент (2024–25 / 2019–22)");

      g.selectAll("rect").data(data).enter().append("rect")
        .attr("y", (d) => y(d.aimag)).attr("height", y.bandwidth())
        .attr("x", 0).attr("rx", 4)
        .attr("fill", (d) => color(d.gpa_avg))
        .attr("tabindex", 0)
        .attr("width", 0)
        .on("mousemove", function (e, d) {
          const [mx, my] = d3.pointer(e, host);
          tip.html(`<strong>${d.aimag}</strong><br/>Өсөлт: ${d.growth_x}×<br/>2024–25: ${d.recent} · 2019–22: ${d.older}<br/>Дундаж GPA: ${d.gpa_avg} · HSK: ${d.hsk_avg}`)
            .style("left", (mx + 14) + "px").style("top", (my - 14) + "px").classed("visible", true);
        })
        .on("mouseleave", () => tip.classed("visible", false))
        .transition().duration(800).delay((d, i) => i * 50).ease(d3.easeCubicOut)
        .attr("width", (d) => x(d.growth_x));

      g.selectAll("text.val").data(data).enter().append("text")
        .attr("class", "adv-value-label")
        .attr("x", (d) => x(d.growth_x) + 6).attr("y", (d) => y(d.aimag) + y.bandwidth() / 2 + 4)
        .text((d) => `${d.growth_x}× · GPA ${d.gpa_avg}`)
        .style("opacity", 0).transition().delay((d, i) => 500 + i * 50).style("opacity", 1);

      const sc = document.createElement("div");
      sc.className = "color-scale-legend";
      sc.innerHTML = `<span>Дундаж GPA ${gpaExtent[0]}</span>
        <span class="scale-bar" style="background:linear-gradient(90deg, ${color(gpaExtent[0])}, ${color((gpaExtent[0] + gpaExtent[1]) / 2)}, ${color(gpaExtent[1])})"></span>
        <span>${gpaExtent[1]}</span>`;
      host.appendChild(sc);
      caption(host, "Багана = аймаг тус бүрийн элсэлтийн өсөлт (саяхны үе / эхэн үе). Өнгө = тухайн аймгийн оюутнуудын дундаж GPA — өсөлт ба чанарыг нэг дор харуулна.");
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Entry point — called from main.js initEverything()
  // ═══════════════════════════════════════════════════════════
  function initAdvancedCharts() {
    if (typeof d3 === "undefined" || !window.INSIGHTS) return;
    const safe = (name, fn) => {
      try { fn(); } catch (e) { console.error(`[adv:${name}] алдаа:`, e); }
    };
    safe("modelExplain", renderModelExplain);
    safe("cohortFunnel", renderCohortFunnel);
    safe("corrDistribution", renderCorrDistribution);
    safe("geoFlow", renderGeoFlow);
    safe("aimagGrowth", renderAimagGrowth);
    if (window.ScrollTrigger) {
      setTimeout(() => window.ScrollTrigger.refresh(), 300);
    }
  }

  window.initAdvancedCharts = initAdvancedCharts;
})();
