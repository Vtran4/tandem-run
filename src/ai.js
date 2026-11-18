// The tandem run — rival driver + ?auto=1 bot (both drive through the same input interface)
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var AI = TR.AI = TR.AI || {};

  // average curve ahead of z
  AI.curveAhead = function (road, z, segs) {
    var i = road.segAt(z).index, sum = 0, n;
    var L = road.segments.length;
    for (n = 0; n < segs; n++) sum += road.segments[Math.min(i + n, L - 1)].curve;
    return sum / segs;
  };

  // worst curve within braking range, weighted by proximity
  AI.cornerFactor = function (road, z, skill) {
    var i = road.segAt(z).index, worst = 0, n;
    var L = road.segments.length;
    for (n = 0; n < 80; n++) {
      var s = road.segments[Math.min(i + n, L - 1)];
      var w = Math.abs(s.curve) * (1 - n / 150);
      if (w > worst) worst = w;
    }
    return 1 - Math.min(0.66, worst * 0.125 * (1.42 - skill));
  };

  // racing line: cut toward the inside of what's coming
  AI.lineX = function (road, z) {
    var c = AI.curveAhead(road, z + 900, 26);
    if (Math.abs(c) < 0.5) return U.clamp(c * 0.06, -0.12, 0.12);
    return U.clamp(-U.sign(c) * Math.min(0.6, Math.abs(c) * 0.14), -0.6, 0.6);
  };

  // shared traffic avoidance: hold a free lane, brake by physics, commit to the pass
  AI.trafficAvoid = function (car, want, dt) {
    var game = TR.Main && TR.Main.game;
    if (!game || !game.traffic || game.state === 'summary') return want;
    var list = game.traffic;
    var i, t, dz;

    // committed pass: hold the chosen lane flat out until it's clear behind us
    if (car.queueT > 1.5 && car.avoidX !== undefined) {
      var still = false;
      for (i = 0; i < list.length; i++) {
        t = list[i];
        dz = t.z - car.z;
        if (dz > -1600 && dz < 6500 && Math.abs(t.x - car.avoidX) < 0.52) { still = true; break; }
      }
      want.tx = car.avoidX;
      want.throttle = true; want.brake = false;
      // stall bailout: only when making no progress for 1.1 s
      car.stallT = (car.stallT || 0) + dt;
      if (car.stallT > 1.1) {
        if (Math.abs(car.z - (car.commitZ0 || car.z)) < 350) {
          car.queueT = 0; car.avoidT = 0; car.stallT = 0;
          want.throttle = false;
          return want;
        }
        car.commitZ0 = car.z; car.stallT = 0;
      }
      if (!still) { car.queueT = 0; car.avoidT = 0; car.stallT = 0; }
      return want;
    }

    // detect the most urgent obstacle overlapping our position or our line
    var obs = null, odz = 12000;
    for (i = 0; i < list.length; i++) {
      t = list[i];
      dz = t.z - car.z;
      if (dz < 60 || dz > odz) continue;
      if (Math.abs(t.x - car.x) < 0.58 || Math.abs(t.x - want.tx) < 0.52) { obs = t; odz = dz; }
    }
    if (!obs) { car.avoidT = 0; car.queueT = 0; return want; }

    // knowing about an obstacle starts the commit clock — even from far away
    car.queueT = (car.queueT || 0) + dt;

    // pick a lane: score both sides by clearance, walls and blocked lanes
    if (!car.avoidT || car.avoidT <= 0) {
      var sg = TR.Main.game.track.segAt(obs.z);
      function score(ax) {
        var s = Math.abs(ax - obs.x);
        if ((ax > 0.62 && sg.wallR) || (ax < -0.62 && sg.wallL)) s -= 0.6;
        if (TR.Traffic.laneBlocked(list, car.z, ax, car)) s -= 0.45;
        return s;
      }
      var axR = U.clamp(obs.x + 0.7, -0.72, 0.72);
      var axL = U.clamp(obs.x - 0.7, -0.72, 0.72);
      car.avoidX = score(axR) >= score(axL) ? axR : axL;
      car.avoidT = 1.8;
    }
    car.avoidT -= dt;

    var tdz = obs.z - car.z;
    var vGap = car.speed - obs.speed;

    // urgent traffic overrides the rival-separation lane; distant traffic does not
    if (odz < 7000 || car.queueT > 0.5 || !want.bySep) want.tx = car.avoidX;

    // brake by physics: start when the gap is shorter than the braking distance
    var brakeDist = vGap > 0 ? (car.speed * car.speed - obs.speed * obs.speed) / (2 * TR.BRAKE * car.brakeM) : 0;

    if (vGap > 300 && tdz < brakeDist * 1.25 + 500 && car.queueT < 1.5) {
          want.throttle = false;
          want.brake = true;
        } else if (tdz < 4600 && vGap > 600 && car.queueT < 1.5) {
          want.throttle = false;
        } else if (tdz < 1500 && car.queueT < 1.5) {
      // settled in behind: keep air, wait for the commit
      var gapNeed = (car.len + obs.len) * 0.5 + 700;
      if (tdz < gapNeed) {
        want.throttle = false;
        want.brake = car.speed > obs.speed * 0.92;
      } else {
        want.throttle = car.speed < obs.speed * 0.98;
      }
    }
    return want;
  };

  // bilateral separation: never converge with the other race car when overlapping
  AI.separate = function (car, other, want) {
    if (!other) return want;
    var dz = other.z - car.z;
    if (Math.abs(dz) > 2700) return want;
    var dx = other.x - car.x;
    if (Math.abs(dx) > 0.68) return want;
    var side = U.sign(car.x - other.x) || (car.z > other.z ? 1 : -1);
    want.tx = U.clamp(other.x + side * 0.72, -0.85, 0.85);
    want.bySep = true;
    return want;
  };

  // ---------- the rival ----------
  // duel: {rival:{name,car,top,skill}, mistake, block}; fx: {bump(i,side)}
  AI.rivalStep = function (car, player, road, duel, dt, time, fx) {
    var skill = duel.rival.skill;
    var sp = car.speed / TR.MAXSPEED;

    // slipstream works for the rival too
    var dzp = player.z - car.z; // >0: player ahead
    car.draft = dzp > TR.CARL + 150 && dzp < TR.DRAFTD && Math.abs(player.x - car.x) < TR.DRAFTX;

    var cs = AI.cornerFactor(road, car.z + car.speed * 0.55, skill);
    var target = TR.MAXSPEED * duel.rival.top * Math.min(1.02, cs / Math.max(0.25, car.top));

    var throttle = car.speed < target;
    var brake = car.speed > target * 1.025;

    var tx = AI.lineX(road, car.z + car.speed * 0.2);

    // right behind the player: don't ram — match speed and pick the free side
    if (dzp > 200 && dzp < TR.CARL + 400) {
      tx = U.clamp(player.x + (player.x > 0 ? -0.55 : 0.55), -0.85, 0.85);
      throttle = car.speed < player.speed * 0.97;
      brake = car.speed > player.speed * 1.02;
    }

    // scripted early mistake in duel 1
    if (duel.mistake && !car.mistakeDone && car.z > road.finishZ * 0.42) {
      car.mistakeDone = true;
      car.mistakeT = 1.6;
      car.mistakeDir = car.x > 0 ? 1 : -1;
    }
    if (car.mistakeT > 0) {
      tx = U.clamp(tx + car.mistakeDir * 0.85, -0.95, 0.95);
      throttle = false; brake = false;
    }

    // defend: shade toward the chasing player late in the ladder
    if (dzp < -(TR.CARL + 150) && dzp > -5200 && duel.block > 0) {
      var closeness = 1 - Math.abs(dzp) / 5200;
      tx = U.lerp(tx, U.clamp(player.x, -0.8, 0.8), duel.block * closeness * 0.85);
    }
    // overtake: if closing on the player from behind, go around
    if (dzp > TR.CARL + 200 && dzp < 5200) {
      tx = U.clamp(player.x + (player.x > 0 ? -0.62 : 0.62), -0.85, 0.85);
      throttle = car.speed < target * 1.01;
    }

    // skill wobble
    tx += Math.sin(time * 0.9 + 3.1) * 0.05 * (1 - skill);

    var comp = U.clamp(AI.curveAhead(road, car.z + 500, 14) * 0.155 * (1 / car.grip), -0.85, 0.85);
    var act = { tx: tx, throttle: throttle, brake: brake };
    act = AI.separate(car, player, act);
    act = AI.trafficAvoid(car, act, dt);
    var steer = U.clamp((act.tx - car.x) * 2.3 + comp, -1, 1);
    TR.Cars.step(car, { throttle: act.throttle, brake: act.brake, steer: steer }, road, dt);
  };

  // ---------- the attract/verify bot (player side) ----------
  AI.botStep = function (car, rival, road, dt, time) {
    var sp = car.speed / TR.MAXSPEED;
    var cs = AI.cornerFactor(road, car.z + car.speed * 0.5, 0.97);
    var target = TR.MAXSPEED * car.top * Math.min(1.03, cs / Math.max(0.25, car.top));

    var dz = rival.z - car.z; // >0: rival ahead
    var dx = rival.x - car.x;
    car.draft = dz > TR.CARL + 150 && dz < TR.DRAFTD && Math.abs(dx) < TR.DRAFTX;

    var throttle = car.speed < target;
    var brake = car.speed > target * 1.02;
    var tx = AI.lineX(road, car.z + car.speed * 0.18);

    // directly behind and blocked: don't ram — match speed, shade to the free side
    var directlyBehind = dz > 150 && dz < TR.CARL + 500 && Math.abs(dx) < 0.6;
    if (directlyBehind && !car.commitT) {
      car.matchT = (car.matchT || 0) + dt;
      if (car.matchT > 1.4) {
        var s1 = rival.x > 0 ? -1 : 1;
        var off1 = U.clamp(rival.x + s1 * 0.78, -0.85, 0.85);
        var game = TR.Main && TR.Main.game;
        var blocked = game && game.traffic && TR.Traffic.laneBlocked(game.traffic, car.z, off1, car);
        car.commitSide = blocked ? -s1 : s1;
        car.commitT = 6; car.matchT = 0;
      }
    }
    if (car.commitT > 0) {
      // committed to the pass: hold the offset flat out until it's done
      car.commitT -= dt;
      tx = U.clamp(rival.x + car.commitSide * 0.78, -0.85, 0.85);
      throttle = true; brake = false;
      if (dz < -800) car.commitT = 0;
    } else if (directlyBehind) {
      tx = U.clamp(rival.x + (rival.x > 0 ? -0.78 : 0.78), -0.85, 0.85);
      throttle = car.speed < rival.speed * 0.97;
      brake = car.speed > rival.speed * 1.03;
    } else {
      if (dz > TR.CARL + 150 && dz < TR.DRAFTD && Math.abs(dx) < TR.DRAFTX + 0.08) {
        // tuck in behind and let the draft build
        tx = U.lerp(tx, rival.x, 0.5);
        throttle = true; brake = false;
      } else if (dz > TR.CARL - 500 && dz < TR.DRAFTD * 1.4 && sp > 0.5) {
        // pull out: prefer the inside of the next bend
        var ahead = AI.curveAhead(road, rival.z + 900, 22);
        var inside = Math.abs(ahead) > 0.9 ? -U.sign(ahead) * 0.52 : (rival.x > 0 ? -0.5 : 0.5);
        tx = U.clamp(inside, -0.85, 0.85);
      }
    }

    // never sit side-by-side into a wall
    if (Math.abs(dz) < TR.CARL * 1.3) {
      var wall = road.segAt(car.z + 300);
      if (tx < -0.7 && wall.wallL) tx = -0.6;
      if (tx > 0.7 && wall.wallR) tx = 0.6;
    }

    var comp = U.clamp(AI.curveAhead(road, car.z + 500, 14) * 0.155 * (1 / car.grip), -0.9, 0.9);
    var act = { tx: tx, throttle: throttle, brake: brake };
    act = AI.separate(car, rival, act);
    act = AI.trafficAvoid(car, act, dt);
    var steer = U.clamp((act.tx - car.x) * 2.6 + comp, -1, 1);
    TR.Cars.step(car, { throttle: act.throttle, brake: act.brake, steer: steer }, road, dt);
  };
})(typeof window !== 'undefined' ? window : globalThis);