// The tandem run — boot, states, loop
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var SEG = TR.SEG;

  // ---------- params ----------
  var qs = {};
  (function () {
    var s = g.location.search.slice(1).split('&');
    for (var i = 0; i < s.length; i++) {
      var kv = s[i].split('=');
      if (kv[0]) qs[kv[0]] = kv.length > 1 ? kv[1] : true;
    }
  })();

  g.__errors = [];
  g.addEventListener('error', function (e) { g.__errors.push(String(e.message || e)); });

  var M = TR.Main = TR.Main || {};
  var AI = TR.AI;
  var game = M.game = {
    state: 'attract', stateT: 0, duelIdx: 0, selIdx: 1,
    track: null, roadW: TR.ROADW, duel: null,
    player: null, rival: null, cars: [], traffic: [],
    cam: { x: 0, y: TR.CAMH, z: 0 }, camYS: TR.CAMH,
    skyShift: 0, time: 0, frame: 0, raceT: 0, topSpeed: 0, attempts: 0,
    results: [], sparks: [], trackCache: [],
    view: qs.view || 'chase', bot: !!qs.auto, frozen: false,
    paused: false, offT: 0, resetFlash: 0,
    params: qs, countBeep: 0,
    fx: {
      bump: function (i, side) {
        var now = game.time;
        if (now - (game._lastBumpT || -9) < 0.14) return;
        game._lastBumpT = now;
        TR.Audio.bump(i);
        var px = (game.player._sx || 960 + side * 40), rx = (game.rival._sx || px);
        TR.Scene.spawnSparks(game, (px + rx) / 2, (game.player._sy || 900), 6 + i * 6 | 0, side);
      }
    }
  };
  M.selModel = 'gto';

  var keys = {};
  M.keys = keys; // exposed for tests
  var STEP = 1 / 60;

  // ---------- boot ----------
  M.init = function () {
    var seed = parseInt(qs.seed, 10) || 11;
    game.seed = seed;
    TR.Sprites.build(U.mulberry32(seed * 31 + 7));
    TR.Scene.init(document.getElementById('cv'));
    g.addEventListener('resize', function () { TR.Scene.rs = M.rs; TR.Scene.resize(); });
    loadDuel(0, true);
    game.state = 'attract';
    game.results = [];
    if (qs.state !== undefined && qs.state !== 'attract') {
      var st = String(qs.state);
      if (st.slice(0, 4) === 'duel') {
        var di = U.clamp(parseInt(st.slice(4), 10) - 1 || 0, 0, 3);
        if (game.bot) game.selIdx = 1;
        game.duelIdx = di;
        loadDuel(di, true);
      } else if (st === 'summary') {
        loadDuel(0, true); game.state = 'summary';
        game.results[0] = { time: 96.4, gap: 1.8, win: true, top: 8900, firstTry: true };
      } else if (st === 'end') {
        game.state = 'end';
        game.results = [
          { time: 92, gap: 2.1, win: true, top: 8600, firstTry: true },
          { time: 98, gap: 1.4, win: true, top: 9000, firstTry: true },
          { time: 106, gap: 0.9, win: true, top: 9200, firstTry: true },
          { time: 112, gap: 0.5, win: true, top: 9450, firstTry: true }
        ];
        game.track = track(3); game.duel = TR.DUELS[3];
      }
    }
    M.rs = 1;
    M.last = g.performance.now();
    M.acc = 0;
    M.fpsN = 0; M.fpsT = 0; M.fps = 60; M.slowN = 0;
    M.schedule();
    g.__sim = { state: game.state, duel: 0, done: [], allDone: false };
  };

  // rAF throttles in hidden/headless tabs — fall back to a timer there
  M.schedule = function () {
    if (!g.requestAnimationFrame || M.useTimer || g.document.hidden) g.setTimeout(M.loop, 15);
    else g.requestAnimationFrame(M.loop);
  };

  // manual advance for headless verification
  M.pump = function (n) {
    n = n || 1;
    for (var i = 0; i < n; i++) sim(STEP);
    mix();
  };
  // programmatic key for tests
  M.pressKey = function (c) { onKey(c); };

  function track(i) {
    if (!game.trackCache[i]) game.trackCache[i] = TR.buildTrack(i, game.seed);
    return game.trackCache[i];
  }

  function loadDuel(i, keepResults) {
    game.duelIdx = i;
    game.duel = TR.DUELS[i];
    game.track = track(i);
    game.roadW = game.track.roadW;
    game.player = TR.Cars.make(M.selModel, 0, true);
    TR.Cars.applyModel(game.player, TR);
    game.rival = TR.Cars.make(game.duel.rival.car, game.player.model === game.duel.rival.car ? 0 : 1, false);
    TR.Cars.applyModel(game.rival, TR);
    game.rival.top = game.duel.rival.top;
    game.cars = [game.player, game.rival];
    game.traffic = TR.Traffic.build(game.seed + i * 17);
    for (var ti = 0; ti < game.traffic.length; ti++) game.cars.push(game.traffic[ti]);
    stage();
    game.raceT = 0; game.topSpeed = 0; game.stateT = 0; game.countBeep = 0; game.offT = 0; game.resetFlash = 0;
    if (!keepResults) game.attempts = (game.attempts || 0) + 1;
    game.state = 'count';
    g.__sim = { state: game.state, duel: i, done: game.results.map(function (r) { return r && r.win; }), allDone: false, offT: game.offT, paused: game.paused };
  }

  function stage() {
    game.player.z = 9 * SEG; game.player.x = -0.35; game.player.speed = 0;
    game.rival.z = 9 * SEG + 1400; game.rival.x = 0.35; game.rival.speed = 0;
    game.player.mistakeDone = false; game.rival.mistakeDone = false;
    game.player.finished = false; game.rival.finished = false;
    game.player.crossT = 0; game.rival.crossT = 0;
    game.cam.z = game.player.z - TR.CAMBACK;
    game.cam.x = game.player.x;
    game.camYS = yAt(game.player.z) + TR.CAMH;
    game.cam.y = game.camYS;
  }

  function yAt(z) {
    return game.track.segAt(z).p1.y;
  }

  // ---------- input ----------
  g.addEventListener('keydown', function (e) {
    var c = e.code;
    if (c === 'ArrowUp' || c === 'ArrowDown' || c === 'ArrowLeft' || c === 'ArrowRight' || c === 'Space') e.preventDefault();
    if (!keys[c]) onKey(c);
    keys[c] = true;
  });
  g.addEventListener('keyup', function (e) { keys[e.code] = false; });

  function playerInput() {
    return {
      throttle: !!(keys.KeyW || keys.ArrowUp),
      brake: !!(keys.KeyS || keys.ArrowDown),
      steer: U.clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), -1, 1)
    };
  }

  function onKey(c) {
    if (c === 'KeyM') {
      if (TR.Audio.enabled) TR.Audio.disable(); else TR.Audio.enable();
      return;
    }
    if (game.frozen) return;
    // pause menu
    if (c === 'Escape' && (game.state === 'race' || game.state === 'count')) {
      game.paused = !game.paused;
      return;
    }
    if (game.paused) {
      if (c === 'Escape') { game.paused = false; }
      else if (c === 'KeyR') { game.paused = false; game.attempts++; loadDuel(game.duelIdx, true); }
      else if (c === 'KeyQ') { game.paused = false; exitToTitle(); }
      return;
    }
    if (game.state === 'attract') {
      if (!game.bot) { game.state = 'select'; game.stateT = 0; }
      return;
    }
    if (game.state === 'select') {
      if (c === 'ArrowLeft') game.selIdx = (game.selIdx + 2) % 3;
      else if (c === 'ArrowRight') game.selIdx = (game.selIdx + 1) % 3;
      else if (c === 'Enter' || c === 'Space') {
        M.selModel = TR.SELECT[game.selIdx];
        game.results = []; game.attempts = 0;
        loadDuel(0, true);
      }
      return;
    }
    if (game.state === 'race' && c === 'KeyR') { game.attempts++; loadDuel(game.duelIdx, true); return; }
    if (game.state === 'summary') {
      if (c === 'KeyR' || (c === 'Enter' && !(game.results[game.duelIdx] && game.results[game.duelIdx].win))) {
        game.attempts++;
        loadDuel(game.duelIdx, true);
      } else if (c === 'Enter') {
        if (game.duelIdx >= 3) { game.state = 'end'; game.stateT = 0; }
        else { game.attempts = 0; loadDuel(game.duelIdx + 1, true); }
      }
      return;
    }
    if (game.state === 'end' && (c === 'Enter' || c === 'KeyR')) {
      game.results = []; game.attempts = 0;
      game.state = 'select'; game.stateT = 0;
      return;
    }
  }

  function exitToTitle() {
    game.state = 'attract';
    game.stateT = 0;
    game.attractStaged = false;
    game.offT = 0; game.resetFlash = 0;
    g.__sim = { state: 'attract', duel: game.duelIdx, done: game.results.map(function (r) { return r && r.win; }), allDone: false };
  }

  // ---------- simulation ----------
  function sim(dt) {
    game.time += dt;
    game.stateT += dt;
    var st = game.state;

    if (st === 'attract') {
      attractSim(dt);
    } else if (st === 'count') {
      // engines idle; beeps
      var marks = [0.2, 1.2, 2.2];
      while (game.countBeep < 3 && game.stateT >= marks[game.countBeep]) { TR.Audio.beep(false); game.countBeep++; }
      if (game.stateT >= 3.2) { TR.Audio.beep(true); game.state = 'race'; game.stateT = 0; }
      camFollow(dt, true);
    } else if (st === 'race') {
      raceSim(dt);
    }
    // summary/end: world rests

    if (game.resetFlash > 0) game.resetFlash -= dt;
    updateSparks(dt);
  }

  function attractSim(dt) {
    // stage the duel mid-road so the attract loop shows real racing: draft, pull-out, pass
    if (!game.attractStaged || game.player.z >= game.track.finishZ * 0.985) {
      var zs = Math.max(40 * SEG, game.track.finishZ * 0.22);
      game.rival.z = zs;
      game.player.z = zs - 3300;
      game.rival.x = U.clamp(AI.lineX(game.track, zs), -0.5, 0.5);
      game.player.x = game.rival.x > 0 ? game.rival.x - 0.5 : game.rival.x + 0.5;
      game.rival.speed = TR.MAXSPEED * 0.895;
      game.player.speed = game.rival.speed;
      game.rival.finished = false; game.player.finished = false;
      game.attractStaged = true;
    }
    TR.Traffic.update(game.traffic, game.track, dt, game.player.z, game.seed);
    AI.botStep(game.player, game.rival, game.track, dt, game.time);
    AI.rivalStep(game.rival, game.player, game.track, game.duel, dt, game.time, game.fx);
    trafficContacts();
    TR.Cars.contact(game.player, game.rival, game.fx);
    camFollow(dt, false);
  }

  function raceSim(dt) {
    game.raceT += dt;
    var p = game.player, r = game.rival;

    TR.Traffic.update(game.traffic, game.track, dt, p.z, game.seed);

    if (game.bot) {
      AI.botStep(p, r, game.track, dt, game.time);
      p.leanS += (0 - p.leanS) * Math.min(1, dt * 4);
    } else {
      var inp = playerInput();
      if (p.finished) inp = { throttle: false, brake: p.speed > 1500, steer: 0 };
      TR.Cars.step(p, inp, game.track, dt);
      p.leanS += (inp.steer - p.leanS) * Math.min(1, dt * 7);
      p.lastThrottle = inp.throttle;
    }
    if (!r.finished) AI.rivalStep(r, p, game.track, game.duel, dt, game.time, game.fx);

    // player draft (visual/mix + physics already inside Cars.step via p.draft)
    if (!game.bot) {
      var dzr = r.z - p.z;
      p.draft = dzr > 500 && dzr < TR.DRAFTD && Math.abs(r.x - p.x) < TR.DRAFTX;
    }
    TR.Cars.contact(p, r, game.fx);
    trafficContacts();
    game.topSpeed = Math.max(game.topSpeed, p.speed);

    // off-road: 5 s to get back on the tarmac, then the racer is reset
    if (!p.finished) {
      if (Math.abs(p.x) > TR.OFFROAD_LIMIT) {
        game.offT += dt;
        if (game.offT >= TR.OFFROAD_TIME) {
          p.x = 0;
          p.speed = Math.min(p.speed, TR.OFFROAD_RESET_SPEED);
          p.wobbleT = 0.6;
          game.offT = 0;
          game.resetFlash = 1.4;
          TR.Audio.bump(0.55);
          TR.Scene.spawnSparks(game, p._sx || g.innerWidth / 2, (p._sy || g.innerHeight * 0.8) + 40, 12, 0);
        }
      } else if (Math.abs(p.x) < 1.06) {
        game.offT = 0;
      }
    }

    // scrape sparks
    if (p.scrape && p.speed > 2500) {
      TR.Scene.spawnSparks(game, (p._sx || g.innerWidth / 2) + p.scrape * (p._sw || 400) * 0.5, p._sy || g.innerHeight * 0.9, 2, p.scrape);
    }

    // finish lines
    if (!p.finished && p.z >= game.track.finishZ) { p.finished = true; p.crossT = game.raceT; }
    if (!r.finished && r.z >= game.track.finishZ) { r.finished = true; r.crossT = game.raceT; }

    if (p.finished) {
      p.finishWait = (p.finishWait || 0) + dt;
      if (p.finishWait > 1.5) {
        var gapT = r.finished ? r.crossT - p.crossT
          : (game.track.finishZ - r.z) / Math.max(2000, r.speed);
        var win = gapT > 0;
        game.results[game.duelIdx] = {
          time: p.crossT, gap: gapT, win: win,
          top: game.topSpeed, firstTry: (game.attempts || 0) === 0
        };
        TR.Audio.finishChord();
        game.state = 'summary'; game.stateT = 0;
        g.__sim.state = 'summary';
      }
    } else if (r.finished && r.crossT < game.raceT - 4) {
      // rival is long gone; end the duel as a loss
      game.results[game.duelIdx] = {
        time: game.raceT, gap: -(game.raceT - r.crossT), win: false,
        top: game.topSpeed, firstTry: (game.attempts || 0) === 0
      };
      game.state = 'summary'; game.stateT = 0;
      g.__sim.state = 'summary';
    }
    camFollow(dt, false);
  }

  function trafficContacts() {
    var p = game.player, r = game.rival, list = game.traffic;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!p.finished) TR.Cars.contact(p, t, game.fx);
      if (!r.finished) TR.Cars.contact(r, t, game.fx);
    }
  }

  function camFollow(dt, idle) {
    var p = game.player;
    game.cam.z = Math.max(0, p.z - TR.CAMBACK);
    var camH = TR.CAMH - 170 * (p.speed / TR.MAXSPEED); // lower with speed: cheap velocity cue
    var ty = yAt(Math.max(0, p.z)) + (game.view === 'onroad' ? 560 : camH);
    game.camYS += (ty - game.camYS) * Math.min(1, dt * 5);
    game.cam.y = game.camYS;
    var tx = game.view === 'side' ? p.x + 2.6 : p.x;
    game.cam.x += (tx - game.cam.x) * Math.min(1, dt * (game.view === 'side' ? 4 : 9));
    game.skyShift += game.track.segAt(p.z).curve * (p.speed / TR.MAXSPEED) * dt * 0.55;
  }

  function updateSparks(dt) {
    var sp = game.sparks;
    for (var i = sp.length - 1; i >= 0; i--) {
      var s = sp[i];
      s.t += dt;
      if (s.t >= s.life) { sp.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vy += 900 * dt;
    }
  }

  // ---------- audio mix ----------
  function mix() {
    var p = game.player, r = game.rival;
    if (!p) return;
    var dz = Math.abs(r.z - p.z);
    var draftAmt = p.draft ? U.clamp(1 - dz / TR.DRAFTD, 0, 1) : 0;
    var scrub = Math.abs(p.leanS || 0) > 0.4 && p.speed > TR.MAXSPEED * 0.45 ? Math.abs(p.leanS) : 0;
    TR.Audio.update(STEP, {
      sp: p.speed / TR.MAXSPEED, rpm: p.rpm || 0, gear: p.gear || 0,
      throttle: game.state === 'race' ? (p.lastThrottle || game.bot) : false,
      draft: draftAmt, scrub: scrub, scrape: p.scrape !== 0,
      off: Math.abs(p.x) > 1.04,
      rivalGap: dz, rivalX: r.x - p.x, rivalSp: r.speed, rivalRpm: r.rpm || 0
    });
  }

  // ---------- loop ----------
  M.loop = function (now) {
    M.schedule();
    var rawDt = (now - M.last) / 1000;
    var dtReal = Math.min(0.1, rawDt);
    if (!isFinite(dtReal) || dtReal < 0) dtReal = 0.016;
    if (!M.useTimer && (rawDt > 0.35 || !isFinite(rawDt))) {
      M.slowFrames = (M.slowFrames || 0) + 1;
      if (M.slowFrames >= 3) M.useTimer = true;
    } else if (!M.useTimer) M.slowFrames = 0;
    M.last = now;

    // fps + adaptive resolution
    M.fpsN++; M.fpsT += dtReal;
    if (M.fpsT >= 1) {
      M.fps = M.fpsN / M.fpsT;
      g.__fps = Math.round(M.fps);
      M.fpsN = 0; M.fpsT = 0;
      if (M.fps < 50 && TR.Scene.rs > 0.6) { TR.Scene.rs = Math.max(0.6, TR.Scene.rs - 0.12); TR.Scene.resize(); }
      else if (M.fps > 57 && TR.Scene.rs < 1) { TR.Scene.rs = Math.min(1, TR.Scene.rs + 0.08); TR.Scene.resize(); }
    }

    if (game.frozen) return;

    if (game.paused) {
      // freeze the world, keep drawing (the pause menu is HUD)
      if (!qs.nodraw) {
        TR.Scene.render(game);
        TR.HUD.draw(TR.Scene.ctx, game);
      }
      return;
    }

    if (qs.t !== undefined) {
      // deterministic freeze: simulate silently to t, render once, stop
      var tTarget = parseFloat(qs.t) || 0;
      var n = Math.ceil(tTarget / STEP);
      for (var i = 0; i < n; i++) sim(STEP);
      if (!qs.nodraw) TR.Scene.render(game);
      game.frozen = true;
      return;
    }

    var tick = parseInt(qs.tick, 10) || 0;
    if (tick > 0) {
      for (var k = 0; k < tick; k++) sim(STEP);
    } else {
      M.acc += dtReal;
      var guard = 0;
      while (M.acc >= STEP && guard < 4) { sim(STEP); M.acc -= STEP; guard++; }
      if (guard >= 4) M.acc = 0;
    }
    mix();

    if (!qs.nodraw) {
      TR.Scene.render(game);
      TR.HUD.draw(TR.Scene.ctx, game);
      // enable-sound hint fades once audio is on
      if (TR.Audio.enabled) {
        var b = document.getElementById('snd');
        if (b && b.style.display !== 'none') b.style.display = 'none';
      }
    }
    game.frame++;
  };

  // sound button
  g.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('snd');
    if (b) b.addEventListener('click', function () { TR.Audio.enable(); b.blur(); });
  });

  M.start = function () { M.init(); };
  M.start();
})(typeof window !== 'undefined' ? window : globalThis);