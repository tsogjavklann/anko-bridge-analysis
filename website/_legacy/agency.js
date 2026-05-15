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

  // ═══ 5. Three.js WebGL — scroll-driven cinematic scene + post-processing ═══
  function initScrollScene() {
    if (typeof THREE === "undefined") return;
    const canvas = document.getElementById("three-globe-fixed") || document.getElementById("three-globe");
    if (!canvas) return;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Perf gate — bloom/grain only on capable devices
    const lowEnd = (navigator.hardwareConcurrency || 4) < 4 ||
                   (navigator.deviceMemory || 4) < 4 || W < 720;

    const scene = new THREE.Scene();
    // Canvas IS the page background (Noomo-style). Post-processing breaks
    // alpha, so we paint a vivid periwinkle + warm-bloom gradient texture
    // directly as the scene background.
    (function setBgGradient() {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 512;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#bcc2e6"; ctx.fillRect(0, 0, 512, 512);
      const bloom = (x, y, r, col) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
        ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
      };
      bloom(390, 70, 330, "rgba(255,210,186,0.9)");   // warm peach top-right
      bloom(60, 175, 300, "rgba(208,200,255,0.78)");  // cool lavender left
      bloom(300, 510, 350, "rgba(255,221,231,0.62)"); // pink bottom
      bloom(495, 360, 280, "rgba(255,228,205,0.55)"); // warm right
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
    })();

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1000);
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
    renderer.toneMappingExposure = 1.08;

    // Detect software / SwiftShader rendering — post-processing crashes it.
    let softwareGL = false;
    try {
      const gl = renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const rs = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      softwareGL = /swiftshader|software|llvmpipe|microsoft basic/i.test(rs);
    } catch (e) { /* keep softwareGL false */ }
    const USE_POST = !REDUCED && !lowEnd && !softwareGL &&
                     typeof window.EffectComposer === "function";

    // ═══ Environment — RoomEnvironment via PMREM (offline-safe, no HDRI fetch) ═══
    try {
      if (typeof window.RoomEnvironment === "function") {
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new window.RoomEnvironment(), 0.04).texture;
      }
    } catch (e) { console.warn("RoomEnvironment skipped", e); }

    // ═══ Lighting — bright, clean (light periwinkle scene) ═══
    const ambient = new THREE.HemisphereLight(0xffffff, 0xc7cde4, 1.05);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.9);
    fill.position.set(-5, 3, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9c2, 0.7);
    rim.position.set(0, -3, -5);
    scene.add(rim);
    const accent = new THREE.PointLight(0x6E63E0, 0.9, 14);
    accent.position.set(2, 1, 2);
    scene.add(accent);

    // ═══ Mouse parallax ═══
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener("mousemove", (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // ═══ Post-processing pipeline ═══
    let composer = null, bloomPass = null, grainPass = null;
    if (USE_POST) {
      try {
        composer = new window.EffectComposer(renderer);
        composer.addPass(new window.RenderPass(scene, camera));
        // Gentle bloom — high threshold so the bright light scene doesn't wash out
        bloomPass = new window.UnrealBloomPass(
          new THREE.Vector2(W, H), 0.22, 0.5, 0.95);
        composer.addPass(bloomPass);
        // Film grain — final composite layer
        grainPass = new window.ShaderPass({
          uniforms: {
            tDiffuse: { value: null },
            uTime: { value: 0 },
            uIntensity: { value: 0.025 },
          },
          vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `
            precision mediump float;
            uniform sampler2D tDiffuse; uniform float uTime; uniform float uIntensity;
            varying vec2 vUv;
            float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
            void main(){
              vec4 col = texture2D(tDiffuse, vUv);
              float n = rand(vUv + fract(uTime)) - 0.5;
              gl_FragColor = vec4(col.rgb + n * uIntensity, col.a);
            }`,
        });
        composer.addPass(grainPass);
        composer.addPass(new window.OutputPass());
      } catch (e) {
        console.warn("Post-processing disabled", e);
        composer = null;
      }
    }

    function onResize() {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
      if (composer) composer.setSize(W, H);
      if (bloomPass) bloomPass.resolution.set(W, H);
    }
    window.addEventListener("resize", onResize);

    // ═══ Hero centerpiece — glossy chrome/iridescent orb (Noomo-style) ═══
    const earthGroup = new THREE.Group();
    camera.add(earthGroup);
    earthGroup.position.set(0, 0, -3.5);

    const EARTH_RADIUS = 0.42;
    const PhysMat = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
    const earth = new THREE.Mesh(
      new THREE.IcosahedronGeometry(EARTH_RADIUS, 6),
      new PhysMat({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.04,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        iridescence: 0.85,
        iridescenceIOR: 1.35,
        envMapIntensity: 1.6,
      })
    );
    earthGroup.add(earth);

    // thin wireframe shell — subtle structural detail
    const clouds = new THREE.Mesh(
      new THREE.IcosahedronGeometry(EARTH_RADIUS * 1.14, 2),
      new THREE.MeshBasicMaterial({
        color: 0x6E63E0, wireframe: true, transparent: true, opacity: 0.18,
      })
    );
    earthGroup.add(clouds);

    // soft rim glow
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.32, 48, 24),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color(0xb9b0ff) } },
        vertexShader: "varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "precision mediump float; varying vec3 vN; uniform vec3 glowColor; void main(){ float i=pow(0.62-dot(vN,vec3(0,0,1)),2.6); gl_FragColor=vec4(glowColor,clamp(i,0.0,1.0)*0.55); }",
      })
    );
    earthGroup.add(atmosphere);

    // ═══ Section-anchored 3D models — GLB with procedural fallback ═══
    // baseY values are world coords the camera dollies past as the user scrolls.
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Generic gold-chrome fallback if a GLB fails to load
    function makeFallback(name) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.3, 1),
        new THREE.MeshStandardMaterial({ color: 0xC9A24B, metalness: 0.95, roughness: 0.18 })
      ));
      return g;
    }

    // Voxel-cube satellites — small chrome/glass cubes that orbit + spin
    // independently around each model (the Noomo "floating pixels" detail).
    function buildVoxels(parent, count) {
      const PMat = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
      const matWhite = new PMat({
        color: 0xf3f2f8, metalness: 0.0, roughness: 0.35,
        transmission: 0.35, thickness: 0.4, ior: 1.3,
        transparent: true, opacity: 0.95, envMapIntensity: 1.5,
      });
      const matGold = new PMat({
        color: 0xffc85a, metalness: 1.0, roughness: 0.14,
        transparent: true, opacity: 1.0, envMapIntensity: 1.7,
      });
      const vox = [];
      for (let i = 0; i < count; i++) {
        const s = 0.13 + Math.random() * 0.20;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(s, s, s),
          Math.random() < 0.30 ? matGold : matWhite
        );
        m.userData.orbitR = 1.5 + Math.random() * 1.3;
        m.userData.orbitA = Math.random() * Math.PI * 2;
        m.userData.orbitB = (Math.random() - 0.5) * Math.PI * 0.9;
        m.userData.orbitSpeed = (Math.random() - 0.5) * 0.35;
        m.userData.spin = (Math.random() - 0.5) * 0.045;
        m.userData.floatPhase = Math.random() * Math.PI * 2;
        parent.add(m);
        vox.push(m);
      }
      return vox;
    }

    // 7 narrative models — the camera weaves past each as its home section
    // scrolls into view. baseX/baseY are computed from the section's real
    // scroll position so the camera arrives at the model exactly on cue.
    const CAM_Y_RANGE = 46;   // must match cameraPath()'s `-p * 46`
    const modelDefs = [
      { name: "ger",       url: "models/ger.glb",       scale: 1.7, side:  1, baseZ: -2.6, homeSel: ["#sec-0"]  },
      { name: "globe",     url: "models/globe.glb",     scale: 1.6, side: -1, baseZ: -3.0, homeSel: ["#sec-1"]  },
      { name: "greatwall", url: "models/greatwall.glb", scale: 1.7, side:  1, baseZ: -3.1, homeSel: ["#sec-2"]  },
      { name: "hsk_gauge", url: "models/hsk_gauge.glb", scale: 1.8, side: -1, baseZ: -2.7, homeSel: ["#sec-4"]  },
      { name: "gradcap",   url: "models/gradcap.glb",   scale: 2.0, side:  1, baseZ: -2.7, homeSel: ["#sec-5"]  },
      { name: "funnel",    url: "models/funnel.glb",    scale: 1.8, side: -1, baseZ: -2.7, homeSel: ["#sec-13"] },
      { name: "growth",    url: "models/growth.glb",    scale: 1.8, side:  1, baseZ: -2.7, homeSel: ["#sec-15"] },
    ];
    // Map a def's home section to a world position along the camera's descent.
    function anchorModel(def) {
      const docScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const el = document.querySelector(def.homeSel[0]);
      let frac = 0;
      if (el) {
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        const center = elTop + el.offsetHeight / 2 - window.innerHeight / 2;
        frac = Math.max(0, Math.min(1, center / docScroll));
      }
      def.baseY = -frac * CAM_Y_RANGE;
      def.baseX = def.side * 2.7;
    }
    const models = {};
    const GLTFLoaderClass = window.GLTFLoader || THREE.GLTFLoader;
    const gltfLoader = typeof GLTFLoaderClass === "function" ? new GLTFLoaderClass() : null;

    // ═══ Floating decor — glossy white shapes scattered through the world ═══
    // These pass the camera at varied depths to sell the "flying through space" feel.
    const decorGroup = new THREE.Group();
    scene.add(decorGroup);
    (function buildDecor() {
      const PMat = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
      // Polished chrome — reflects the RoomEnvironment like Noomo's objects
      const whiteMat = new PMat({
        color: 0xffffff, metalness: 1.0, roughness: 0.05,
        clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 1.8,
      });
      // Frosted iridescent glass
      const tintMat = new PMat({
        color: 0xeef0ff, metalness: 0.0, roughness: 0.12,
        transmission: 0.6, thickness: 0.8, ior: 1.4,
        iridescence: 0.7, iridescenceIOR: 1.3,
        transparent: true, opacity: 0.95, envMapIntensity: 1.6,
      });
      const geos = [
        () => new THREE.BoxGeometry(0.5, 0.5, 0.5),
        () => new THREE.IcosahedronGeometry(0.34, 0),
        () => new THREE.TorusGeometry(0.34, 0.12, 12, 24),
        () => new THREE.OctahedronGeometry(0.4, 0),
      ];
      let seed = 1337;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 14; i++) {
        const g = geos[i % geos.length]();
        const m = new THREE.Mesh(g, rnd() > 0.55 ? tintMat : whiteMat);
        const side = rnd() > 0.5 ? 1 : -1;
        m.position.set(
          side * (1.6 + rnd() * 4.5),
          -rnd() * 44,
          -1.5 - rnd() * 6
        );
        const s = 0.5 + rnd() * 1.1;
        m.scale.setScalar(s);
        m.userData.spin = (rnd() - 0.5) * 0.012;
        m.userData.floatAmp = 0.15 + rnd() * 0.3;
        m.userData.floatPhase = rnd() * Math.PI * 2;
        m.userData.baseY = m.position.y;
        decorGroup.add(m);
      }
    })();

    function placeModel(def, obj, fromGlb) {
      anchorModel(def);
      // A wrapper holds the model + its voxel satellites. The wrapper does the
      // float-bob; the model itself does the idle Y-spin.
      const wrap = new THREE.Group();

      // Normalise size: every GLB was modelled at a different scale in Blender,
      // so fit each one to a consistent target world size, then recentre.
      const box0 = new THREE.Box3().setFromObject(obj);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxDim = Math.max(size0.x, size0.y, size0.z) || 1;
      obj.scale.setScalar((def.scale * 1.9) / maxDim);
      const box1 = new THREE.Box3().setFromObject(obj);
      const c = box1.getCenter(new THREE.Vector3());
      obj.position.sub(c);

      obj.traverse(node => {
        if (node.isMesh && node.material) {
          node.material.envMapIntensity = 1.25;
          if (node.material.transparent === undefined || !node.material.transparent) {
            node.material.transparent = true;
          }
        }
      });
      wrap.add(obj);

      const voxels = buildVoxels(wrap, 7);

      wrap.position.set(def.baseX, def.baseY, def.baseZ);
      wrap.userData.def = def;
      wrap.userData.model = obj;
      wrap.userData.voxels = voxels;
      wrap.userData.opacity = 0.0;        // current (lerped)
      wrap.userData.targetOpacity = 0.0;  // driven by ScrollTrigger
      wrap.userData.spinY = 0.0030 + Math.random() * 0.0030;
      wrap.userData.floatPhase = Math.random() * Math.PI * 2;
      modelGroup.add(wrap);
      models[def.name] = wrap;
    }

    modelDefs.forEach(def => {
      if (gltfLoader) {
        gltfLoader.load(def.url,
          (gltf) => placeModel(def, gltf.scene, true),
          undefined,
          () => placeModel(def, makeFallback(def.name), false));
      } else {
        placeModel(def, makeFallback(def.name), false);
      }
    });

    // ═══ Cinematic camera path — scroll drives a CAMERA, not a page scroll ═══
    // The camera weaves through 3D space: lateral pan + dolly in/out + roll +
    // a leading lookAt target. Vertical descent is blended with sideways motion
    // so it feels like flying through a scene, not sliding a document.
    function cameraPath(p) {
      const wave = p * Math.PI;
      return {
        x:     Math.sin(wave * 2.5) * 3.6,                                  // pan left↔right ~2.5 swings
        y:     -p * 46,                                                     // descend through the world
        z:     6.6 - Math.sin(wave) * 2.6 + Math.sin(wave * 6) * 0.55,       // dolly in mid-journey + micro in/out
        lookX: Math.sin(wave * 2.5 + 0.75) * 2.4,                           // look leads the turn
        lookY: -p * 46 + Math.sin(wave * 4) * 1.8,                          // gaze bobs ahead/behind
        roll:  Math.sin(wave * 2.5) * 0.055,                                // bank into the turns
      };
    }
    const camTarget = { x: 0, y: 0, z: 6.6, lookX: 0, lookY: 0, roll: 0 };
    let scrollP = 0;
    if (window.gsap && window.ScrollTrigger && !REDUCED) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.1,
        onUpdate: (self) => {
          scrollP = self.progress;
          Object.assign(camTarget, cameraPath(scrollP));
        },
      });
      // Per-model reveal triggers — fade a model up while its home section is
      // in view. onToggle fires on every active/inactive change; we also read
      // .isActive once on creation so a model whose section is already on
      // screen at load (e.g. the hero) reveals immediately.
      modelDefs.forEach(def => {
        const setVis = (on) => {
          const m = models[def.name];
          if (m) m.userData.targetOpacity = on ? 1 : 0.12;
        };
        def.homeSel.forEach(sel => {
          const el = document.querySelector(sel);
          if (!el) return;
          const st = ScrollTrigger.create({
            trigger: el, start: "top 90%", end: "bottom 10%",
            onToggle: (self) => setVis(self.isActive),
          });
          if (st.isActive) setVis(true);
        });
      });
      // Re-anchor models whenever layout changes (charts render, resize) so
      // each one stays glued to its home section's scroll position.
      ScrollTrigger.addEventListener("refresh", () => {
        modelDefs.forEach(def => {
          anchorModel(def);
          const obj = models[def.name];
          if (obj) obj.position.set(def.baseX, def.baseY, def.baseZ);
        });
      });
    } else {
      // Reduced motion / no GSAP — static framing
      Object.assign(camTarget, cameraPath(0));
    }

    // ═══ Animate loop ═══
    const clock = new THREE.Clock();
    // Smoothed camera state — lerps toward the cinematic path target
    const cam = { x: 0, y: 0, z: 6.6, lookX: 0, lookY: 0, roll: 0 };
    const _look = new THREE.Vector3();
    function animate() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const k = 1 - Math.pow(1 - 0.075, dt * 60); // framerate-independent lerp
      const elapsed = clock.elapsedTime;

      mx += (tmx - mx) * k;
      my += (tmy - my) * k;

      // Camera — lerp every channel toward the scroll-driven path + mouse parallax
      cam.x    += (camTarget.x    - cam.x)    * k;
      cam.y    += (camTarget.y    - cam.y)    * k;
      cam.z    += (camTarget.z    - cam.z)    * k;
      cam.lookX += (camTarget.lookX - cam.lookX) * k;
      cam.lookY += (camTarget.lookY - cam.lookY) * k;
      cam.roll  += (camTarget.roll  - cam.roll)  * k;
      camera.position.set(cam.x + mx * 0.6, cam.y + my * 0.3, cam.z);
      _look.set(cam.lookX + mx * 0.4, cam.lookY - my * 0.3, cam.y - 6);
      camera.lookAt(_look);
      camera.rotation.z += (cam.roll - mx * 0.03 - camera.rotation.z) * k;

      // Earth — always visible hero element
      earth.rotation.y += 0.0035;
      clouds.rotation.y += 0.0009;
      earthGroup.position.x = mx * 0.12;
      earthGroup.position.y = my * 0.08 + Math.sin(elapsed * 0.5) * 0.05;
      earthGroup.rotation.z = -mx * 0.08;

      // Models — idle Y-spin + float-bob + independently orbiting voxel cubes
      Object.values(models).forEach(wrap => {
        const def = wrap.userData.def;
        const model = wrap.userData.model;
        // idle slow rotation of the model itself
        model.rotation.y += wrap.userData.spinY;
        // gentle float-bob of the whole group
        wrap.position.x = def.baseX + Math.sin(elapsed * 0.40 + wrap.userData.floatPhase) * 0.20;
        wrap.position.y = def.baseY + Math.sin(elapsed * 0.52 + wrap.userData.floatPhase) * 0.24;
        // voxel satellites — each spins on its own + slowly orbits the model
        wrap.userData.voxels.forEach(v => {
          v.rotation.x += v.userData.spin;
          v.rotation.y += v.userData.spin * 1.3;
          v.userData.orbitA += v.userData.orbitSpeed * dt;
          const r = v.userData.orbitR, b = v.userData.orbitB, a = v.userData.orbitA;
          v.position.set(
            Math.cos(a) * Math.cos(b) * r,
            Math.sin(b) * r + Math.sin(elapsed * 0.6 + v.userData.floatPhase) * 0.12,
            Math.sin(a) * Math.cos(b) * r
          );
        });
        // lerped opacity reveal driven by ScrollTrigger
        wrap.userData.opacity += (wrap.userData.targetOpacity - wrap.userData.opacity) * k;
        wrap.traverse(node => {
          if (node.isMesh && node.material && node.material.transparent) {
            node.material.opacity = wrap.userData.opacity;
          }
        });
      });

      // Floating decor — slow spin + gentle vertical drift
      decorGroup.children.forEach(m => {
        m.rotation.x += m.userData.spin;
        m.rotation.y += m.userData.spin * 0.7;
        m.position.y = m.userData.baseY + Math.sin(elapsed * 0.35 + m.userData.floatPhase) * m.userData.floatAmp;
      });

      if (grainPass) grainPass.uniforms.uTime.value = elapsed;
      if (composer) composer.render();
      else renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    window.__scrollScene = { scene, camera, renderer, composer, models, earthGroup };
  }
  window.initScrollScene = initScrollScene;

  // ═══ 6. Content parallax — HTML drifts at varied rates so the page
  //        feels like a moving camera, not a sliding document ═══
  function initScrollTriggers() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero — lifts and fades as you leave it
    const hero = document.querySelector(".section-hero");
    if (hero) {
      gsap.to(".hero-inner", {
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
        yPercent: -28, opacity: 0, ease: "none",
      });
    }

    // Big headlines drift UP slower than scroll — they "hang" in space
    gsap.utils.toArray(".section-title, .chapter-title, .hero-num").forEach(el => {
      gsap.fromTo(el, { yPercent: 14 }, {
        yPercent: -14, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
      });
    });

    // Leads / captions drift the opposite way — subtle counter-parallax
    gsap.utils.toArray(".lead, .kicker").forEach(el => {
      gsap.fromTo(el, { yPercent: -6 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.4 },
      });
    });

    // Chart / card blocks rise gently into frame
    gsap.utils.toArray(".chart-wrap, .reco-card, .program-card, .kpi").forEach((el, i) => {
      gsap.fromTo(el, { yPercent: 8 }, {
        yPercent: -4, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 1 },
      });
    });

    // Marquee — scrub-driven horizontal drift on top of its CSS loop
    gsap.utils.toArray(".marquee-track").forEach(track => {
      gsap.to(track, {
        scrollTrigger: { trigger: track, start: "top bottom", end: "bottom top", scrub: 0.5 },
        x: "-18%", ease: "none",
      });
    });

    ScrollTrigger.refresh();
  }

  // ═══ Bootstrap ═══
  function startThreeWhenReady() {
    const ready = () => typeof THREE !== "undefined" && typeof window.GLTFLoader === "function";
    const start = () => { if (!window.__scrollScene) initScrollScene(); };
    if (ready()) {
      start();
    } else {
      window.addEventListener("three-ready", start, { once: true });
      setTimeout(() => { if (ready()) start(); }, 2000);
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
