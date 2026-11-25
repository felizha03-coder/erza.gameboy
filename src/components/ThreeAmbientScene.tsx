import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ThemeMode } from '../types/erza';

interface ThreeAmbientSceneProps {
  themeMode: ThemeMode;
}

interface FloatingProp {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  phase: number;
  rotSpeedX: number;
  rotSpeedY: number;
}

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createStarGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  const points = 4;
  const outer = 0.44;
  const inner = 0.16;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createSmileyFaceTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Sunny gold/sky coin face inspired by Reference 1's floating smiley tokens
    const grad = ctx.createRadialGradient(96, 84, 16, 128, 128, 128);
    grad.addColorStop(0, '#FFFBEB');
    grad.addColorStop(0.55, '#FDE047');
    grad.addColorStop(1, '#EAB308');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#142D49';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#142D49';
    ctx.beginPath();
    ctx.ellipse(94, 104, 11, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(162, 104, 11, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheerful smile arc
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 128, 56, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export const ThreeAmbientScene: React.FC<ThreeAmbientSceneProps> = ({ themeMode }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const hemi = hemiRef.current;
    if (!scene) return;
    if (themeMode === 'DAY') {
      scene.fog = new THREE.FogExp2(0x79bfff, 0.032);
      if (hemi) {
        hemi.color.setHex(0xf8fcff);
        hemi.groundColor.setHex(0x347bb8);
        hemi.intensity = 1.05;
      }
    } else {
      scene.fog = new THREE.FogExp2(0x142d49, 0.042);
      if (hemi) {
        hemi.color.setHex(0xa8d8ff);
        hemi.groundColor.setHex(0x0b1b2e);
        hemi.intensity = 0.8;
      }
    }
  }, [themeMode]);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      mountEl.clientWidth || window.innerWidth,
      mountEl.clientHeight || window.innerHeight
    );
    renderer.shadowMap.enabled = false;
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(themeMode === 'DAY' ? 0x79bfff : 0x142d49, 0.035);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 60);
    camera.position.set(0, 0, 10.6);

    const hemi = new THREE.HemisphereLight(
      themeMode === 'DAY' ? 0xf8fcff : 0xa8d8ff,
      themeMode === 'DAY' ? 0x347bb8 : 0x0b1b2e,
      themeMode === 'DAY' ? 1.05 : 0.8
    );
    hemiRef.current = hemi;
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fcff, 1.4);
    keyLight.position.set(6, 7, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x79bfff, 1.15);
    rimLight.position.set(-7, -3, -4);
    scene.add(rimLight);

    // Materials
    const skyPlasticMat = new THREE.MeshPhysicalMaterial({
      color: 0x347bb8,
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.88,
      clearcoatRoughness: 0.14,
    });

    const iceGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8d8ff,
      roughness: 0.15,
      metalness: 0.14,
      iridescence: 0.8,
      iridescenceIOR: 1.33,
      clearcoat: 1.0,
    });

    const cloudWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fcff,
      roughness: 0.6,
      metalness: 0.05,
    });

    const silverRimMat = new THREE.MeshStandardMaterial({
      color: 0xc5e5ff,
      roughness: 0.22,
      metalness: 0.85,
    });

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const smileyTex = createSmileyFaceTexture(maxAniso);
    const smileyFaceMat = new THREE.MeshStandardMaterial({
      map: smileyTex,
      roughness: 0.26,
      metalness: 0.12,
    });

    const starGeo = createStarGeometry();
    const ringGeo = new THREE.TorusGeometry(0.45, 0.07, 12, 30);
    const coinCylGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.12, 28);
    coinCylGeo.rotateX(Math.PI / 2);
    const coinFaceGeo = new THREE.CircleGeometry(0.39, 28);

    const puffGeo = new THREE.SphereGeometry(0.28, 14, 12);
    const cartBodyGeo = new THREE.BoxGeometry(0.64, 0.72, 0.12);
    const cartRidgeGeo = new THREE.BoxGeometry(0.56, 0.1, 0.14);
    const cartLabelGeo = new THREE.BoxGeometry(0.46, 0.36, 0.02);

    const props: FloatingProp[] = [];

    // 1. Floating 3D Smiley Token Coin (inspired by Reference 1's floating yellow smiley discs)
    const buildSmileyCoin = (x: number, y: number, z: number, scale: number, phase: number) => {
      const g = new THREE.Group();
      const rim = new THREE.Mesh(ringGeo, silverRimMat);
      const disc = new THREE.Mesh(coinCylGeo, silverRimMat);
      const front = new THREE.Mesh(coinFaceGeo, smileyFaceMat);
      front.position.z = 0.064;
      const back = new THREE.Mesh(coinFaceGeo, smileyFaceMat);
      back.rotation.y = Math.PI;
      back.position.z = -0.064;
      g.add(rim, disc, front, back);
      g.position.set(x, y, z);
      g.scale.setScalar(scale);
      scene.add(g);
      props.push({
        group: g,
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.72,
        phase,
        rotSpeedX: 0.22,
        rotSpeedY: 0.52,
      });
    };

    // 2. Floating 3D Fluffy Cloud Cluster
    const buildCloudCluster = (x: number, y: number, z: number, scale: number, phase: number) => {
      const g = new THREE.Group();
      const c1 = new THREE.Mesh(puffGeo, cloudWhiteMat);
      const c2 = new THREE.Mesh(puffGeo, cloudWhiteMat);
      c2.scale.setScalar(0.8);
      c2.position.set(-0.26, -0.06, 0.02);
      const c3 = new THREE.Mesh(puffGeo, cloudWhiteMat);
      c3.scale.setScalar(0.75);
      c3.position.set(0.26, -0.07, -0.02);
      const accentStar = new THREE.Mesh(starGeo, iceGlassMat);
      accentStar.scale.setScalar(0.32);
      accentStar.position.set(0.34, 0.26, 0.12);
      g.add(c1, c2, c3, accentStar);
      g.position.set(x, y, z);
      g.scale.setScalar(scale);
      scene.add(g);
      props.push({
        group: g,
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.55,
        phase,
        rotSpeedX: 0.08,
        rotSpeedY: -0.18,
      });
    };

    // 3. Floating 3D Mini Cartridge (matching Reference 2 proportions)
    const buildMiniCartridge = (x: number, y: number, z: number, scale: number, phase: number) => {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(cartBodyGeo, skyPlasticMat);
      const grip = new THREE.Mesh(cartRidgeGeo, silverRimMat);
      grip.position.set(0, 0.28, 0);
      const art = new THREE.Mesh(cartLabelGeo, iceGlassMat);
      art.position.set(0, -0.05, 0.065);
      g.add(shell, grip, art);
      g.position.set(x, y, z);
      g.scale.setScalar(scale);
      scene.add(g);
      props.push({
        group: g,
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.64,
        phase,
        rotSpeedX: 0.16,
        rotSpeedY: 0.36,
      });
    };

    // 4. Floating 3D Star Charm
    const buildStarCharm = (x: number, y: number, z: number, scale: number, phase: number) => {
      const g = new THREE.Group();
      const star = new THREE.Mesh(starGeo, iceGlassMat);
      const core = new THREE.Mesh(starGeo, cloudWhiteMat);
      core.scale.setScalar(0.45);
      core.position.z = 0.09;
      const ring = new THREE.Mesh(ringGeo, skyPlasticMat);
      ring.scale.setScalar(0.88);
      ring.rotation.y = Math.PI * 0.28;
      g.add(star, core, ring);
      g.position.set(x, y, z);
      g.scale.setScalar(scale);
      scene.add(g);
      props.push({
        group: g,
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.78,
        phase,
        rotSpeedX: -0.2,
        rotSpeedY: 0.42,
      });
    };

    // Positioned cleanly on flanks so center Game Boy stays unobstructed
    buildSmileyCoin(-5.3, 2.35, -1.1, 0.88, 0.2);
    buildSmileyCoin(5.45, -1.85, -1.2, 0.86, 3.1);
    buildCloudCluster(-5.5, -1.75, -1.6, 1.05, 1.4);
    buildCloudCluster(5.1, 2.2, -1.5, 0.96, 2.6);
    buildMiniCartridge(-4.2, 0.25, -2.5, 0.72, 4.1);
    buildStarCharm(4.3, 0.1, -2.4, 0.76, 5.2);

    // Instanced sky-blue sparkles & pixel stars
    const PARTICLE_COUNT = 72;
    const particleGeo = new THREE.OctahedronGeometry(0.055, 0);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xf8fcff,
      transparent: true,
      opacity: 0.75,
    });
    const instancedParticles = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    const pData: { x: number; y: number; z: number; s: number; speed: number; phase: number }[] =
      [];
    const _dummy = new THREE.Object3D();
    const _color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = (Math.random() - 0.5) * 11;
      const z = -2 - Math.random() * 7;
      const s = 0.55 + Math.random() * 1.1;
      pData.push({
        x,
        y,
        z,
        s,
        speed: 0.4 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
      _dummy.position.set(x, y, z);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      instancedParticles.setMatrixAt(i, _dummy.matrix);
      _color.setHex(i % 3 === 0 ? 0xf8fcff : i % 3 === 1 ? 0xe7f5ff : 0x347bb8);
      instancedParticles.setColorAt(i, _color);
    }
    instancedParticles.instanceMatrix.needsUpdate = true;
    if (instancedParticles.instanceColor) instancedParticles.instanceColor.needsUpdate = true;
    instancedParticles.computeBoundingSphere();
    scene.add(instancedParticles);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const updateScene = (elapsed: number, delta: number) => {
      for (let i = 0; i < props.length; i++) {
        const c = props[i];
        c.group.position.y = c.baseY + Math.sin(elapsed * c.speed + c.phase) * 0.34;
        c.group.rotation.x += c.rotSpeedX * delta;
        c.group.rotation.y += c.rotSpeedY * delta;
      }
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = pData[i];
        const yOffset = Math.sin(elapsed * p.speed + p.phase) * 0.25;
        const pulse = p.s * (0.75 + 0.3 * Math.sin(elapsed * 1.6 + p.phase));
        _dummy.position.set(p.x, p.y + yOffset, p.z);
        _dummy.rotation.y = elapsed * 0.5 + p.phase;
        _dummy.scale.setScalar(pulse);
        _dummy.updateMatrix();
        instancedParticles.setMatrixAt(i, _dummy.matrix);
      }
      instancedParticles.instanceMatrix.needsUpdate = true;
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      if (!prefersReduced) {
        updateScene(elapsed, delta);
      }
      renderer.render(scene, camera);
      if (prefersReduced) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const handleResize = () => {
      if (disposed || !mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
    };
    const onContextRestored = () => {
      if (!disposed) tick();
    };

    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    try {
      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    } catch {
      // Ignore software fallback hint
    }
    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      starGeo.dispose();
      ringGeo.dispose();
      coinCylGeo.dispose();
      coinFaceGeo.dispose();
      puffGeo.dispose();
      cartBodyGeo.dispose();
      cartRidgeGeo.dispose();
      cartLabelGeo.dispose();
      particleGeo.dispose();

      smileyTex.dispose();
      skyPlasticMat.dispose();
      iceGlassMat.dispose();
      cloudWhiteMat.dispose();
      silverRimMat.dispose();
      smileyFaceMat.dispose();
      particleMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};
