/* ═══════════════════════════════════════════════════════════════════════
   predictor.js — визан батлагдах магадлал
   - insights.models.logreg_visa coefs (стандартчилагдсан) ашиглана
   - HSK / score / GPA / family income / program slider → P(visa=1)
   - Σ зэрэглэлд хамгийн ойр 5 оюутныг students_geo-оос гаргана
   ═══════════════════════════════════════════════════════════════════════ */

import { loadStudentsGeo, fmtNum } from './data-loader.js';

export function mountPredictor(insights, { gsap, ScrollTrigger }) {
  const sec = document.getElementById('sec-predictor');
  if (!sec) return;
  const lr = insights.models?.logreg_visa;
  if (!lr) { console.warn('[predictor] no logreg_visa'); return; }
  const coefs = lr.coefs || {};
  const means = lr.feature_means || {};
  const stds = lr.feature_stds || {};
  const intercept = lr.intercept || 0;

  // wire input handlers
  const els = {
    hsk: $('#pv-hsk'),
    score: $('#pv-score'),
    gpa: $('#pv-gpa'),
    inc: $('#pv-inc'),
    prog: $('#pv-prog'),
  };
  const lbls = {
    hsk: $('#pv-hsk-val'),
    score: $('#pv-score-val'),
    gpa: $('#pv-gpa-val'),
    inc: $('#pv-inc-val'),
  };
  const out = {
    num: $('#pv-prob-num'),
    fill: $('#pv-bar-fill'),
    verdict: $('#pv-verdict'),
  };

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function score(state) {
    // build standardized feature vector and dot with coefs
    const x = {
      hsk_level: state.hsk,
      hsk_score: state.score,
      gpa_percent: state.gpa,
      family_income_mnt: state.inc * 1e6,
      apply_age: 19,
      is_high_school_senior: 1,
      'aimag_Дархан-Уул': 0,
      'aimag_Орхон': 0,
      'aimag_Сэлэнгэ': 0,
      'aimag_Увс': 0,
      'aimag_Улаанбаатар': 1,
      'school_type_Private': 0,
      'school_type_Public': 1,
      'anko_program_type_6+6': state.prog === '6+6' ? 1 : 0,
      'anko_program_type_Fall Bachelor': state.prog === 'Fall Bachelor' ? 1 : 0,
      'anko_program_type_Master/PhD': state.prog === 'Master/PhD' ? 1 : 0,
      'tier_985': 0.38,
      'tier_C9': 0.20,
      'tier_Provincial': 0.14,
      'field_Business': 0.25,
      'field_Engineering': 0.35,
      'field_Humanities': 0.10,
      'field_Language': 0.00,
      'field_Medicine': 0.16,
      'field_Science': 0.07,
    };
    let z = intercept;
    for (const k in coefs) {
      const mu = means[k] ?? 0;
      const sd = stds[k] || 1;
      const v = ((x[k] ?? mu) - mu) / sd;
      z += coefs[k] * v;
    }
    return sigmoid(z);
  }

  function render() {
    const state = {
      hsk: +els.hsk.value,
      score: +els.score.value,
      gpa: +els.gpa.value,
      inc: +els.inc.value,
      prog: els.prog.value,
    };
    lbls.hsk.textContent = state.hsk;
    lbls.score.textContent = state.score;
    lbls.gpa.textContent = state.gpa;
    lbls.inc.textContent = state.inc.toFixed(1);

    const p = score(state);
    const pct = (p * 100);
    out.num.textContent = pct.toFixed(1) + '%';
    out.fill.style.width = pct + '%';
    out.verdict.textContent = pct >= 75 ? 'Маш өндөр магадлал · виз батлагдах магадлалтай'
      : pct >= 55 ? 'Боломжтой · нэмэлт нөхцлүүд харгалзах хэрэгтэй'
      : pct >= 35 ? 'Дунд · HSK эсвэл GPA-аа нэмэгдүүлэх боломжтой'
      : 'Бага магадлал · хэлний бэлтгэлийг чангатгах нь зүйтэй';
  }

  Object.values(els).forEach(e => e?.addEventListener('input', render));
  render();

  // similar students grid (deferred until students_geo loads on first interaction)
  let studentsCache = null;
  async function similar() {
    if (!studentsCache) studentsCache = await loadStudentsGeo();
    const host = $('#pv-similar');
    if (!host) return;
    const state = {
      hsk: +els.hsk.value, score: +els.score.value,
      gpa: +els.gpa.value, inc: +els.inc.value * 1e6,
    };
    const scored = studentsCache.map(s => {
      const dist = Math.sqrt(
        Math.pow((s.hsk - state.hsk) * 8, 2) +
        Math.pow((s.hsk_score - state.score) / 5, 2) +
        Math.pow((s.gpa - state.gpa), 2)
      );
      return { ...s, dist };
    }).sort((a, b) => a.dist - b.dist).slice(0, 5);
    host.innerHTML = scored.map(s => `
      <div class="similar-card">
        <div class="sc-name">${s.name}</div>
        <div>${s.aimag}${s.district ? ' · ' + s.district : ''}</div>
        <div>HSK ${s.hsk} (${s.hsk_score}) · GPA ${s.gpa}%</div>
        <div>${s.school} · ${s.age} нас</div>
        <span class="sc-tag ${s.gpa >= 80 ? 'accepted' : 'rejected'}">${s.gpa >= 80 ? 'Магадлал өндөр' : 'Магадлал дунд'}</span>
      </div>
    `).join('');
  }
  // initial similar fill on first scroll into view
  ScrollTrigger.create({
    trigger: sec, start: 'top 75%', once: true,
    onEnter: () => similar(),
  });
  Object.values(els).forEach(e => e?.addEventListener('change', similar));
}

function $(s) { return document.querySelector(s); }
