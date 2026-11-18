// The tandem run — WebAudio: engine, wind, draft, scrub, scrape, bumps, beeps
(function (g) {
  'use strict';
  var TR = g.TR, U = g.TRU;
  var A = TR.Audio = TR.Audio || {};

  A.started = false;
  A.enabled = false;
  A.ctx = null;

  A.enable = function () {
    if (A.enabled) return;
    try {
      var AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      var ctx = A.ctx = new AC();
      A.master = ctx.createGain();
      A.master.gain.value = 0;
      A.master.connect(ctx.destination);

      // shared loop noise buffer
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;

      // ---- player engine: saw + sub square + texture noise
      A.eng1 = ctx.createOscillator(); A.eng1.type = 'sawtooth';
      A.eng2 = ctx.createOscillator(); A.eng2.type = 'square';
      A.engGain = ctx.createGain(); A.engGain.gain.value = 0;
      A.engFilter = ctx.createBiquadFilter(); A.engFilter.type = 'lowpass'; A.engFilter.Q.value = 1.4;
      var eng2Gain = ctx.createGain(); eng2Gain.gain.value = 0.5;
      A.eng1.connect(A.engFilter);
      A.eng2.connect(eng2Gain); eng2Gain.connect(A.engFilter);
      A.engFilter.connect(A.engGain); A.engGain.connect(A.master);
      A.eng1.start(); A.eng2.start();

      // ---- rival engine
      A.riv1 = ctx.createOscillator(); A.riv1.type = 'sawtooth';
      A.rivGain = ctx.createGain(); A.rivGain.gain.value = 0;
      A.rivFilter = ctx.createBiquadFilter(); A.rivFilter.type = 'lowpass'; A.rivFilter.frequency.value = 750;
      A.rivPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      A.riv1.connect(A.rivFilter);
      if (A.rivPan) { A.rivFilter.connect(A.rivPan); A.rivPan.connect(A.rivGain); }
      else A.rivFilter.connect(A.rivGain);
      A.rivGain.connect(A.master);
      A.riv1.start();

      // ---- wind / scrub / draft / scrape (shared noise through filters)
      function noiseChain(type, freq, q, gainV) {
        var src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        var gn = ctx.createGain(); gn.gain.value = gainV;
        src.connect(f); f.connect(gn); gn.connect(A.master);
        src.start();
        return { f: f, g: gn };
      }
      A.wind = noiseChain('lowpass', 400, 0.7, 0);
      A.scrub = noiseChain('bandpass', 880, 1.1, 0);
      A.draft = noiseChain('bandpass', 520, 0.9, 0);
      A.scrape = noiseChain('highpass', 2600, 0.8, 0);

      A.started = true;
      A.enabled = true;
      A.master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.25);
    } catch (e) { /* audio must never break the game */ }
  };

  A.disable = function () {
    if (!A.enabled) return;
    A.enabled = false;
    try { A.master.gain.setTargetAtTime(0, A.ctx.currentTime, 0.08); } catch (e) {}
  };

  // live mix state from the game
  // s: {sp, rpm, gear, throttle, draft, scrub, scrape, off, rivalGap, rivalX, rivalSp, rivalRpm}
  A.shiftT = 0; A.lastGear = 0;
  A.update = function (dt, s) {
    if (!A.started || !A.enabled) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var rpm = U.clamp(s.rpm, 0, 1);
    var freq = 46 + rpm * 118 + s.gear * 2.5;

    if (s.gear !== A.lastGear) {
      A.shiftT = 0.1;
      A.lastGear = s.gear;
      A.blip(freq);
    }
    var shiftDip = A.shiftT > 0 ? (A.shiftT -= dt, 0.45) : 1;

    var load = s.throttle ? 1 : 0.35;
    A.eng1.frequency.setTargetAtTime(freq, t, 0.03);
    A.eng2.frequency.setTargetAtTime(freq * 0.5, t, 0.03);
    A.engFilter.frequency.setTargetAtTime(240 + rpm * 1500 * load, t, 0.05);
    A.engGain.gain.setTargetAtTime((0.13 + (s.throttle ? 0.13 : 0) + s.sp * 0.07) * shiftDip, t, 0.05);

    // rival
    if (s.rivalGap != null) {
      var rf = 44 + U.clamp(s.rivalRpm, 0, 1) * 112 + s.rivalSp * 0.0004 * 40;
      A.riv1.frequency.setTargetAtTime(rf, t, 0.05);
      var rv = U.clamp(1 - s.rivalGap / 7000, 0, 1);
      A.rivGain.gain.setTargetAtTime(rv * rv * 0.16, t, 0.08);
      if (A.rivPan) A.rivPan.pan.setTargetAtTime(U.clamp(s.rivalX * 1.6, -1, 1), t, 0.1);
    }

    A.wind.f.frequency.setTargetAtTime(300 + s.sp * 1300, t, 0.1);
    A.wind.g.gain.setTargetAtTime(s.sp * s.sp * 0.34, t, 0.1);
    A.scrub.g.gain.setTargetAtTime(s.scrub * 0.22 + (s.off ? 0.16 : 0), t, 0.05);
    A.scrub.f.frequency.setTargetAtTime(s.off ? 240 : 880, t, 0.05);
    A.draft.g.gain.setTargetAtTime(s.draft * 0.2, t, 0.08);
    A.scrape.g.gain.setTargetAtTime(s.scrape ? 0.2 : 0, t, 0.03);
  };

  // one-shot noise burst + low thud
  A.bump = function (intensity) {
    if (!A.started || !A.enabled) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = A.noise; src.playbackRate.value = 0.4;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(0.55 * intensity, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(f); f.connect(gn); gn.connect(A.master);
    src.start(t); src.stop(t + 0.25);
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 64;
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.5 * intensity, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(og); og.connect(A.master);
    o.start(t); o.stop(t + 0.32);
  };

  A.blip = function (baseFreq) {
    if (!A.started || !A.enabled) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 920;
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(0.07, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(gn); gn.connect(A.master);
    o.start(t); o.stop(t + 0.1);
  };

  A.beep = function (hi) {
    if (!A.started || !A.enabled) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hi ? 990 : 660;
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(0.16, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + (hi ? 0.5 : 0.18));
    o.connect(gn); gn.connect(A.master);
    o.start(t); o.stop(t + (hi ? 0.55 : 0.2));
  };

  A.finishChord = function () {
    if (!A.started || !A.enabled) return;
    A.beep(true);
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1320;
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(0.12, t + 0.12);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(gn); gn.connect(A.master);
    o.start(t + 0.12); o.stop(t + 0.85);
  };
})(typeof window !== 'undefined' ? window : globalThis);