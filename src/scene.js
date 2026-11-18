// The tandem run — scene renderer: backdrop, walls, sprites, cars, film passes
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var PAL = TR.PAL, FOGN = TR.FOGN;
  var SC = TR.Scene = TR.Scene || {};

  var WALLH = 4600, RAILB = 320, RAILT = 620;

  SC.canvas = null; SC.ctx = null; SC.W = 0; SC.H = 0; SC.rs = 1;
  SC.horY = 0;

  SC.init = function (canvas) {
    SC.canvas = canvas;
    SC.ctx = canvas.getContext('2d');
    SC.resize();
  };

  SC.resize = function () {
    var W = g.innerWidth, H = g.innerHeight;
    var dpr = Math.min(2, g.devicePixelRatio || 1);
    SC.W = W; SC.H = H;
    SC.canvas.width = Math.round(W * dpr * SC.rs);
    SC.canvas.height = Math.round(H * dpr * SC.rs);
    SC.canvas.style.width = W + 'px';
    SC.canvas.style.height = H + 'px';
    SC.ctx.setTransform(dpr * SC.rs, 0, 0, dpr * SC.rs, 0, 0);
    SC.horY = Math.round(H * 0.42);
    TR.Sprites.buildBackdrop(SC.canvas.width / (dpr * SC.rs), SC.canvas.height / (dpr * SC.rs), SC.horY);
    TR.Sprites.buildVignette(W, H);
    // prebuilt strings
    var hz = TR.HAZE, i;
    SC.hazeStr = new Array(FOGN);
    for (i = 0; i < FOGN; i++) {
      var a = (i / (FOGN - 1)) * 0.85;
      SC.hazeStr[i] = 'rgba(' + hz[0] + ',' + hz[1] + ',' + hz[2] + ',' + a + ')';
    }
    SC.railT = new Array(FOGN); SC.railB = new Array(FOGN); SC.railP = new Array(FOGN);
    SC.ceil = new Array(FOGN);
    for (i = 0; i < FOGN; i++) {
      var t = i / (FOGN - 1);
      SC.railT[i] = mixStr(PAL.rail, t, 0.9);
      SC.railB[i] = mixStr(PAL.railDark, t, 0.9);
      SC.railP[i] = mixStr('#3d3833', t, 0.9);
      SC.ceil[i] = mixStr('#1c1512', t, 0.55);
    }
  };

  function mixStr(hex, fogT, maxA) {
    var c = U.rgb(hex), hz = TR.HAZE;
    var r = Math.round(c[0] + (hz[0] - c[0]) * fogT * maxA);
    var g2 = Math.round(c[1] + (hz[1] - c[1]) * fogT * maxA);
    var b = Math.round(c[2] + (hz[2] - c[2]) * fogT * maxA);
    return 'rgb(' + r + ',' + g2 + ',' + b + ')';
  }

  SC.rockPattern = null;
  function rockPattern(ctx) {
    if (!SC.rockPattern) SC.rockPattern = ctx.createPattern(TR.Sprites.rockTile, 'repeat');
    return SC.rockPattern;
  }

  // near-field asphalt: tire-polish band + aggregate noise + sun wash
  SC.roadFx = function (ctx, p1, p2, s, n) {
    if (!SC.asphaltPat) SC.asphaltPat = ctx.createPattern(TR.Sprites.asphaltTile, 'repeat');
    var fog = s.fog;
    // warm wash on the sunlit lane: warm toward the right (sea/sun), cool toward the left wall
    if (n < 120) {
      var wA = (0.085 * (1 - n / 120));
      ctx.fillStyle = 'rgba(255,170,110,' + (wA).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p1.sx + p1.sw * 0.05, p1.sy);
      ctx.lineTo(p1.sx + p1.sw, p1.sy);
      ctx.lineTo(p2.sx + p2.sw, p2.sy);
      ctx.lineTo(p2.sx + p2.sw * 0.05, p2.sy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(46,44,66,' + (wA * 0.55).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p1.sx - p1.sw, p1.sy);
      ctx.lineTo(p1.sx - p1.sw * 0.1, p1.sy);
      ctx.lineTo(p2.sx - p2.sw * 0.1, p2.sy);
      ctx.lineTo(p2.sx - p2.sw, p2.sy);
      ctx.closePath(); ctx.fill();
    }
    // racing-line polish
    var a = 0.085 * (1 - fog * 1.4);
    if (a > 0.004) {
      ctx.fillStyle = 'rgba(26,22,20,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p1.sx - p1.sw * 0.30, p1.sy);
      ctx.lineTo(p1.sx + p1.sw * 0.34, p1.sy);
      ctx.lineTo(p2.sx + p2.sw * 0.34, p2.sy);
      ctx.lineTo(p2.sx - p2.sw * 0.30, p2.sy);
      ctx.closePath(); ctx.fill();
    }
    // aggregate speckle, only close
    if (n < 40) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.sx - p1.sw, p1.sy);
      ctx.lineTo(p1.sx + p1.sw, p1.sy);
      ctx.lineTo(p2.sx + p2.sw, p2.sy);
      ctx.lineTo(p2.sx - p2.sw, p2.sy);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = 0.10 * (1 - n / 40);
      ctx.fillStyle = SC.asphaltPat;
      ctx.fillRect(Math.min(p1.sx, p2.sx) - p1.sw - 4, p2.sy, (Math.abs(p1.sx - p2.sx) + p1.sw + p2.sw) + 8, p1.sy - p2.sy + 1);
      ctx.restore();
    }
  };

  // ---------- walls + roadside sprites + cars, far -> near ----------
  SC.walls = function (ctx, road, s) {
    var p1 = s.p1, p2 = s.p2;
    var fi = Math.min(FOGN - 1, (s.fog * FOGN) | 0);
    if (s.tunnel) {
      // side walls + ceiling
      var t1 = p1.sy - p1.s * WALLH * SC.H / 2, t2 = p2.sy - p2.s * WALLH * SC.H / 2;
      quad(ctx, p1.sx - p1.sw * 1.14, p1.sy, t1, p2.sx - p2.sw * 1.14, p2.sy, t2, SC.ceil[fi]);
      quad(ctx, p1.sx + p1.sw * 1.14, p1.sy, t1, p2.sx + p2.sw * 1.14, p2.sy, t2, SC.ceil[fi]);
      // ceiling slab
      ctx.fillStyle = SC.ceil[fi];
      ctx.beginPath();
      ctx.moveTo(p1.sx - p1.sw * 1.14, t1);
      ctx.lineTo(p1.sx + p1.sw * 1.14, t1);
      ctx.lineTo(p2.sx + p2.sw * 1.14, t2);
      ctx.lineTo(p2.sx - p2.sw * 1.14, t2);
      ctx.closePath(); ctx.fill();
      // bright exit mouth at the far end of the tunnel
      var nxt = road.segments[s.index + 1];
      if (nxt && !nxt.tunnel) {
        var eH = p2.sy - p2.s * WALLH * 0.78 * SC.H / 2;
        var grE = ctx.createLinearGradient(0, eH, 0, p2.sy);
        grE.addColorStop(0, 'rgba(255,244,214,0.98)');
        grE.addColorStop(1, 'rgba(255,226,168,0.8)');
        ctx.fillStyle = grE;
        ctx.beginPath();
        ctx.moveTo(p2.sx - p2.sw * 0.98, p2.sy);
        ctx.lineTo(p2.sx - p2.sw * 0.98, eH);
        ctx.lineTo(p2.sx + p2.sw * 0.98, eH);
        ctx.lineTo(p2.sx + p2.sw * 0.98, p2.sy);
        ctx.closePath(); ctx.fill();
      }
    }
    if (s.wallL === 2 || s.wallR === 2) {
      var pat = rockPattern(ctx);
      if (s.wallL === 2) rockQuad(ctx, pat, p1, p2, -1.14, fi, s.index);
      if (s.wallR === 2) rockQuad(ctx, pat, p1, p2, 1.14, fi, s.index);
    }
    if (s.wallL === 1) railSide(ctx, p1, p2, -1.1, fi, s.index);
    if (s.wallR === 1) railSide(ctx, p1, p2, 1.1, fi, s.index);
  };

  function rockQuad(ctx, pat, p1, p2, side, fi, idx) {
    var t1 = p1.sy - p1.s * WALLH * SC.H / 2, t2 = p2.sy - p2.s * WALLH * SC.H / 2;
    var x1 = p1.sx + side * p1.sw, x2 = p2.sx + side * p2.sw;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, p1.sy); ctx.lineTo(x2, p2.sy); ctx.lineTo(x2, t2); ctx.lineTo(x1, t1);
    ctx.closePath();
    ctx.clip();
    ctx.translate(-((idx * 53) % 256), -((idx * 29) % 96)); // break the pattern repeat per segment
    ctx.fillStyle = pat;
    ctx.fillRect(Math.min(x1, x2) - 4, Math.min(t1, t2) - 96, Math.abs(x2 - x1) + 264, Math.max(p1.sy, p2.sy) - Math.min(t1, t2) + 96);
    ctx.fillStyle = SC.hazeStr[fi];
    ctx.fillRect(Math.min(x1, x2) - 4, Math.min(t1, t2), Math.abs(x2 - x1) + 264, Math.max(p1.sy, p2.sy) - Math.min(t1, t2));
    // warm top edge from the sun
    ctx.strokeStyle = 'rgba(255,214,150,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, t1); ctx.lineTo(x2, t2); ctx.stroke();
    ctx.restore();
  }

  function railSide(ctx, p1, p2, side, fi, idx) {
    var b1 = p1.sy - p1.s * RAILB * SC.H / 2, b2 = p2.sy - p2.s * RAILB * SC.H / 2;
    var t1 = p1.sy - p1.s * RAILT * SC.H / 2, t2 = p2.sy - p2.s * RAILT * SC.H / 2;
    var x1 = p1.sx + side * p1.sw * 1.08, x2 = p2.sx + side * p2.sw * 1.08;
    quad(ctx, x1, b1, t1, x2, b2, t2, SC.railT[fi], SC.railB[fi], x1, x2);
    // posts every 4 segments
    if (idx % 4 === 0) {
      ctx.fillStyle = SC.railP[fi];
      ctx.fillRect(x1 - 2.5, t1 - 2, 5, p1.sy - t1 + 2);
    }
  }

  // vertical band with a vertical metal gradient
  function quad(ctx, x1, yb1, yt1, x2, yb2, yt2, topCol, botCol, rx1, rx2) {
    var gr = ctx.createLinearGradient(0, Math.min(yt1, yt2), 0, Math.max(yb1, yb2));
    gr.addColorStop(0, topCol);
    gr.addColorStop(1, botCol || topCol);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x1, yb1); ctx.lineTo(x2, yb2); ctx.lineTo(x2, yt2); ctx.lineTo(x1, yt1);
    ctx.closePath(); ctx.fill();
  }

  SC.sprites = function (ctx, s, game) {
    if (!s.sprites) return;
    var fi = Math.min(FOGN - 1, (s.fog * FOGN) | 0);
    var p = s.p1, W = SC.W, H = SC.H;
    for (var i = 0; i < s.sprites.length; i++) {
      var d = s.sprites[i];
      var def = TR.Sprites.get(d.name);
      if (!def) continue;
      var destW = p.s * def.w * W / 2 * (d.small ? 0.7 : 1);
      if (destW < 2) continue;
      var destH = destW * def.aspect;
      var x = p.sx + d.off * p.sw;
      var yB = p.sy;
      if (d.hang) yB = p.sy - p.s * 2500 * H / 2;
      if (d.over) yB = p.sy - p.s * 3400 * H / 2;
      var img = def.variants[fi];
      var x0 = x - destW / 2, y0 = yB - destH;
      if (y0 > s.clip || x0 > W || x0 + destW < 0) continue;
      ctx.save();
      if (y0 + destH > s.clip) {
        ctx.beginPath(); ctx.rect(0, 0, W, s.clip); ctx.clip();
      }
      if (d.name === 'lamp' || d.name === 'banner') {
        // lights glow additively at night-fog depths
        ctx.globalAlpha = 1;
      } else if (s.fog > 0.72) {
        ctx.globalAlpha = 1 - (s.fog - 0.72) * 0.9;
      }
      if (d.flip) {
        ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0);
      }
      ctx.drawImage(img, x0, y0, destW, destH);
      ctx.restore();
    }
  };

  SC.cars = function (ctx, s, game) {
    if (!s.cars || !s.cars.length) return;
    var W = SC.W, H = SC.H;
    for (var i = 0; i < s.cars.length; i++) {
      var car = s.cars[i];
      if (car.isPlayer) continue; // player is drawn fixed at the bottom
      var pct = (car.z - s.index * TR.SEG) / TR.SEG;
      var p1 = s.p1, p2 = s.p2;
      var sc = U.lerp(p1.s, p2.s, pct);
      var sx = U.lerp(p1.sx, p2.sx, pct);
      var sy = U.lerp(p1.sy, p2.sy, pct);
      var sw = U.lerp(p1.sw, p2.sw, pct);
      var dz = U.lerp(p1.dz, p2.dz, pct);
      if (dz < 950) continue; // passed under the camera
      var w = (car.wu || 1180) * sc * W / 2;
      if (w < 3) continue;
      var x = sx + car.x * sw;
      car._sx = x; car._sy = sy - w * 0.33; car._sw = w;
      ctx.save();
      if (s.fog > 0.55) ctx.globalAlpha = Math.max(0, 1 - (s.fog - 0.55) * 1.8);
      TR.Cars.draw(ctx, car.model, car.pal, x, sy, w, {
        lean: car.leanS || 0, yaw: car.yawS || 0, throttle: car.lastThrottle,
        brake: car.brakeLight, speedPct: car.speed / TR.MAXSPEED,
        wobble: car.wobbleT > 0 ? car.wobbleT : 0, t: game.time, trail: false
      }, game);
      ctx.restore();
    }
  };

  // ---------- full frame ----------
  SC.render = function (game) {
    var ctx = SC.ctx, W = SC.W, H = SC.H, horY = SC.horY;
    var Spr = TR.Sprites;
    ctx.clearRect(0, 0, W, H);

    // backdrop parallax: sky slow, sea mid, hills fast
    var skyOff = ((game.skyShift * W * 0.10) % W + W) % W;
    drawWrapped(ctx, Spr.sky, skyOff, 0, W, Spr.skyH);
    var seaOff = ((game.skyShift * W * 0.16 + W * 0.04) % W + W) % W;
    ctx.drawImage(Spr.sea, 0, horY, W, Spr.seaH);
    // sea glitter shimmer: a few live sparkles
    ctx.fillStyle = 'rgba(255,238,196,0.5)';
    for (var sp2 = 0; sp2 < 5; sp2++) {
      var gy = horY + Math.random() * Spr.seaH * 0.8;
      var gx = Spr.sunX * 0.98 + (Math.random() - 0.5) * W * 0.05;
      ctx.fillRect(gx, gy, 3 + Math.random() * 5, 1.3);
    }
    var hillOff = ((game.skyShift * W * 0.26) % W + W) % W;
    drawWrapped(ctx, Spr.hills, hillOff, horY - Spr.hillH, W, Spr.hillH);
    // horizon glow line
    ctx.fillStyle = 'rgba(255,226,166,0.4)';
    ctx.fillRect(0, horY - 1, W, 2);

    var road = game.track;
    if (road) {
      road.renderStrips(ctx, W, H, game.cam, game.roadW);
      road.placeCars(game.cars, game.frame);
      road.renderSprites(ctx, W, H, game.cam, game.roadW, {
        walls: function (c, w2, h2, s) { SC.walls(c, road, s); },
        sprites: function (c, w2, h2, s) {
          SC.sprites(c, s, game);
          SC.cars(c, s, game);
        }
      });
      drawSparks(ctx, game);
      // player car (nearest)
      if (game.view !== 'side' || true) {
        var sPlayer = TR.CAMD / TR.CAMBACK;
        var pw = 1180 * sPlayer * W / 2;
        var px = W / 2 + (game.view === 'onroad' ? 0 : (game.player.leanS || 0) * W * 0.012);
        var pyB = H * 0.975;
        if (game.view !== 'onroad') {
          game.player._sx = px; game.player._sy = pyB - pw * 0.33; game.player._sw = pw;
          TR.Cars.draw(ctx, game.player.model, game.player.pal, px, pyB, pw, {
            lean: game.player.leanS || 0, yaw: game.player.yawS || 0, throttle: game.player.lastThrottle,
            brake: game.player.brakeLight,
            speedPct: game.player.speed / TR.MAXSPEED,
            wobble: game.player.wobbleT > 0 ? game.player.wobbleT : 0, t: game.time, trail: true
          }, game);
        } else {
          // low bonnet hint
          ctx.fillStyle = 'rgba(30,24,20,0.85)';
          ctx.beginPath();
          ctx.moveTo(W * 0.18, H); ctx.lineTo(W * 0.34, H * 0.93);
          ctx.lineTo(W * 0.66, H * 0.93); ctx.lineTo(W * 0.82, H);
          ctx.closePath(); ctx.fill();
        }
      }
    }

    // film passes
    ctx.drawImage(Spr.vignette, 0, 0, W, H);
    if (!game.params.nograin) {
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = SC.grainPat || (SC.grainPat = ctx.createPattern(Spr.grainTile, 'repeat'));
      var gx2 = (game.frame * 7) % 180, gy2 = (game.frame * 13) % 180;
      ctx.save(); ctx.translate(-gx2, -gy2); ctx.fillRect(0, 0, W + 180, H + 180); ctx.restore();
      ctx.globalAlpha = 1;
    }
  };

  function drawWrapped(ctx, img, off, y, W, h) {
    var x = -off;
    ctx.drawImage(img, x, y, W, h);
    if (off > 0) ctx.drawImage(img, x + W, y, W, h);
    else ctx.drawImage(img, x - W, y, W, h);
  }

  // sparks pool
  SC.spawnSparks = function (game, x, y, n, side) {
    for (var i = 0; i < n; i++) {
      if (game.sparks.length > 90) game.sparks.shift();
      game.sparks.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 260 - side * 120,
        vy: -60 - Math.random() * 200,
        life: 0.25 + Math.random() * 0.3, t: 0
      });
    }
  };

  function drawSparks(ctx, game) {
    if (!game.sparks.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < game.sparks.length; i++) {
      var sp = game.sparks[i];
      var a = 1 - sp.t / sp.life;
      if (a <= 0) continue;
      ctx.fillStyle = 'rgba(255,' + (150 + a * 90 | 0) + ',70,' + (a * 0.9) + ')';
      ctx.fillRect(sp.x, sp.y, 2.4, 2.4);
    }
    ctx.restore();
  }
})(typeof window !== 'undefined' ? window : globalThis);