// 키르케 물격자 엔진 (kirke_water_lattice.html 의 식을 그대로 옮김). 캔버스 하나 = 10 × 10 m 칸 하나
// makeLattice(canvas, {scene, wind, dir}) -> { state, build(), draw(t), voidPct() }
(function (global) {
  // Ken Perlin 개선판(2002) 3D 노이즈. 순열은 LCG(씨앗 7) 섞기 — 시트·웹·캡처가 모두 같은 값
  const P = new Uint8Array(512);
  { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function grad(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
  function perlin(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = P[xi] + yi, AA = P[A] + zi, AB = P[A + 1] + zi, B = P[xi + 1] + yi, BA = P[B] + zi, BB = P[B + 1] + zi;
    return lerp(lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
                lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  function fbm(x, y, z, oct, gain) { let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * perlin(x * f + 17.3 * o, y * f + 5.1 * o, z * f); n += a; a *= gain; f *= 2; } return s / n; }
  console.assert(Math.abs(perlin(1, 4, 0)) < 1e-9 && Math.abs(perlin(2, 5, 7)) < 1e-9, 'perlin is 0 on lattice points');

  const N = 100, LV = 16, DZ = 0.18, F0 = 0.42, VOID = 0.22, L5 = 5;
  const ROWS = [{ name: '키르케의 집', ax: 0, ay: 0, gain: 0.5, wind: 0.2 },
                { name: '와인', ax: 2.5, ay: 0, gain: 0.62, wind: 1.0 },
                { name: '바람 자루', ax: 0, ay: 6.0, gain: 0.55, wind: 1.0 }];
  const WINDS = [{ o: 51, sp: 0.3 }, { o: 74, sp: 5.7 }, { o: 77, sp: 12.4 }, { o: 92, sp: 38.8 }];
  const DIRS = ['가운데에서 뻗음', '가로로', '아래로'];

  function makeLattice(cv, opt) {
    const g = cv.getContext('2d');
    const state = Object.assign({ scene: 0, wind: 2, dir: 0, layers: 5, holes: 0.6, refr: 0.6, caus: 0.7 }, opt);
    const mask = Array.from({ length: L5 }, () => new Uint8Array(N * N)), first = new Int16Array(N * N);
    const D = new Float32Array(N * N), DS = 4, DN = Math.ceil(N / DS) + 2, DC = new Float32Array(DN * DN);
    const ST = 3, NC = Math.ceil((N + 2) / ST) + 2, HC = new Float32Array(NC * NC), H = new Float32Array((N + 2) * (N + 2));
    const BINS = 8;
    let FS = null, THR = 0, sNow = 0, voidPct = 0, ink = [43, 47, 54], paper = '#fff';

    function build() {
      const row = ROWS[state.scene], s = Math.min(1, WINDS[state.wind].sp / 15) * row.wind; sNow = s;
      const sx = 1 + row.ax * (0.4 + s), sy = 1 + row.ay * (0.5 + s), warp = 0.8 + 2.2 * s;
      const seed = state.scene * 4 + state.wind, F = new Float32Array(N * N * LV), top = new Float32Array(N * N);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const X = i * 0.1 + seed * 37, Y = j * 0.1 + seed * 37, ex = Math.min(i, N - 1 - i, j, N - 1 - j) / (N - 1);
        let mx = -9;
        for (let k = 0; k < LV; k++) {
          const Z = (LV - 1 - k) * DZ;
          const wx = fbm(X * 0.18 + 3.1, Y * 0.18, Z * 0.18, 3, 0.5) * warp, wy = fbm(X * 0.18, Y * 0.18 + 7.7, Z * 0.18, 3, 0.5) * warp;
          let f = fbm((X + wx) * F0 / sx, (Y + wy) * F0 / sy, Z * F0 * 2, 6, row.gain) + 0.55 * k / (LV - 1);
          f -= 0.5 * Math.max(0, 0.06 - ex) / 0.06 * (0.6 + 0.4 * fbm(X * 1.7, Y * 1.7, Z, 2, 0.5));
          F[(i * N + j) * LV + k] = f; if (f > mx) mx = f;
        }
        top[i * N + j] = mx;
      }
      FS = F; THR = Float32Array.from(top).sort()[Math.floor(VOID * N * N)];
    }

    // 빈 공간을 미는 바람: 0 가운데에서 뻗음, 1 가로(왼 -> 오), 2 아래(위 -> 아래)
    function flowField(t, s) {
      const v = 0.35 + 1.1 * s, e = 1.6 + 2.4 * s, mode = state.dir;
      for (let a = 0; a < DN; a++) for (let b = 0; b < DN; b++) {
        const x = a * DS * 0.1, y = b * DS * 0.1; let n;
        if (mode === 0) { const dx = x - 5, dy = y - 5, r = Math.hypot(dx, dy) + 1e-6;
          n = fbm(dx / r * 1.3 + 11.7, dy / r * 1.3, (r - v * t) * 0.38 * 1.4 / e + t * 0.05, 3, 0.55) - 0.35 * Math.exp(-(r * r) / 2.2); }
        else if (mode === 1) n = fbm((x - v * t) * 0.38 / e + 11.7, y * 0.38 * 1.3, t * 0.08, 3, 0.55);
        else n = fbm(x * 0.38 * 1.3 + 11.7, (y - v * t) * 0.38 / e, t * 0.08, 3, 0.55);
        DC[a * DN + b] = n;
      }
      for (let i = 0; i < N; i++) { const u = i / DS, a = Math.floor(u), fu = u - a, su = fu * fu * (3 - 2 * fu);
        for (let j = 0; j < N; j++) { const w = j / DS, b = Math.floor(w), fv = w - b, sv = fv * fv * (3 - 2 * fv);
          D[i * N + j] = (DC[a * DN + b] * (1 - su) + DC[(a + 1) * DN + b] * su) * (1 - sv) + (DC[a * DN + b + 1] * (1 - su) + DC[(a + 1) * DN + b + 1] * su) * sv; } }
    }
    function updateMask() {
      const amt = state.holes * 1.6; let solidN = 0;
      for (let c = 0; c < N * N; c++) {
        const d = amt * D[c];
        let k0 = LV; for (let k = 0; k < LV; k++) if (FS[c * LV + k] + d > THR) { k0 = k; break; }
        first[c] = k0; if (k0 < LV) solidN++;
        for (let l = 0; l < L5; l++) { const k = k0 + l; mask[l][c] = k < LV && FS[c * LV + k] + d > THR ? 1 : 0; }
      }
      voidPct = 100 * (1 - solidN / (N * N));
    }

    function colors(inkRGB, paperCss) { ink = inkRGB; paper = paperCss; }

    function draw(t) {
      const row = ROWS[state.scene], s = sNow, px = cv.width / N;
      const fx = state.dir === 1 ? 1 : (state.dir === 2 ? 0 : 0.35 * Math.cos(t * 0.05));
      const fy = state.dir === 2 ? 1 : (state.dir === 1 ? 0 : 0.35 * Math.sin(t * 0.05));
      const stretchX = 1 + (state.dir === 1 ? 1.2 : row.ax * 0.25) * (0.4 + s), stretchY = 1 + (state.dir === 2 ? 1.2 : row.ay * 0.15) * (0.5 + s);
      if (state.holes > 0) flowField(t, s); else D.fill(0);
      updateMask();
      g.fillStyle = paper; g.fillRect(0, 0, cv.width, cv.height);
      const base = px * 0.82, lw = Math.max(1, px * 0.16);
      g.globalAlpha = Math.min(1, Math.max(0.3, px * 0.16));            // 작은 칸: 1 px 선이 촘촘해 너무 진해지지 않게
      for (let l = state.layers - 1; l >= 0; l--) {
        const zl = t * 0.12 + l * 0.9;
        for (let a = 0; a < NC; a++) for (let b = 0; b < NC; b++) {
          const x = (a * ST - 1) * 0.1, y = (b * ST - 1) * 0.1;
          const qx = (x - fx * t * 0.5) * 0.55 / stretchX, qy = (y - fy * t * 0.5) * 0.55 / stretchY;
          const w = fbm(qx * 0.6 + 4.2, qy * 0.6, zl * 0.5, 2, 0.5) * 1.4;
          HC[a * NC + b] = fbm(qx + w, qy - w, zl, 3, 0.5);
        }
        for (let i = 0; i < N + 2; i++) { const u = i / ST, a = Math.floor(u), fu = u - a, su = fu * fu * (3 - 2 * fu);
          for (let j = 0; j < N + 2; j++) { const v = j / ST, b = Math.floor(v), fv = v - b, sv = fv * fv * (3 - 2 * fv);
            H[i * (N + 2) + j] = (HC[a * NC + b] * (1 - su) + HC[(a + 1) * NC + b] * su) * (1 - sv) + (HC[a * NC + b + 1] * (1 - su) + HC[(a + 1) * NC + b + 1] * su) * sv; } }
        const paths = Array.from({ length: BINS }, () => new Path2D());
        const layerA = 0.95 - 0.16 * l, m = mask[l];
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const c = i * N + j; if (!m[c]) continue;
          const h = H[(i + 1) * (N + 2) + (j + 1)];
          const gx = (H[(i + 2) * (N + 2) + (j + 1)] - H[i * (N + 2) + (j + 1)]) * 10;
          const gy = (H[(i + 1) * (N + 2) + (j + 2)] - H[(i + 1) * (N + 2) + j]) * 10;
          const ridge = Math.pow(1 - Math.min(1, Math.abs(h) * 11), 2), k = state.refr * 2.2;
          const lx = base * Math.min(1.5, Math.max(0.12, 1 + k * gx)), ly = base * Math.min(1.5, Math.max(0.12, 1 + k * gy));
          const depth = (first[c] + l) / (LV + L5), trough = Math.min(1, Math.max(0, -h * 2.5));
          const a = layerA * (1 - 0.55 * depth) * (1 - state.caus * 0.95 * ridge) * (0.55 + 0.75 * trough * state.caus + 0.45 * (1 - state.caus));
          const bin = Math.max(0, Math.min(BINS - 1, Math.floor(a * BINS)));
          if (bin === 0) continue;
          const cx = (i + 0.5) * px, cy = (j + 0.5) * px, p = paths[bin];
          p.moveTo(cx - lx / 2, cy); p.lineTo(cx + lx / 2, cy); p.moveTo(cx, cy - ly / 2); p.lineTo(cx, cy + ly / 2);
        }
        g.lineWidth = lw;
        for (let b = 1; b < BINS; b++) { g.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(b + 0.5) / BINS * 0.62})`; g.stroke(paths[b]); }
      }
      g.globalAlpha = 1;
    }

    return { state, build, draw, colors, voidPct: () => voidPct, windOf: () => WINDS[state.wind], speedFactor: () => 0.4 + sNow };
  }

  global.Kirke = { makeLattice, ROWS, WINDS, DIRS, N };
})(window);
