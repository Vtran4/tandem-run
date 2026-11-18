// The tandem run — civilian traffic: sedans, vans and trucks sharing the duel road
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var T = TR.Traffic = TR.Traffic || {};

  var TYPES = ['sedan', 'sedan', 'sedan', 'van', 'van', 'truck'];

  // one pool per duel; cars respawn ahead of the player so the road stays lived-in
  T.build = function (seed) {
    var rng = U.mulberry32(seed * 6151 + 89);
    var cfg = TR.TRAFFIC;
    var list = [];
    for (var i = 0; i < cfg.N; i++) {
      var type = TYPES[(rng() * TYPES.length) | 0];
      var sp = cfg.speeds[type];
      var speed = sp[0] + rng() * (sp[1] - sp[0]);
      var car = TR.Cars.makeTraffic(type, (rng() * 7) | 0, 0, lane(rng), speed);
      car.z = cfg.MINZ + rng() * cfg.SPREAD;
      list.push(car);
    }
    return list;
  };

  function lane(rng) {
    // two loose lanes; mostly right-hand (slow) lane, clear of the racing line
    var r = rng();
    if (r < 0.7) return 0.55 + (rng() - 0.5) * 0.1;
    if (r < 0.92) return -0.55 + (rng() - 0.5) * 0.1;
    return 0.3 + (rng() - 0.5) * 0.2; // occasional straggler
  }

  // keep the pool alive: move everyone, recycle the ones we leave far behind
  T.update = function (list, road, dt, playerZ, seed) {
    var cfg = TR.TRAFFIC;
    var i, j, c;
    // mutual spacing: nobody rear-ends slower traffic in the same lane
    for (i = 0; i < list.length; i++) list[i]._cap = 1e9;
    for (i = 0; i < list.length; i++) {
      for (j = 0; j < list.length; j++) {
        if (i === j) continue;
        var a = list[i], b = list[j];
        var dz = b.z - a.z;
        if (dz > 200 && dz < 3200 && Math.abs(a.x - b.x) < 0.5 && a.speed > b.speed) {
          var cap = b.speed * (0.6 + 0.4 * Math.min(1, dz / 3200));
          if (cap < a._cap) a._cap = cap;
        }
      }
    }
    for (i = 0; i < list.length; i++) {
      c = list[i];
      c.z += Math.min(c.speed, c._cap) * dt;
      c.brakeLight = c._cap < c.speed;
      if (c.z > playerZ + cfg.RESPAWN_BEHIND * 2 || c.z < playerZ - cfg.RESPAWN_BEHIND) {
        var rng = U.mulberry32(seed + i * 131 + ((c.z / 1000) | 0));
        c.z = playerZ + cfg.MINZ + 8000 + rng() * cfg.SPREAD * 0.6;
        c.x = lane(rng);
        var sp = cfg.speeds[c.model];
        c.speed = sp[0] + rng() * (sp[1] - sp[0]);
        c.pal = (rng() * 7) | 0;
        c.brakeLight = false;
      }
    }
  };

  // is a lane occupied ahead (excluding the car doing the checking)?
  T.laneBlocked = function (list, z, x, self) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c === self) continue;
      var dz = c.z - z;
      if (dz < 60 || dz > 6500) continue;
      if (Math.abs(c.x - x) < 0.5) return true;
    }
    return false;
  };

  // nearest traffic ahead of z within dzMax whose lane overlaps xCur
  T.aheadOf = function (list, z, dzMax, xCur) {
    var best = null, bestDz = dzMax;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var dz = c.z - z;
      if (dz <= 100 || dz > bestDz) continue;
      if (Math.abs(c.x - xCur) > 0.5) continue;
      best = c; bestDz = dz;
    }
    return best;
  };

  // nearest regardless of lane (for panic braking)
  T.closestAhead = function (list, z, dzMax) {
    var best = null, bestDz = dzMax;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var dz = c.z - z;
      if (dz <= 100 || dz > bestDz) continue;
      best = c; bestDz = dz;
    }
    return best;
  };
})(typeof window !== 'undefined' ? window : globalThis);