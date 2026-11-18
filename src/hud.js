// The tandem run — HUD, rear-view strip, cards (all canvas-drawn)
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var HUD = TR.HUD = TR.HUD || {};

  var F = '"Barlow Condensed","Arial Narrow",Arial,sans-serif';

  HUD.draw = function (ctx, game) {
    var W = TR.Scene.W, H = TR.Scene.H;
    ctx.textBaseline = 'alphabetic';

    if (game.state === 'attract') {
      title(ctx, W, H, game);
      hint(ctx, W, H, 'Press any key — choose a car and race');
      return;
    }
    if (game.state === 'select') { selectCard(ctx, W, H, game); return; }
    if (game.state === 'end') { endCard(ctx, W, H, game); return; }
    if (game.state === 'summary') { summaryCard(ctx, W, H, game); return; }

    // racing / countdown HUD
    title(ctx, W, H, game);
    if (game.state === 'race') {
      hint(ctx, W, H, 'Draft close behind ' + game.duel.rival.name + ', then pull out · Esc pause');
    } else {
      hint(ctx, W, H, 'Beat ' + game.duel.rival.name + ' to the finish · Esc pause');
    }

    // speed + gear, bottom right
    var kmh = Math.round(game.player.speed / TR.KMH);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(14,12,16,0.42)';
    roundRect(ctx, W - 218, H - 92, 202, 74, 8); ctx.fill();
    ctx.fillStyle = '#f2e8d4';
    ctx.font = '700 52px ' + F;
    ctx.fillText(String(kmh), W - 92, H - 34);
    ctx.font = '600 17px ' + F;
    ctx.fillStyle = 'rgba(242,232,212,0.75)';
    ctx.fillText('km/h', W - 30, H - 56);
    ctx.fillStyle = '#f2b545';
    ctx.font = '700 30px ' + F;
    ctx.fillText(String(game.player.gear + 1), W - 40, H - 30);

    // gap, bottom left
    var dz = game.rival.z - game.player.z;
    var gap = Math.abs(dz) / Math.max(900, game.player.speed);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(14,12,16,0.42)';
    roundRect(ctx, 18, H - 78, 150, 60, 8); ctx.fill();
    ctx.font = '700 36px ' + F;
    ctx.fillStyle = dz > 0 ? '#e8654a' : '#f2e8d4';
    ctx.fillText((dz > 0 ? '+' : '\u2212') + gap.toFixed(1), 32, H - 36);
    ctx.font = '600 15px ' + F;
    ctx.fillStyle = 'rgba(242,232,212,0.7)';
    ctx.fillText(gap < 0.06 ? 'door to door' : ('s ' + (dz > 0 ? 'behind' : 'ahead')), 96, H - 58);

    // progress strip
    var sw = Math.min(560, W * 0.4), sx = (W - sw) / 2, sy = H - 16;
    ctx.fillStyle = 'rgba(242,232,212,0.25)';
    ctx.fillRect(sx, sy, sw, 2);
    ctx.fillStyle = '#e8654a';
    ctx.fillRect(sx + U.clamp(game.rival.z / game.track.finishZ, 0, 1) * sw - 2, sy - 3, 5, 8);
    ctx.fillStyle = '#f2e8d4';
    ctx.fillRect(sx + U.clamp(game.player.z / game.track.finishZ, 0, 1) * sw - 2, sy - 3, 5, 8);

    // rear-view strip (only when the rival is behind — no empty box otherwise)
    if (game.rival.z < game.player.z - 400) rearView(ctx, W, game);

    // pause menu
    if (game.paused) {
      ctx.fillStyle = 'rgba(8,6,12,0.55)';
      ctx.fillRect(0, 0, W, H);
      var pw2 = Math.min(460, W * 0.5), ph2 = 250;
      var px2 = (W - pw2) / 2, py2 = (H - ph2) / 2;
      ctx.fillStyle = 'rgba(14,11,16,0.9)';
      roundRect(ctx, px2, py2, pw2, ph2, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(242,216,168,0.4)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, px2 + 0.75, py2 + 0.75, pw2 - 1.5, ph2 - 1.5, 12); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f2b545';
      ctx.font = '700 40px ' + F;
      ctx.fillText('Paused', W / 2, py2 + 64);
      ctx.font = '600 20px ' + F;
      ctx.fillStyle = '#f2e8d4';
      ctx.fillText('Esc — resume', W / 2, py2 + 112);
      ctx.fillText('R — restart the duel', W / 2, py2 + 148);
      ctx.fillText('Q — exit to the title', W / 2, py2 + 184);
      ctx.font = '600 14px ' + F;
      ctx.fillStyle = 'rgba(242,232,212,0.55)';
      ctx.fillText('the road waits', W / 2, py2 + 222);
      return;
    }

    // off-road countdown: get back on the tarmac or be reset
    if (game.offT > 0 && game.state === 'race') {
      var nLeft = Math.ceil(TR.OFFROAD_TIME - game.offT);
      var frac = (game.offT % 1);
      ctx.save();
      ctx.translate(W / 2, H * 0.34);
      ctx.scale(1 + (1 - frac) * 0.12, 1 + (1 - frac) * 0.12);
      ctx.textAlign = 'center';
      ctx.font = '700 110px ' + F;
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(40,10,8,0.7)';
      ctx.strokeText(String(nLeft), 0, 0);
      ctx.fillStyle = '#ff6a4a';
      ctx.fillText(String(nLeft), 0, 0);
      ctx.font = '600 22px ' + F;
      ctx.strokeStyle = 'rgba(40,10,8,0.6)';
      ctx.lineWidth = 6;
      ctx.strokeText('back on the road!', 0, 44);
      ctx.fillStyle = '#f2e8d4';
      ctx.fillText('back on the road!', 0, 44);
      ctx.restore();
    }
    if (game.resetFlash > 0 && game.state === 'race') {
      ctx.textAlign = 'center';
      ctx.font = '700 34px ' + F;
      ctx.fillStyle = 'rgba(242,181,69,' + Math.min(1, game.resetFlash) + ')';
      ctx.fillText('Position reset', W / 2, H * 0.48);
    }

    // countdown numbers
    if (game.state === 'count') {
      var n = Math.ceil(3.2 - game.stateT);
      var label = n >= 3 ? '3' : n === 2 ? '2' : n === 1 ? '1' : 'GO';
      var frac = (game.stateT % 1);
      var scale = 1 + (1 - frac) * 0.25;
      ctx.save();
      ctx.translate(W / 2, H * 0.36);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.font = '700 96px ' + F;
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(30,20,14,0.6)';
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = label === 'GO' ? '#f2b545' : '#f2e8d4';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  };

  function title(ctx, W, H, game) {
    ctx.textAlign = 'left';
    ctx.font = '700 21px ' + F;
    ctx.fillStyle = 'rgba(20,16,20,0.5)';
    ctx.fillText('THE TANDEM RUN', 19, 31);
    ctx.fillStyle = '#f2e8d4';
    ctx.fillText('THE TANDEM RUN', 18, 30);
    if (game.state !== 'attract' && game.state !== 'select') {
      ctx.font = '600 14px ' + F;
      ctx.fillStyle = 'rgba(242,232,212,0.66)';
      ctx.fillText('Duel ' + (game.duelIdx + 1) + ' of 4 \u00b7 ' + game.duel.name + ' \u00b7 vs ' + game.duel.rival.name + ' in the ' + TR.CARS[game.duel.rival.car].name, 18, 50);
    }
  }

  function hint(ctx, W, H, text) {
    ctx.textAlign = 'left';
    ctx.font = '600 15px ' + F;
    ctx.fillStyle = 'rgba(20,16,20,0.45)';
    ctx.fillText(text, 19, 71);
    ctx.fillStyle = '#f2d9a8';
    ctx.fillText(text, 18, 70);
  }

  function rearView(ctx, W, game) {
    var rw = 340, rh = 52, rx = (W - rw) / 2, ry = 14;
    ctx.fillStyle = 'rgba(10,9,13,0.55)';
    roundRect(ctx, rx, ry, rw, rh, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(242,232,212,0.22)';
    ctx.lineWidth = 1;
    roundRect(ctx, rx + 0.5, ry + 0.5, rw - 1, rh - 1, 6); ctx.stroke();
    // backdrop: horizon + road widening toward the viewer
    var hy = ry + 16;
    ctx.fillStyle = 'rgba(120,100,110,0.5)';
    ctx.fillRect(rx + 6, hy, rw - 12, 1.5);
    ctx.fillStyle = 'rgba(70,66,64,0.75)';
    ctx.beginPath();
    ctx.moveTo(rx + rw / 2 - 3, hy);
    ctx.lineTo(rx + rw / 2 + 3, hy);
    ctx.lineTo(rx + rw - 12, ry + rh - 4);
    ctx.lineTo(rx + 12, ry + rh - 4);
    ctx.closePath(); ctx.fill();
    // rival when behind
    var dz = game.player.z - game.rival.z; // >0: rival behind us
    if (dz > 200) {
      var closeness = U.clamp(1 - dz / 9000, 0.12, 1);
      var cw = 14 + closeness * 58;
      var cx2 = rx + rw / 2 + U.clamp((game.rival.x - game.player.x) * 60, -rw / 2 + cw, rw / 2 - cw);
      var cy2 = ry + rh - 6 - closeness * 6;
      ctx.fillStyle = cssOf(TR.CARS[game.rival.model].paint[game.rival.pal]);
      roundRect(ctx, cx2 - cw / 2, cy2 - cw * 0.32, cw, cw * 0.32, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,70,40,0.9)';
      ctx.fillRect(cx2 - cw / 2 + 2, cy2 - cw * 0.2, cw * 0.22, 2.5);
      ctx.fillRect(cx2 + cw / 2 - 2 - cw * 0.22, cy2 - cw * 0.2, cw * 0.22, 2.5);
    }
  }

  function cssOf(hex) {
    var c = U.rgb(hex);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  // ---------- cards ----------
  function panel(ctx, W, H, w, h) {
    var x = (W - w) / 2, y = (H - h) / 2;
    ctx.fillStyle = 'rgba(12,10,15,0.72)';
    roundRect(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(242,216,168,0.35)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 12); ctx.stroke();
    return { x: x, y: y };
  }

  function selectCard(ctx, W, H, game) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2e8d4';
    ctx.font = '700 40px ' + F;
    ctx.fillText('Choose your car', W / 2, H * 0.16);
    var cw = 300, ch = 340, gap = 40;
    var total = cw * 3 + gap * 2, x0 = (W - total) / 2, y0 = H * 0.24;
    for (var i = 0; i < 3; i++) {
      var id = TR.SELECT[i], m = TR.CARS[id];
      var x = x0 + i * (cw + gap);
      var sel = i === game.selIdx;
      ctx.fillStyle = sel ? 'rgba(28,22,20,0.82)' : 'rgba(14,12,16,0.62)';
      roundRect(ctx, x, y0, cw, ch, 10); ctx.fill();
      ctx.strokeStyle = sel ? '#f2b545' : 'rgba(242,232,212,0.25)';
      ctx.lineWidth = sel ? 2.5 : 1;
      roundRect(ctx, x + 1, y0 + 1, cw - 2, ch - 2, 10); ctx.stroke();
      // car rear view
      TR.Cars.draw(ctx, id, 0, x + cw / 2, y0 + 178, 190, { lean: 0, brake: false, speedPct: 0, t: game.time }, game);
      ctx.fillStyle = '#f2e8d4';
      ctx.font = '700 25px ' + F;
      ctx.fillText(m.name, x + cw / 2, y0 + 224);
      // stat bars: top speed, acceleration, grip, braking
      var labels = ['top speed', 'acceleration', 'grip', 'braking'];
      for (var s = 0; s < 4; s++) {
        var by = y0 + 252 + s * 20;
        ctx.textAlign = 'left';
        ctx.font = '600 13px ' + F;
        ctx.fillStyle = 'rgba(242,232,212,0.6)';
        ctx.fillText(labels[s], x + 22, by + 10);
        var v = (m.stats[s] - 0.86) / 0.22; // normalize 0..1
        ctx.fillStyle = 'rgba(242,232,212,0.18)';
        ctx.fillRect(x + 120, by + 2, 150, 7);
        ctx.fillStyle = '#f2b545';
        ctx.fillRect(x + 120, by + 2, 150 * U.clamp(v, 0.08, 1), 7);
        ctx.textAlign = 'center';
      }
    }
    ctx.textAlign = 'center';
    ctx.font = '600 17px ' + F;
    ctx.fillStyle = '#f2d9a8';
    ctx.fillText('\u2190 / \u2192 choose \u00b7 Enter race \u00b7 M sound', W / 2, y0 + ch + 46);
  }

  function summaryCard(ctx, W, H, game) {
    var r = game.results[game.duelIdx];
    var win = r && r.win;
    var p = panel(ctx, W, H, 560, 300);
    ctx.textAlign = 'center';
    ctx.fillStyle = win ? '#f2b545' : '#e8654a';
    ctx.font = '700 44px ' + F;
    ctx.fillText(win ? 'You take it' : game.duel.rival.name + ' takes it', W / 2, p.y + 74);
    ctx.fillStyle = '#f2e8d4';
    ctx.font = '600 19px ' + F;
    var byGap = Math.abs(r.gap).toFixed(1);
    ctx.fillText(win ? 'by ' + byGap + ' s over ' + game.duel.rival.name : 'by ' + byGap + ' s \u2014 the draft wins races', W / 2, p.y + 106);
    ctx.font = '700 30px ' + F;
    ctx.fillText(U.fmtTime(r.time), W / 2, p.y + 158);
    ctx.font = '600 16px ' + F;
    ctx.fillStyle = 'rgba(242,232,212,0.72)';
    ctx.fillText('top speed ' + Math.round(r.top / TR.KMH) + ' km/h \u00b7 ' + game.duel.name, W / 2, p.y + 188);
    ctx.font = '600 18px ' + F;
    ctx.fillStyle = '#f2d9a8';
    ctx.fillText(win ? 'Enter \u2014 next: vs ' + (TR.DUELS[game.duelIdx + 1] ? nextLine(game) : 'the lighthouse') : 'R \u2014 race ' + game.duel.rival.name + ' again', W / 2, p.y + 250);
  }

  function nextLine(game) {
    var d = TR.DUELS[game.duelIdx + 1];
    return d.rival.name + ' in the ' + TR.CARS[d.rival.car].name;
  }

  function endCard(ctx, W, H, game) {
    var total = 0, firstTry = 0, best = 0;
    for (var i = 0; i < game.results.length; i++) {
      var r = game.results[i];
      if (r) { total += r.time; if (r.firstTry) firstTry++; best = Math.max(best, r.top); }
    }
    var p = panel(ctx, W, H, 620, 330);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2b545';
    ctx.font = '700 48px ' + F;
    ctx.fillText('The lighthouse', W / 2, p.y + 78);
    ctx.fillStyle = '#f2e8d4';
    ctx.font = '700 34px ' + F;
    ctx.fillText(U.fmtTime(total), W / 2, p.y + 136);
    ctx.font = '600 18px ' + F;
    ctx.fillStyle = 'rgba(242,232,212,0.75)';
    ctx.fillText('total time \u00b7 ' + firstTry + ' of 4 duels won first try \u00b7 best ' + Math.round(best / TR.KMH) + ' km/h', W / 2, p.y + 168);
    ctx.font = '600 18px ' + F;
    ctx.fillStyle = '#f2d9a8';
    ctx.fillText('Enter \u2014 run the coast again', W / 2, p.y + 240);
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
})(typeof window !== 'undefined' ? window : globalThis);