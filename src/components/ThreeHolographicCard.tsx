import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface ThreeHolographicCardProps {
  inserting: boolean;
  onTriggerInsert: () => void;
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

/* Classic Game Boy Cartridge Silhouette matching Reference 2 */
function createCartridgeBodyGeometry(): THREE.ExtrudeGeometry {
  const w = 1.92;
  const h = 2.16;
  const r = 0.05;
  const notchW = 0.24;
  const notchH = 0.08;

  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - notchH);
  s.lineTo(w / 2 - notchW, h / 2 - notchH);
  s.lineTo(w / 2 - notchW, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createPillGeometry(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const r = height / 2;
  const halfStraight = Math.max(0.01, width / 2 - r);
  const s = new THREE.Shape();
  s.moveTo(-halfStraight, -r);
  s.lineTo(halfStraight, -r);
  s.absarc(halfStraight, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-halfStraight, r);
  s.absarc(-halfStraight, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createTriangleGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.14, 0.09);
  s.lineTo(0.14, 0.09);
  s.lineTo(0, -0.1);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

/* Engraved pill header matching Reference 2 ("GAME BOY") */
function createHeaderBannerTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#347BB8';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = 'rgba(248, 252, 255, 0.92)';
    ctx.font = 'italic bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME BOY', 256, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

/* Central square cartridge sticker matching Reference 2 layout */
function createStickerTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Silver-white side metallic trim matching Reference 2
    const borderGrad = ctx.createLinearGradient(0, 0, 512, 512);
    borderGrad.addColorStop(0, '#F8FCFF');
    borderGrad.addColorStop(0.5, '#C5E5FF');
    borderGrad.addColorStop(1, '#A8D8FF');
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Side vertical labels on silver strip ("THIS SIDE OUT" / "ERZA EDITION")
    ctx.save();
    ctx.fillStyle = '#142D49';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.translate(18, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FRIENDSHIP EDITION', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#142D49';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.translate(494, 256);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('THIS SIDE OUT', 0, 0);
    ctx.restore();

    // Inner artwork frame
    const artGrad = ctx.createLinearGradient(34, 22, 478, 490);
    artGrad.addColorStop(0, '#142D49');
    artGrad.addColorStop(0.45, '#347BB8');
    artGrad.addColorStop(0.85, '#79BFFF');
    artGrad.addColorStop(1, '#C5E5FF');
    ctx.fillStyle = artGrad;
    ctx.fillRect(34, 22, 444, 468);

    // Animated rainbow holographic reflection stripe
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(-0.45);
    const rainbow = ctx.createLinearGradient(-240, 0, 240, 0);
    rainbow.addColorStop(0, 'rgba(248,252,255,0)');
    rainbow.addColorStop(0.32, 'rgba(231,245,255,0.34)');
    rainbow.addColorStop(0.5, 'rgba(196,181,253,0.42)');
    rainbow.addColorStop(0.68, 'rgba(125,211,252,0.36)');
    rainbow.addColorStop(1, 'rgba(248,252,255,0)');
    ctx.fillStyle = rainbow;
    ctx.fillRect(-350, -350, 700, 700);
    ctx.restore();

    // Embedded tiny pixel stars
    ctx.fillStyle = '#F8FCFF';
    [
      [78, 72, 10],
      [430, 82, 12],
      [88, 340, 9],
      [426, 330, 10],
    ].forEach(([sx, sy, sz]) => {
      ctx.fillRect(sx - sz / 2, sy - 1.5, sz, 3);
      ctx.fillRect(sx - 1.5, sy - sz / 2, 3, sz);
    });

    // Title Banner
    ctx.fillStyle = '#F8FCFF';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("ERZA'S", 256, 76);
    ctx.fillStyle = '#E7F5FF';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('MEMORY CARD', 256, 112);
    ctx.fillStyle = '#A8D8FF';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('FRIENDSHIP EDITION', 256, 140);

    // Center Pixel Smiley Buddy inside cloud halo
    const smileyGrid = [
      '0011111100',
      '0111111110',
      '1111111111',
      '1100110011',
      '1100110011',
      '1111111111',
      '1101111011',
      '1110000111',
      '0111111110',
      '0011111100',
    ];
    const pSize = 15;
    const startX = 256 - (10 * pSize) / 2;
    const startY = 176;
    smileyGrid.forEach((row, r) => {
      [...row].forEach((cell, c) => {
        if (cell === '1') {
          ctx.fillStyle = r < 2 ? '#F8FCFF' : '#FDE047';
          ctx.fillRect(startX + c * pSize, startY + r * pSize, pSize - 1, pSize - 1);
        } else {
          ctx.fillStyle = '#142D49';
          ctx.fillRect(startX + c * pSize, startY + r * pSize, pSize - 1, pSize - 1);
        }
      });
    });

    // ESRB-inspired "E EVERYONE" seal in bottom-left like Reference 2
    ctx.fillStyle = '#F8FCFF';
    ctx.fillRect(52, 360, 56, 74);
    ctx.fillStyle = '#142D49';
    ctx.fillRect(55, 363, 50, 14);
    ctx.fillStyle = '#F8FCFF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('FRIENDS', 80, 373);
    ctx.fillStyle = '#142D49';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('E', 80, 412);
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ERZA ED.', 80, 428);

    // Bottom tag pill
    ctx.fillStyle = 'rgba(20, 45, 73, 0.85)';
    ctx.fillRect(126, 396, 336, 38);
    ctx.strokeStyle = '#E7F5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(126, 396, 336, 38);
    ctx.fillStyle = '#F8FCFF';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('MEMORIES • MUSIC • GAMES', 294, 420);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export const ThreeHolographicCard: React.FC<ThreeHolographicCardProps> = ({
  inserting,
  onTriggerInsert,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pointerTiltRef = useRef({ x: 0, y: 0 });
  const insertingRef = useRef(inserting);

  useEffect(() => {
    insertingRef.current = inserting;
  }, [inserting]);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const isSoftwareGl = detectSoftwareGl();
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    const w = mountEl.clientWidth || 198;
    const h = mountEl.clientHeight || 212;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 30);
    camera.position.set(0, 0.05, 5.4);

    const hemi = new THREE.HemisphereLight(0xf8fcff, 0x142d49, 1.05);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    key.position.set(3.2, 4.8, 6);
    scene.add(key);

    const skyRim = new THREE.DirectionalLight(0x79bfff, 1.45);
    skyRim.position.set(-4.2, -2, 3.4);
    scene.add(skyRim);

    const cartGroup = new THREE.Group();
    scene.add(cartGroup);

    // 1. Transparent Sky-Blue Holographic Cartridge Shell (with stepped top-right notch)
    const bodyGeo = createCartridgeBodyGeometry();
    const holoBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x79bfff,
      roughness: 0.16,
      metalness: 0.14,
      iridescence: 1.0,
      iridescenceIOR: 1.42,
      iridescenceThicknessRange: [160, 520],
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, holoBodyMat);
    cartGroup.add(bodyMesh);

    // 2. Top Grip Ribs (4 bars per side matching Reference 2)
    const ribGeo = new THREE.BoxGeometry(0.28, 0.036, 0.035);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0xe7f5ff,
      roughness: 0.3,
      metalness: 0.25,
    });
    for (let i = 0; i < 4; i++) {
      const y = 0.78 - i * 0.072;
      const leftRib = new THREE.Mesh(ribGeo, ribMat);
      leftRib.position.set(-0.78, y, 0.135);
      const rightRib = new THREE.Mesh(ribGeo, ribMat);
      rightRib.position.set(0.78, y, 0.135);
      cartGroup.add(leftRib, rightRib);
    }

    // 3. Recessed Pill Header + Embossed "GAME BOY"
    const pillGeo = createPillGeometry(1.22, 0.32, 0.03);
    const pillMat = new THREE.MeshPhysicalMaterial({
      color: 0x347bb8,
      roughness: 0.28,
      metalness: 0.2,
      clearcoat: 0.7,
    });
    const pillMesh = new THREE.Mesh(pillGeo, pillMat);
    pillMesh.position.set(0, 0.68, 0.125);
    cartGroup.add(pillMesh);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const bannerTex = createHeaderBannerTexture(maxAniso);
    const bannerGeo = new THREE.PlaneGeometry(1.06, 0.24);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.28,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(0, 0.68, 0.153);
    cartGroup.add(bannerMesh);

    // 4. Center Recessed Holographic Sticker Area
    const stickerFrameGeo = new THREE.BoxGeometry(1.36, 1.24, 0.025);
    const stickerFrameMat = new THREE.MeshStandardMaterial({
      color: 0x142d49,
      roughness: 0.42,
      metalness: 0.3,
    });
    const stickerFrame = new THREE.Mesh(stickerFrameGeo, stickerFrameMat);
    stickerFrame.position.set(0, -0.14, 0.125);
    cartGroup.add(stickerFrame);

    const stickerTex = createStickerTexture(maxAniso);
    const stickerGeo = new THREE.PlaneGeometry(1.26, 1.15);
    const stickerMat = new THREE.MeshPhysicalMaterial({
      map: stickerTex,
      roughness: 0.14,
      metalness: 0.15,
      iridescence: 1.0,
      iridescenceIOR: 1.38,
      clearcoat: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const stickerMesh = new THREE.Mesh(stickerGeo, stickerMat);
    stickerMesh.position.set(0, -0.14, 0.142);
    cartGroup.add(stickerMesh);

    // 5. Bottom Downward Triangle Indicator
    const triGeo = createTriangleGeometry();
    const triMat = new THREE.MeshStandardMaterial({
      color: 0xf8fcff,
      roughness: 0.24,
      metalness: 0.35,
    });
    const triMesh = new THREE.Mesh(triGeo, triMat);
    triMesh.position.set(0, -0.9, 0.135);
    cartGroup.add(triMesh);

    // 6. Metallic Connector Pins at Bottom
    const pinGeo = new THREE.BoxGeometry(0.08, 0.14, 0.025);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xe7f5ff,
      roughness: 0.18,
      metalness: 0.92,
    });
    for (let i = 0; i < 8; i++) {
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(-0.56 + i * 0.16, -1.03, -0.04);
      cartGroup.add(pin);
    }

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

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (!prefersReduced) {
        const targetRotY = insertingRef.current
          ? 0.12
          : Math.sin(elapsed * 1.35) * 0.28 + pointerTiltRef.current.x * 0.45;
        const targetRotX = insertingRef.current
          ? -0.22
          : Math.cos(elapsed * 1.05) * 0.1 + pointerTiltRef.current.y * 0.35;

        cartGroup.rotation.y = THREE.MathUtils.damp(cartGroup.rotation.y, targetRotY, 7, delta);
        cartGroup.rotation.x = THREE.MathUtils.damp(cartGroup.rotation.x, targetRotX, 7, delta);
        cartGroup.position.y = Math.sin(elapsed * 2.0) * 0.07;
      }

      renderer.render(scene, camera);
      if (prefersReduced) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    try {
      if (!isSoftwareGl) renderer.compile(scene, camera);
    } catch {
      // Ignore software fallback compile error
    }
    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      bodyGeo.dispose();
      ribGeo.dispose();
      pillGeo.dispose();
      bannerGeo.dispose();
      stickerFrameGeo.dispose();
      stickerGeo.dispose();
      triGeo.dispose();
      pinGeo.dispose();
      bannerTex.dispose();
      stickerTex.dispose();
      holoBodyMat.dispose();
      ribMat.dispose();
      pillMat.dispose();
      bannerMat.dispose();
      stickerFrameMat.dispose();
      stickerMat.dispose();
      triMat.dispose();
      pinMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerTiltRef.current = { x: nx, y: ny };
  };

  const handlePointerLeave = () => {
    pointerTiltRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Insert Erza's Memory Card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', 'erza-memory-card');
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onTriggerInsert}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTriggerInsert();
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E7F5FF] rounded-2xl transition-transform duration-300 ${
        inserting ? 'animate-sd-slide pointer-events-none' : 'hover:scale-105'
      }`}
    >
      <div className="relative flex flex-col items-center">
        <div
          ref={mountRef}
          className="w-[172px] h-[188px] sm:w-[198px] sm:h-[212px] drop-shadow-[0_18px_28px_rgba(20,45,73,0.42)]"
        />
      </div>
    </div>
  );
};
