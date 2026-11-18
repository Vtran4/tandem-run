// The tandem run — the four duel roads + scenery dressing
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var SEG = TR.SEG;

  function Builder(road, rng, roadW) {
    this.road = road; this.rng = rng; this.roadW = roadW;
    this.y = 0;
    // stretch every span so duels run 90-150 s
    var K = 2.0, self = this;
    var _span = this.span, _straight = this.straight;
    this.span = function (e, h, l, c, dY, wL, wR, t) {
      return _span.call(self, Math.round(e * K), Math.round(h * K), Math.round(l * K), c, dY || 0, wL, wR, t);
    };
    this.straight = function (n, dY, wL, wR) {
      return _straight.call(self, Math.round(n * K), dY, wL, wR);
    };
  }

  // curve eased in/out, y eased across the whole span
  Builder.prototype.span = function (enter, hold, leave, curve, dY, wallL, wallR, tunnel) {
    var road = this.road, startY = this.y, total = enter + hold + leave;
    var i, t, y;
    for (i = 0; i < total; i++) {
      t = (i + 1) / total;
      y = U.easeInOut(startY, startY + dY, t);
      var c;
      if (i < enter) c = U.easeIn(0, curve, (i + 1) / enter);
      else if (i < enter + hold) c = curve;
      else c = U.easeOut(curve, 0, (i - enter - hold) / leave);
      road.addSegment(c, y, y, wallL, wallR, tunnel);
    }
    this.y += dY;
    return this;
  };
  Builder.prototype.straight = function (n, dY, wallL, wallR) { return this.span(Math.min(10, n >> 2), n - Math.min(10, n >> 2) * 2, Math.min(10, n >> 2), 0, dY || 0, wallL, wallR, false); };

  // ---------- dressing ----------
  function dress(b, opts) {
    var road = b.road, rng = b.rng, segs = road.segments, N = segs.length;
    var i, s;
    for (i = 12; i < N - 4; i++) {
      s = segs[i];
      // reflector posts on both sides (skip tunnels)
      if (!s.tunnel && i % 6 === 0) {
        road.addSprite(i, { name: 'post', off: -1.09, flip: false });
        road.addSprite(i, { name: 'post', off: 1.09, flip: true });
      }
      if (s.tunnel && i % 9 === 0) road.addSprite(i, { name: 'lamp', off: 0, hang: true });
      // chevrons on hard bends, outside edge, jittered
      if (!s.tunnel && Math.abs(s.curve) >= 3.8 && i % 7 === 0) {
        road.addSprite(i, { name: 'chevR', off: (s.curve > 0 ? -1.2 : 1.2) + (rng() - 0.5) * 0.14, flip: s.curve > 0 });
      }
      if (opts.palms && !s.tunnel && i % 4 === 0 && rng() < 0.62) {
        var pn = rng() < 0.6 ? 'palm' : 'palm2';
        var side = opts.palmSide ? (rng() < 0.72 ? -1 : 1) : (rng() < 0.5 ? -1 : 1);
        if (side < 0 && s.wallL === 2) side = 1; // no palms inside the rock wall
        var poff = side * (1.45 + rng() * 2.1);
        if (side > 0 && opts.palmSide) poff = side * (2.3 + rng() * 1.6); // keep the sea-side rail clear
        road.addSprite(i, { name: pn, off: poff, flip: rng() < 0.5 });
        if (rng() < 0.3) road.addSprite(i, { name: 'bush', off: (rng() - 0.5) * 3.4 });
      }
      if (opts.rocks && !s.tunnel && i % 11 === 0 && rng() < 0.5) {
        road.addSprite(i, { name: 'rock', off: (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 1.2) });
      }
      if (opts.bushes && !s.tunnel && i % 7 === 0 && rng() < 0.5) {
        road.addSprite(i, { name: 'bush', off: (rng() < 0.5 ? -1 : 1) * (1.3 + rng() * 1.8) });
      }
      if (opts.cranes && i % 90 === 40) {
        road.addSprite(i, { name: 'crane', off: -(4.5 + rng() * 3) });
      }
    }
    // walls overlay per segment flags are set during build; add rails visual via wall flags only
  }

  // ---------- the four roads ----------
  var builds = {
    harbor: function (rng) {
      var road = new TR.Road(), b = new Builder(road, rng, 2300);
      b.straight(60).span(30, 60, 30, 1.6, 0)
        .straight(40).span(26, 50, 26, -2.2, 200)
        .straight(50).span(24, 44, 24, 2.6, 0)
        .straight(36, -160)
        // the short first tunnel
        .span(16, 64, 16, -1.2, 0, 2, 2, true)
        .straight(46).span(28, 56, 28, 3.0, 240)
        .straight(40).span(24, 40, 24, -2.4, -120)
        .straight(60).span(30, 60, 30, 1.8, 0)
        .straight(70).span(26, 48, 26, -2.8, -120)
        .straight(90).span(30, 70, 30, 2.2, 160)
        .straight(80);
      dress(b, { bushes: true, cranes: true });
      return { road: road, roadW: 2300 };
    },
    cuttings: function (rng) {
      var road = new TR.Road(), b = new Builder(road, rng, 1850);
      b.straight(50).span(30, 60, 30, 3.2, 180, 2, 0)
        .straight(30, 0, 0, 2)
        .span(20, 80, 20, -4.2, -210, 2, 2, true)   // tunnel one
        .straight(34, 0, 2, 2)
        .span(26, 56, 26, 4.6, 300, 2, 2)
        .straight(28).span(22, 60, 22, -3.4, -270, 2, 2)
        .span(18, 70, 18, 4.0, 0, 2, 2, true)        // tunnel two
        .straight(30, 0, 2, 0)
        .span(28, 64, 28, -4.6, 240, 2, 0)
        .straight(26).span(24, 52, 24, 3.6, -180, 0, 0)
        .straight(40).span(26, 48, 26, -3.0, 150)
        .straight(90);
      dress(b, { rocks: true });
      return { road: road, roadW: 1850 };
    },
    terraces: function (rng) {
      var road = new TR.Road(), b = new Builder(road, rng, 1750);
      b.straight(46).span(22, 44, 22, 5.4, 640, 2, 1)
        .span(20, 40, 20, -6.4, 760, 2, 1)
        .straight(22).span(18, 36, 18, 7.2, -520, 2, 1)     // hairpin right
        .span(18, 40, 18, -5.8, 1040, 2, 1)
        .straight(26).span(16, 42, 16, 6.6, -840, 2, 1)     // hairpin left
        .straight(20, 1280, 2, 1)
        .span(20, 36, 20, -4.4, -1240, 2, 1)
        .span(18, 34, 18, 5.0, 760, 2, 1)
        .straight(24).span(16, 38, 16, -7.0, 520, 2, 1)     // hairpin right
        .straight(18, -1120).span(20, 44, 20, 4.8, 0, 2, 1)
        .straight(30).span(18, 40, 18, -5.2, -760, 2, 1)
        .straight(80);
      dress(b, { palms: true, palmSide: true });
      return { road: road, roadW: 1750 };
    },
    lighthouse: function (rng) {
      var road = new TR.Road(), b = new Builder(road, rng, 2150);
      b.straight(150, 0, 0, 1).span(34, 80, 34, 2.6, -120, 0, 1)
        .straight(140).span(30, 70, 30, -3.0, 140, 0, 1)
        .straight(60).span(26, 60, 26, 3.4, -80, 2, 1)
        .straight(170, 0, 0, 1)
        .span(30, 76, 30, -2.8, 120, 0, 1)
        .straight(130).span(28, 64, 28, 3.2, -60, 0, 1)
        .straight(120);
      dress(b, { bushes: true, palms: true });
      return { road: road, roadW: 2150 };
    }
  };

  // build a duel: returns track object with dressed road, finish, grid
  TR.buildTrack = function (duelIdx, seed) {
    var rng = U.mulberry32(seed * 7919 + duelIdx * 104729 + 17);
    var out = builds[TR.DUELS[duelIdx].build](rng);
    var road = out.road;
    var segs = road.segments;
    var N = segs.length;
    // pad with straight so the world continues past the finish
    var i;
    for (i = 0; i < TR.FINISHPAD; i++) road.addSegment(0, segs[N - 1].p1.y, segs[N - 1].p1.y, 0, 0, false);
    // grid + finish
    var finishIdx = N - 8;
    road.finishSeg = finishIdx;
    segs[finishIdx].finish = true;
    for (i = 5; i < 10; i++) segs[i].grid = true;
    // scenery anchors
    road.addSprite(finishIdx - 2, { name: 'banner', off: 0, over: true });
    road.addSprite(finishIdx + 26, { name: 'lighthouse', off: 3.1 });
    road.addSprite(finishIdx + 44, { name: 'lighthouse', off: 4.4, small: true });
    // duel 4: the lighthouse anchors the whole run
    if (TR.DUELS[duelIdx].build === 'lighthouse') {
      for (var lh = 240; lh < finishIdx - 60; lh += 240) {
        road.addSprite(lh, { name: 'lighthouse', off: lh % 480 === 0 ? 3.0 : 4.6, small: lh % 480 !== 0 });
      }
    }
    road.trackLen = (N + TR.FINISHPAD) * SEG;
    road.finishZ = finishIdx * SEG;
    road.roadW = out.roadW;
    // fogged color tables for this road
    buildTables(road);
    return road;
  };

  function buildTables(road) {
    var P = TR.PAL, F = TR.FOGN, hz = TR.HAZE;
    function t(hexes) {
      var out = [];
      for (var k = 0; k < hexes.length; k++) out.push(U.fogTable(hexes[k], hz, F));
      return out;
    }
    road.tables = {
      grass: t([P.grassA, P.grassB]),     // [parity3][fog]
      verge: t([P.vergeA, P.vergeB]),
      rumble: t([P.rumbleA, P.rumbleB]),
      road: t([P.roadA, P.roadB]),
      line: t([P.roadLine])
    };
    road.tables.checker = t(['#efe8d8']);
    road.tables.grassIdx = function (s) { return s.rumble * 3; };
    // tunnel variants: darkened versions
    function dark(hex, amt) {
      var c = U.rgb(hex);
      return 'rgb(' + Math.round(c[0] * amt) + ',' + Math.round(c[1] * amt) + ',' + Math.round(c[2] * amt) + ')';
    }
    function darkTable(hexes, amt) {
      var out = [];
      for (var k = 0; k < hexes.length; k++) {
        var arr = new Array(F);
        for (var f = 0; f < F; f++) {
          var mix = f / (F - 1), c = U.rgb(hexes[k]);
          var r = Math.round(c[0] * amt + (TR.HAZE[0] - c[0] * amt) * mix);
          var g2 = Math.round(c[1] * amt + (TR.HAZE[1] - c[1] * amt) * mix);
          var b2 = Math.round(c[2] * amt + (TR.HAZE[2] - c[2] * amt) * mix);
          arr[f] = 'rgb(' + r + ',' + g2 + ',' + b2 + ')';
        }
        out.push(arr);
      }
      return out;
    }
    road.tTables = {
      grass: darkTable([P.grassA, P.grassB], 0.38),
      verge: darkTable([P.vergeA, P.vergeB], 0.38),
      rumble: darkTable([P.rumbleA, P.rumbleB], 0.42),
      road: darkTable([P.roadA, P.roadB], 0.46),
      line: darkTable([P.roadLine], 0.5),
      checker: darkTable(['#efe8d8'], 0.5)
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);