/* ═══════════════════════════════════════════════════════════════════════
   deep-analytics.js — ML explainability + correlation + PCA + boxplot
   ═══════════════════════════════════════════════════════════════════════ */

import * as d3 from 'd3';
import { fmtNum } from './data-loader.js';

const FEATURE_MN = {
  hsk_level: 'HSK түвшин',
  hsk_score: 'HSK оноо',
  gpa_percent: 'GPA',
  family_income_mnt: 'Гэр бүлийн орлого',
  apply_age: 'Нас',
  is_high_school_senior: 'Ахлах төгсөгч',
  'tier_985': '985 зэрэглэл',
  'tier_C9': 'C9 зэрэглэл',
  'tier_Provincial': 'Provincial',
  'anko_program_type_6+6': '6+6 хөтөлбөр',
  'anko_program_type_1+4': '1+4 хөтөлбөр',
  'anko_program_type_Fall Bachelor': 'Fall Bachelor',
  'anko_program_type_Master/PhD': 'Master/PhD',
  'aimag_Улаанбаатар': 'Улаанбаатар',
  'aimag_Дархан-Уул': 'Дархан-Уул',
  'aimag_Орхон': 'Орхон',
  'aimag_Сэлэнгэ': 'Сэлэнгэ',
  'aimag_Увс': 'Увс',
  'school_type_Private': 'Private сургууль',
  'school_type_Public': 'Public сургууль',
  'field_Business': 'Бизнес',
  'field_Engineering': 'Инженерчлэл',
  'field_Medicine': 'Анагаах',
  'field_Humanities': 'Хүмүүнлэг',
  'field_Science': 'Шинжлэх ухаан',
  'field_Language': 'Хэл',
  'field_Arts': 'Урлаг',
};
const mnFeat = (k) => FEATURE_MN[k] || k;

export function mountDeepAnalytics(insights) {
  mountMLTabs(insights);
  mountCorrelation(insights);
  mountPCA(insights);
  mountBoxplot(insights);
  mountScholarshipKPI(insights);
}

/* ── ML tabs (RF / LogReg / XGB / HSK funnel) ───────────────────────────── */
function mountMLTabs(insights) {
  const tabs = document.querySelectorAll('#ml-tabs .tab');
  const body = document.getElementById('ml-tab-body');
  if (!tabs.length || !body) return;
  const models = insights.models;

  function render(tabKey) {
    body.innerHTML = '';
    tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === tabKey));

    if (tabKey === 'fun') {
      body.appendChild(makeHSKFunnel(insights.bi_hsk_funnel));
      return;
    }
    const m = tabKey === 'rf' ? models.random_forest_acceptance
            : tabKey === 'lr' ? models.logreg_visa
            : models.xgb_scholarship;
    if (!m) { body.textContent = 'No model.'; return; }
    const title = tabKey === 'rf' ? 'Random Forest · Элсэлт'
                : tabKey === 'lr' ? 'Logistic Regression · Виз'
                : 'XGBoost · Тэтгэлэг';
    const grid = document.createElement('div'); grid.className = 'ml-grid';

    // 1. Feature importance / coefficient bar
    const fiCard = document.createElement('div'); fiCard.className = 'ml-card';
    const fiData = m.feature_importances
      || (m.coefs ? Object.entries(m.coefs).map(([feature, importance]) => ({ feature, importance: Math.abs(importance), signed: importance })) : []);
    fiData.sort((a,b) => b.importance - a.importance);
    fiCard.innerHTML = `<h5>Гол хувьсагч (top 8)</h5>`;
    fiCard.appendChild(makeFeatureBars(fiData.slice(0, 8), tabKey === 'lr'));
    grid.appendChild(fiCard);

    // 2. ROC card
    const rocCard = document.createElement('div'); rocCard.className = 'ml-card';
    rocCard.innerHTML = `<h5>ROC муруй</h5><div class="ml-badge">Accuracy ${(m.accuracy*100).toFixed(1)}%</div>`;
    rocCard.appendChild(makeROC(m.roc));
    grid.appendChild(rocCard);

    // 3. Confusion matrix card
    const cmCard = document.createElement('div'); cmCard.className = 'ml-card';
    cmCard.innerHTML = `<h5>Confusion матриц</h5>`;
    cmCard.appendChild(makeConfusion(m.confusion_matrix));
    grid.appendChild(cmCard);

    body.appendChild(grid);

    // Append a per-tab detailed Mongolian explainer block below the analytics
    body.appendChild(buildMLExplainer(tabKey));
  }

  tabs.forEach(t => t.addEventListener('click', () => render(t.dataset.tab)));
  render('rf');
}

/* Per-tab Mongolian explainer — appears under the chosen tab's analytics */
function buildMLExplainer(tabKey) {
  const wrap = document.createElement('article');
  wrap.className = 'ml-explainer';

  const blocks = {
    rf: {
      title: 'Random Forest · Элсэлтийн магадлал',
      stat: '68.6% нарийвчлал',
      paras: [
        'Random Forest загвар тестийн багц дээр элсэлт батлагдах эсэхийг <strong>68.6% нарийвчлалтай</strong> таамагласан. Энэ загвар олон шийдвэрийн модны нийлбэр дүгнэлт ашигладаг тул HSK, GPA, орлого зэрэг хүчин зүйлсийн хам нөлөөг илүү сайн илрүүлдэг.',
        '<strong>Гол хувьсагч:</strong> <span class="ml-hl">HSK түвшин (22%)</span> — хамгийн чухал, дараа нь <span class="ml-hl">GPA (14.4%)</span>, <span class="ml-hl">HSK оноо (13.8%)</span>, <span class="ml-hl">Өрхийн орлого (13.3%)</span>, бүртгүүлсэн нас (6.0%). Эдгээр хувьсагчид элсэлтийн шийдвэрт хамгийн их жинтэй гарсан.',
        '<strong>Алдааны матриц:</strong> Загвар татгалзсан тохиолдлын 154-ийг зөв, 104-ийг буруу ангилсан. Иймээс энэ үр дүнг эцсийн шийдвэр биш, <strong>зөвлөмжийн түвшний эрсдэлийн дохио</strong> гэж ашиглах нь зөв. Recall: 232/(232+73) = <strong>76%</strong>.',
      ],
    },
    lr: {
      title: 'Logistic Regression · Виз батлагдах магадлал',
      stat: '95.1% нарийвчлал',
      paras: [
        'Визийн өгөгдөл хүчтэй <strong>тэнцвэргүй</strong>: ихэнх кейс батлагдсан тул accuracy өндөр харагдаж байна. Гэхдээ татгалзсан тохиолдлыг ялгах чадвар сул байгаа учраас энэ загварыг болгоомжтой тайлбарлах хэрэгтэй. <strong>Ийм өндөр accuracy дангаараа хангалттай үзүүлэлт биш.</strong>',
        '<strong>Стандартчилагдсан коэффициент:</strong> <span class="ml-hl">HSK түвшин (+0.12)</span>, <span class="ml-hl">өрхийн орлого (+0.16)</span> нь виз батлагдах магадлалыг ихэсгэдэг бол <span class="ml-hl">HSK оноо (−0.15)</span>, <span class="ml-hl">бүртгүүлсэн нас (−0.24)</span>, <span class="ml-hl">GPA (−0.07)</span> нь бууруулдаг. Энэ нь визийн шийдвэр зөвхөн академик чанарт биш, <strong>санхүүгийн нотолгоо</strong>-нд илүү тулгуурладгийг харуулна.',
        '<strong>Анхааруулга:</strong> 14 татгалзсан жишээ нь хэт цөөн — загвар хангалттай ялгаж сурах өгөгдөл байхгүй. <strong>Бодит хэрэглээнд</strong> ашиглахын өмнө татгалзсан кейсийг нэмэгдүүлэх, эсвэл тэнцвэргүй өгөгдөлд тохирсон сургалтын арга хэрэглэх шаардлагатай.',
      ],
    },
    xgb: {
      title: 'XGBoost · Тэтгэлэг авах магадлал',
      stat: '54.4% нарийвчлал',
      paras: [
        'Gradient boosting загвар нь өмнөх алхмын алдаанаас сурдаг. <strong>Нарийвчлал 54.4%</strong> — санамсаргүй таамгаас бараг 5pp дээгүүр. Тэтгэлгийн шийдвэр нь олон шалгуур зэрэг нөлөөлдөг, харьцангуй тогтворгүй ангилал болохыг энэ үр дүн харуулж байна.',
        '<strong>Top хувьсагчид:</strong> <span class="ml-hl">HSK түвшин (7.0%)</span>, <span class="ml-hl">Увс аймгаас бүртгүүлсэн эсэх (5.4%)</span>, <span class="ml-hl">Анагаах салбар (5.3%)</span>, <span class="ml-hl">УБ-аас бүртгүүлсэн (5.1%)</span>, <span class="ml-hl">Бизнес салбар (4.6%)</span>. Тэтгэлгийн төрөл бүр өөр шалгууртай байж болохыг харуулна.',
        '<strong>Алдааны матриц:</strong> Тэтгэлэг авсан 129 жишээнээс 53-ийг (TP) зөв илрүүлсэн, 76-ийг алдсан. <strong>Recall 41%</strong> — тэтгэлэг авах оюутны 41%-ийг л загвар таамаглаж чадсан.',
      ],
    },
    fun: {
      title: 'HSK funnel · Хөрвөлтийн юүлүүр',
      stat: 'Бодит өгөгдөл',
      paras: [
        'Энэ хэсэг нь загварын таамаг биш, бодит өгөгдөл дээрх HSK түвшин бүрийн элсэлтийн <strong>хөрвөлтийн юүлүүр</strong>. HSK 1 түвшинд элсэлтийн магадлал ердөө <span class="ml-hl">7.7%</span> бол HSK 6 түвшинд <span class="ml-hl">79.8%</span> — <strong>10× зөрүү</strong>. Энэ нь Random Forest-ын "HSK түвшин нь хамгийн чухал" гэсэн дүгнэлтийг бодит тоогоор нотолж байна.',
        '<strong>Бизнесийн утга:</strong> HSK 4 түвшинд хүртэл бэлдсэн оюутны элсэлтийн магадлал 54%, HSK 5 хүртэл бэлдсэн нь 77% болж нэмэгдэнэ. <strong>HSK 4-өөс HSK 5 руу ахихад элсэлтийн хувь ойролцоогоор 22 пунктээр нэмэгддэг</strong> — энэ нь бэлтгэлд хөрөнгө оруулах хамгийн өндөр өгөөжийн цэг.',
      ],
    },
  };

  const b = blocks[tabKey];
  if (!b) return wrap;
  const block = document.createElement('div'); block.className = 'ml-block';
  block.innerHTML = `<h5>${b.title} <span class="ml-stat">${b.stat}</span></h5>` +
                    b.paras.map(p => `<p>${p}</p>`).join('');
  wrap.appendChild(block);

  // Summary appears on every tab so the user always has the bigger picture
  const summary = document.createElement('div');
  summary.className = 'ml-block ml-block-summary';
  summary.innerHTML = `
    <h5>Нэгтгэсэн дүгнэлт</h5>
    <ul>
      <li><strong>HSK түвшин</strong> нь элсэлт болон тэтгэлгийн загварт хамгийн тогтвортой нөлөөтэй хувьсагч байна.</li>
      <li><strong>Random Forest</strong> нь элсэлтийг 68.6% нарийвчлалтай таамагладаг — production-д <strong>зөвлөмжийн систем</strong> хэлбэрээр ашиглах боломжтой.</li>
      <li><strong>Logistic Regression</strong> нь визийн шийдвэрийг загварчилсан боловч өгөгдөл хэт тэнцвэргүй — <strong>илүү татгалзсан жишээ цуглуулах</strong> хэрэгтэй.</li>
      <li><strong>XGBoost</strong> тэтгэлгийн ангиллыг 54.4% нарийвчлалтай таамагласан нь энэ шийдвэр олон хүчин зүйлээс хамаардгийг харуулж байна.</li>
      <li>Бизнесийн хувьд: <strong>HSK 4→5 рүү гарах бэлтгэлд хөрөнгө оруулалт</strong> хамгийн өндөр өгөөжтэй.</li>
    </ul>
  `;
  wrap.appendChild(summary);

  return wrap;
}

function makeFeatureBars(arr, signed) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const w = 360, h = arr.length * 28 + 16;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width','100%'); svg.setAttribute('height', h);
  const max = d3.max(arr, d => d.importance);
  arr.forEach((d, i) => {
    const y0 = 8 + i * 28;
    const lblW = 150;
    // label
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', lblW - 6); t.setAttribute('y', y0 + 13);
    t.setAttribute('text-anchor', 'end');
    t.setAttribute('font-size', 11); t.setAttribute('font-family','Inter');
    t.setAttribute('fill', 'rgba(242,243,247,0.85)');
    t.textContent = mnFeat(d.feature);
    svg.appendChild(t);
    // bar
    const bw = (d.importance / max) * (w - lblW - 50);
    const color = signed
      ? (d.signed >= 0 ? '#2fae89' : '#ee6f46')
      : '#d8a64a';
    const r = document.createElementNS(ns,'rect');
    r.setAttribute('x', lblW); r.setAttribute('y', y0 + 4);
    r.setAttribute('height', 14); r.setAttribute('rx', 3);
    r.setAttribute('fill', color); r.setAttribute('opacity', 0.85);
    r.setAttribute('width', 0);
    svg.appendChild(r);
    requestAnimationFrame(() => {
      r.style.transition = 'width 0.9s cubic-bezier(0.22,1,0.36,1)';
      r.setAttribute('width', bw);
    });
    const v = document.createElementNS(ns,'text');
    v.setAttribute('x', lblW + bw + 6); v.setAttribute('y', y0 + 15);
    v.setAttribute('font-size', 10); v.setAttribute('font-family','Inter Tight');
    v.setAttribute('font-weight', 700);
    v.setAttribute('fill', color);
    v.textContent = signed ? (d.signed >= 0 ? '+' : '') + d.signed.toFixed(3) : d.importance.toFixed(3);
    svg.appendChild(v);
  });
  return svg;
}

function makeROC(roc) {
  const ns = 'http://www.w3.org/2000/svg';
  const w = 260, h = 220, pad = 30;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width','100%'); svg.setAttribute('height', h);
  // diagonal
  const dg = document.createElementNS(ns, 'line');
  dg.setAttribute('x1', pad); dg.setAttribute('y1', h - pad);
  dg.setAttribute('x2', w - pad); dg.setAttribute('y2', pad);
  dg.setAttribute('stroke', 'rgba(255,255,255,0.18)');
  dg.setAttribute('stroke-dasharray', '3 3');
  svg.appendChild(dg);
  // axes labels
  const lblX = document.createElementNS(ns,'text');
  lblX.setAttribute('x', w/2); lblX.setAttribute('y', h - 6);
  lblX.setAttribute('text-anchor','middle');
  lblX.setAttribute('font-size', 9); lblX.setAttribute('fill','rgba(242,243,247,0.55)');
  lblX.textContent = 'False Positive Rate';
  svg.appendChild(lblX);
  const lblY = document.createElementNS(ns,'text');
  lblY.setAttribute('x', 10); lblY.setAttribute('y', h/2);
  lblY.setAttribute('font-size', 9); lblY.setAttribute('fill','rgba(242,243,247,0.55)');
  lblY.setAttribute('transform', `rotate(-90 10 ${h/2})`);
  lblY.setAttribute('text-anchor','middle');
  lblY.textContent = 'True Positive Rate';
  svg.appendChild(lblY);

  // curve
  if (roc?.fpr && roc?.tpr) {
    const x = d3.scaleLinear().domain([0,1]).range([pad, w-pad]);
    const y = d3.scaleLinear().domain([0,1]).range([h-pad, pad]);
    const line = d3.line().x((d,i) => x(roc.fpr[i])).y((d,i) => y(d)).curve(d3.curveCatmullRom);
    const p = document.createElementNS(ns,'path');
    p.setAttribute('d', line(roc.tpr));
    p.setAttribute('fill','none'); p.setAttribute('stroke','#d8a64a'); p.setAttribute('stroke-width', 2);
    svg.appendChild(p);
    // area under curve (light fill)
    const area = d3.area().x((d,i) => x(roc.fpr[i])).y0(h-pad).y1((d,i) => y(d)).curve(d3.curveCatmullRom);
    const a = document.createElementNS(ns,'path');
    a.setAttribute('d', area(roc.tpr));
    a.setAttribute('fill', 'rgba(216,166,74,0.16)');
    svg.appendChild(a);
    // AUC label
    const auc = trapAUC(roc.fpr, roc.tpr);
    const aucT = document.createElementNS(ns,'text');
    aucT.setAttribute('x', w - pad - 6); aucT.setAttribute('y', pad + 16);
    aucT.setAttribute('text-anchor','end');
    aucT.setAttribute('font-family','Inter Tight'); aucT.setAttribute('font-weight', 800);
    aucT.setAttribute('font-size', 13); aucT.setAttribute('fill','#d8a64a');
    aucT.textContent = `AUC ${auc.toFixed(3)}`;
    svg.appendChild(aucT);
  }
  return svg;
}

function trapAUC(fpr, tpr) {
  let s = 0;
  for (let i = 1; i < fpr.length; i++) {
    s += (fpr[i] - fpr[i-1]) * (tpr[i] + tpr[i-1]) / 2;
  }
  return s;
}

function makeConfusion(cm) {
  if (!cm || !cm.length) return document.createTextNode('—');
  const [tn, fp] = cm[0], [fn, tp] = cm[1];
  const wrap = document.createElement('div'); wrap.className = 'cm-grid';
  wrap.innerHTML = `
    <div class="cm-cell tn"><div class="cm-num">${tn}</div><div class="cm-lbl">TN</div></div>
    <div class="cm-cell fp"><div class="cm-num">${fp}</div><div class="cm-lbl">FP</div></div>
    <div class="cm-cell fn"><div class="cm-num">${fn}</div><div class="cm-lbl">FN</div></div>
    <div class="cm-cell tp"><div class="cm-num">${tp}</div><div class="cm-lbl">TP</div></div>
  `;
  return wrap;
}

function makeHSKFunnel(funnel) {
  const wrap = document.createElement('div');
  const w = 760, h = 280, pad = 30;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width','100%'); svg.setAttribute('height', h);
  const keys = ['1','2','3','4','5','6'];
  const max = Math.max(...keys.map(k => funnel[k].applied));
  const colW = (w - pad*2) / keys.length;
  keys.forEach((k, i) => {
    const f = funnel[k];
    const x = pad + i * colW + colW/2;
    const aH = (f.applied / max) * (h - 70);
    const acH = (f.accepted / max) * (h - 70);
    // applied bar
    const a = document.createElementNS(ns,'rect');
    a.setAttribute('x', x - colW*0.32); a.setAttribute('y', h - pad - aH);
    a.setAttribute('width', colW*0.64); a.setAttribute('height', aH);
    a.setAttribute('fill', 'rgba(110,99,224,0.35)'); a.setAttribute('rx', 3);
    svg.appendChild(a);
    // accepted bar
    const ac = document.createElementNS(ns,'rect');
    ac.setAttribute('x', x - colW*0.32); ac.setAttribute('y', h - pad - acH);
    ac.setAttribute('width', colW*0.64); ac.setAttribute('height', acH);
    ac.setAttribute('fill', '#d8a64a'); ac.setAttribute('rx', 3);
    svg.appendChild(ac);
    // label HSK
    const t = document.createElementNS(ns,'text');
    t.setAttribute('x', x); t.setAttribute('y', h - 12);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', 11); t.setAttribute('fill','rgba(242,243,247,0.85)');
    t.setAttribute('font-family','Inter Tight'); t.setAttribute('font-weight', 700);
    t.textContent = 'HSK ' + k;
    svg.appendChild(t);
    // rate
    const r = document.createElementNS(ns,'text');
    r.setAttribute('x', x); r.setAttribute('y', h - pad - aH - 6);
    r.setAttribute('text-anchor', 'middle');
    r.setAttribute('font-size', 12); r.setAttribute('fill','#d8a64a');
    r.setAttribute('font-family','Inter Tight'); r.setAttribute('font-weight', 800);
    r.textContent = f.rate.toFixed(1) + '%';
    svg.appendChild(r);
  });
  wrap.appendChild(svg);
  const note = document.createElement('p');
  note.style.cssText = 'font-size:0.85rem;color:var(--c-ink-soft);margin-top:0.8rem;';
  note.innerHTML = '<strong style="color:#d8a64a">Алтан</strong> — батлагдсан · <strong style="color:#6e63e0">Ягаан</strong> — өргөдөл. HSK 1: 7.7% → HSK 6: 79.8% · хэлний түвшин шийдвэрлэх хүчин зүйл.';
  wrap.appendChild(note);
  return wrap;
}

/* ── correlation heatmap ─────────────────────────────────────────────────── */
function mountCorrelation(insights) {
  const host = document.getElementById('corr-heatmap');
  if (!host) return;
  const cm = insights.correlation_matrix;
  if (!cm) return;
  const labels = cm.labels;
  const mat = cm.matrix;
  const n = labels.length;
  const size = Math.min(host.clientWidth, 420);
  const cellW = (size - 100) / n;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width','100%'); svg.setAttribute('height', size);
  // diverging color: red (-1) → white (0) → gold (+1)
  const color = (v) => {
    const t = (v + 1) / 2;
    if (v >= 0) return `rgba(216, 166, 74, ${Math.abs(v) * 0.9 + 0.06})`;
    return `rgba(238, 111, 70, ${Math.abs(v) * 0.85 + 0.06})`;
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = mat[i][j];
      const x = 100 + j * cellW;
      const y = 30 + i * cellW;
      const r = document.createElementNS(ns,'rect');
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', cellW - 1); r.setAttribute('height', cellW - 1);
      r.setAttribute('fill', color(v)); r.setAttribute('rx', 2);
      svg.appendChild(r);
      const t = document.createElementNS(ns,'text');
      t.setAttribute('x', x + cellW/2); t.setAttribute('y', y + cellW/2 + 4);
      t.setAttribute('text-anchor','middle');
      t.setAttribute('font-size', 11); t.setAttribute('font-family','Inter Tight');
      t.setAttribute('font-weight', 700);
      t.setAttribute('fill', Math.abs(v) > 0.5 ? '#1a1722' : 'rgba(242,243,247,0.85)');
      t.textContent = v.toFixed(2);
      svg.appendChild(t);
    }
    // left label
    const lab = document.createElementNS(ns,'text');
    lab.setAttribute('x', 92); lab.setAttribute('y', 30 + i * cellW + cellW/2 + 4);
    lab.setAttribute('text-anchor','end');
    lab.setAttribute('font-size', 11); lab.setAttribute('fill','rgba(242,243,247,0.85)');
    lab.setAttribute('font-family','Inter');
    lab.textContent = labels[i];
    svg.appendChild(lab);
    // top label
    const top = document.createElementNS(ns,'text');
    top.setAttribute('x', 100 + i * cellW + cellW/2);
    top.setAttribute('y', 22);
    top.setAttribute('text-anchor','middle');
    top.setAttribute('font-size', 10); top.setAttribute('fill','rgba(242,243,247,0.7)');
    top.setAttribute('font-family','Inter');
    top.textContent = labels[i];
    svg.appendChild(top);
  }
  host.appendChild(svg);
}

/* ── PCA scatter (1,500 students, 5 clusters) ───────────────────────────── */
function mountPCA(insights) {
  const host = document.getElementById('pca-scatter');
  if (!host) return;
  const pca = insights.personas_pca;
  if (!pca) return;
  const pts = pca.points;
  const cent = pca.centroids;
  const names = pca.names;
  const w = host.clientWidth || 420, h = 420, pad = 30;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xExt = d3.extent(xs), yExt = d3.extent(ys);
  const x = d3.scaleLinear().domain(xExt).range([pad, w-pad]).nice();
  const y = d3.scaleLinear().domain(yExt).range([h-pad, pad]).nice();
  const colors = ['#d8a64a','#6e63e0','#2fae89','#ee6f46','#cf4fb5'];

  const svg = d3.select(host).append('svg')
    .attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
  // axes
  svg.append('g').attr('class','axis').attr('transform', `translate(0, ${h-pad})`).call(d3.axisBottom(x).ticks(5));
  svg.append('g').attr('class','axis').attr('transform', `translate(${pad}, 0)`).call(d3.axisLeft(y).ticks(5));
  // points
  svg.append('g').selectAll('circle').data(pts).enter().append('circle')
    .attr('cx', d => x(d.x)).attr('cy', d => y(d.y))
    .attr('r', 2.4)
    .attr('fill', d => colors[d.cluster])
    .attr('opacity', 0.55);
  // centroids
  Object.entries(cent).forEach(([cid, c]) => {
    svg.append('circle').attr('cx', x(c.x)).attr('cy', y(c.y))
      .attr('r', 8).attr('fill', 'none')
      .attr('stroke', colors[cid]).attr('stroke-width', 2);
    svg.append('circle').attr('cx', x(c.x)).attr('cy', y(c.y))
      .attr('r', 3).attr('fill', colors[cid]);
    svg.append('text').attr('x', x(c.x) + 12).attr('y', y(c.y) + 4)
      .attr('font-family','Inter Tight').attr('font-weight', 700)
      .attr('font-size', 11).attr('fill', colors[cid])
      .text(names[cid].length > 24 ? names[cid].slice(0, 22) + '…' : names[cid]);
  });
}

/* ── Boxplot ────────────────────────────────────────────────────────────── */
function mountBoxplot(insights) {
  const host = document.getElementById('boxplot');
  if (!host) return;
  const bx = insights.scholarship_box;
  if (!bx?.length) return;
  const w = host.clientWidth || 700, h = 380, pad = { l: 130, r: 30, t: 16, b: 30 };
  const all = bx.flatMap(d => [d.whisker_lo, d.whisker_hi]);
  const x = d3.scaleLinear().domain([d3.min(all)*0.9, d3.max(all)*1.05]).range([pad.l, w-pad.r]).nice();
  const y = d3.scaleBand().domain(bx.map(d => d.type)).range([pad.t, h-pad.b]).padding(0.28);
  const colors = ['#d8a64a','#6e63e0','#2fae89','#ee6f46','#cf4fb5','#4cb1e0'];
  const svg = d3.select(host).append('svg').attr('width','100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);

  svg.append('g').attr('class','axis').attr('transform', `translate(0, ${h-pad.b})`)
    .call(d3.axisBottom(x).tickFormat(d => fmtNum.format(d) + '元').ticks(5));

  bx.forEach((d, i) => {
    const c = colors[i % colors.length];
    const yc = y(d.type) + y.bandwidth()/2;
    // whisker
    svg.append('line').attr('x1', x(d.whisker_lo)).attr('x2', x(d.whisker_hi)).attr('y1', yc).attr('y2', yc).attr('stroke', c).attr('stroke-width', 1.2);
    // ticks
    [d.whisker_lo, d.whisker_hi].forEach(v => {
      svg.append('line').attr('x1', x(v)).attr('x2', x(v))
        .attr('y1', yc - 6).attr('y2', yc + 6)
        .attr('stroke', c).attr('stroke-width', 1.2);
    });
    // IQR box
    svg.append('rect')
      .attr('x', x(d.q1)).attr('y', yc - 14)
      .attr('width', x(d.q3) - x(d.q1)).attr('height', 28)
      .attr('fill', c).attr('opacity', 0.5).attr('rx', 3);
    // median
    svg.append('line').attr('x1', x(d.median)).attr('x2', x(d.median))
      .attr('y1', yc - 14).attr('y2', yc + 14)
      .attr('stroke', '#fff').attr('stroke-width', 2);
    // label
    svg.append('text').attr('x', pad.l - 8).attr('y', yc + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 11).attr('font-family','Inter')
      .attr('fill', 'rgba(242,243,247,0.85)')
      .text(d.type);
    svg.append('text').attr('x', pad.l - 8).attr('y', yc + 18)
      .attr('text-anchor', 'end')
      .attr('font-size', 9).attr('font-family','Inter')
      .attr('fill', 'rgba(242,243,247,0.5)')
      .text('n=' + d.count);
  });
}

function mountScholarshipKPI(insights) {
  const t = document.getElementById('schol-total');
  const a = document.getElementById('schol-avg');
  if (t) t.textContent = fmtNum.format(insights.scholarship_total_yuan);
  if (a) a.textContent = fmtNum.format(insights.scholarship_avg_yuan);
}
