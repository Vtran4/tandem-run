// The tandem run — car physics + code-drawn vehicles (race cars + civilian traffic)
// Rear view with yaw: steering shows the inside flank (steer left -> left side visible)
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;

  var Cars = TR.Cars = TR.Cars || {};

  Cars.make = function (modelId, palIdx, isPlayer) {
    return {
      model: modelId, pal: palIdx | 0, isPlayer: !!isPlayer,
      z: 0, x: 0, speed: 0,
      top: 1, accel: 1, grip: 1, brakeM: 1,
      len: 2250, hw: 1180 / (TR.ROADW * 2), wu: 1180,
      draft: false, brakeLight: false,
      wobble: 0, wobbleT: 0, sparkT: 0, sparkSide: 0,
      gear: 0, mistakeT: 0, yawS: 0, lastThrottle: false
    };
  };

  Cars.makeTraffic = function (type, colorIdx, z, x, speed) {
    var wu = TR.TRAFFIC.widths[type];
    return {
      model: type, pal: colorIdx | 0, isPlayer: false, isTraffic: true,
      z: z, x: x, speed: speed,
      top: 0, accel: 0, grip: 1, brakeM: 1,
      len: TR.TRAFFIC.lens[type], hw: wu / (TR.ROADW * 2),
      wu: wu,
      draft: false, brakeLight: false, wobbleT: 0, gear: 0, yawS: 0, lastThrottle: false
    };
  };

  Cars.applyModel = function (car, C) {
    var m = C.CARS[car.model];
    car.top = m.top; car.accel = m.accel; car.grip = m.grip; car.brakeM = m.brake;
  };

  // input: {throttle, brake, steer(-1..1)}
  Cars.step = function (car, input, road, dt) {
    var TRc = TR;
    var sp = car.speed / TRc.MAXSPEED;
    var top = TRc.MAXSPEED * car.top * (car.draft ? TRc.DRAFTTOP : 1);

    if (input.throttle && car.mistakeT <= 0) {
      car.speed += TRc.ACCEL * car.accel * (car.draft ? TRc.DRAFTACC : 1) * dt;
    } else {
      car.speed -= TRc.DECEL * dt;
    }
    if (input.brake) car.speed -= TRc.BRAKE * car.brakeM * dt;
    if (car.speed > top) car.speed = Math.max(top, car.speed - TRc.DECEL * 2.2 * dt);
    if (car.speed < 0) car.speed = 0;

    // off-road drag
    var off = Math.abs(car.x) > 1.04;
    if (off && car.speed > TRc.OFFLIMIT) car.speed = Math.max(TRc.OFFLIMIT, car.speed - TRc.OFFDECEL * dt);

    // steering + centrifugal pull
    car.x += input.steer * TRc.STEER * dt * sp * car.grip;
    var seg = road.segAt(car.z + 400);
    car.x -= 2 * dt * sp * sp * seg.curve * TRc.CENTRI;

    // walls / limits
    var lim = 1.34;
    if (car.x > lim) car.x = lim;
    if (car.x < -lim) car.x = -lim;
    car.scrape = 0;
    if (Math.abs(car.x) > 1.055) {
      var side = U.sign(car.x);
      var wall = side > 0 ? road.segAt(car.z).wallR : road.segAt(car.z).wallL;
      if (wall) {
        car.scrape = side;
        car.speed *= (1 - 0.55 * dt);
        car.x = side * 1.055;
      }
    }

    car.z += car.speed * dt;
    if (car.z < 0) { car.z = 0; car.speed = 0; }

    // yaw (visual): smoothed steering drives the 3/4 view
    car.yawS += (U.clamp(input.steer || 0, -1, 1) - car.yawS) * Math.min(1, dt * 6);

    // contact wobble decay
    if (car.wobbleT > 0) car.wobbleT -= dt;
    if (car.mistakeT > 0) car.mistakeT -= dt;
    car.brakeLight = !!input.brake;
    car.lastThrottle = !!input.throttle;
    var gearLo = [0, 0.15, 0.31, 0.49, 0.68, 0.86];
    var gearHi = [0.15, 0.31, 0.49, 0.68, 0.86, 1.03];
    var gp = U.clamp(sp, 0, 1.02), gr = 0;
    while (gr < 5 && gp > gearHi[gr]) gr++;
    car.gear = gr;
    car.rpm = (gp - gearLo[gr]) / (gearHi[gr] - gearLo[gr]);
  };

  // resolve contact between two vehicles; fx gets bump events
  Cars.contact = function (a, b, fx) {
    var dz = a.z - b.z;
    var dzMax = (a.len + b.len) * 0.5;
    if (Math.abs(dz) > dzMax) return;
    var dx = a.x - b.x;
    var need = a.hw + b.hw;
    if (Math.abs(dx) >= need) return;
    var push = (need - Math.abs(dx)) * 0.55;
    var s = dx === 0 ? (a.z > b.z ? 1 : -1) : U.sign(dx);
    a.x += s * push * 0.5; b.x -= s * push * 0.5;
    a.x = U.clamp(a.x, -1.3, 1.3); b.x = U.clamp(b.x, -1.3, 1.3);
    a.speed *= 0.993; b.speed *= 0.993;
    a.wobbleT = 0.5; b.wobbleT = 0.5;
    if (fx) fx.bump(Math.abs(dx) < need * 0.5 ? 1 : 0.55, s);
  };

  // ---------- drawing ----------
  // st: {lean, yaw, brake, throttle, speedPct, t, wobble, trail}
  Cars.draw = function (ctx, modelId, palIdx, cx, yBottom, w, st, world) {
    var yaw = U.clamp(st.yaw || 0, -1, 1);
    var lean = st.lean || 0, sp = st.speedPct || 0, brake = !!st.brake;
    var wob = st.wobble || 0;
    cx += Math.sin((st.t || 0) * 26) * wob * w * 0.03;
    var side = yaw >= 0 ? 1 : -1;         // steering right -> right flank shows
    var flankA = Math.abs(yaw);

    if (modelId === 'sedan' || modelId === 'van' || modelId === 'truck') {
      drawTraffic(ctx, modelId, palIdx, cx, yBottom, w, st, yaw);
      return;
    }

    var m = TR.CARS[modelId];
    var paint = m.paint[palIdx], hi = m.hi[palIdx], dark = m.dark[palIdx];
    var h = w * 0.68;

    // long sun shadow: the racer only — no trail behind rivals or traffic
    if (st.trail) {
      var shGrad = ctx.createLinearGradient(0, yBottom - h * 0.06, 0, yBottom + h * 0.55);
      shGrad.addColorStop(0, 'rgba(20,16,28,0.34)');
      shGrad.addColorStop(1, 'rgba(20,16,28,0.03)');
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.44, yBottom - h * 0.06);
      ctx.lineTo(cx + w * 0.44, yBottom - h * 0.06);
      ctx.lineTo(cx + w * 0.44, yBottom + h * 0.55);
      ctx.lineTo(cx - w * 0.98, yBottom + h * 0.55);
      ctx.closePath(); ctx.fill();
    }
    // contact shadow
    ctx.fillStyle = 'rgba(15,12,22,0.40)';
    ctx.beginPath();
    ctx.ellipse(cx, yBottom - h * 0.045, w * 0.47, h * 0.075, 0, 0, 6.284);
    ctx.fill();

    // rear wheels (grounded, yaw-shifted, far side foreshortened)
    var wheelW = w * 0.145, wheelH = h * 0.24;
    var wy = yBottom - wheelH * 0.5;
    var lx = cx - w * (0.40 + flankA * 0.035 * (side < 0 ? -1 : 1));
    var rx2 = cx + w * (0.40 - flankA * 0.035 * (side > 0 ? -1 : 1));
    ctx.fillStyle = '#14110f';
    roundRect(ctx, lx - wheelW / 2, wy - wheelH / 2, wheelW, wheelH, wheelW * 0.28); ctx.fill();
    roundRect(ctx, rx2 - wheelW / 2, wy - wheelH / 2, wheelW, wheelH, wheelW * 0.28); ctx.fill();
    // rims at low speed, blur at speed
    if (sp < 0.3) {
      ctx.fillStyle = 'rgba(150,150,155,0.8)';
      ctx.beginPath(); ctx.arc(lx, wy, wheelH * 0.16, 0, 6.284); ctx.fill();
      ctx.beginPath(); ctx.arc(rx2, wy, wheelH * 0.16, 0, 6.284); ctx.fill();
    } else if (sp > 0.25) {
      ctx.strokeStyle = 'rgba(190,185,180,' + (Math.min(0.5, sp * 0.4)) + ')';
      ctx.lineWidth = Math.max(1, wheelW * 0.1);
      ctx.beginPath(); ctx.moveTo(lx, wy - wheelH * 0.32); ctx.lineTo(lx, wy + wheelH * 0.32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx2, wy - wheelH * 0.32); ctx.lineTo(rx2, wy + wheelH * 0.32); ctx.stroke();
    }
    // brake disc glow
    if (brake && sp > 0.45) {
      discGlow(ctx, lx, wy, wheelW, sp);
      discGlow(ctx, rx2, wy, wheelW, sp);
    }

    // body: yaw perspective = shear the roofline toward the turn + stretch the near flank
    ctx.save();
    ctx.translate(cx, yBottom);
    ctx.transform(1, 0, -yaw * 0.12, 1, 0, 0);
    ctx.scale(1 + flankA * 0.055, 1);
    ctx.rotate(-lean * 0.05);
    ctx.translate(lean * w * 0.015, brake ? h * 0.012 : -h * 0.006);

    var bw = w * 0.86, bTop = -h * 0.55, bBot = -h * 0.02;

    // visible flank wedge (the 3/4 read)
    if (flankA > 0.18) {
      drawFlank(ctx, side, bw, h, w, paint, flankA, bTop, bBot);
    }

    // main body mass: sun-lit top edge, deep lower shade
    var grad = ctx.createLinearGradient(0, bTop, 0, bBot);
    grad.addColorStop(0, shade(paint, 30));
    grad.addColorStop(0.14, shade(paint, 8));
    grad.addColorStop(0.5, paint);
    grad.addColorStop(0.86, shade(paint, -28));
    grad.addColorStop(1, shade(paint, -44));
    ctx.fillStyle = grad;

    if (modelId === 'p911') {
      // cabin peeking above the tail (rear-engine flyline)
      ctx.fillStyle = shade(paint, -16);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.20, bTop + h * 0.12);
      ctx.quadraticCurveTo(0, bTop - h * 0.045, bw * 0.20, bTop + h * 0.12);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, bBot);
      ctx.bezierCurveTo(-bw * 0.56, bBot - h * 0.18, -bw * 0.54, bTop + h * 0.16, -bw * 0.34, bTop + h * 0.10);
      ctx.bezierCurveTo(-bw * 0.14, bTop, bw * 0.14, bTop, bw * 0.34, bTop + h * 0.10);
      ctx.bezierCurveTo(bw * 0.54, bTop + h * 0.16, bw * 0.56, bBot - h * 0.18, bw * 0.5, bBot);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      screenGlass(ctx, -bw * 0.23, bTop + h * 0.07, bw * 0.46, h * 0.13, world, lean, true);
      // engine deck grille
      ctx.fillStyle = 'rgba(24,20,18,0.85)';
      roundRect(ctx, -bw * 0.13, bTop + h * 0.055, bw * 0.26, h * 0.045, h * 0.008); ctx.fill();
      ctx.strokeStyle = 'rgba(200,195,185,0.28)';
      ctx.lineWidth = Math.max(1, h * 0.005);
      for (var gd = 0; gd < 3; gd++) {
        var gy2 = bTop + h * 0.068 + gd * h * 0.012;
        ctx.beginPath(); ctx.moveTo(-bw * 0.12, gy2); ctx.lineTo(bw * 0.12, gy2); ctx.stroke();
      }
      // full-width light strip (lit) with a hot core line
      var lit = brake ? 1 : 0.78;
      ctx.fillStyle = 'rgba(255,54,34,' + lit + ')';
      roundRect(ctx, -bw * 0.42, bBot - h * 0.16, bw * 0.84, h * 0.048, h * 0.022); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,200,' + (0.5 + lit * 0.4) + ')';
      roundRect(ctx, -bw * 0.42, bBot - h * 0.155, bw * 0.84, h * 0.016, h * 0.008); ctx.fill();
      glow(ctx, 0, bBot - h * 0.135, bw * 0.36, 'rgba(255,64,36,' + (0.24 * lit) + ')');
      // bumper band + plate blank + twin pipes
      ctx.fillStyle = '#1c1917';
      roundRect(ctx, -bw * 0.5, bBot - h * 0.105, bw, h * 0.095, w * 0.02); ctx.fill();
      plate(ctx, 0, bBot - h * 0.09, w * 0.12, h * 0.05);
      pipe(ctx, -w * 0.11, bBot, w, h, st.throttle);
      pipe(ctx, w * 0.11, bBot, w, h, st.throttle);
    } else if (modelId === 'gto') {
      ctx.beginPath();
      ctx.moveTo(-bw * 0.52, bBot);
      ctx.lineTo(-bw * 0.56, bTop + h * 0.22);
      ctx.lineTo(-bw * 0.30, bTop + h * 0.04);
      ctx.lineTo(bw * 0.30, bTop + h * 0.04);
      ctx.lineTo(bw * 0.56, bTop + h * 0.22);
      ctx.lineTo(bw * 0.52, bBot);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      // box arches with stone-chip wear
      ctx.fillStyle = shade(paint, -20);
      ctx.fillRect(-bw * 0.57, bBot - h * 0.16, bw * 0.15, h * 0.14);
      ctx.fillRect(bw * 0.42, bBot - h * 0.16, bw * 0.15, h * 0.14);
      ctx.fillStyle = 'rgba(230,220,200,0.28)';
      ctx.fillRect(-bw * 0.57, bBot - h * 0.13, bw * 0.04, h * 0.05);
      ctx.fillRect(bw * 0.53, bBot - h * 0.13, bw * 0.04, h * 0.05);
      // ducktail lip
      ctx.fillStyle = shade(paint, -12);
      ctx.fillRect(-bw * 0.30, bTop + h * 0.02, bw * 0.60, h * 0.028);
      screenGlass(ctx, -bw * 0.21, bTop + h * 0.08, bw * 0.42, h * 0.10, world, lean, false);
      // black grille + quad lights
      ctx.fillStyle = '#171412';
      roundRect(ctx, -bw * 0.44, bBot - h * 0.19, bw * 0.88, h * 0.13, w * 0.015); ctx.fill();
      var lit2 = brake ? 1 : 0.7;
      for (var q = 0; q < 4; q++) {
        var lx2 = (q < 2 ? -1 : 1) * bw * (0.33 - (q % 2) * 0.12);
        ctx.fillStyle = 'rgba(255,72,48,' + lit2 + ')';
        ctx.beginPath(); ctx.arc(lx2, bBot - h * 0.125, h * 0.024, 0, 6.284); ctx.fill();
        ctx.fillStyle = 'rgba(120,16,10,0.9)';
        ctx.beginPath(); ctx.arc(lx2, bBot - h * 0.125, h * 0.013, 0, 6.284); ctx.fill();
        if (brake) {
          ctx.fillStyle = 'rgba(255,236,220,0.9)';
          ctx.beginPath(); ctx.arc(lx2, bBot - h * 0.125, h * 0.010, 0, 6.284); ctx.fill();
        }
        glow(ctx, lx2, bBot - h * 0.125, h * 0.06, 'rgba(255,70,40,' + (0.2 * lit2) + ')');
      }
      plate(ctx, 0, bBot - h * 0.045, w * 0.11, h * 0.042);
      pipe(ctx, -w * 0.115, bBot, w, h, st.throttle);
      pipe(ctx, w * 0.115, bBot, w, h, st.throttle);
    } else if (modelId === 'coun') {
      ctx.beginPath();
      ctx.moveTo(-bw * 0.50, bBot);
      ctx.lineTo(-bw * 0.60, bTop + h * 0.26);
      ctx.lineTo(-bw * 0.34, bTop + h * 0.02);
      ctx.lineTo(bw * 0.34, bTop + h * 0.02);
      ctx.lineTo(bw * 0.60, bTop + h * 0.26);
      ctx.lineTo(bw * 0.50, bBot);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      screenGlass(ctx, -bw * 0.17, bTop + h * 0.05, bw * 0.34, h * 0.10, world, lean, false);
      // engine-cover slats
      ctx.strokeStyle = 'rgba(90,84,70,0.5)';
      ctx.lineWidth = Math.max(1, h * 0.007);
      for (var cs2 = 0; cs2 < 3; cs2++) {
        var cy3 = bTop + h * 0.16 + cs2 * h * 0.03;
        ctx.beginPath(); ctx.moveTo(-bw * 0.26, cy3); ctx.lineTo(bw * 0.26, cy3); ctx.stroke();
      }
      // full-width black panel with slats
      ctx.fillStyle = '#141210';
      roundRect(ctx, -bw * 0.48, bBot - h * 0.17, bw * 0.96, h * 0.15, w * 0.01); ctx.fill();
      ctx.strokeStyle = 'rgba(200,195,185,0.25)';
      ctx.lineWidth = Math.max(1, h * 0.006);
      for (var sl = 0; sl < 5; sl++) {
        var sy2 = bBot - h * 0.15 + sl * h * 0.028;
        ctx.beginPath(); ctx.moveTo(-bw * 0.44, sy2); ctx.lineTo(bw * 0.44, sy2); ctx.stroke();
      }
      // center quad exhaust cluster
      ctx.fillStyle = '#3a3633';
      for (var ce = 0; ce < 4; ce++) {
        ctx.beginPath();
        ctx.arc((ce - 1.5) * w * 0.032, bBot - h * 0.055, h * 0.02, 0, 6.284);
        ctx.fill();
      }
      exhaustHeat(ctx, 0, bBot - h * 0.055, h * 0.05, st.throttle);
      // corner taillights
      var lit3 = brake ? 1 : 0.72;
      ctx.fillStyle = 'rgba(255,64,44,' + lit3 + ')';
      ctx.fillRect(-bw * 0.47, bTop + h * 0.16, bw * 0.10, h * 0.032);
      ctx.fillRect(bw * 0.37, bTop + h * 0.16, bw * 0.10, h * 0.032);
      glow(ctx, -bw * 0.42, bTop + h * 0.175, h * 0.07, 'rgba(255,70,40,' + (0.22 * lit3) + ')');
      glow(ctx, bw * 0.42, bTop + h * 0.175, h * 0.07, 'rgba(255,70,40,' + (0.22 * lit3) + ')');
    } else { // f40
      // rear wing on struts
      ctx.fillStyle = shade(paint, -14);
      roundRect(ctx, -bw * 0.54, bTop - h * 0.115, bw * 1.08, h * 0.055, w * 0.008); ctx.fill();
      rimWing(ctx, -bw * 0.54, bTop - h * 0.115, bw * 1.08);
      ctx.fillStyle = shade(paint, -32);
      ctx.fillRect(-bw * 0.40, bTop - h * 0.06, w * 0.022, h * 0.09);
      ctx.fillRect(bw * 0.378, bTop - h * 0.06, w * 0.022, h * 0.09);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.50, bBot);
      ctx.lineTo(-bw * 0.54, bTop + h * 0.18);
      ctx.lineTo(-bw * 0.30, bTop + h * 0.02);
      ctx.lineTo(bw * 0.30, bTop + h * 0.02);
      ctx.lineTo(bw * 0.54, bTop + h * 0.18);
      ctx.lineTo(bw * 0.50, bBot);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      rim(ctx, w);
      screenGlass(ctx, -bw * 0.17, bTop + h * 0.06, bw * 0.34, h * 0.09, world, lean, true);
      // mesh grille
      ctx.fillStyle = '#131110';
      roundRect(ctx, -bw * 0.42, bBot - h * 0.20, bw * 0.84, h * 0.14, w * 0.01); ctx.fill();
      ctx.strokeStyle = 'rgba(180,175,168,0.18)';
      ctx.lineWidth = 1;
      for (var mx = -bw * 0.40; mx < bw * 0.40; mx += w * 0.026) {
        ctx.beginPath(); ctx.moveTo(mx, bBot - h * 0.20); ctx.lineTo(mx, bBot - h * 0.06); ctx.stroke();
      }
      // quad lights in the board
      var lit4 = brake ? 1 : 0.68;
      for (var q2 = 0; q2 < 4; q2++) {
        var lx3 = (q2 < 2 ? -1 : 1) * bw * (0.34 - (q2 % 2) * 0.13);
        ctx.fillStyle = 'rgba(255,72,48,' + lit4 + ')';
        ctx.beginPath(); ctx.arc(lx3, bTop + h * 0.085, h * 0.02, 0, 6.284); ctx.fill();
        if (brake) {
          ctx.fillStyle = 'rgba(255,236,220,0.9)';
          ctx.beginPath(); ctx.arc(lx3, bTop + h * 0.085, h * 0.009, 0, 6.284); ctx.fill();
        }
        glow(ctx, lx3, bTop + h * 0.085, h * 0.07, 'rgba(255,70,40,' + (0.2 * lit4) + ')');
      }
      plate(ctx, 0, bBot - h * 0.04, w * 0.10, h * 0.04);
      pipe(ctx, -w * 0.16, bBot - h * 0.05, w, h, st.throttle);
      pipe(ctx, w * 0.16, bBot - h * 0.05, w, h, st.throttle);
    }

    // horizon reflection line across the paint
    ctx.fillStyle = 'rgba(255,214,150,0.20)';
    ctx.fillRect(-bw * 0.5, bTop + h * 0.30, bw, Math.max(1, h * 0.016));
    ctx.restore();
  };

  // ---------- the visible flank (yaw 3/4 read) ----------
  function drawFlank(ctx, side, bw, h, w, paint, a, bTop, bBot) {
    var ext = bw * 0.05 + a * bw * 0.09;
    var x0 = side * bw * 0.40; // tucked under the body edge: no seam
    var g2 = ctx.createLinearGradient(x0, 0, x0 + side * ext, 0);
    g2.addColorStop(0, shade(paint, -6));
    g2.addColorStop(1, shade(paint, -34));
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(x0, bBot - h * 0.02);
    ctx.lineTo(x0 + side * ext, bBot - h * 0.06);
    ctx.lineTo(x0 + side * ext, bTop + h * 0.20);
    ctx.lineTo(x0, bTop + h * 0.14);
    ctx.closePath(); ctx.fill();
    // side window sliver
    ctx.fillStyle = 'rgba(52,60,74,0.9)';
    ctx.beginPath();
    ctx.moveTo(x0 + side * ext * 0.2, bTop + h * 0.17);
    ctx.lineTo(x0 + side * ext * 0.85, bTop + h * 0.22);
    ctx.lineTo(x0 + side * ext * 0.85, bTop + h * 0.30);
    ctx.lineTo(x0 + side * ext * 0.2, bTop + h * 0.26);
    ctx.closePath(); ctx.fill();
  }

  // ---------- civilian traffic bodies ----------
  function drawTraffic(ctx, type, palIdx, cx, yBottom, w, st, yaw) {
    var paint = TR.TRAFFIC.colors[((palIdx % TR.TRAFFIC.colors.length) + TR.TRAFFIC.colors.length) % TR.TRAFFIC.colors.length];
    var h = w * (type === 'truck' ? 1.05 : type === 'van' ? 0.95 : 0.72);
    // contact shadow only (no sun trail for traffic)
    ctx.fillStyle = 'rgba(15,12,22,0.36)';
    ctx.beginPath();
    ctx.ellipse(cx, yBottom - h * 0.02, w * 0.5, h * 0.05, 0, 0, 6.284);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, yBottom);
    ctx.transform(1, 0, -yaw * 0.12, 1, 0, 0);
    var bw = w * 0.9, bBot = 0, bTop = -h;
    var grad = ctx.createLinearGradient(0, bTop, 0, bBot);
    grad.addColorStop(0, shade(paint, 34));
    grad.addColorStop(0.22, paint);
    grad.addColorStop(0.8, shade(paint, -24));
    grad.addColorStop(1, shade(paint, -38));
    ctx.fillStyle = grad;

    if (type === 'sedan') {
      // cabin + roof
      ctx.fillStyle = shade(paint, -8);
      roundRect(ctx, -bw * 0.30, bTop + h * 0.02, bw * 0.60, h * 0.30, w * 0.03); ctx.fill();
      // glass band
      ctx.fillStyle = 'rgba(54,62,76,0.92)';
      roundRect(ctx, -bw * 0.26, bTop + h * 0.05, bw * 0.52, h * 0.12, w * 0.02); ctx.fill();
      // body
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, bBot);
      ctx.lineTo(-bw * 0.52, bTop + h * 0.30);
      ctx.quadraticCurveTo(0, bTop + h * 0.24, bw * 0.52, bTop + h * 0.30);
      ctx.lineTo(bw * 0.5, bBot);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      // trunk seam + wide lights
      ctx.strokeStyle = 'rgba(30,26,24,0.5)';
      ctx.lineWidth = Math.max(1, h * 0.008);
      ctx.beginPath(); ctx.moveTo(-bw * 0.30, bTop + h * 0.38); ctx.lineTo(bw * 0.30, bTop + h * 0.38); ctx.stroke();
      var lit = st.brake ? 1 : 0.55;
      ctx.fillStyle = 'rgba(255,64,44,' + lit + ')';
      roundRect(ctx, -bw * 0.44, bTop + h * 0.46, bw * 0.20, h * 0.07, h * 0.015); ctx.fill();
      roundRect(ctx, bw * 0.24, bTop + h * 0.46, bw * 0.20, h * 0.07, h * 0.015); ctx.fill();
      // bumper + plate
      ctx.fillStyle = '#20201e';
      roundRect(ctx, -bw * 0.5, bTop + h * 0.62, bw, h * 0.14, w * 0.015); ctx.fill();
      plate(ctx, 0, bTop + h * 0.66, w * 0.13, h * 0.07);
    } else if (type === 'van') {
      // tall box, twin rear doors
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, bBot);
      ctx.lineTo(-bw * 0.5, bTop + h * 0.06);
      ctx.quadraticCurveTo(0, bTop, bw * 0.5, bTop + h * 0.06);
      ctx.lineTo(bw * 0.5, bBot);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      // door seam
      ctx.strokeStyle = 'rgba(40,36,32,0.6)';
      ctx.lineWidth = Math.max(1.5, w * 0.008);
      ctx.beginPath(); ctx.moveTo(0, bTop + h * 0.08); ctx.lineTo(0, bBot - h * 0.10); ctx.stroke();
      // windows up top
      ctx.fillStyle = 'rgba(54,62,76,0.92)';
      roundRect(ctx, -bw * 0.40, bTop + h * 0.09, bw * 0.32, h * 0.13, w * 0.012); ctx.fill();
      roundRect(ctx, bw * 0.08, bTop + h * 0.09, bw * 0.32, h * 0.13, w * 0.012); ctx.fill();
      // vertical rear lights
      var lit2 = st.brake ? 1 : 0.55;
      ctx.fillStyle = 'rgba(255,64,44,' + lit2 + ')';
      ctx.fillRect(-bw * 0.46, bTop + h * 0.46, bw * 0.055, h * 0.20);
      ctx.fillRect(bw * 0.405, bTop + h * 0.46, bw * 0.055, h * 0.20);
      // bumper step
      ctx.fillStyle = '#232320';
      roundRect(ctx, -bw * 0.5, bTop + h * 0.78, bw, h * 0.13, w * 0.01); ctx.fill();
      plate(ctx, 0, bTop + h * 0.82, w * 0.13, h * 0.06);
    } else { // truck: box body with ribs, mudflaps, light row
      ctx.fillStyle = shade(paint, -4);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.52, bBot - h * 0.16);
      ctx.lineTo(-bw * 0.52, bTop + h * 0.05);
      ctx.lineTo(bw * 0.52, bTop + h * 0.05);
      ctx.lineTo(bw * 0.52, bBot - h * 0.16);
      ctx.closePath(); ctx.fill();
      rim(ctx, w);
      // vertical ribs
      ctx.strokeStyle = 'rgba(60,58,54,0.5)';
      ctx.lineWidth = Math.max(1.5, w * 0.008);
      for (var rb = -4; rb <= 4; rb++) {
        ctx.beginPath();
        ctx.moveTo(rb * bw * 0.11, bTop + h * 0.07);
        ctx.lineTo(rb * bw * 0.11, bBot - h * 0.18);
        ctx.stroke();
      }
      // sun wash on the container face
      ctx.fillStyle = 'rgba(255,190,120,0.14)';
      ctx.fillRect(bw * 0.05, bTop + h * 0.05, bw * 0.47, h * 0.55);
      // chassis + mudflaps
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(-bw * 0.5, bBot - h * 0.16, bw, h * 0.10);
      ctx.fillStyle = '#26241f';
      ctx.fillRect(-bw * 0.44, bBot - h * 0.07, bw * 0.14, h * 0.07);
      ctx.fillRect(bw * 0.30, bBot - h * 0.07, bw * 0.14, h * 0.07);
      // dual wheels
      ctx.fillStyle = '#14110f';
      roundRect(ctx, -bw * 0.40, bBot - h * 0.20, bw * 0.17, h * 0.16, w * 0.02); ctx.fill();
      roundRect(ctx, bw * 0.23, bBot - h * 0.20, bw * 0.17, h * 0.16, w * 0.02); ctx.fill();
      // light row + plate
      var lit3 = st.brake ? 1 : 0.6;
      for (var lr = 0; lr < 5; lr++) {
        ctx.fillStyle = lr === 2 ? 'rgba(255,190,80,' + lit3 + ')' : 'rgba(255,64,44,' + lit3 + ')';
        ctx.fillRect((lr - 2) * bw * 0.13 - w * 0.02, bBot - h * 0.185, w * 0.035, h * 0.022);
      }
      plate(ctx, 0, bBot - h * 0.12, w * 0.14, h * 0.05);
    }
    ctx.restore();
  }

  // ---------- shared bits ----------
  function screenGlass(ctx, x, y, w2, h2, world, lean, defrost) {
    var gl = ctx.createLinearGradient(x, y, x + w2, y + h2);
    gl.addColorStop(0, 'rgba(58,70,90,0.95)');
    gl.addColorStop(0.55, 'rgba(120,110,110,0.85)');
    gl.addColorStop(1, 'rgba(232,167,99,0.8)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.moveTo(x + w2 * 0.1, y);
    ctx.lineTo(x + w2 * 0.9, y);
    ctx.lineTo(x + w2, y + h2);
    ctx.lineTo(x, y + h2);
    ctx.closePath(); ctx.fill();
    // interior hint
    ctx.fillStyle = 'rgba(16,14,18,0.35)';
    ctx.fillRect(x + w2 * 0.18, y + h2 * 0.3, w2 * 0.64, h2 * 0.5);
    if (defrost) {
      ctx.strokeStyle = 'rgba(220,214,200,0.25)';
      ctx.lineWidth = Math.max(1, h2 * 0.05);
      for (var d = 1; d <= 2; d++) {
        var dy = y + h2 * (0.35 + d * 0.18);
        ctx.beginPath(); ctx.moveTo(x + w2 * 0.15, dy); ctx.lineTo(x + w2 * 0.85, dy); ctx.stroke();
      }
    }
    if (lean) {
      ctx.fillStyle = 'rgba(255,244,214,0.16)';
      ctx.fillRect(x + w2 * 0.1 + lean * w2 * 0.2, y + h2 * 0.2, w2 * 0.25, h2 * 0.5);
    }
  }

  function plate(ctx, cxOff, y, w2, h2) {
    ctx.fillStyle = '#d8d2c0';
    roundRect(ctx, cxOff - w2 / 2, y, w2, h2, Math.max(1, h2 * 0.18)); ctx.fill();
    ctx.fillStyle = 'rgba(60,56,50,0.75)';
    ctx.fillRect(cxOff - w2 * 0.38, y + h2 * 0.3, w2 * 0.76, h2 * 0.28);
  }

  function pipe(ctx, px, y, w, h, throttle) {
    ctx.fillStyle = '#3a3633';
    ctx.beginPath(); ctx.ellipse(px, y - h * 0.02, w * 0.022, h * 0.016, 0, 0, 6.284); ctx.fill();
    ctx.fillStyle = '#0e0c0a';
    ctx.beginPath(); ctx.ellipse(px, y - h * 0.02, w * 0.013, h * 0.009, 0, 0, 6.284); ctx.fill();
    if (throttle) exhaustHeat(ctx, px, y - h * 0.02, w * 0.02, true);
  }

  function exhaustHeat(ctx, x, y, r, on) {
    if (!on) return;
    var gl = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    gl.addColorStop(0, 'rgba(255,180,110,0.35)');
    gl.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }

  function discGlow(ctx, x, y, r, sp) {
    var gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, 'rgba(255,140,40,' + (0.5 * sp) + ')');
    gl.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function rimWing(ctx, x, y, w2) {
    ctx.strokeStyle = 'rgba(255,220,158,0.6)';
    ctx.lineWidth = Math.max(1.6, w2 * 0.01);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w2, y); ctx.stroke();
  }

  function glow(ctx, x, y, r, color) {
    var gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, color);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // warm rim light along the top contour the sun just painted
  function rim(ctx, w) {
    ctx.strokeStyle = 'rgba(255,220,158,0.65)';
    ctx.lineWidth = Math.max(1.8, w * 0.01);
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var shadeCache = {};
  function shade(hex, amt) {
    var key = hex + amt;
    var c = shadeCache[key];
    if (c) return c;
    var rgb = U.rgb(hex);
    var r = U.clamp(rgb[0] + amt, 0, 255) | 0, gg = U.clamp(rgb[1] + amt, 0, 255) | 0, b = U.clamp(rgb[2] + amt, 0, 255) | 0;
    c = 'rgb(' + r + ',' + gg + ',' + b + ')';
    shadeCache[key] = c;
    return c;
  }
})(typeof window !== 'undefined' ? window : globalThis);