/* ═══════════════════════════════════════════════════════════════════════
   bi-recommendations.js — 5 практик бизнес зөвлөмжийн карт
   + conclusion KPI count-up
   ═══════════════════════════════════════════════════════════════════════ */

import { fmtNum } from './data-loader.js';

export function mountBI(insights) {
  const host = document.getElementById('bi-cards');
  if (!host) return;

  const r = insights.bi_program_revenue || {};
  const aimagGrowth = (insights.bi_aimag_growth || []).slice(0, 3);
  const schoolAcc = insights.bi_school_acceptance || [];
  const volat = insights.bi_yearly_volatility || {};
  const peak = insights.peak_year || {};

  const cards = [
    {
      impact: 'high', num: '6+6',
      title: '6+6 хөтөлбөрт хөрөнгө оруулалтыг хадгалах',
      desc: 'Хамгийн их эзлэх (56.8%) ба өсөлттэй (+5.9pp 2019→2024) хөтөлбөр. ANKO-гийн гол орлогын эх үүсвэр.',
      tag: 'Өндөр нөлөө · Стратегийн чиглэл',
      evidence: `${fmtNum.format(r['6+6']?.count || 0)} оюутан · ${fmtNum.format(Math.round(r['6+6']?.avg_tuition_yuan || 0))} 元 дундаж`,
      conf: 95,
    },
    {
      impact: 'high', num: 'HSK 5+',
      title: 'HSK 5-6 түвшинд хүргэх бэлтгэлийн багцыг хүчтэй болгох',
      desc: 'HSK 1 ба HSK 6 түвшний элсэлтийн зөрүү 10 дахин байгаа тул хэлний бэлтгэл нь элсэлтийн чанарт хамгийн шууд нөлөөлөх хөрөнгө оруулалт байна.',
      tag: 'Өндөр нөлөө · Хэрэглэгчийн чанар',
      evidence: 'HSK 6 элсэлт 79.8% vs HSK 1 7.7% — 10× зөрүү',
      conf: 92,
    },
    {
      impact: 'med', num: '×13',
      title: 'Орон нутгийн зах зээлийг тэлэх',
      desc: `${aimagGrowth.map(a => a.aimag).join(', ')} зэрэг аймгуудад сүүлийн 3 жилд 13–18× өсөлт. Улаанбаатараас гадуурх зах зээл боломжтой.`,
      tag: 'Дунд нөлөө · Зах зээл тэлэлт',
      evidence: aimagGrowth.map(a => `${a.aimag} ${a.growth_x}×`).join(' · '),
      conf: 85,
    },
    {
      impact: 'med', num: '+15%',
      title: 'Улсын сургуулийн төгсөгчдөд тусгай мэргэжлийн зөвлөгөө',
      desc: `Улсын ${schoolAcc.find(s => s.school === 'Public')?.rate.toFixed(1)}% vs хувийн ${schoolAcc.find(s => s.school === 'Private')?.rate.toFixed(1)}% — 8pp ялгаа. Улсын сургуулийн төгсөгчдөд илүү дэмжлэг шаардлагатай.`,
      tag: 'Дунд нөлөө · Боловсон хүчин',
      evidence: schoolAcc.map(s => `${s.school} ${s.rate.toFixed(1)}%`).join(' · '),
      conf: 78,
    },
    {
      impact: 'high', num: '1,371',
      title: '2025 оны оргил эрэлтэд бэлдэх',
      desc: `2025 онд ${fmtNum.format(peak.count || 1371)} өргөдөл — 2019-ийн 14 дахин. Илүү салбар, илүү ажилтан, илүү боловсролын зөвлөгч авах хэрэгтэй.`,
      tag: 'Өндөр нөлөө · Үйл ажиллагааны тэлэлт',
      evidence: `Ачаалал ${Math.abs(volat.max_drop_pct || 0).toFixed(0)}%-аас 14× хооронд хэлбэлзэж буй`,
      conf: 90,
    },
  ];

  cards.forEach(c => {
    const card = document.createElement('article');
    card.className = 'bi-card';
    card.dataset.impact = c.impact;
    card.innerHTML = `
      <div class="bi-num">${c.num}</div>
      <div class="bi-title">${c.title}</div>
      <div class="bi-desc">${c.desc}</div>
      <div><span class="bi-tag ${c.impact}">${c.tag}</span></div>
      <div class="bi-evidence">📊 ${c.evidence}</div>
      <div class="bi-confidence">
        <span>Итгэл</span>
        <div class="bc-bar"><div class="bc-fill" style="width:${c.conf}%"></div></div>
        <span><strong>${c.conf}%</strong></span>
      </div>
    `;
    host.appendChild(card);
  });
}

export function mountConclusion(insights, { gsap, ScrollTrigger }) {
  const sec = document.getElementById('sec-conclusion');
  if (!sec) return;
  const kpis = sec.querySelectorAll('.kpi-num');

  ScrollTrigger.create({
    trigger: sec,
    start: 'top 75%',
    once: true,
    onEnter: () => {
      kpis.forEach(el => {
        const target = +el.dataset.count;
        const o = { v: 0 };
        gsap.to(o, {
          v: target,
          duration: 2.2,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = target >= 100 ? fmtNum.format(Math.round(o.v))
              : Math.round(o.v).toString();
          },
        });
      });
    },
  });
}
