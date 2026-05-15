/* ═══════════════════════════════════════════════════════════════════════
   main.js — analytics orchestrator
   - eager load insights.json
   - mount: stop overlay cards (0–6), marquee, chapter intros, maps,
     charts, predictor, deep analytics, BI, conclusion
   - bind GSAP ScrollTrigger reveals
   - shift 3D canvas to Ambient mode when past cinematic spine
   ═══════════════════════════════════════════════════════════════════════ */

import { loadInsights, fmtNum } from './data-loader.js';
import { mountStopCards }        from './analytics-cards.js';
import { mountCharts }           from './charts.js';
import { mountMaps }             from './maps.js';
import { mountPredictor }        from './predictor.js';
import { mountDeepAnalytics }    from './deep-analytics.js';
import { mountBI, mountConclusion } from './bi-recommendations.js';

/* tiny wrapper around GSAP — we share the global from the 3D scene if available
   else import from CDN */
async function getGSAP() {
  if (window.__anko3d?.gsap) return { gsap: window.__anko3d.gsap, ScrollTrigger: window.__anko3d.ScrollTrigger };
  const [{ default: gsap }, { default: ScrollTrigger }] = await Promise.all([
    import('gsap'), import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

async function boot() {
  // Wait until DOM is fully parsed
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  }

  const { gsap, ScrollTrigger } = await getGSAP();
  window.__anko = window.__anko || {};
  window.__anko.gsap = gsap;
  window.__anko.ScrollTrigger = ScrollTrigger;

  // Eager-load insights
  let insights;
  try {
    insights = await loadInsights();
  } catch (e) {
    console.error('[anko] insights.json load failed:', e);
    return;
  }
  window.__anko.insights = insights;
  console.log('[anko] insights loaded · keys:', Object.keys(insights).length);

  // 1. Stop overlay cards on cinematic spine (Stop 0–6)
  try { mountStopCards(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] stop cards', e); }

  // 2. Charts: marquee already CSS-driven; race / program / sankey / persona
  try { mountCharts(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] charts', e); }

  // 3. Maps (Leaflet) — defer until Leaflet UMD has loaded
  try { mountMaps(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] maps', e); }

  // 4. Predictor
  try { mountPredictor(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] predictor', e); }

  // 5. Deep analytics (ML tabs, correlation, PCA, boxplot)
  try { mountDeepAnalytics(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] deep', e); }

  // 6. BI cards + Conclusion
  try { mountBI(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] bi', e); }
  try { mountConclusion(insights, { gsap, ScrollTrigger }); }
  catch(e) { console.error('[anko] conclusion', e); }

  // 7. Slide reveal — fade content in once each .slide enters the viewport
  document.querySelectorAll('.slide').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      once: true,
      onEnter: () => el.classList.add('is-in'),
    });
  });

  // 8. Ambient mode transition — past stop 6 the 3D canvas should recede.
  bindAmbientMode({ gsap, ScrollTrigger });

  // 9. Refresh after everything mounted
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

function bindAmbientMode({ gsap, ScrollTrigger }) {
  // 3D canvas always at full opacity — analytics slides have their own dark
  // backdrop (z-index 4) that occludes the canvas. The camera continues to
  // animate "behind" each analytics slide so when the user reaches the next
  // cinematic stop slide, the 3D model is already at its anchor.
  // Hide scroll-cue once user moves past slide 0.
  const slide0 = document.querySelectorAll('.slide')[0];
  if (slide0) {
    ScrollTrigger.create({
      trigger: slide0, start: 'bottom 80%',
      onEnter: () => { const c = document.getElementById('scrollcue'); if (c) c.style.opacity = '0'; },
      onLeaveBack: () => { const c = document.getElementById('scrollcue'); if (c) c.style.opacity = '1'; },
    });
  }
}

boot();
