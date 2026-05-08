/* ═════════════════════════════════════════════════════════════
   ANKO Bridge — Agency-level enhancements
   Lenis smooth scroll · GSAP ScrollTrigger · Three.js hero globe
   Masked text reveals · Magnetic hover · Page loader
   ═════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ═══ 1. Page loader ═══
  function runPageLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader) return Promise.resolve();
    const num = document.getElementById("loaderNum");
    const fill = document.getElementById("loaderFill");

    return new Promise(resolve => {
      let progress = 0;
      const target = 100;
      const minDuration = 1400;  // minimum loader visible time
      const startTs = performance.now();

      function tick() {
        // Ease toward 100
        progress += (target - progress) * 0.025 + 0.4;
        if (progress > target) progress = target;
        if (num) num.textContent = Math.floor(progress);
        if (fill) fill.style.width = progress + "%";

        const elapsed = performance.now() - startTs;
        if (progress >= target - 0.5 && elapsed >= minDuration) {
          if (num) num.textContent = "100";
          if (fill) fill.style.width = "100%";
          // Wait for ANY data to be ready (insights.json, geojson)
          const ready = window.STUDENTS_GEO && window.DESTINATIONS_GEO && window.INSIGHTS;
          if (ready || elapsed >= 4000) {
            setTimeout(() => {
              loader.classList.add("is-done");
              resolve();
              setTimeout(() => loader.remove(), 800);
            }, 250);
            return;
          }
        }
        requestAnimationFrame(tick);
      }
      tick();
    });
  }

  // ═══ 2. Lenis smooth scroll ═══
  function initLenis() {
    if (typeof Lenis === "undefined") return null;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.1,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.__lenis = lenis;

    // Sync with GSAP ScrollTrigger
    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    return lenis;
  }

  // ═══ 3. Masked text reveals on scroll ═══
  function initMaskedReveals() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Target: every section-title and chapter-title
    const titles = document.querySelectorAll(".section-title, .chapter-title, .hero-title");
    titles.forEach(el => {
      // Wrap each top-level child in a span with overflow:hidden + translateY
      // To keep it simple, wrap the whole element's text in a single mask if it's plain text
      if (el.querySelector(".split-line")) return;  // already done
      // Use IntersectionObserver to trigger reveal
      gsap.set(el, { autoAlpha: 0, y: 60 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(el, {
            autoAlpha: 1, y: 0,
            duration: 1.1,
            ease: "power3.out",
          });
        },
      });
    });

    // Lead paragraphs — subtle fade
    const leads = document.querySelectorAll(".lead, .step p, .reco-action");
    leads.forEach(el => {
      gsap.set(el, { autoAlpha: 0, y: 24 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out", delay: 0.15 }),
      });
    });

    // Chapter intros — pinned dramatic reveal
    document.querySelectorAll(".chapter-intro").forEach(intro => {
      const num = intro.querySelector(".chapter-num");
      const title = intro.querySelector(".chapter-title");
      const desc = intro.querySelector(".chapter-desc");
      gsap.set([num, title, desc], { autoAlpha: 0, y: 80 });
      ScrollTrigger.create({
        trigger: intro,
        start: "top 70%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline();
          tl.to(num,   { autoAlpha: 0.85, y: 0, duration: 0.7, ease: "power3.out" })
            .to(title, { autoAlpha: 1,    y: 0, duration: 1.2, ease: "expo.out" }, "-=0.4")
            .to(desc,  { autoAlpha: 0.9,  y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
        },
      });
    });

    // Marquee — already CSS-animated, just refresh ScrollTrigger
    ScrollTrigger.refresh();
  }

  // ═══ 4. Magnetic hover on chip / button-like elements ═══
  function initMagnetic() {
    const els = document.querySelectorAll(".chip, .theme-toggle, .scroll-hint, .hero-stat");
    els.forEach(el => {
      el.classList.add("magnetic");
      let raf = null;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
        });
      });
      el.addEventListener("mouseleave", () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "";
      });
    });
  }

  // ═══ 5. Three.js WebGL — vibrant scene, scroll-driven, mouse-reactive ═══
  function initThreeGlobe() {
    if (typeof THREE === "undefined") return;
    const canvas = document.getElementById("three-globe-fixed") || document.getElementById("three-globe");
    if (!canvas) return;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    // Camera — perspective, looking at world center
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
    camera.position.set(0, 0, 6);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // ═══ Vibrant lighting (HDR-like) ═══
    const ambient = new THREE.HemisphereLight(0xfff0d6, 0x2b1a55, 0.55);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe9d6, 1.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7faef5, 0.9);
    fill.position.set(-5, 3, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff77c8, 0.7);
    rim.position.set(0, -3, -5);
    scene.add(rim);
    const accent = new THREE.PointLight(0x5dcaa5, 1.4, 12);
    accent.position.set(2, 1, 2);
    scene.add(accent);

    // ═══ Mouse parallax (2-axis tilt) ═══
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener("mousemove", (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1..1
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;  // -1..1
    }, { passive: true });

    function onResize() {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }
    window.addEventListener("resize", onResize);

    // ═══ Loaded objects ═══
    const loaded = {};
    const decorationGroup = new THREE.Group();
    scene.add(decorationGroup);

    // ═══ REAL EARTH — small textured sphere, centered in viewport ═══
    const earthGroup = new THREE.Group();
    camera.add(earthGroup);
    earthGroup.position.set(0, 0, -3.5);  // centered, in front of camera

    const texLoader = new THREE.TextureLoader();
    texLoader.crossOrigin = "anonymous";

    const earthMap  = texLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
    const earthBump = texLoader.load("https://threejs.org/examples/textures/planets/earth_normal_2048.jpg");
    const earthSpec = texLoader.load("https://threejs.org/examples/textures/planets/earth_specular_2048.jpg");

    const EARTH_RADIUS = 0.32;
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 64, 32),
      new THREE.MeshStandardMaterial({
        map: earthMap,
        normalMap: earthBump,
        roughnessMap: earthSpec,
        metalness: 0.05,
        roughness: 0.7,
        emissiveMap: earthMap,
        emissive: new THREE.Color(0x224466),
        emissiveIntensity: 0.08,
      })
    );
    earthGroup.add(earth);
    loaded.globe = earth;

    // Cloud layer
    const cloudsTex = texLoader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 48, 24),
      new THREE.MeshLambertMaterial({
        map: cloudsTex, transparent: true, opacity: 0.4, depthWrite: false,
      })
    );
    earthGroup.add(clouds);

    // Atmosphere glow halo
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.18, 48, 24),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color(0x4499ff) } },
        vertexShader: "varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "varying vec3 vN; uniform vec3 glowColor; void main(){ float i=pow(0.65-dot(vN,vec3(0,0,1)),3.0); gl_FragColor=vec4(glowColor,i); }",
      })
    );
    earthGroup.add(atmosphere);
    earth.userData.clouds = clouds;

    // ═══ Decorative GLBs — smaller, oscillate left-right ═══
    const GLTFLoaderClass = window.GLTFLoader || THREE.GLTFLoader;
    if (typeof GLTFLoaderClass === "function") {
      const loader = new GLTFLoaderClass();
      const decorDefs = [
        // baseX = central position; oscX = how far it sways
        { name: "greatwall", url: "models/greatwall.glb",
          scale: 0.18, baseX: -2.8, baseY: -10, baseZ: -1.5, oscX: 0.8, oscSpeed: 0.45, rotY: -0.5 },
        { name: "ger",       url: "models/ger.glb",
          scale: 0.30, baseX:  2.8, baseY: -22, baseZ: -1.5, oscX: 0.7, oscSpeed: 0.55, rotY: 0.45 },
        { name: "bridge",    url: "models/bridge.glb",
          scale: 0.30, baseX: -2.8, baseY: -42, baseZ: -2.0, oscX: 0.9, oscSpeed: 0.40, rotY: 0.5 },
      ];
      decorDefs.forEach(def => {
        loader.load(def.url, (gltf) => {
          const m = gltf.scene;
          m.scale.setScalar(def.scale);
          m.position.set(def.baseX, def.baseY, def.baseZ);
          m.rotation.y = def.rotY;
          m.userData = def;
          m.traverse(node => {
            if (node.isMesh && node.material) {
              node.material.envMapIntensity = 1.3;
            }
          });
          decorationGroup.add(m);
          loaded[def.name] = m;
        }, undefined, (e) => console.warn(def.name + " failed", e));
      });
    }

    // ═══ Animate ═══
    let scrollLerpY = 0;
    let elapsed = 0;
    function animate(ts) {
      elapsed = (ts || 0) / 1000;
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;

      const sc = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = (document.documentElement.scrollHeight - window.innerHeight);
      const p = maxScroll > 0 ? sc / maxScroll : 0;
      scrollLerpY += (p - scrollLerpY) * 0.08;

      // Camera moves down through world as user scrolls
      // Scene world height: -50 (covers all sections)
      camera.position.y = -scrollLerpY * 50;
      // Camera tilt: slight mouse-driven
      camera.rotation.x = my * 0.08;
      camera.rotation.y = mx * 0.08;

      // Real Earth — visible throughout, gentle descent within viewport
      // Y stays in range +0.9 (top) to -0.9 (bottom) — always fully visible
      if (loaded.globe) {
        earth.rotation.y += 0.0035;
        if (earth.userData.clouds) earth.userData.clouds.rotation.y += 0.0008;

        const sp = scrollLerpY;

        // Y: gentle descent, capped within viewport
        // Hero Y=0.9 (top area), mid 0.0 (center), end Y=-0.9 (bottom area)
        const baseY = 0.9 - sp * 1.8;          // 0.9 → -0.9
        const breatheY = Math.sin(elapsed * 0.5) * 0.06;
        const arcY = baseY + breatheY;

        // X: gentle horizontal sway
        const phase = sp * Math.PI * 2.5;
        const swayX = Math.sin(phase) * 1.4;
        const microX = Math.sin(elapsed * 0.4) * 0.06;
        const arcX = swayX + microX;

        // Mouse parallax — subtle
        earthGroup.position.x = arcX + mx * 0.12;
        earthGroup.position.y = arcY + my * 0.08;

        // Tilt
        earthGroup.rotation.z = -mx * 0.10;
        earthGroup.rotation.x = my * 0.05;
      }

      // Decorations — left-right swing + Y bob + slow rotation + breathing scale
      Object.entries(loaded).forEach(([name, m]) => {
        if (name === "globe") return;
        const def = m.userData;
        m.rotation.y += 0.003;
        // Left-right sway
        m.position.x = def.baseX + Math.sin(elapsed * def.oscSpeed) * def.oscX;
        // Soft Y bob
        m.position.y = def.baseY + Math.sin(elapsed * 0.4 + def.baseX) * 0.20;
        // Subtle scale breathing
        const breathe = 1.0 + Math.sin(elapsed * 0.35 + def.baseY) * 0.04;
        m.scale.setScalar(def.scale * breathe);
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    window.__threeGlobe = { scene, camera, renderer, decorationGroup, loaded, earthGroup };
  }

  // ═══ 6. ScrollTrigger pin / parallax effects ═══
  function initScrollTriggers() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero canvas parallax — slight zoom + fade as user scrolls past
    const hero = document.querySelector(".section-hero");
    const canvas = document.getElementById("three-globe");
    if (hero && canvas) {
      gsap.to(canvas, {
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
        scale: 1.15,
        opacity: 0.4,
      });
      gsap.to(".hero-inner", {
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom 30%",
          scrub: 0.6,
        },
        y: -100,
        opacity: 0,
      });
    }

    // Marquee speed-up on scroll
    const marquees = document.querySelectorAll(".marquee-track");
    marquees.forEach(track => {
      const tween = gsap.to(track, {
        scrollTrigger: {
          trigger: track,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.4,
        },
        x: "-15%",
        ease: "none",
      });
    });
  }

  // ═══ Bootstrap ═══
  function startThreeWhenReady() {
    const ready = () => typeof THREE !== "undefined" && typeof window.GLTFLoader === "function";
    if (ready()) {
      initThreeGlobe();
    } else {
      window.addEventListener("three-ready", initThreeGlobe, { once: true });
      setTimeout(() => {
        if (ready() && !window.__threeGlobe) initThreeGlobe();
      }, 2000);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    runPageLoader();
    initLenis();
    startThreeWhenReady();
    setTimeout(() => {
      initMaskedReveals();
      initScrollTriggers();
      initMagnetic();
    }, 200);
  });
})();
