/* ===========================
   LOADING SCREEN — shows once per session
=========================== */
(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;

  // If already visited this session, kill loader immediately
  if (sessionStorage.getItem('mx_v')) {
    loader.style.cssText = 'display:none!important';
    return;
  }
  sessionStorage.setItem('mx_v', '1');

  // Shader background
  function startShader() {
    const cv = document.getElementById('loaderCanvas');
    if (!cv || typeof THREE === 'undefined') return;

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const scene = new THREE.Scene();
    const uni = {
      time:       { value: 1.0 },
      resolution: { value: new THREE.Vector2() }
    };

    scene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: { time: uni.time, resolution: uni.resolution },
        vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
        fragmentShader: `
          precision highp float;
          uniform vec2 resolution;
          uniform float time;
          float rnd(float x){ return fract(sin(x)*1e4); }
          void main(){
            vec2 uv=(gl_FragCoord.xy*2.0-resolution.xy)/min(resolution.x,resolution.y);
            uv.x=floor(uv.x*64.0)/64.0;
            uv.y=floor(uv.y*128.0)/128.0;
            float t=time*0.06+rnd(uv.x)*0.4;
            float lw=0.0008;
            vec3 c=vec3(0.0);
            for(int j=0;j<3;j++)
              for(int i=0;i<5;i++)
                c[j]+=lw*float(i*i)/abs(fract(t-0.01*float(j)+float(i)*0.01)-length(uv));
            // Cyan-blue tint: suppress red, boost blue
            vec3 fc=vec3(c[2]*0.08, c[1]*0.35+c[0]*0.18, c[0]*1.4+c[1]*0.28);
            fc.gb+=vec2(0.012,0.028);
            gl_FragColor=vec4(fc,1.0);
          }
        `
      })
    ));

    const rndr = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
    rndr.setPixelRatio(1);

    function onResize() {
      rndr.setSize(window.innerWidth, window.innerHeight);
      uni.resolution.value.set(rndr.domElement.width, rndr.domElement.height);
    }
    onResize();
    window.addEventListener('resize', onResize, { passive: true });

    let rid;
    (function tick() {
      rid = requestAnimationFrame(tick);
      uni.time.value += 0.05;
      rndr.render(scene, cam);
    })();

    loader.addEventListener('transitionend', () => {
      cancelAnimationFrame(rid);
      rndr.dispose();
    }, { once: true });
  }

  startShader();
  window.addEventListener('load', () => setTimeout(() => loader.classList.add('hide'), 2200));
})();

/* ===========================
   CUSTOM CURSOR
=========================== */
const cursor     = document.getElementById('cursor');
const cursorRing = document.getElementById('cursorRing');
if (cursor && cursorRing) {
  let cx = 0, cy = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
  });
  (function raf() {
    rx += (cx - rx) * 0.12;
    ry += (cy - ry) * 0.12;
    cursorRing.style.left = rx + 'px';
    cursorRing.style.top  = ry + 'px';
    requestAnimationFrame(raf);
  })();
  document.addEventListener('mouseleave', () => { cursor.style.opacity = cursorRing.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { cursor.style.opacity = cursorRing.style.opacity = '1'; });
}

/* ===========================
   INTERACTIVE GRADIENT BG
   (smoothed mouse-follow updating CSS vars)
=========================== */
(function () {
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let x  = tx, y = ty;
  const root = document.documentElement;

  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  (function tick() {
    x += (tx - x) * 0.05;
    y += (ty - y) * 0.05;
    root.style.setProperty('--mx', x + 'px');
    root.style.setProperty('--my', y + 'px');
    requestAnimationFrame(tick);
  })();
})();

/* ===========================
   MOBILE NAV
=========================== */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileNav?.classList.toggle('open');
});
mobileNav?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    hamburger?.classList.remove('active');
    mobileNav?.classList.remove('open');
  })
);

/* ===========================
   NAVBAR SCROLL EFFECT
=========================== */
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ===========================
   SCROLL REVEAL
=========================== */
const obs = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

/* ===========================
   SMOOTH ANCHOR SCROLL
=========================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ===========================
   CONTACT FORM
=========================== */
document.getElementById('contactForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('[type=submit]');
  const orig = btn.textContent;
  btn.textContent = 'Sending...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Message Sent ✓';
    e.currentTarget.reset();
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
  }, 1500);
});

/* ===========================
   3D GEOMETRIC OBJECTS
   Mostly curvy/twisty shapes, 1 polyhedron in the rotation
=========================== */
const GEO_SHAPES = ['lissajous', 'gyro', 'helix', 'dodecahedron'];
const CURVY = new Set(['torusknot', 'lissajous', 'helix']);
let _gIdx = 0;

document.querySelectorAll('.geo-canvas').forEach(canvas => {
  if (!canvas.dataset.shape) canvas.dataset.shape = GEO_SHAPES[_gIdx++ % GEO_SHAPES.length];
  initGeo(canvas);
});

function initGeo(canvas) {
  if (typeof THREE === 'undefined') return;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  if (!W || !H) return;

  const isLg  = canvas.classList.contains('geo-lg');
  const isSm  = canvas.classList.contains('geo-sm');
  const shape = canvas.dataset.shape || 'torusknot';

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
  camera.position.z = 4.5;

  scene.add(new THREE.AmbientLight(0x060610, 1));
  const cLight = new THREE.PointLight(0x00d4ff, isLg ? 12 : 8, 25);
  const vLight = new THREE.PointLight(0xa855f7, isLg ?  9 : 6, 25);
  const wLight = new THREE.PointLight(0xffffff, 3, 20);
  wLight.position.set(0, 4, 8);
  scene.add(cLight, vLight, wLight);

  const size = isLg ? 1.5 : isSm ? 1.2 : 1.35;
  const lr   = isLg ? 4.5 : 3.5;

  const group = new THREE.Group();
  scene.add(group);

  // ---- COMPOUND: GYROSCOPE (3 perpendicular rings + glowing core) ----
  if (shape === 'gyro') {
    const ringR   = size * 0.85;
    const tubeR   = size * 0.045;
    const ringGeo = new THREE.TorusGeometry(ringR, tubeR, 16, 110);

    const ringMat = new THREE.MeshPhongMaterial({
      color: 0x002233, specular: 0xbbeeFF, shininess: 300,
      transparent: true, opacity: 0.85
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.5
    });

    // 3 perpendicular rings, each with filled + wireframe overlay
    const r1 = new THREE.Mesh(ringGeo, ringMat);
    const r1w = new THREE.Mesh(ringGeo, wireMat);
    const r2 = new THREE.Mesh(ringGeo, ringMat.clone());
    const r2w = new THREE.Mesh(ringGeo, wireMat.clone());
    r2.rotation.x = r2w.rotation.x = Math.PI / 2;
    const r3 = new THREE.Mesh(ringGeo, ringMat.clone());
    const r3w = new THREE.Mesh(ringGeo, wireMat.clone());
    r3.rotation.y = r3w.rotation.y = Math.PI / 2;

    group.add(r1, r1w, r2, r2w, r3, r3w);

    // Glowing core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size * 0.22, 1),
      new THREE.MeshPhongMaterial({
        color: 0x00d4ff, emissive: 0x0099dd, emissiveIntensity: 1.2,
        shininess: 100, flatShading: true
      })
    );
    group.add(core);

    let t = Math.random() * 50;
    (function tick() {
      requestAnimationFrame(tick);
      t += 0.009;
      group.rotation.x = t * 0.40;
      group.rotation.y = t * 0.55;
      group.rotation.z = t * 0.20;
      core.rotation.x = -t * 0.80;
      core.rotation.y =  t * 0.60;
      cLight.position.set(Math.sin(t*.65)*lr, Math.cos(t*.48)*lr, Math.cos(t*.65)*lr*.6);
      vLight.position.set(Math.cos(t*.55)*lr, Math.sin(t*.42)*lr, Math.sin(t*.55)*lr*.6);
      renderer.render(scene, camera);
    })();
    return;
  }

  // ---- SINGLE-GEO SHAPES ----
  let geo, spinFactor = 1, useFlat = true;

  switch (shape) {
    case 'torusknot':
      geo = new THREE.TorusKnotGeometry(size * 0.65, size * 0.22, 100, 14, 2, 3);
      useFlat = false;
      break;

    case 'lissajous': {
      const pts = [];
      const A = 3, B = 4, C = 5;
      const dx = Math.PI / 2, dy = Math.PI / 4;
      const R  = size * 0.78;
      for (let i = 0; i <= 240; i++) {
        const u = (i / 240) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.sin(A * u + dx) * R,
          Math.sin(B * u + dy) * R,
          Math.cos(C * u) * R
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      geo = new THREE.TubeGeometry(curve, 500, size * 0.06, 8, true);
      useFlat = false;
      spinFactor = 0.55;
      break;
    }

    case 'helix': {
      const pts = [];
      const turns = 3, rad = size * 0.55, h = size * 2.0;
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const a = u * Math.PI * 2 * turns;
        pts.push(new THREE.Vector3(Math.cos(a) * rad, (u - 0.5) * h, Math.sin(a) * rad));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      geo = new THREE.TubeGeometry(curve, 240, size * 0.13, 10, false);
      useFlat = false;
      spinFactor = 0.7;
      break;
    }

    case 'dodecahedron':
      geo = new THREE.DodecahedronGeometry(size * 0.95, 0);
      break;

    default: // icosahedron (Discover card)
      geo = new THREE.IcosahedronGeometry(size, isSm ? 0 : 1);
  }

  // Core mesh
  group.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: 0x001a33, specular: 0xbbeeFF,
    shininess: 300, flatShading: useFlat,
    transparent: true, opacity: 0.88
  })));

  // Curvy shapes get a wireframe overlay; polyhedrons get bright edge lines
  if (CURVY.has(shape)) {
    group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.22
    })));
  } else {
    group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 })
    ));
  }

  let t = Math.random() * 50;
  (function tick() {
    requestAnimationFrame(tick);
    t += 0.009;
    group.rotation.x = t * 0.35 * spinFactor;
    group.rotation.y = t * 0.52 * spinFactor;
    cLight.position.set(Math.sin(t * .65) * lr, Math.cos(t * .48) * lr, Math.cos(t * .65) * lr * .6);
    vLight.position.set(Math.cos(t * .55) * lr, Math.sin(t * .42) * lr, Math.sin(t * .55) * lr * .6);
    renderer.render(scene, camera);
  })();
}
