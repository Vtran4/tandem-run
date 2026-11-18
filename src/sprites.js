// The tandem run — precomputed art: scenery sprites, backdrop, patterns, film grain
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var PAL = TR.PAL, FOGN = TR.FOGN;

  var S = TR.Sprites = TR.Sprites || {};
  var defs = {};

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // fog variants: base sprite faded into haze by 'source-atop'
  function fogVariants(base) {
    var out = new Array(FOGN);
    for (var i = 0; i < FOGN; i++) {
      var c = mk(base.width, base.height);
      var x = c.getContext('2d');
      x.drawImage(base, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      var a = (i / (FOGN - 1)) * 0.94;
      x.fillStyle = 'rgba(' + TR.HAZE[0] + ',' + TR.HAZE[1] + ',' + TR.HAZE[2] + ',' + a + ')';
      x.fillRect(0, 0, c.width, c.height);
      out[i] = c;
    }
    return out;
  }

  function def(name, worldW, draw) {
    var base = draw(mk(4, 4)); // draw fn creates its own canvas
    defs[name] = { variants: fogVariants(base.canvas || base), w: worldW, aspect: (base.canvas || base).height / (base.canvas || base).width };
  }

  // ---------- sprite drawings ----------
  function palmCanvas(rng) {
    var c = mk(240, 400), x = c.getContext('2d');
    var lean = (rng() - 0.5) * 60;
    // trunk
    var grad = x.createLinearGradient(100, 0, 150, 0);
    grad.addColorStop(0, '#4c3826'); grad.addColorStop(0.55, '#7a5c40'); grad.addColorStop(1, '#95744f');
    x.strokeStyle = grad; x.lineWidth = 13; x.lineCap = 'round';
    // ground shadow first
    x.fillStyle = 'rgba(40,30,40,0.28)';
    x.beginPath(); x.ellipse(150, 392, 58, 8, 0, 0, 6.284); x.fill();
    x.beginPath();
    x.moveTo(120, 395);
    x.quadraticCurveTo(118 + lean * 0.3, 240, 120 + lean, 130);
    x.stroke();
    // trunk rings
    x.strokeStyle = 'rgba(60,44,30,0.5)'; x.lineWidth = 2;
    for (var t = 0; t < 9; t++) {
      var ty = 380 - t * 28, tx = 120 + (lean * (380 - ty) / 265) * 0.5;
      x.beginPath(); x.moveTo(tx - 6, ty); x.lineTo(tx + 6, ty); x.stroke();
    }
    // fronds from crown
    var cx0 = 120 + lean, cy0 = 128;
    for (var f = 0; f < 10; f++) {
      var a = -Math.PI * 0.92 + f * (Math.PI * 0.84 / 9) + (rng() - 0.5) * 0.14;
      var len = 95 + rng() * 40;
      var ex = cx0 + Math.cos(a) * len, ey = cy0 + Math.sin(a) * len * 0.62 + len * 0.34;
      var mx = cx0 + Math.cos(a) * len * 0.55, my = cy0 + Math.sin(a) * len * 0.45 - 18;
      x.strokeStyle = 'rgba(47,66,44,0.95)'; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx0, cy0); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
      // backlit edge
      x.strokeStyle = 'rgba(255,214,140,0.55)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx0, cy0); x.quadraticCurveTo(mx, my - 3, ex, ey - 2); x.stroke();
    }
    // crown heart
    x.fillStyle = '#3a4f36';
    x.beginPath(); x.arc(cx0, cy0, 10, 0, 6.284); x.fill();
    return c;
  }

  function bushCanvas(rng) {
    // dry scrub tufts, not blobs
    var c = mk(200, 100), x = c.getContext('2d');
    x.fillStyle = 'rgba(40,30,40,0.25)';
    x.beginPath(); x.ellipse(100, 94, 74, 7, 0, 0, 6.284); x.fill();
    for (var t = 0; t < 7; t++) {
      var bx = 34 + rng() * 132, bh = 26 + rng() * 44, lean2 = (rng() - 0.5) * 26;
      x.strokeStyle = 'rgba(96,84,50,0.9)';
      x.lineWidth = 3 + rng() * 2.5;
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx, 92); x.quadraticCurveTo(bx + lean2 * 0.4, 92 - bh * 0.6, bx + lean2, 92 - bh); x.stroke();
      // sun-lit tips
      x.strokeStyle = 'rgba(212,180,108,0.75)';
      x.lineWidth = 2;
      x.beginPath(); x.moveTo(bx + lean2 * 0.82, 92 - bh * 0.86); x.lineTo(bx + lean2, 92 - bh); x.stroke();
      if (rng() < 0.6) {
        x.beginPath(); x.moveTo(bx + lean2 * 0.5, 92 - bh * 0.55); x.quadraticCurveTo(bx + lean2 * 0.9, 92 - bh * 0.8, bx + lean2 * 1.5 + 6, 92 - bh * 0.75); x.stroke();
      }
    }
    return c;
  }

  function postCanvas() {
    var c = mk(70, 150), x = c.getContext('2d');
    // ground shadow baked in (sun ahead-right: streak falls left)
    x.fillStyle = 'rgba(40,30,40,0.30)';
    x.beginPath(); x.ellipse(46, 146, 26, 5, 0, 0, 6.284); x.fill();
    x.fillStyle = 'rgba(40,30,40,0.22)';
    x.beginPath();
    x.moveTo(38, 144); x.lineTo(4, 149); x.lineTo(14, 150); x.lineTo(46, 146);
    x.closePath(); x.fill();
    var gr = x.createLinearGradient(0, 0, 70, 0);
    gr.addColorStop(0, '#a89f90'); gr.addColorStop(0.5, '#e8e2d4'); gr.addColorStop(1, '#8e887c');
    x.fillStyle = gr;
    x.fillRect(30, 18, 12, 130);
    // reflector with baked glint
    x.fillStyle = '#7a1616';
    x.fillRect(27, 8, 18, 12);
    var gl = x.createRadialGradient(36, 14, 0, 36, 14, 9);
    gl.addColorStop(0, 'rgba(255,120,90,0.95)');
    gl.addColorStop(1, 'rgba(255,120,90,0)');
    x.fillStyle = gl; x.fillRect(24, 2, 24, 24);
    x.fillStyle = '#fff0d8';
    x.beginPath(); x.arc(36, 14, 2.2, 0, 6.284); x.fill();
    return c;
  }

  function chevronCanvas() {
    var c = mk(340, 240), x = c.getContext('2d');
    x.fillStyle = 'rgba(40,30,40,0.28)';
    x.beginPath(); x.ellipse(150, 236, 120, 6, 0, 0, 6.284); x.fill();
    x.beginPath(); x.ellipse(274, 236, 30, 5, 0, 0, 6.284); x.fill();
    x.fillStyle = 'rgba(40,30,40,0.2)';
    x.beginPath();
    x.moveTo(150, 234); x.lineTo(30, 239); x.lineTo(60, 240); x.lineTo(170, 236);
    x.closePath(); x.fill();
    x.fillStyle = '#4a453e';
    x.fillRect(60, 90, 12, 148); x.fillRect(268, 90, 12, 148);
    var gr = x.createLinearGradient(0, 0, 0, 90);
    gr.addColorStop(0, '#e0b23a'); gr.addColorStop(1, '#b8871f');
    x.fillStyle = gr;
    x.fillRect(20, 8, 300, 86);
    x.strokeStyle = '#181512'; x.lineWidth = 7;
    x.strokeRect(24, 12, 292, 78);
    x.fillStyle = '#181512';
    for (var a = 0; a < 3; a++) {
      var ax = 52 + a * 92;
      x.beginPath();
      x.moveTo(ax, 22); x.lineTo(ax + 46, 51); x.lineTo(ax, 80);
      x.lineTo(ax + 14, 51); x.closePath(); x.fill();
    }
    return c;
  }

  function craneCanvas() {
    // harbor crane: lattice tower, horizontal jib, hanging container — a real silhouette
    var c = mk(520, 660), x = c.getContext('2d');
    var col = 'rgba(46,52,64,0.95)';
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 6; x.lineCap = 'round';
    var bx = 200, byTop = 120, byBot = 620;
    // legs (slight A)
    x.beginPath(); x.moveTo(bx - 26, byBot); x.lineTo(bx - 8, byTop + 40); x.stroke();
    x.beginPath(); x.moveTo(bx + 26, byBot); x.lineTo(bx + 8, byTop + 40); x.stroke();
    // cross bracing
    x.lineWidth = 3;
    for (var br = 0; br < 7; br++) {
      var y1 = byTop + 60 + br * 62, y2 = y1 + 62;
      x.beginPath(); x.moveTo(bx - 20 - br * 0.6, y1); x.lineTo(bx + 20 + br * 0.6, y2); x.stroke();
      x.beginPath(); x.moveTo(bx + 20 + br * 0.6, y1); x.lineTo(bx - 20 - br * 0.6, y2); x.stroke();
    }
    // cab + tower head
    x.lineWidth = 6;
    x.fillRect(bx - 22, byTop + 28, 44, 34);
    // jib to the right with lattice
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(bx, byTop + 30); x.lineTo(bx + 268, byTop + 46); x.stroke();
    x.beginPath(); x.moveTo(bx, byTop + 62); x.lineTo(bx + 268, byTop + 46); x.stroke();
    x.lineWidth = 2.5;
    for (var lb = 0; lb < 9; lb++) {
      var lx = bx + 24 + lb * 28;
      x.beginPath(); x.moveTo(lx, byTop + 33 + lb * 0.6); x.lineTo(lx + 14, byTop + 60 - lb * 0.4); x.stroke();
    }
    // counter jib + weight
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(bx, byTop + 34); x.lineTo(bx - 96, byTop + 52); x.stroke();
    x.beginPath(); x.moveTo(bx, byTop + 62); x.lineTo(bx - 96, byTop + 52); x.stroke();
    x.fillStyle = col;
    x.fillRect(bx - 110, byTop + 40, 26, 40);
    // peak + tie lines
    x.beginPath(); x.moveTo(bx, byTop + 34); x.lineTo(bx, byTop - 34); x.stroke();
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(bx, byTop - 34); x.lineTo(bx + 250, byTop + 42); x.stroke();
    x.beginPath(); x.moveTo(bx, byTop - 34); x.lineTo(bx - 90, byTop + 48); x.stroke();
    // trolley, cable, container
    x.lineWidth = 4;
    x.fillRect(bx + 196, byTop + 34, 26, 16);
    x.beginPath(); x.moveTo(bx + 209, byTop + 50); x.lineTo(bx + 209, byTop + 150); x.stroke();
    x.fillStyle = 'rgba(96,74,52,0.9)';
    x.fillRect(bx + 184, byTop + 150, 52, 30);
    // warm rim on the sun side (right edges)
    x.strokeStyle = 'rgba(255,204,140,0.4)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(bx + 268, byTop + 46); x.lineTo(bx, byTop + 30); x.stroke();
    x.beginPath(); x.moveTo(bx + 26, byBot); x.lineTo(bx + 8, byTop + 40); x.stroke();
    return c;
  }

  function lighthouseCanvas() {
    var c = mk(320, 640), x = c.getContext('2d');
    // rock base
    x.fillStyle = '#4c3c30';
    x.beginPath();
    x.moveTo(20, 636); x.lineTo(70, 540); x.lineTo(150, 560); x.lineTo(230, 528); x.lineTo(300, 636);
    x.closePath(); x.fill();
    // tower: white sun side / warm shade
    var gr = x.createLinearGradient(90, 0, 210, 0);
    gr.addColorStop(0, '#8a7a68'); gr.addColorStop(0.45, '#efe8da'); gr.addColorStop(1, '#d8ceb8');
    x.fillStyle = gr;
    x.beginPath();
    x.moveTo(118, 545); x.lineTo(138, 130); x.lineTo(182, 130); x.lineTo(202, 545);
    x.closePath(); x.fill();
    // red bands
    x.fillStyle = '#9c2a20';
    band(x, 133, 132, 187, 148, 166, 168);
    band(x, 126, 300, 194, 314, 173, 326);
    // gallery + lamp room
    x.fillStyle = '#242020';
    x.fillRect(128, 112, 64, 14);
    x.fillStyle = '#efe8da';
    x.fillRect(136, 70, 48, 44);
    // lamp glow
    var gl = x.createRadialGradient(160, 92, 4, 160, 92, 60);
    gl.addColorStop(0, 'rgba(255,232,160,0.95)');
    gl.addColorStop(0.4, 'rgba(255,196,110,0.45)');
    gl.addColorStop(1, 'rgba(255,196,110,0)');
    x.fillStyle = gl; x.fillRect(90, 30, 140, 130);
    x.fillStyle = '#fff6d8';
    x.beginPath(); x.arc(160, 92, 9, 0, 6.284); x.fill();
    // roof
    x.fillStyle = '#332a26';
    x.beginPath(); x.moveTo(128, 70); x.lineTo(160, 34); x.lineTo(192, 70); x.closePath(); x.fill();
    function band(x2, x1, y1, x2b, y2, xm, ym) {
      x2.fillStyle = '#9c2a20';
      x2.beginPath();
      x2.moveTo(x1, y1); x2.lineTo(x2b, y2);
      x2.lineTo(xm + 11, ym + 14); x2.lineTo(xm - 11, ym + 14);
      x2.closePath(); x2.fill();
    }
    return c;
  }

  function rockOutCanvas(rng) {
    // jagged boulders with lit faces and baked ground shadow
    var c = mk(420, 240), x = c.getContext('2d');
    x.fillStyle = 'rgba(40,30,40,0.28)';
    x.beginPath(); x.ellipse(210, 222, 180, 14, 0, 0, 6.284); x.fill();
    for (var i = 0; i < 4; i++) {
      var bx = 60 + rng() * 280, by = 160 + rng() * 40;
      var w = 50 + rng() * 90, h = 40 + rng() * 60;
      var pts = 7, vs = [];
      for (var p = 0; p < pts; p++) {
        var a = Math.PI + (p / (pts - 1)) * Math.PI;
        var rr = (0.6 + rng() * 0.4);
        vs.push([bx + Math.cos(a) * w * rr * 0.5 * (1 + rng() * 0.25), by - Math.sin(a) * h * rr]);
      }
      var gr = x.createLinearGradient(bx - w / 2, by - h, bx + w / 2, by);
      gr.addColorStop(0, '#b08a6c'); gr.addColorStop(0.55, '#8a6a52'); gr.addColorStop(1, '#54413a');
      x.fillStyle = gr;
      x.beginPath(); x.moveTo(vs[0][0], by);
      for (var q = 0; q < vs.length; q++) x.lineTo(vs[q][0], vs[q][1]);
      x.lineTo(vs[vs.length - 1][0], by);
      x.closePath(); x.fill();
      // lit top edge
      x.strokeStyle = 'rgba(255,220,160,0.5)'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(vs[1][0], vs[1][1]); x.lineTo(vs[3][0], vs[3][1]); x.stroke();
      // speckle
      for (var spn = 0; spn < 10; spn++) {
        x.fillStyle = 'rgba(40,30,24,' + (0.08 + rng() * 0.14) + ')';
        x.fillRect(bx - w / 2 + rng() * w, by - h * 0.8 + rng() * h * 0.75, 2 + rng() * 3, 1.5 + rng() * 2);
      }
    }
    return c;
  }

  function lampCanvas() {
    var c = mk(140, 90), x = c.getContext('2d');
    x.fillStyle = '#33291f';
    x.fillRect(58, 0, 24, 18);
    var gl = x.createRadialGradient(70, 46, 4, 70, 46, 62);
    gl.addColorStop(0, 'rgba(255,236,170,0.98)');
    gl.addColorStop(0.35, 'rgba(255,206,120,0.5)');
    gl.addColorStop(1, 'rgba(255,206,120,0)');
    x.fillStyle = gl; x.fillRect(0, 0, 140, 90);
    x.fillStyle = '#fff4d0';
    x.beginPath(); x.ellipse(70, 40, 17, 10, 0, 0, 6.284); x.fill();
    return c;
  }

  function bannerCanvas() {
    var c = mk(1500, 400), x = c.getContext('2d');
    // truss beam
    x.fillStyle = '#3a3532';
    x.fillRect(0, 60, 1500, 54);
    x.strokeStyle = '#57514c'; x.lineWidth = 4;
    for (var t = 0; t < 37; t++) {
      x.beginPath(); x.moveTo(t * 40, 60); x.lineTo(t * 40 + 40, 114); x.stroke();
      x.beginPath(); x.moveTo(t * 40 + 40, 60); x.lineTo(t * 40, 114); x.stroke();
    }
    // banner
    x.fillStyle = '#6e211c';
    x.fillRect(380, 100, 740, 150);
    x.strokeStyle = '#e8dcc4'; x.lineWidth = 6;
    x.strokeRect(392, 112, 716, 126);
    x.fillStyle = '#efe4cc';
    x.font = '700 92px "Barlow Condensed","Arial Narrow",sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('TANDEM RUN', 750, 178);
    // checker strips
    for (var q = 0; q < 37; q++) {
      x.fillStyle = q % 2 ? '#efe4cc' : '#181512';
      x.fillRect(q * 40, 8, 40, 30);
      x.fillStyle = q % 2 ? '#181512' : '#efe4cc';
      x.fillRect(q * 40, 136, 40, 30);
    }
    // posts
    x.fillStyle = '#3a3532';
    x.fillRect(30, 114, 26, 286); x.fillRect(1444, 114, 26, 286);
    return c;
  }

  // ---------- patterns / overlays ----------
  S.build = function (rng) {
    def('palm', 1500, function () { return palmCanvas(rng); });
    def('palm2', 1150, function () { return palmCanvas(rng); });
    def('bush', 720, function () { return bushCanvas(rng); });
    def('post', 115, function () { return postCanvas(); });
    def('chevR', 1150, function () { return chevronCanvas(); });
    def('crane', 5400, function () { return craneCanvas(); });
    def('lighthouse', 3600, function () { return lighthouseCanvas(); });
    def('rock', 2400, function () { return rockOutCanvas(rng); });
    def('lamp', 340, function () { return lampCanvas(); });
    def('banner', 5200, function () { return bannerCanvas(); });

    // rock wall pattern tile
    var rp = mk(256, 256), rx = rp.getContext('2d');
    rx.fillStyle = PAL.rock; rx.fillRect(0, 0, 256, 256);
    var r2 = rng;
    for (var st = 0; st < 11; st++) {
      var sy = st * 24 + r2() * 8;
      rx.strokeStyle = 'rgba(64,48,36,0.42)'; rx.lineWidth = 3 + r2() * 3;
      rx.beginPath(); rx.moveTo(-10, sy);
      for (var sx = 0; sx <= 266; sx += 24) rx.lineTo(sx, sy + Math.sin(sx * 0.05 + st) * 5);
      rx.stroke();
      rx.strokeStyle = 'rgba(255,224,170,0.14)'; rx.lineWidth = 2;
      rx.beginPath(); rx.moveTo(-10, sy - 3);
      for (var sx2 = 0; sx2 <= 266; sx2 += 24) rx.lineTo(sx2, sy - 3 + Math.sin(sx2 * 0.05 + st) * 5);
      rx.stroke();
    }
    for (var sp2 = 0; sp2 < 240; sp2++) {
      rx.fillStyle = 'rgba(40,30,22,' + (0.05 + r2() * 0.12) + ')';
      rx.fillRect(r2() * 256, r2() * 256, 2 + r2() * 4, 2 + r2() * 4);
    }
    // terrace step shadows: every ~72px a dark drop with a lit lip
    for (var stp = 0; stp < 3; stp++) {
      var ty2 = 40 + stp * 78 + r2() * 10;
      rx.fillStyle = 'rgba(30,22,16,0.4)';
      rx.fillRect(0, ty2, 256, 7 + r2() * 4);
      rx.fillStyle = 'rgba(255,222,168,0.22)';
      rx.fillRect(0, ty2 - 3, 256, 2.5);
    }
    // seep streaks
    for (var seep = 0; seep < 6; seep++) {
      var gx = r2() * 256;
      rx.fillStyle = 'rgba(52,42,34,0.25)';
      rx.fillRect(gx, r2() * 60, 6 + r2() * 10, 120 + r2() * 120);
    }
    S.rockTile = rp;

    // asphalt speckle tile (transparent, for near-road noise)
    var ap = mk(96, 96), ax = ap.getContext('2d');
    for (var ai = 0; ai < 420; ai++) {
      var av = Math.random();
      ax.fillStyle = av < 0.5 ? 'rgba(255,244,220,' + (0.05 + Math.random() * 0.2) + ')' : 'rgba(20,16,14,' + (0.05 + Math.random() * 0.25) + ')';
      ax.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random() * 2, 1 + Math.random() * 1.5);
    }
    S.asphaltTile = ap;

    // grain tile
    var gr2 = mk(180, 180), gx2 = gr2.getContext('2d');
    var img = gx2.createImageData(180, 180);
    for (var pi = 0; pi < img.data.length; pi += 4) {
      var v = 120 + Math.floor(Math.random() * 135);
      img.data[pi] = v; img.data[pi + 1] = v; img.data[pi + 2] = v;
      img.data[pi + 3] = Math.random() < 0.5 ? 26 : 0;
    }
    gx2.putImageData(img, 0, 0);
    S.grainTile = gr2;
  };

  S.get = function (name) { return defs[name]; };

  // ---------- backdrop (sky, sea, hills) ----------
  S.buildBackdrop = function (W, H, horY) {
    var sky = mk(W, horY + 2), x = sky.getContext('2d');
    // sliced gradient with dither — no banding
    var stops = [[0, 44, 63, 94], [0.42, 138, 106, 114], [0.75, 232, 167, 99], [1, 246, 201, 138]];
    function skyCol(t, j) {
      var i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var f = U.smooth(U.clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
      return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * f + j) + ',' + Math.round(a[2] + (b[2] - a[2]) * f + j * 0.7) + ',' + Math.round(a[3] + (b[3] - a[3]) * f + j * 0.5) + ')';
    }
    for (var ry = 0; ry <= horY; ry++) {
      x.fillStyle = skyCol(ry / horY, (Math.random() - 0.5) * 9);
      x.fillRect(0, ry, W, 1);
    }
    // sun + glow, out over the sea
    var sunX = W * 0.72, sunY = horY * 0.9, sunR = W * 0.03;
    S.sunX = sunX;
    var gl = x.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, W * 0.23);
    gl.addColorStop(0, 'rgba(255,226,168,0.55)');
    gl.addColorStop(0.4, 'rgba(255,190,115,0.22)');
    gl.addColorStop(1, 'rgba(255,190,115,0)');
    x.fillStyle = gl; x.fillRect(sunX - W * 0.24, sunY - W * 0.24, W * 0.48, W * 0.48);
    var sg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    sg.addColorStop(0, PAL.sun); sg.addColorStop(0.75, 'rgba(255,240,205,0.85)'); sg.addColorStop(1, 'rgba(255,240,205,0)');
    x.fillStyle = sg;
    x.beginPath(); x.arc(sunX, sunY, sunR, 0, 6.284); x.fill();
    // cloud bands: varied, lit from below
    var rngC = U.mulberry32(7);
    for (var cb = 0; cb < 4; cb++) {
      var cy2 = horY * (0.28 + cb * 0.17 + rngC() * 0.05);
      var cw = W * (0.12 + rngC() * 0.2);
      var cxp = W * (rngC() * 0.85);
      var nearSun = Math.abs(cxp - sunX) < cw * 0.8 && Math.abs(cy2 - sunY) < horY * 0.3;
      x.fillStyle = nearSun ? 'rgba(120,74,80,0.20)' : 'rgba(84,62,78,0.22)';
      x.beginPath(); x.ellipse(cxp, cy2, cw, horY * 0.014 + 2, (rngC() - 0.5) * 0.06, 0, 6.284); x.fill();
      x.fillStyle = nearSun ? 'rgba(255,196,130,0.5)' : 'rgba(255,178,128,0.26)';
      x.beginPath(); x.ellipse(cxp, cy2 - horY * 0.012, cw * 0.8, horY * 0.008 + 1.4, (rngC() - 0.5) * 0.06, 0, 6.284); x.fill();
    }
    S.sky = sky; S.skyH = horY + 2;

    // sea band: warm at the horizon, glitter under the sun
    var seaH = Math.max(40, H * 0.10);
    var sea = mk(W, seaH), sx2 = sea.getContext('2d');
    var gr2 = sx2.createLinearGradient(0, 0, 0, seaH);
    gr2.addColorStop(0, '#5d6478'); gr2.addColorStop(0.3, '#4a5b6e'); gr2.addColorStop(1, '#33475c');
    sx2.fillStyle = gr2; sx2.fillRect(0, 0, W, seaH);
    var warm = sx2.createLinearGradient(0, 0, 0, seaH * 0.34);
    warm.addColorStop(0, 'rgba(232,178,120,0.65)');
    warm.addColorStop(1, 'rgba(232,178,120,0)');
    sx2.fillStyle = warm; sx2.fillRect(0, 0, W, seaH * 0.34);
    for (var gi = 0; gi < 300; gi++) {
      var t = gi / 300;
      var gy = t * t * seaH;
      var spread = W * (0.02 + t * 0.17);
      var gx3 = sunX + (Math.sin(gi * 12.9898) * 0.5) * spread;
      var gw = 3 + t * 13;
      sx2.fillStyle = 'rgba(255,233,184,' + (0.34 - t * 0.2) + ')';
      sx2.fillRect(gx3, gy, gw, 1.4);
    }
    for (var gs = 0; gs < 60; gs++) {
      sx2.fillStyle = 'rgba(255,225,170,' + (0.10 + Math.random() * 0.14) + ')';
      sx2.fillRect(Math.random() * W, Math.random() * seaH, 2 + Math.random() * 4, 1.2);
    }
    S.sea = sea; S.seaH = seaH;

    // hills (two ridges, drawn over sky, under sea) — faded out over the sea
    var hillH = Math.max(60, H * 0.12);
    var hills = mk(W, hillH), hx = hills.getContext('2d');
    function ridge(color, amp, base, seedN, alpha) {
      hx.fillStyle = color; hx.globalAlpha = alpha;
      hx.beginPath(); hx.moveTo(0, hillH);
      for (var px = 0; px <= W; px += 8) {
        var ry2 = base + Math.sin(px * 0.004 + seedN) * amp + Math.sin(px * 0.013 + seedN * 2.7) * amp * 0.4;
        hx.lineTo(px, ry2);
      }
      hx.lineTo(W, hillH); hx.closePath(); hx.fill();
      hx.globalAlpha = 1;
    }
    ridge('#6d5d70', hillH * 0.22, hillH * 0.52, 1.7, 0.8);
    ridge('#564a58', hillH * 0.16, hillH * 0.74, 4.3, 0.92);
    // fade the hills out on the right so the sea keeps the horizon there
    var fade = hx.createLinearGradient(W * 0.38, 0, W * 0.68, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    hx.globalCompositeOperation = 'destination-out';
    hx.fillStyle = fade;
    hx.fillRect(W * 0.38, 0, W * 0.5, hillH);
    hx.globalCompositeOperation = 'source-over';
    S.hills = hills; S.hillH = hillH;
  };

  // vignette (rebuilt on resize)
  S.buildVignette = function (W, H) {
    var v = mk(W, H), x = v.getContext('2d');
    var gr = x.createRadialGradient(W / 2, H * 0.42, H * 0.44, W / 2, H * 0.52, H * 1.04);
    gr.addColorStop(0, 'rgba(8,6,14,0)');
    gr.addColorStop(1, 'rgba(8,6,14,0.42)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    S.vignette = v;
  };
})(typeof window !== 'undefined' ? window : globalThis);