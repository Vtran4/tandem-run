// The tandem run — constants, cars, duel ladder
(function (g) {
  'use strict';
  var C = (g.TR = g.TR || {});

  // world / camera
  C.SEG = 250;            // segment length (world units)
  C.DRAW = 260;           // segments drawn ahead
  C.CAMD = 0.84;          // camera depth (1/tan(fov/2), ~100 deg)
  C.CAMH = 1080;          // camera height above road
  C.CAMBACK = 2050;       // camera distance behind player
  C.ROADW = 2050;         // default half road width (world units)

  // physics (per second)
  C.MAXSPEED = 9600;
  C.ACCEL = 3500;
  C.BRAKE = 10000;
  C.DECEL = 1500;         // engine braking / drag
  C.OFFLIMIT = 3300;      // top speed on grass
  C.OFFDECEL = 8200;
  C.CENTRI = 0.315;       // centrifugal pull factor
  C.STEER = 2.05;         // lateral speed (road-half widths per second at full speed)
  C.KMH = 34;             // display divisor

  // cars / contact
  C.CARL = 2250;          // contact length (world units) — nose to tail
  C.CARHW = 0.115;        // contact half width (fraction of half-road, per car)
  C.DRAFTD = 4300;        // draft zone depth (must sit behind the camera plane)
  C.DRAFTX = 0.37;        // draft lateral window
  C.DRAFTACC = 1.7;       // accel multiplier in draft
  C.DRAFTTOP = 1.06;      // top speed multiplier in draft

  // traffic: civilian sedans, vans and trucks sharing the road
  C.TRAFFIC = {
    N: 10,            // cars kept alive ahead of the player
    MINZ: 26000,      // first spawn distance ahead at duel start
    SPREAD: 540000,   // spawn band depth
    RESPAWN_BEHIND: 200 * 250, // fall this far behind -> respawn ahead
    AHEAD_CLEAR: 800, // don't spawn inside this radius of the player
    speeds: { sedan: [4200, 5300], van: [3400, 4300], truck: [2700, 3600] },
    lens: { sedan: 2150, van: 2450, truck: 3050 },
    widths: { sedan: 1080, van: 1200, truck: 1320 },
    colors: ['#c9c9c9', '#454b53', '#7a2e24', '#2e4156', '#efe9dc', '#383d44', '#8a6a3a']
  };

  // off-road: 5 s countdown, then the racer is reset onto the tarmac
  C.OFFROAD_LIMIT = 1.12;   // |x| beyond the rumble = off the main road
  C.OFFROAD_TIME = 5;
  C.OFFROAD_RESET_SPEED = 3600;

  // track
  C.FINISHPAD = 700;      // straight segments after the finish line
  C.FOGN = 12;            // fog color buckets

  // golden-hour palette
  C.HAZE = [243, 197, 142];
  C.PAL = {
    skyTop: '#2c3f5e', skyMid: '#8a6a72', skyLow: '#e8a763', skyHor: '#f6c98a',
    sun: '#fff3d0', sunGlow: '#ffcf8a',
    seaFar: '#3d5a78', seaNear: '#6d87a0', glitter: '#ffe9b8',
    hillFar: '#7c6a78', hillNear: '#5d4f5c',
    grassA: '#7f7449', grassB: '#786d45',
    roadA: '#5c5856', roadB: '#595553', roadLine: '#cfc3a4',
    rumbleA: '#a0522f', rumbleB: '#c8bfae',
    vergeA: '#635a3c', vergeB: '#5c5437',
    rail: '#9aa0a4', railDark: '#5d6266', post: '#ded8cc',
    rock: '#8a6a52', rockDark: '#5f4a3a',
    wallText: '#efe6d8',
    tunnel: '#241d1a', tunnelWall: '#33291f'
  };

  // cars: top/accel/grip/brake multipliers; paint[0] = default, paint[1] = rival alt
  C.CARS = {
    p911: {
      id: 'p911', name: 'Porsche 911 Carrera', tag: '911 CARRERA',
      top: 0.962, accel: 0.99, grip: 1.08, brake: 1.07, stats: [0.93, 0.96, 1.08, 1.07],
      paint: ['#aeb6bd', '#33506f'], hi: ['#eef2f5', '#7ea0c8'], dark: ['#4e565e', '#16283f']
    },
    gto: {
      id: 'gto', name: 'Ferrari 288 GTO', tag: '288 GTO',
      top: 0.985, accel: 1.02, grip: 1.0, brake: 0.99, stats: [0.96, 1.02, 1.0, 0.99],
      paint: ['#b31a1c', '#c2c6cc'], hi: ['#ff5a4a', '#f2f4f6'], dark: ['#4a0d0f', '#4d5158']
    },
    coun: {
      id: 'coun', name: 'Lamborghini Countach', tag: 'COUNTACH',
      top: 1.0, accel: 1.05, grip: 0.93, brake: 0.92, stats: [1.0, 1.05, 0.93, 0.92],
      paint: ['#ece6d5', '#c99a1c'], hi: ['#fff8e8', '#ffd968'], dark: ['#6b6455', '#5f470e']
    },
    f40: {
      id: 'f40', name: 'Ferrari F40', tag: 'F40',
      top: 1.018, accel: 1.06, grip: 0.97, brake: 0.95, stats: [1.02, 1.06, 0.97, 0.95],
      paint: ['#b31a1c', '#20506b'], hi: ['#ff5a4a', '#6fa0c0'], dark: ['#4a0d0f', '#102432']
    }
  };
  C.SELECT = ['p911', 'gto', 'coun'];

  // the ladder: one sprint each, rivals sharpen
  C.DUELS = [
    { name: 'the harbor road', rival: { name: 'Ellis', car: 'p911', top: 0.905, skill: 0.86 }, build: 'harbor', mistake: true, block: 0 },
    { name: 'the cuttings', rival: { name: 'Marco', car: 'gto', top: 0.945, skill: 0.91 }, build: 'cuttings', mistake: false, block: 0.15 },
    { name: 'the palm terraces', rival: { name: 'Sable', car: 'coun', top: 0.975, skill: 0.95 }, build: 'terraces', mistake: false, block: 0.3 },
    { name: 'the lighthouse run', rival: { name: 'Vera', car: 'f40', top: 1.004, skill: 0.985 }, build: 'lighthouse', mistake: false, block: 0.45 }
  ];
})(typeof window !== 'undefined' ? window : globalThis);