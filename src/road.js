// The tandem run — road: segments, projection, strip + wall rendering
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var SEG = TR.SEG, DRAW = TR.DRAW, CAMD = TR.CAMD;
  var FOGN = TR.FOGN;

  // fog by draw index, precomputed
  var fogByN = new Array(DRAW);
  (function () {
    for (var n = 0; n < DRAW; n++) fogByN[n] = Math.pow(n / DRAW, 1.5);
  })();

  function Road() {
    this.segments = [];
    this.finishSeg = 0;
    this.tables = null;   // fogged color tables (built after palette known)
    this.tTables = null;  // tunnel variants
  }

  Road.prototype.addSegment = function (curve, y1, y2, wallL, wallR, tunnel) {
    var n = this.segments.length;
    var s = {
      index: n,
      curve: curve,
      p1: { y: y1, z: n * SEG, dz: 0, s: 0, sx: 0, sy: 0, sw: 0 },
      p2: { y: y2, z: (n + 1) * SEG, dz: 0, s: 0, sx: 0, sy: 0, sw: 0 },
      sprites: null,
      wallL: wallL || 0,   // 0 none, 1 rail, 2 rock
      wallR: wallR || 0,
      tunnel: !!tunnel,
      lamp: false,
      finish: false,
      grid: false,
      clip: 0, fog: 0,
      parity: (n % 12) < 6 ? 0 : 1,
      grassP: (n % 12) < 6 ? 0 : 1,
      dash: (n % 8) < 4,
      rumble: (n % 6) < 3 ? 0 : 1,
      cars: null, carsFrame: -1
    };
    this.segments.push(s);
    return s;
  };

  Road.prototype.addSprite = function (idx, def) {
    var s = this.segments[idx];
    if (!s.sprites) s.sprites = [];
    s.sprites.push(def);
  };

  Road.prototype.segAt = function (z) {
    var i = Math.floor(z / SEG);
    var segs = this.segments;
    if (i < 0) i = 0;
    if (i >= segs.length) i = segs.length - 1;
    return segs[i];
  };

  Road.prototype.placeCars = function (cars, frame) {
    for (var c = 0; c < cars.length; c++) {
      var car = cars[c];
      var seg = this.segAt(car.z);
      if (seg.carsFrame !== frame) { seg.cars = []; seg.carsFrame = frame; }
      seg.cars.push(car);
    }
  };

  function projectPoint(p, camX, camY, camZ, W, H, roadW) {
    var dz = p.z - camZ;
    p.dz = dz;
    var sc = CAMD / (dz < 40 ? 40 : dz);
    p.s = sc;
    p.sx = W / 2 - sc * camX * W / 2;
    p.sy = H / 2 - sc * (p.y - camY) * H / 2;
    p.sw = sc * roadW * W / 2;
  }

  function poly(ctx, x1, y1, w1, x2, y2, w2, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2 - w2, y2);
    ctx.closePath();
    ctx.fill();
  }

  // near -> far strips with hill clipping
  Road.prototype.renderStrips = function (ctx, W, H, cam, roadW) {
    var segs = this.segments;
    var baseIdx = Math.floor(cam.z / SEG);
    if (baseIdx < 0) baseIdx = 0;
    var basePct = (cam.z - baseIdx * SEG) / SEG;
    var base = segs[baseIdx];
    var camXBase = cam.x * roadW;
    var x = 0, dx = -(base.curve * basePct);
    var maxy = H;
    var T = this.tables, TT = this.tTables;
    var n, i, s, p1, p2, tab;
    for (n = 0; n < DRAW; n++) {
      i = baseIdx + n;
      if (i >= segs.length) break;
      s = segs[i];
      p1 = s.p1; p2 = s.p2;
      projectPoint(p1, camXBase - x, cam.y, cam.z, W, H, roadW);
      projectPoint(p2, camXBase - x - dx, cam.y, cam.z, W, H, roadW);
      x += dx; dx += s.curve;
      s.clip = maxy;
      s.fog = fogByN[n];
      if (p2.sy >= maxy || p2.dz < 40) continue;
      if (p1.sy <= p2.sy) continue;
      tab = s.tunnel ? TT : T;
      var fi = Math.min(FOGN - 1, (s.fog * FOGN) | 0);
      var y1 = p1.sy, y2 = p2.sy;
      // grass full width
      ctx.fillStyle = tab.grass[s.grassP][fi];
      ctx.fillRect(0, y2, W, y1 - y2 + 1);
      // warm sun wash on the near ground
      if (n < 120) {
        ctx.fillStyle = 'rgba(255,178,110,' + (0.05 * (1 - n / 120)).toFixed(3) + ')';
        ctx.fillRect(0, y2, W, y1 - y2 + 1);
      }
      // verge band
      poly(ctx, p1.sx, y1, p1.sw * 1.34, p2.sx, y2, p2.sw * 1.34, tab.verge[s.grassP][fi]);
      // rumble
      poly(ctx, p1.sx, y1, p1.sw * 1.12, p2.sx, y2, p2.sw * 1.12, tab.rumble[s.rumble][fi]);
      // road
      poly(ctx, p1.sx, y1, p1.sw, p2.sx, y2, p2.sw, tab.road[s.parity][fi]);
      if (TR.Scene.roadFx && n < 70) TR.Scene.roadFx(ctx, p1, p2, s, n);
      // edge lines (worn)
      var lw1 = p1.sw * 0.016, lw2 = p2.sw * 0.016;
      poly(ctx, p1.sx - p1.sw * 0.9, y1, lw1, p2.sx - p2.sw * 0.9, y2, lw2, tab.line[0][fi]);
      poly(ctx, p1.sx + p1.sw * 0.9, y1, lw1, p2.sx + p2.sw * 0.9, y2, lw2, tab.line[0][fi]);
      // center dash
      if (s.dash && p1.sw > 24) {
        poly(ctx, p1.sx, y1, p1.sw * 0.014, p2.sx, y2, p2.sw * 0.014, tab.line[0][fi]);
      }
      // finish checker band
      if (s.finish) {
        var cols = 14, r, cx1, cx2, w1 = p1.sw * 2 / cols, w2 = p2.sw * 2 / cols;
        for (r = 0; r < cols; r++) {
          if ((r + s.index) % 2 === 0) continue;
          cx1 = p1.sx - p1.sw + r * w1;
          cx2 = p2.sx - p2.sw + r * w2;
          ctx.fillStyle = tab.checker[0][fi];
          ctx.beginPath();
          ctx.moveTo(cx1, y1); ctx.lineTo(cx1 + w1, y1);
          ctx.lineTo(cx2 + w2, y2); ctx.lineTo(cx2, y2);
          ctx.closePath(); ctx.fill();
        }
      }
      // start grid boxes (thin paint)
      if (s.grid && p1.sw > 60) {
        ctx.strokeStyle = tab.line[0][fi]; ctx.lineWidth = Math.max(1, p1.sw * 0.006);
        var gy1 = y1 - (y1 - y2) * 0.25, gy2 = y2 + (y1 - y2) * 0.25;
        ctx.strokeRect(p1.sx - p1.sw * 0.55, gy1, p1.sw * 0.34, gy2 - gy1);
        ctx.strokeRect(p1.sx + p1.sw * 0.21, gy1, p1.sw * 0.34, gy2 - gy1);
      }
      maxy = y2;
    }
    return maxy;
  };

  // far -> near: walls, roadside sprites, cars. camPos = camera {x,y,z}
  Road.prototype.renderSprites = function (ctx, W, H, cam, roadW, drawFns) {
    var segs = this.segments;
    var baseIdx = Math.floor(cam.z / SEG);
    if (baseIdx < 0) baseIdx = 0;
    var n, i, s;
    for (n = DRAW - 1; n > 0; n--) {
      i = baseIdx + n;
      if (i >= segs.length) continue;
      s = segs[i];
      if (s.dz < 40 || s.p1.sy < -H * 0.5) continue;
      drawFns.walls(ctx, W, H, s, roadW);
      drawFns.sprites(ctx, W, H, s, roadW);
    }
  };

  TR.Road = Road;
})(typeof window !== 'undefined' ? window : globalThis);