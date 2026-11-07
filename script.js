/**
 * ANNIVERSAIRE - APPLICATION VITRINE ÉPURÉE & MOTEUR 3D THREE.JS
 * - Célébration universelle (sans contrainte d'âge)
 * - Boîte cadeau 3D interactive (Three.js WebGL) avec rotation 360° et ouverture au clic
 * - Gâteau 3D émergeant avec bougies et flammes dynamiques
 * - Soufflage interactif : au clic OU réellement via le microphone du visiteur
 * - Pluie d'étincelles 3D et canvas d'étoiles dorées
 * - Synthèse sonore Web Audio API (fanfare, souffle, carillon 'Happy Birthday')
 * - Compte à rebours dynamique
 * - Modal de personnalisation (Prénom, Date, Thèmes) & Lien de partage URL
 */

// =============================================================================
// ÉTAT DE L'APPLICATION (UNIVERSEL / SANS ÂGE)
// =============================================================================
const AppState = {
  name: "Imane",
  date: "2026-11-07T20:00:00",
  theme: "theme-rose",
  isGiftOpen: false,
  candlesBlown: false,
  musicPlaying: false
};

// =============================================================================
// INITIALISATION AU CHARGEMENT
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Lecture des paramètres d'URL (ex: ?name=Alex)
  const urlParams = new URLSearchParams(window.location.search);
  const paramName = urlParams.get('name');
  if (paramName) {
    AppState.name = paramName;
  }

  loadSavedConfig();
  initThreeDScene();
  initBackgroundSparkles();
  initCustomizer();
  initMusicPlayer();
  initEventListeners();
});

// =============================================================================
// MOTEUR 3D THREE.JS : BOÎTE CADEAU 3D & PLUIE D'ÉTINCELLES
// =============================================================================
let scene3D, camera3D, renderer3D;
let giftGroup, giftLidGroup, cakeGroup, candleFlameMesh, candleLight;
let sparklesParticles, balloonsGroup;
let isDragging = false, prevMouseX = 0, prevMouseY = 0;
let targetRotX = 0.2, targetRotY = -0.4;
let raycaster, mouse;

function initThreeDScene() {
  const container = document.getElementById('giftBoxContainer');
  if (!container || typeof THREE === 'undefined') return;

  container.innerHTML = `
    <div class="canvas-3d-wrapper">
      <canvas id="giftCanvas3D"></canvas>
      <div class="canvas-controls-hint">
        <i data-lucide="rotate-3d"></i> Faites pivoter en 3D • Cliquez pour ouvrir !
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  const canvas = document.getElementById('giftCanvas3D');
  const width = container.clientWidth || 550;
  const height = 400;

  // Scène
  scene3D = new THREE.Scene();

  // Caméra
  camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera3D.position.set(0, 3.5, 9);
  camera3D.lookAt(0, 0.5, 0);

  // Renderer WebGL avec ombres douces et antialiasing
  renderer3D = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer3D.setSize(width, height);
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3D.shadowMap.enabled = true;
  renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;

  // Éclairage féerique
  const ambientLight = new THREE.AmbientLight(0xfff4e6, 1.3);
  scene3D.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffeedd, 2.2);
  mainLight.position.set(5, 10, 7);
  mainLight.castShadow = true;
  scene3D.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xd4af37, 1.2);
  fillLight.position.set(-6, -2, -4);
  scene3D.add(fillLight);

  // Matériaux de la boîte (Magenta & Or Rose)
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xc2185b,
    roughness: 0.32,
    metalness: 0.25
  });

  const goldRibbonMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0x553e00,
    emissiveIntensity: 0.25
  });

  // Groupe Racine de la Boîte Cadeau
  giftGroup = new THREE.Group();
  scene3D.add(giftGroup);

  // 1. Corps de la boîte
  const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 2.4);
  const bodyMesh = new THREE.Mesh(bodyGeo, boxMat);
  bodyMesh.position.y = 0.9;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  giftGroup.add(bodyMesh);

  // Rubans dorés
  const ribbonVGeo = new THREE.BoxGeometry(0.35, 1.82, 2.44);
  const ribbonVMesh = new THREE.Mesh(ribbonVGeo, goldRibbonMat);
  ribbonVMesh.position.y = 0.9;
  giftGroup.add(ribbonVMesh);

  const ribbonHGeo = new THREE.BoxGeometry(2.44, 1.82, 0.35);
  const ribbonHMesh = new THREE.Mesh(ribbonHGeo, goldRibbonMat);
  ribbonHMesh.position.y = 0.9;
  giftGroup.add(ribbonHMesh);

  // 2. Couvercle du Cadeau (qui s'envolera au clic)
  giftLidGroup = new THREE.Group();
  giftLidGroup.position.set(0, 1.85, 0);

  const lidGeo = new THREE.BoxGeometry(2.6, 0.45, 2.6);
  const lidMesh = new THREE.Mesh(lidGeo, boxMat);
  lidMesh.position.y = 0.22;
  lidMesh.castShadow = true;
  giftLidGroup.add(lidMesh);

  const lidRibbon1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.47, 2.64), goldRibbonMat);
  lidRibbon1.position.y = 0.22;
  giftLidGroup.add(lidRibbon1);

  const lidRibbon2 = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.47, 0.36), goldRibbonMat);
  lidRibbon2.position.y = 0.22;
  giftLidGroup.add(lidRibbon2);

  // Nœud 3D sur le couvercle
  const bowGeo = new THREE.TorusGeometry(0.35, 0.12, 12, 24);
  const bowLeft = new THREE.Mesh(bowGeo, goldRibbonMat);
  bowLeft.position.set(-0.25, 0.65, 0);
  bowLeft.rotation.y = Math.PI / 4;
  bowLeft.rotation.z = Math.PI / 6;
  giftLidGroup.add(bowLeft);

  const bowRight = new THREE.Mesh(bowGeo, goldRibbonMat);
  bowRight.position.set(0.25, 0.65, 0);
  bowRight.rotation.y = -Math.PI / 4;
  bowRight.rotation.z = -Math.PI / 6;
  giftLidGroup.add(bowRight);

  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), goldRibbonMat);
  bowKnot.position.set(0, 0.55, 0);
  giftLidGroup.add(bowKnot);

  giftGroup.add(giftLidGroup);

  // 3. Gâteau 3D intérieur
  cakeGroup = new THREE.Group();
  cakeGroup.position.set(0, 0.1, 0);
  cakeGroup.scale.set(0.01, 0.01, 0.01);
  cakeGroup.visible = false;

  const cakeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.8, 32),
    new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.4 })
  );
  cakeBase.position.y = 0.4;
  cakeGroup.add(cakeBase);

  const cakeTopTier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.6, 32),
    new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.3 })
  );
  cakeTopTier.position.y = 1.0;
  cakeGroup.add(cakeTopTier);

  // Bougie 3D
  const candleMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x00b4d8 })
  );
  candleMesh.position.set(0, 1.45, 0);
  cakeGroup.add(candleMesh);

  // Flamme lumineuse
  const flameGeo = new THREE.ConeGeometry(0.09, 0.22, 16);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  candleFlameMesh = new THREE.Mesh(flameGeo, flameMat);
  candleFlameMesh.position.set(0, 1.78, 0);
  cakeGroup.add(candleFlameMesh);

  candleLight = new THREE.PointLight(0xff9900, 2.5, 6);
  candleLight.position.set(0, 1.85, 0);
  cakeGroup.add(candleLight);

  scene3D.add(cakeGroup);

  // Ombre portée au sol
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.01;
  scene3D.add(groundShadow);

  // 4. Pluie d'étincelles 3D & Ballons flottants
  create3DSparkleShower();
  create3DBalloons();

  // Raycaster & événements souris
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  setup3DInteraction(canvas);

  // Boucle de rendu
  animate3D();
  window.addEventListener('resize', onWindowResize3D);
}

// Pluie d'étincelles 3D autour de la boîte
function create3DSparkleShower() {
  const particleCount = 450;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = [];

  const colorGold = new THREE.Color(0xffd700);
  const colorRose = new THREE.Color(0xff69b4);
  const colorCyan = new THREE.Color(0x00f2fe);
  const colorWhite = new THREE.Color(0xffffff);
  const palette = [colorGold, colorRose, colorCyan, colorWhite];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.0 + Math.random() * 5.0;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * 8 - 1;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    const chosen = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = chosen.r;
    colors[i * 3 + 1] = chosen.g;
    colors[i * 3 + 2] = chosen.b;

    velocities.push({
      vy: 0.015 + Math.random() * 0.025,
      wobble: Math.random() * 5
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pMaterial = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    map: createSparkleTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  sparklesParticles = new THREE.Points(geometry, pMaterial);
  sparklesParticles.userData = { velocities };
  scene3D.add(sparklesParticles);
}

function createSparkleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 220, 100, 0.8)');
  grad.addColorStop(0.7, 'rgba(255, 180, 50, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// Ballons 3D métallisés flottant autour de la boîte
function create3DBalloons() {
  balloonsGroup = new THREE.Group();
  const balloonConfigs = [
    { color: 0xff1493, x: -3.2, y: 2.2, z: -1.0, scale: 0.85, speed: 1.2, phase: 0 },
    { color: 0xff69b4, x: -2.3, y: 3.4, z: -1.8, scale: 0.95, speed: 1.5, phase: 1.5 },
    { color: 0xffd700, x: 2.7, y: 2.5, z: -1.0, scale: 0.9, speed: 1.1, phase: 3.0 },
    { color: 0xc2185b, x: 3.3, y: 3.5, z: -1.8, scale: 1.0, speed: 1.4, phase: 4.5 }
  ];

  balloonConfigs.forEach(cfg => {
    const bGroup = new THREE.Group();
    bGroup.position.set(cfg.x, cfg.y, cfg.z);
    bGroup.userData = { initialY: cfg.y, speed: cfg.speed, phase: cfg.phase };

    const bGeo = new THREE.SphereGeometry(0.52 * cfg.scale, 24, 24);
    const bMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: 0.55,
      roughness: 0.22
    });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.scale.set(1, 1.25, 1);
    bMesh.castShadow = true;
    bGroup.add(bMesh);

    const knotGeo = new THREE.ConeGeometry(0.08 * cfg.scale, 0.1 * cfg.scale, 8);
    const knotMesh = new THREE.Mesh(knotGeo, bMat);
    knotMesh.position.y = -0.68 * cfg.scale;
    knotMesh.rotation.x = Math.PI;
    bGroup.add(knotMesh);

    balloonsGroup.add(bGroup);
  });

  scene3D.add(balloonsGroup);
}

function setup3DInteraction(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      targetRotY += deltaX * 0.01;
      targetRotX += deltaY * 0.01;
      targetRotX = Math.max(-0.2, Math.min(0.6, targetRotX));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      targetRotY += deltaX * 0.012;
      targetRotX += deltaY * 0.012;
      targetRotX = Math.max(-0.2, Math.min(0.6, targetRotX));
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera3D);
    const intersects = raycaster.intersectObjects([giftGroup], true);

    if (intersects.length > 0 && !AppState.isGiftOpen) {
      triggerOpenGiftAnimation();
    }
  });
}

function onWindowResize3D() {
  const container = document.getElementById('giftBoxContainer');
  if (!container || !renderer3D || !camera3D) return;
  const width = container.clientWidth;
  const height = 400;
  camera3D.aspect = width / height;
  camera3D.updateProjectionMatrix();
  renderer3D.setSize(width, height);
}

let clock = new THREE.Clock();

function animate3D() {
  requestAnimationFrame(animate3D);
  const elapsedTime = clock.getElapsedTime();

  if (giftGroup) {
    if (!isDragging) {
      targetRotY += 0.003;
    }
    giftGroup.rotation.y += (targetRotY - giftGroup.rotation.y) * 0.08;
    giftGroup.rotation.x += (targetRotX - giftGroup.rotation.x) * 0.08;

    if (!AppState.isGiftOpen) {
      giftGroup.position.y = Math.sin(elapsedTime * 2) * 0.08;
    }
  }

  if (sparklesParticles) {
    const positions = sparklesParticles.geometry.attributes.position.array;
    const { velocities } = sparklesParticles.userData;

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3 + 1] -= velocities[i].vy;
      positions[i * 3] += Math.cos(elapsedTime + velocities[i].wobble) * 0.005;
      positions[i * 3 + 2] += Math.sin(elapsedTime + velocities[i].wobble) * 0.005;

      if (positions[i * 3 + 1] < -0.5) {
        positions[i * 3 + 1] = 6.5;
      }
    }
    sparklesParticles.geometry.attributes.position.needsUpdate = true;
    sparklesParticles.rotation.y = elapsedTime * 0.02;
  }

  // Animation du flottement des ballons
  if (balloonsGroup) {
    balloonsGroup.children.forEach(b => {
      const { initialY, speed, phase } = b.userData;
      b.position.y = initialY + Math.sin(elapsedTime * speed + phase) * 0.18;
      b.rotation.z = Math.sin(elapsedTime * speed * 0.8 + phase) * 0.08;
    });
  }

  if (candleFlameMesh && !AppState.candlesBlown) {
    const scale = 1.0 + Math.sin(elapsedTime * 15) * 0.15;
    candleFlameMesh.scale.set(scale, scale * 1.1, scale);
    candleLight.intensity = 2.0 + Math.sin(elapsedTime * 12) * 0.8;
  }

  renderer3D.render(scene3D, camera3D);
}

// Explosion féerique d'émojis flottants
function launchFloatingEmojis() {
  const emojis = ['💖', '✨', '🌸', '🎂', '🎉', '💐', '⭐', '🎈'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.position = 'fixed';
    el.style.left = `${45 + (Math.random() - 0.5) * 20}%`;
    el.style.bottom = '35%';
    el.style.fontSize = `${Math.random() * 22 + 20}px`;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '999';
    el.style.userSelect = 'none';
    document.body.appendChild(el);

    if (typeof gsap !== 'undefined') {
      gsap.to(el, {
        x: (Math.random() - 0.5) * 360,
        y: -(Math.random() * 320 + 200),
        rotation: (Math.random() - 0.5) * 60,
        opacity: 0,
        duration: Math.random() * 1.5 + 1.5,
        ease: 'power2.out',
        onComplete: () => el.remove()
      });
    } else {
      setTimeout(() => el.remove(), 2500);
    }
  }
}

// =============================================================================
// ANIMATION D'OUVERTURE DE LA BOÎTE CADEAU
// =============================================================================
function triggerOpenGiftAnimation() {
  if (AppState.isGiftOpen) return;
  AppState.isGiftOpen = true;

  playFanfareSound();
  launchGrandConfettiBurst();
  launchFloatingEmojis();

  if (typeof gsap !== 'undefined' && giftLidGroup) {
    gsap.to(giftLidGroup.position, {
      y: 4.8,
      duration: 1.2,
      ease: "power2.out"
    });
    gsap.to(giftLidGroup.rotation, {
      x: 0.6,
      z: 0.8,
      y: 1.5,
      duration: 1.2,
      ease: "power2.out"
    });
    gsap.to(giftLidGroup.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      delay: 0.9,
      duration: 0.4,
      onComplete: () => {
        giftLidGroup.visible = false;
      }
    });

    cakeGroup.visible = true;
    gsap.to(cakeGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.2,
      delay: 0.3,
      ease: "elastic.out(1, 0.6)"
    });
    gsap.to(cakeGroup.position, {
      y: 1.8,
      duration: 1.0,
      delay: 0.3,
      ease: "power2.out"
    });
  }

  const cakeContainer = document.getElementById('cakeContainer');
  if (cakeContainer) {
    cakeContainer.classList.remove('hidden');
    cakeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const hint = document.querySelector('.canvas-controls-hint');
  if (hint) {
    hint.innerHTML = '✨ Boîte ouverte ! Soufflez la bougie ci-dessous 🎂';
  }
}

function resetGift() {
  AppState.isGiftOpen = false;
  AppState.candlesBlown = false;

  if (giftLidGroup) {
    giftLidGroup.visible = true;
    gsap.to(giftLidGroup.position, { y: 1.85, duration: 0.7, ease: "power2.inOut" });
    gsap.to(giftLidGroup.rotation, { x: 0, y: 0, z: 0, duration: 0.7 });
    gsap.to(giftLidGroup.scale, { x: 1, y: 1, z: 1, duration: 0.7 });
  }

  if (cakeGroup) {
    gsap.to(cakeGroup.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 0.5,
      onComplete: () => {
        cakeGroup.visible = false;
        cakeGroup.position.set(0, 0.1, 0);
      }
    });
  }

  if (candleFlameMesh) candleFlameMesh.visible = true;
  if (candleLight) candleLight.intensity = 2.5;

  document.querySelectorAll('.flame').forEach(f => f.classList.remove('extinguished'));

  const cakeContainer = document.getElementById('cakeContainer');
  if (cakeContainer) cakeContainer.classList.add('hidden');

  const blowBtn = document.getElementById('blowCandlesBtn');
  if (blowBtn) {
    blowBtn.innerHTML = '<i data-lucide="wind"></i> <span>Souffler les bougies !</span>';
    blowBtn.classList.remove('btn-primary');
    blowBtn.classList.add('btn-warning');
  }

  const micText = document.getElementById('micBlowText');
  if (micText) micText.innerText = "Souffler au micro 🎙️";

  const hint = document.querySelector('.canvas-controls-hint');
  if (hint) {
    hint.innerHTML = '<i data-lucide="rotate-3d"></i> Faites pivoter en 3D • Cliquez pour ouvrir !';
    if (window.lucide) lucide.createIcons();
  }
}

function blowCandles() {
  if (AppState.candlesBlown) return;
  AppState.candlesBlown = true;

  if (candleFlameMesh) {
    gsap.to(candleFlameMesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.3,
      onComplete: () => {
        candleFlameMesh.visible = false;
      }
    });
  }
  if (candleLight) {
    gsap.to(candleLight, { intensity: 0, duration: 0.4 });
  }

  document.querySelectorAll('.flame').forEach(flame => {
    flame.classList.add('extinguished');
  });

  playBlowSound();

  confetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#ffd700', '#ffffff', '#ff9900']
  });

  const blowBtn = document.getElementById('blowCandlesBtn');
  if (blowBtn) {
    blowBtn.innerHTML = '✨ Vœu exaucé ! 💖';
    blowBtn.classList.remove('btn-warning');
    blowBtn.classList.add('btn-primary');
  }
}

// =============================================================================
// ÉTINCELLES D'ARRIÈRE-PLAN & CONFETTIS
// =============================================================================
function initBackgroundSparkles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const sparkles = [];
  const count = 55;

  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 0.8,
      speedY: Math.random() * 0.4 + 0.1,
      speedX: (Math.random() - 0.5) * 0.25,
      alpha: Math.random(),
      fadeSpeed: Math.random() * 0.015 + 0.005,
      growing: Math.random() > 0.5
    });
  }

  // Traînée de poussière d'étoiles féerique suivant la souris
  const cursorSparkles = [];
  window.addEventListener('mousemove', (e) => {
    for (let i = 0; i < 2; i++) {
      cursorSparkles.push({
        x: e.clientX + (Math.random() - 0.5) * 12,
        y: e.clientY + (Math.random() - 0.5) * 12,
        size: Math.random() * 2.6 + 1.2,
        alpha: 1,
        vy: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 1.0,
        color: Math.random() > 0.4 ? '#ff69b4' : '#ffd700'
      });
    }
    if (cursorSparkles.length > 40) cursorSparkles.shift();
  });

  function renderSparkles() {
    ctx.clearRect(0, 0, width, height);
    sparkles.forEach(p => {
      if (p.growing) {
        p.alpha += p.fadeSpeed;
        if (p.alpha >= 0.85) p.growing = false;
      } else {
        p.alpha -= p.fadeSpeed;
        if (p.alpha <= 0.1) p.growing = true;
      }

      p.y -= p.speedY;
      p.x += p.speedX;

      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.save();
      const isRose = AppState.theme === 'theme-rose';
      ctx.fillStyle = isRose ? `rgba(255, 105, 180, ${p.alpha})` : `rgba(255, 215, 0, ${p.alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = isRose ? '#ff1493' : '#ffd700';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Dessin et mise à jour des étoiles du curseur
    for (let i = cursorSparkles.length - 1; i >= 0; i--) {
      const cp = cursorSparkles[i];
      cp.y += cp.vy;
      cp.x += cp.vx;
      cp.alpha -= 0.025;
      if (cp.alpha <= 0) {
        cursorSparkles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = cp.alpha;
      ctx.fillStyle = cp.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = cp.color;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, cp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(renderSparkles);
  }

  renderSparkles();
}

function launchGrandConfettiBurst() {
  if (typeof confetti === 'undefined') return;

  const count = 200;
  const defaults = { origin: { y: 0.65 } };

  function fire(particleRatio, opts) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }

  fire(0.25, {
    spread: 30,
    startVelocity: 55,
    colors: ['#ffd700', '#ff0055', '#00f2fe']
  });
  fire(0.2, {
    spread: 60,
    colors: ['#ffffff', '#ff9a00', '#9c27b0']
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45
  });
}

// =============================================================================
// AUDIO SYNTHÉTISÉ (WEB AUDIO API)
// =============================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playFanfareSound() {
  try {
    const ctx = getAudioContext();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.7);
    });
  } catch (err) { }
}

function playBlowSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(150, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.45);
  } catch (e) { }
}

// =============================================================================
// LECTEUR AUDIO OFFICIEL (EVA - ANNIVERSAIRE)
// =============================================================================
function initMusicPlayer() {
  const bgMusic = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicToggleBtn');
  const musicIcon = document.getElementById('musicIcon');
  if (!bgMusic || !musicBtn) return;

  bgMusic.volume = 0.8;

  function updateMusicUI(isPlaying) {
    AppState.musicPlaying = isPlaying;
    if (isPlaying) {
      musicBtn.classList.add('playing');
      musicBtn.style.borderColor = 'var(--primary)';
      musicBtn.style.color = 'var(--primary)';
      musicBtn.style.boxShadow = '0 0 15px var(--primary-glow)';
      if (musicIcon) musicIcon.setAttribute('data-lucide', 'volume-2');
    } else {
      musicBtn.classList.remove('playing');
      musicBtn.style.borderColor = '';
      musicBtn.style.color = '';
      musicBtn.style.boxShadow = '';
      if (musicIcon) musicIcon.setAttribute('data-lucide', 'volume-x');
    }
    if (window.lucide) lucide.createIcons();
  }

  // Tenter de lancer la musique dès l'ouverture du site
  function tryAutoPlay() {
    const playPromise = bgMusic.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          updateMusicUI(true);
        })
        .catch(() => {
          // Si le navigateur bloque l'autoplay direct sans interaction :
          // Lancement immédiat au premier clic, toucher ou défilement du visiteur
          updateMusicUI(false);
          const startOnInteraction = () => {
            bgMusic.play().then(() => {
              updateMusicUI(true);
            }).catch(() => { });
            window.removeEventListener('click', startOnInteraction);
            window.removeEventListener('touchstart', startOnInteraction);
            window.removeEventListener('scroll', startOnInteraction);
            window.removeEventListener('keydown', startOnInteraction);
          };
          window.addEventListener('click', startOnInteraction, { once: true });
          window.addEventListener('touchstart', startOnInteraction, { once: true });
          window.addEventListener('scroll', startOnInteraction, { once: true });
          window.addEventListener('keydown', startOnInteraction, { once: true });
        });
    }
  }

  tryAutoPlay();

  // Bouton bascule Lecture / Pause
  musicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bgMusic.paused) {
      bgMusic.play().then(() => updateMusicUI(true)).catch(() => { });
    } else {
      bgMusic.pause();
      updateMusicUI(false);
    }
  });
}

// =============================================================================
// PERSONNALISATION & ÉVÉNEMENTS
// =============================================================================
function initCustomizer() {
  const modal = document.getElementById('customizeModal');
  const openBtn = document.getElementById('openCustomizeModal');
  const closeBtn = document.getElementById('closeCustomizeModal');
  const applyBtn = document.getElementById('applyCustomizeBtn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const chosen = btn.dataset.theme;
      document.body.className = chosen;
      AppState.theme = chosen;
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const name = document.getElementById('inputPersonName').value.trim() || "Imane";
      const dateVal = document.getElementById('inputEventDate').value;

      AppState.name = name;
      if (dateVal) {
        AppState.date = new Date(dateVal + 'T20:00:00').toISOString();
      }

      saveConfig();
      updateDOMFromState();
      modal.classList.add('hidden');

      confetti({ particleCount: 30, spread: 45 });
    });
  }
}

function updateDOMFromState() {
  const heroName = document.getElementById('heroName');
  if (heroName) heroName.innerText = AppState.name;

  const footerText = document.getElementById('footerText');
  if (footerText) footerText.innerText = `Célébration pour ${AppState.name}`;

  const revealedGreeting = document.getElementById('revealedGreeting');
  if (revealedGreeting) revealedGreeting.innerText = `Joyeux Anniversaire ! 🎂`;

  const dateBadge = document.getElementById('eventDateBadge');
  if (dateBadge && AppState.date) {
    const d = new Date(AppState.date);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = d.toLocaleDateString('fr-FR', options);
    dateBadge.innerText = `Aujourd'hui • ${formatted.charAt(0).toUpperCase() + formatted.slice(1)} 🎉`;
  }
}

function saveConfig() {
  localStorage.setItem('birthday_config', JSON.stringify({
    name: AppState.name,
    date: AppState.date,
    theme: AppState.theme
  }));
}

function loadSavedConfig() {
  const saved = localStorage.getItem('birthday_config');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.name && data.name !== "Sarah") AppState.name = data.name;
      if (data.theme && data.theme !== "theme-gold") AppState.theme = data.theme;
      if (data.date) AppState.date = data.date;
    } catch (e) { }
  }
  document.body.className = AppState.theme;
  updateDOMFromState();
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  if (toast && toastMsg) {
    toastMsg.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

function initEventListeners() {
  // Déclencheur surprise
  const triggerSurpriseBtn = document.getElementById('triggerSurpriseBtn');
  if (triggerSurpriseBtn) {
    triggerSurpriseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const surpriseSection = document.getElementById('surprise');
      if (surpriseSection) {
        surpriseSection.scrollIntoView({ behavior: 'smooth' });
      }
      setTimeout(() => {
        triggerOpenGiftAnimation();
      }, 500);
    });
  }

  // Pluie d'étincelles & confettis
  const confettiBtn = document.getElementById('confettiCannonBtn');
  if (confettiBtn) {
    confettiBtn.addEventListener('click', () => {
      launchGrandConfettiBurst();
    });
  }

  // Souffler bougies (au clic)
  const blowBtn = document.getElementById('blowCandlesBtn');
  if (blowBtn) {
    blowBtn.addEventListener('click', blowCandles);
  }

  // Souffler bougies (au microphone en réel !)
  const micBlowBtn = document.getElementById('micBlowBtn');
  if (micBlowBtn) {
    let micStream = null;
    let micAudioContext = null;
    let isListeningMic = false;

    micBlowBtn.addEventListener('click', async () => {
      if (isListeningMic) return;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = micAudioContext.createMediaStreamSource(micStream);
        const analyser = micAudioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        isListeningMic = true;
        const textEl = document.getElementById('micBlowText');
        if (textEl) textEl.innerText = "Soufflez fort dans le micro ! 💨";
        micBlowBtn.style.borderColor = "var(--primary)";

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function checkBlow() {
          if (!isListeningMic || AppState.candlesBlown) {
            if (micStream) micStream.getTracks().forEach(t => t.stop());
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < 30; i++) {
            sum += dataArray[i];
          }
          const avg = sum / 30;
          if (avg > 75) {
            blowCandles();
            isListeningMic = false;
            if (textEl) textEl.innerText = "Bougie soufflée ! 🎉";
            if (micStream) micStream.getTracks().forEach(t => t.stop());
            return;
          }
          requestAnimationFrame(checkBlow);
        }
        checkBlow();
      } catch (err) {
        alert("Microphone non disponible ou permission refusée. Vous pouvez utiliser le bouton direct !");
      }
    });
  }

  // Reconditionner le cadeau
  const resetBtn = document.getElementById('resetGiftBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetGift);
  }

  // Bouton Partager le lien personnalisé
  const shareBtn = document.getElementById('shareLinkBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(AppState.name)}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showToast(`Lien personnalisé copié pour ${AppState.name} ! ✨`);
        }).catch(() => {
          showToast(`Lien prêt : ${url}`);
        });
      } else {
        showToast(`Lien prêt : ${url}`);
      }
    });
  }

  // Bouton Plein Écran
  const fsBtn = document.getElementById('fullscreenBtn');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => { });
      } else {
        document.exitFullscreen().catch(() => { });
      }
    });
  }
}
