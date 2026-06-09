import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

// ========== 全局状态 ==========
const state = {
  particles: null,
  wireframe: null,
  lines: null,
  geometry: null,
  currentPreset: 'torus',
  clock: new THREE.Clock(),
  animTime: 0,
  originalPositions: null,
  particleData: [],
  isLoaded: false
};

// UI 元素引用
const ui = {};

// ========== 颜色主题配置 ==========
const colorThemes = {
  cyan:    { base: new THREE.Color(0x00e5ff),  secondary: new THREE.Color(0x0088cc),  mix: 0.3 },
  fire:    { base: new THREE.Color(0xff4400),  secondary: new THREE.Color(0xffcc00),  mix: 0.4 },
  neon:    { base: new THREE.Color(0xff2a6d),  secondary: new THREE.Color(0xb829dd),  mix: 0.35 },
  ocean:   { base: new THREE.Color(0x0066ff),  secondary: new THREE.Color(0x00ccff),  mix: 0.3 },
  gold:    { base: new THREE.Color(0xffaa00),  secondary: new THREE.Color(0xffdd66),  mix: 0.25 },
  rainbow: { base: new THREE.Color(0xff0000),  secondary: new THREE.Color(0x00ff00),  mix: 0.5 },
  white:   { base: new THREE.Color(0xffffff),  secondary: new THREE.Color(0xaaaaaa),  mix: 0.2 }
};

// ========== 场景初始化 ==========
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0f);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 18);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

// 环境光 + 方向光（用于 wireframe 材质）
scene.add(new THREE.AmbientLight(0x404040, 1.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ========== 工具函数 ==========

/**
 * 采样纹理贴图的平均颜色（忽略透明像素）
 */
function sampleTextureAverageColor(texture) {
  const image = texture.image;
  if (!image || !image.width) return new THREE.Color(0xffffff);

  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size).data;
  let r = 0, g = 0, b = 0, count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 20) continue; // 跳过几乎透明的像素
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  if (count === 0) return new THREE.Color(0xffffff);
  return new THREE.Color(r / count / 255, g / count / 255, b / count / 255);
}

/**
 * 统一提取材质基础色：优先纹理平均色，其次材质 color 属性
 */
function getMaterialColor(material) {
  if (!material) return new THREE.Color(0xffffff);

  const mat = Array.isArray(material) ? material[0] : material;
  if (!mat) return new THREE.Color(0xffffff);

  // 如果材质有纹理贴图，采样纹理平均色
  if (mat.map && mat.map.image) {
    return sampleTextureAverageColor(mat.map);
  }

  // 否则使用材质 color 属性
  if (mat.color && mat.color.isColor) {
    return mat.color.clone();
  }

  return new THREE.Color(0xffffff);
}

/**
 * 在 BufferGeometry 表面采样粒子点
 */
function sampleParticlesFromGeometry(geometry, count) {
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();

  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const modelColors = new Float32Array(count * 3); // 模型原始颜色
  const sizes = new Float32Array(count);
  const randoms = new Float32Array(count);
  const indices = new Float32Array(count); // 用于彩虹色

  const colAttr = geometry.attributes.color;

  // 如果 geometry 是 indexed，使用三角形面积加权采样
  const index = geometry.index;
  let triCount;
  let useIndexed = false;

  if (index && index.count > 0) {
    triCount = index.count / 3;
    useIndexed = true;
  } else {
    triCount = posAttr.count / 3;
  }

  // 预计算三角形面积（用于加权随机采样）
  const areas = new Float32Array(triCount);
  let totalArea = 0;

  for (let i = 0; i < triCount; i++) {
    let a, b, c;
    if (useIndexed) {
      a = new THREE.Vector3().fromBufferAttribute(posAttr, index.array[i * 3]);
      b = new THREE.Vector3().fromBufferAttribute(posAttr, index.array[i * 3 + 1]);
      c = new THREE.Vector3().fromBufferAttribute(posAttr, index.array[i * 3 + 2]);
    } else {
      a = new THREE.Vector3().fromBufferAttribute(posAttr, i * 3);
      b = new THREE.Vector3().fromBufferAttribute(posAttr, i * 3 + 1);
      c = new THREE.Vector3().fromBufferAttribute(posAttr, i * 3 + 2);
    }
    const area = new THREE.Triangle(a, b, c).getArea();
    areas[i] = area;
    totalArea += area;
  }

  // 构建面积累积分布
  const cdf = new Float32Array(triCount);
  let cum = 0;
  for (let i = 0; i < triCount; i++) {
    cum += areas[i] / totalArea;
    cdf[i] = cum;
  }

  const _vA = new THREE.Vector3();
  const _vB = new THREE.Vector3();
  const _vC = new THREE.Vector3();
  const _nA = new THREE.Vector3();
  const _nB = new THREE.Vector3();
  const _nC = new THREE.Vector3();
  const _uvA = new THREE.Vector2();
  const _uvB = new THREE.Vector2();
  const _uvC = new THREE.Vector2();
  const _point = new THREE.Vector3();
  const _normal = new THREE.Vector3();
  const _uv = new THREE.Vector2();

  function getTrianglePoint(triIdx, r1, r2) {
    const sqrtR1 = Math.sqrt(r1);
    const u = 1 - sqrtR1;
    const v = sqrtR1 * (1 - r2);
    const w = sqrtR1 * r2;

    let i0, i1, i2;
    if (useIndexed) {
      i0 = index.array[triIdx * 3];
      i1 = index.array[triIdx * 3 + 1];
      i2 = index.array[triIdx * 3 + 2];
    } else {
      i0 = triIdx * 3;
      i1 = triIdx * 3 + 1;
      i2 = triIdx * 3 + 2;
    }

    _vA.fromBufferAttribute(posAttr, i0);
    _vB.fromBufferAttribute(posAttr, i1);
    _vC.fromBufferAttribute(posAttr, i2);
    _point.set(0,0,0).addScaledVector(_vA, u).addScaledVector(_vB, v).addScaledVector(_vC, w);

    if (normAttr) {
      _nA.fromBufferAttribute(normAttr, i0);
      _nB.fromBufferAttribute(normAttr, i1);
      _nC.fromBufferAttribute(normAttr, i2);
      _normal.set(0,0,0).addScaledVector(_nA, u).addScaledVector(_nB, v).addScaledVector(_nC, w).normalize();
    } else {
      _normal.set(0,1,0);
    }

    if (uvAttr) {
      _uvA.fromBufferAttribute(uvAttr, i0);
      _uvB.fromBufferAttribute(uvAttr, i1);
      _uvC.fromBufferAttribute(uvAttr, i2);
      _uv.set(0,0).addScaledVector(_uvA, u).addScaledVector(_uvB, v).addScaledVector(_uvC, w);
    }

    let sampledColor = null;
    if (colAttr) {
      const cAr = colAttr.array[i0 * 3], cAg = colAttr.array[i0 * 3 + 1], cAb = colAttr.array[i0 * 3 + 2];
      const cBr = colAttr.array[i1 * 3], cBg = colAttr.array[i1 * 3 + 1], cBb = colAttr.array[i1 * 3 + 2];
      const cCr = colAttr.array[i2 * 3], cCg = colAttr.array[i2 * 3 + 1], cCb = colAttr.array[i2 * 3 + 2];
      sampledColor = {
        r: cAr * u + cBr * v + cCr * w,
        g: cAg * u + cBg * v + cCg * w,
        b: cAb * u + cBb * v + cCb * w
      };
    }

    return { point: _point.clone(), normal: _normal.clone(), uv: _uv.clone(), color: sampledColor };
  }

  function sampleTriangle() {
    const r = Math.random();
    let lo = 0, hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  for (let i = 0; i < count; i++) {
    const triIdx = sampleTriangle();
    const r1 = Math.random();
    const r2 = Math.random();
    const { point, normal, color } = getTrianglePoint(triIdx, r1, r2);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;

    normals[i * 3] = normal.x;
    normals[i * 3 + 1] = normal.y;
    normals[i * 3 + 2] = normal.z;

    if (color) {
      modelColors[i * 3] = color.r;
      modelColors[i * 3 + 1] = color.g;
      modelColors[i * 3 + 2] = color.b;
    } else {
      modelColors[i * 3] = 1.0;
      modelColors[i * 3 + 1] = 1.0;
      modelColors[i * 3 + 2] = 1.0;
    }

    randoms[i] = Math.random();
    indices[i] = i / count;
    sizes[i] = 1.0;
  }

  const resultGeo = new THREE.BufferGeometry();
  resultGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  resultGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  resultGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  resultGeo.setAttribute('modelColor', new THREE.BufferAttribute(modelColors, 3));
  resultGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  resultGeo.setAttribute('random', new THREE.BufferAttribute(randoms, 1));
  resultGeo.setAttribute('idx', new THREE.BufferAttribute(indices, 1));

  return resultGeo;
}

/**
 * 更新粒子颜色
 */
function updateParticleColors(geo, themeKey) {
  const colors = geo.attributes.color.array;
  const modelColors = geo.attributes.modelColor ? geo.attributes.modelColor.array : null;
  const randoms = geo.attributes.random.array;
  const idxs = geo.attributes.idx.array;
  const count = geo.attributes.position.count;

  for (let i = 0; i < count; i++) {
    if (themeKey === 'original') {
      if (modelColors) {
        colors[i * 3] = modelColors[i * 3];
        colors[i * 3 + 1] = modelColors[i * 3 + 1];
        colors[i * 3 + 2] = modelColors[i * 3 + 2];
      } else {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1;
      }
      continue;
    }

    const theme = colorThemes[themeKey];
    const r = randoms[i];
    let c;
    if (themeKey === 'rainbow') {
      const hue = idxs[i];
      c = new THREE.Color().setHSL(hue, 0.85, 0.55);
    } else {
      c = new THREE.Color().lerpColors(theme.base, theme.secondary, r * theme.mix * 3);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.attributes.color.needsUpdate = true;
}

/**
 * 更新粒子大小
 */
function updateParticleSizes(geo, baseSize, randomEnabled) {
  const sizes = geo.attributes.size.array;
  const randoms = geo.attributes.random.array;
  const count = sizes.length;
  for (let i = 0; i < count; i++) {
    sizes[i] = baseSize * (randomEnabled ? (0.5 + randoms[i]) : 1.0);
  }
  geo.attributes.size.needsUpdate = true;
}

// ========== ShaderMaterial ==========

const particleVertexShader = `
  attribute float size;
  attribute float random;
  attribute float idx;
  varying vec3 vColor;
  varying float vRandom;
  varying float vIdx;
  varying float vDepth;
  uniform float uTime;
  uniform float uPointSize;
  uniform float uAnimStrength;
  uniform float uAnimSpeed;
  uniform int uAnimMode;
  uniform float uExplodeProgress;

  // 动画模式常量
  #define MODE_NONE 0
  #define MODE_EXPLODE 1
  #define MODE_WAVE 2
  #define MODE_BREATHE 3
  #define MODE_SPIRAL 4
  #define MODE_ORBIT 5

  void main() {
    vColor = color;
    vRandom = random;
    vIdx = idx;

    vec3 pos = position;
    float t = uTime * uAnimSpeed;

    if (uAnimMode == MODE_EXPLODE) {
      // 爆炸聚合：向外扩散再回来
      float phase = sin(t * 0.8 + random * 6.28318);
      float expand = smoothstep(-1.0, 1.0, phase) * uAnimStrength * 0.05;
      vec3 dir = normalize(normal + vec3(random - 0.5, random - 0.5, random - 0.5) * 0.3);
      pos += dir * expand;
    }
    else if (uAnimMode == MODE_WAVE) {
      // 波浪：沿法线方向起伏
      float wave = sin(position.x * 0.5 + t + random * 2.0)
                 + cos(position.y * 0.5 + t * 0.7 + random * 3.0);
      pos += normal * wave * uAnimStrength * 0.015;
    }
    else if (uAnimMode == MODE_BREATHE) {
      // 呼吸：整体缩放脉冲
      float breathe = 1.0 + sin(t * 1.2 + random * 2.0) * uAnimStrength * 0.003;
      pos *= breathe;
    }
    else if (uAnimMode == MODE_SPIRAL) {
      // 螺旋：绕 Y 轴旋转并上下移动
      float angle = t * 0.5 + random * 6.28318;
      float radius = length(pos.xz);
      float newAngle = atan(pos.z, pos.x) + angle * uAnimStrength * 0.02;
      pos.x = cos(newAngle) * radius;
      pos.z = sin(newAngle) * radius;
      pos.y += sin(t + random * 6.28318) * uAnimStrength * 0.01;
    }
    else if (uAnimMode == MODE_ORBIT) {
      // 轨道：每个粒子绕自己局部中心转
      vec3 center = normal * 2.0;
      vec3 local = pos - center;
      float angle = t * 0.3 + random * 6.28318;
      float c = cos(angle * uAnimStrength * 0.02);
      float s = sin(angle * uAnimStrength * 0.02);
      vec3 rotated;
      rotated.x = local.x * c - local.z * s;
      rotated.z = local.x * s + local.z * c;
      rotated.y = local.y;
      pos = center + rotated;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z;

    // 大小随深度衰减
    float sizeAtten = 300.0 / -mvPosition.z;
    gl_PointSize = size * uPointSize * sizeAtten;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vRandom;
  varying float vDepth;
  uniform float uTime;
  uniform bool uGlow;
  uniform int uAnimMode;
  uniform float uOpacity;

  void main() {
    // 圆形粒子
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // 边缘发光
    float glow = 1.0 - smoothstep(0.3, 0.5, dist);
    if (!uGlow) glow = 1.0;

    // 深度淡化
    float depthFade = smoothstep(50.0, 5.0, vDepth);

    // 闪烁
    float twinkle = 0.9 + 0.1 * sin(uTime * 2.0 + vRandom * 100.0);

    vec3 finalColor = vColor * glow * twinkle * (0.7 + 0.3 * depthFade);
    float alpha = glow * depthFade * uOpacity;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ========== 创建/更新粒子系统 ==========

function createParticleSystem(geo, count) {
  // 清理旧对象
  if (state.particles) {
    scene.remove(state.particles);
    state.particles.geometry.dispose();
    state.particles.material.dispose();
  }
  if (state.wireframe) {
    scene.remove(state.wireframe);
    state.wireframe.geometry.dispose();
    state.wireframe.material.dispose();
  }
  if (state.lines) {
    scene.remove(state.lines);
    state.lines.geometry.dispose();
    state.lines.material.dispose();
  }

  // 采样粒子
  const particleGeo = sampleParticlesFromGeometry(geo, count);
  state.originalPositions = particleGeo.attributes.position.array.slice();

  // 如果原始 geometry 没有颜色属性，移除 modelColor，让 original 模式 fallback
  if (!geo.attributes.color) {
    particleGeo.deleteAttribute('modelColor');
  }

  // 应用颜色
  updateParticleColors(particleGeo, ui.colorTheme.value);
  updateParticleSizes(particleGeo, parseFloat(ui.pointSize.value), ui.randomSize.checked);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: parseFloat(ui.pointSize.value) },
      uAnimStrength: { value: parseFloat(ui.animStrength.value) },
      uAnimSpeed: { value: parseFloat(ui.animSpeed.value) },
      uAnimMode: { value: animModeToInt(ui.animMode.value) },
      uGlow: { value: ui.glowEffect.checked },
      uOpacity: { value: 1.0 }
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  const points = new THREE.Points(particleGeo, material);
  scene.add(points);
  state.particles = points;

  // 保存原始几何用于 wireframe
  state.geometry = geo;

  // 可选 wireframe
  updateWireframe();

  // 可选连线
  updateConnectLines();

  // 居中相机
  centerCamera(geo);

  state.isLoaded = true;
  ui.particleCount.textContent = `粒子数: ${count.toLocaleString()}`;
}

function animModeToInt(mode) {
  const map = { none: 0, explode: 1, wave: 2, breathe: 3, spiral: 4, orbit: 5 };
  return map[mode] ?? 0;
}

function updateWireframe() {
  if (state.wireframe) {
    scene.remove(state.wireframe);
    state.wireframe.geometry.dispose();
    state.wireframe.material.dispose();
    state.wireframe = null;
  }
  if (ui.showWireframe.checked && state.geometry) {
    const wireGeo = new THREE.WireframeGeometry(state.geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.15
    });
    state.wireframe = new THREE.LineSegments(wireGeo, wireMat);
    scene.add(state.wireframe);
  }
}

function updateConnectLines() {
  if (state.lines) {
    scene.remove(state.lines);
    state.lines.geometry.dispose();
    state.lines.material.dispose();
    state.lines = null;
  }
  if (!ui.connectLines.checked || !state.particles) return;

  const positions = state.particles.geometry.attributes.position.array;
  const count = state.particles.geometry.attributes.position.count;
  const linePositions = [];
  const lineColors = [];

  // 只连接邻近粒子（简单的空间分割，只检查前 N 个）
  const step = Math.max(1, Math.floor(count / 2000));
  const connectDist = 1.2;

  for (let i = 0; i < count; i += step) {
    const x1 = positions[i * 3];
    const y1 = positions[i * 3 + 1];
    const z1 = positions[i * 3 + 2];
    let connections = 0;
    for (let j = i + step; j < count && connections < 3; j += step) {
      const x2 = positions[j * 3];
      const y2 = positions[j * 3 + 1];
      const z2 = positions[j * 3 + 2];
      const dx = x1 - x2, dy = y1 - y2, dz = z1 - z2;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < connectDist) {
        linePositions.push(x1, y1, z1, x2, y2, z2);
        const alpha = 1.0 - dist / connectDist;
        lineColors.push(alpha, alpha, alpha, alpha, alpha, alpha);
        connections++;
      }
    }
  }

  if (linePositions.length > 0) {
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });
    state.lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(state.lines);
  }
}

function centerCamera(geo) {
  geo.computeBoundingSphere();
  const radius = geo.boundingSphere.radius;
  const center = geo.boundingSphere.center;

  // 移动几何体使中心在原点
  if (state.particles) {
    state.particles.position.copy(center).multiplyScalar(-1);
  }
  if (state.wireframe) {
    state.wireframe.position.copy(center).multiplyScalar(-1);
  }
  if (state.lines) {
    state.lines.position.copy(center).multiplyScalar(-1);
  }

  // 调整相机距离
  const fov = camera.fov * (Math.PI / 180);
  const distance = (radius * 2.5) / Math.tan(fov / 2);
  camera.position.set(0, 0, Math.max(distance, 5));
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
}

// ========== 预设几何体 ==========

function loadPreset(name) {
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.preset === name));
  state.currentPreset = name;

  let geo;
  switch (name) {
    case 'cube':
      geo = new THREE.BoxGeometry(4, 4, 4, 10, 10, 10);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(3, 64, 64);
      break;
    case 'torus':
      geo = new THREE.TorusKnotGeometry(2.5, 0.8, 150, 20);
      break;
    case 'knot':
      geo = new THREE.TorusKnotGeometry(2, 0.6, 200, 32, 3, 5);
      break;
    case 'cone':
      geo = new THREE.ConeGeometry(3, 6, 64, 20);
      break;
    case 'icosahedron':
      geo = new THREE.IcosahedronGeometry(3.5, 4);
      break;
    default:
      geo = new THREE.TorusKnotGeometry(2.5, 0.8, 150, 20);
  }

  createParticleSystem(geo, parseInt(ui.density.value));
  ui.modelInfo.textContent = `当前: 预设模型「${name}」`;
  ui.modelInfo.classList.remove('hidden');
}

// ========== 文件加载 ==========

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

async function loadModelFile(file) {
  showLoading(true);
  const ext = file.name.split('.').pop().toLowerCase();
  const url = URL.createObjectURL(file);
  let geo = null;

  try {
    switch (ext) {
      case 'obj': {
        const loader = new OBJLoader();
        const obj = await loader.loadAsync(url);
        geo = mergeGeometries(obj);
        break;
      }
      case 'gltf':
      case 'glb': {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);

        // 先收集所有材质，为带纹理的材质采样平均色
        const materials = new Set();
        gltf.scene.traverse(child => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => materials.add(m));
            } else {
              materials.add(child.material);
            }
          }
        });
        for (const mat of materials) {
          if (mat.map && mat.map.image) {
            const avgColor = sampleTextureAverageColor(mat.map);
            mat.color.set(avgColor);
          }
        }

        const meshes = [];
        gltf.scene.traverse(child => {
          if (child.isMesh && child.geometry) {
            const geo = child.geometry.clone();

            // 注入颜色：优先顶点颜色，其次材质颜色（已包含纹理采样结果）
            if (!geo.attributes.color) {
              const matColor = getMaterialColor(child.material);
              const count = geo.attributes.position.count;
              const colors = new Float32Array(count * 3);
              for (let i = 0; i < count; i++) {
                colors[i * 3] = matColor.r;
                colors[i * 3 + 1] = matColor.g;
                colors[i * 3 + 2] = matColor.b;
              }
              geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }

            meshes.push(geo);
          }
        });
        if (meshes.length > 0) {
          geo = meshes.length === 1 ? meshes[0] : mergeGeometriesManual(meshes);
        }
        break;
      }
      case 'fbx': {
        const loader = new FBXLoader();
        const fbx = await loader.loadAsync(url);
        const meshes = [];
        fbx.traverse(child => {
          if (child.isMesh && child.geometry) {
            const geo = child.geometry.clone();

            if (!geo.attributes.color && child.material) {
              const matColor = getMaterialColor(child.material);
              const count = geo.attributes.position.count;
              const colors = new Float32Array(count * 3);
              for (let i = 0; i < count; i++) {
                colors[i * 3] = matColor.r;
                colors[i * 3 + 1] = matColor.g;
                colors[i * 3 + 2] = matColor.b;
              }
              geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }

            meshes.push(geo);
          }
        });
        if (meshes.length > 0) {
          geo = meshes.length === 1 ? meshes[0] : mergeGeometriesManual(meshes);
        }
        break;
      }
      case 'stl': {
        const loader = new STLLoader();
        geo = await loader.loadAsync(url);
        break;
      }
      case 'ply': {
        const loader = new PLYLoader();
        geo = await loader.loadAsync(url);
        break;
      }
      default:
        throw new Error('不支持的文件格式: ' + ext);
    }
  } catch (err) {
    alert('模型加载失败: ' + err.message);
    console.error(err);
  } finally {
    URL.revokeObjectURL(url);
    showLoading(false);
  }

  if (geo) {
    createParticleSystem(geo, parseInt(ui.density.value));
    ui.modelInfo.textContent = `当前: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    ui.modelInfo.classList.remove('hidden');
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    state.currentPreset = null;
  }
}

/**
 * 从 OBJ 中提取并合并几何体，同时保留材质颜色
 */
function mergeGeometries(obj) {
  const geometries = [];
  obj.traverse(child => {
    if (child.isMesh && child.geometry) {
      // 应用世界变换
      child.updateMatrixWorld();
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);

      // 没有顶点颜色时，用材质颜色填充（支持纹理采样）
      if (!geo.attributes.color && child.material) {
        const matColor = getMaterialColor(child.material);
        const count = geo.attributes.position.count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          colors[i * 3] = matColor.r;
          colors[i * 3 + 1] = matColor.g;
          colors[i * 3 + 2] = matColor.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }

      geometries.push(geo);
    }
  });
  if (geometries.length === 0) return new THREE.BoxGeometry(1,1,1);
  if (geometries.length === 1) return geometries[0];
  return mergeGeometriesManual(geometries);
}

function mergeGeometriesManual(geometries) {
  let totalVerts = 0;
  let totalIndices = 0;
  let hasIndex = true;
  let hasColor = true;

  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    if (g.index) totalIndices += g.index.count;
    else hasIndex = false;
    if (!g.attributes.color) hasColor = false;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  const colArr = hasColor ? new Float32Array(totalVerts * 3) : null;
  let idxArr = null;
  if (hasIndex && totalIndices > 0) idxArr = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geometries) {
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal ? g.attributes.normal.array : null;
    const col = g.attributes.color ? g.attributes.color.array : null;
    const count = g.attributes.position.count;

    for (let i = 0; i < count; i++) {
      posArr[(vOffset + i) * 3] = pos[i * 3];
      posArr[(vOffset + i) * 3 + 1] = pos[i * 3 + 1];
      posArr[(vOffset + i) * 3 + 2] = pos[i * 3 + 2];
      if (norm) {
        normArr[(vOffset + i) * 3] = norm[i * 3];
        normArr[(vOffset + i) * 3 + 1] = norm[i * 3 + 1];
        normArr[(vOffset + i) * 3 + 2] = norm[i * 3 + 2];
      } else {
        normArr[(vOffset + i) * 3] = 0;
        normArr[(vOffset + i) * 3 + 1] = 1;
        normArr[(vOffset + i) * 3 + 2] = 0;
      }
      if (colArr && col) {
        colArr[(vOffset + i) * 3] = col[i * 3];
        colArr[(vOffset + i) * 3 + 1] = col[i * 3 + 1];
        colArr[(vOffset + i) * 3 + 2] = col[i * 3 + 2];
      } else if (colArr) {
        colArr[(vOffset + i) * 3] = 1;
        colArr[(vOffset + i) * 3 + 1] = 1;
        colArr[(vOffset + i) * 3 + 2] = 1;
      }
    }

    if (g.index && idxArr) {
      for (let i = 0; i < g.index.count; i++) {
        idxArr[iOffset + i] = g.index.array[i] + vOffset;
      }
      iOffset += g.index.count;
    }

    vOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  if (colArr) merged.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  if (idxArr) merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
  return merged;
}

// ========== 动画循环 ==========

let lastFpsTime = 0;
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = state.clock.getDelta();
  state.animTime += dt;

  // 更新粒子 uniforms
  if (state.particles) {
    const mat = state.particles.material;
    mat.uniforms.uTime.value = state.animTime;
    mat.uniforms.uPointSize.value = parseFloat(ui.pointSize.value);
    mat.uniforms.uAnimStrength.value = parseFloat(ui.animStrength.value);
    mat.uniforms.uAnimSpeed.value = parseFloat(ui.animSpeed.value);
    mat.uniforms.uAnimMode.value = animModeToInt(ui.animMode.value);
    mat.uniforms.uGlow.value = ui.glowEffect.checked;
    mat.uniforms.uOpacity.value = parseFloat(ui.opacity.value);
  }

  controls.autoRotate = ui.autoRotate.checked;
  controls.autoRotateSpeed = parseFloat(ui.rotationSpeed.value) * 2.5;
  controls.update();

  renderer.render(scene, camera);

  // FPS
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    ui.fpsCounter.textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastFpsTime = now;
  }
}

// ========== 截图 ==========

function takeScreenshot() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `3d-particle-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}

// ========== UI 事件绑定 ==========

function bindUI() {
  // 引用 DOM
  ui.density = document.getElementById('density');
  ui.densityVal = document.getElementById('densityVal');
  ui.pointSize = document.getElementById('pointSize');
  ui.pointSizeVal = document.getElementById('pointSizeVal');
  ui.opacity = document.getElementById('opacity');
  ui.opacityVal = document.getElementById('opacityVal');
  ui.colorTheme = document.getElementById('colorTheme');
  ui.animMode = document.getElementById('animMode');
  ui.animStrength = document.getElementById('animStrength');
  ui.animStrengthVal = document.getElementById('animStrengthVal');
  ui.animSpeed = document.getElementById('animSpeed');
  ui.animSpeedVal = document.getElementById('animSpeedVal');
  ui.rotationSpeed = document.getElementById('rotationSpeed');
  ui.rotationSpeedVal = document.getElementById('rotationSpeedVal');
  ui.showWireframe = document.getElementById('showWireframe');
  ui.autoRotate = document.getElementById('autoRotate');
  ui.glowEffect = document.getElementById('glowEffect');
  ui.connectLines = document.getElementById('connectLines');
  ui.randomSize = document.getElementById('randomSize');
  ui.fpsCounter = document.getElementById('fpsCounter');
  ui.particleCount = document.getElementById('particleCount');
  ui.modelInfo = document.getElementById('modelInfo');

  // 滑块数值同步
  const sliders = [
    ['density', 'densityVal'],
    ['pointSize', 'pointSizeVal'],
    ['opacity', 'opacityVal'],
    ['animStrength', 'animStrengthVal'],
    ['animSpeed', 'animSpeedVal'],
    ['rotationSpeed', 'rotationSpeedVal']
  ];
  sliders.forEach(([id, valId]) => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(valId);
    el.addEventListener('input', () => {
      valEl.textContent = el.value;
    });
  });

  // 密度改变 → 重建粒子
  ui.density.addEventListener('change', () => {
    if (state.geometry) {
      createParticleSystem(state.geometry, parseInt(ui.density.value));
    } else {
      loadPreset(state.currentPreset || 'torus');
    }
  });

  // 粒子大小改变
  ui.pointSize.addEventListener('input', () => {
    if (state.particles) {
      updateParticleSizes(state.particles.geometry, parseFloat(ui.pointSize.value), ui.randomSize.checked);
    }
  });

  // 透明度改变（实时更新 shader uniform，无需重建粒子）
  ui.opacity.addEventListener('input', () => {
    if (state.particles) {
      state.particles.material.uniforms.uOpacity.value = parseFloat(ui.opacity.value);
    }
  });

  // 随机大小
  ui.randomSize.addEventListener('change', () => {
    if (state.particles) {
      updateParticleSizes(state.particles.geometry, parseFloat(ui.pointSize.value), ui.randomSize.checked);
    }
  });

  // 颜色主题
  ui.colorTheme.addEventListener('change', () => {
    if (state.particles) {
      updateParticleColors(state.particles.geometry, ui.colorTheme.value);
    }
  });

  // 连线
  ui.connectLines.addEventListener('change', updateConnectLines);

  // 线框
  ui.showWireframe.addEventListener('change', updateWireframe);

  // 预设按钮
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  // 文件上传
  document.getElementById('modelInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) loadModelFile(file);
  });

  // 重置相机
  document.getElementById('resetCamera').addEventListener('click', () => {
    if (state.geometry) centerCamera(state.geometry);
    else {
      camera.position.set(0, 0, 18);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  });

  // 截图
  document.getElementById('screenshot').addEventListener('click', takeScreenshot);

  // 窗口大小
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ========== 启动 ==========

bindUI();
loadPreset('torus');
animate();
