// The tandem run — utilities (no DOM deps)
(function (g) {
  'use strict';
  var U = g.TRU = g.TRU || {};

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.smooth = function (t) { return t * t * (3 - 2 * t); };
  U.easeInOut = function (a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) * 0.5) + 0.5); };
  U.easeIn = function (a, b, t) { return a + (b - a) * t * t; };
  U.easeOut = function (a, b, t) { return a + (b - a) * (1 - (1 - t) * (1 - t)); };
  U.sign = function (v) { return v < 0 ? -1 : 1; };

  U.mulberry32 = function (seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // hex "#rrggbb" -> [r,g,b] (cached)
  var hexCache = {};
  U.rgb = function (hex) {
    var c = hexCache[hex];
    if (c) return c;
    var n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache[hex] = c;
    return c;
  };

  // precompute fogged color strings: out[i] = mix(hex, hazeRGB, i/(N-1))
  U.fogTable = function (hex, hazeRGB, N) {
    var base = U.rgb(hex), out = new Array(N);
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var r = Math.round(base[0] + (hazeRGB[0] - base[0]) * t);
      var gg = Math.round(base[1] + (hazeRGB[1] - base[1]) * t);
      var b = Math.round(base[2] + (hazeRGB[2] - base[2]) * t);
      out[i] = 'rgb(' + r + ',' + gg + ',' + b + ')';
    }
    return out;
  };

  // rgba string helper (no allocation-free, but used sparingly)
  U.rgba = function (hex, a) {
    var c = U.rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };

  U.fmtTime = function (t) {
    if (t == null || !isFinite(t)) return '--:--.--';
    var m = Math.floor(t / 60), s = Math.floor(t % 60), h = Math.floor((t * 100) % 100);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + (h < 10 ? '0' : '') + h;
  };
})(typeof window !== 'undefined' ? window : globalThis);