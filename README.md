# The tandem run

A behind-the-car pseudo-3D racer: door-to-door tandem duels against one rival at a time, in exotic cars, on a coastal highway at golden hour — with civilian traffic sharing the road. Vanilla JS + Canvas 2D + WebAudio. No build step, no libraries, no CDN (Google Fonts only, with fallbacks).

Run it: open `index.html` in a browser (double-click works; scripts are classic, no modules).

Personal project. Car names are real; every pixel is drawn in code — no logos, no badges, no ripped assets.

## How it plays

- Attract mode races until the first key. Any key -> car select (left/right, Enter).
- Four point-to-point duels, one sprint each, ~90-150 s:
  1. the harbor road — vs **Ellis** in the Porsche 911 Carrera (blue)
  2. the cuttings — vs **Marco** in the Ferrari 288 GTO (silver), two tunnels
  3. the palm terraces — vs **Sable** in the Lamborghini Countach (gold), hairpins and elevation
  4. the lighthouse run — vs **Vera** in the Ferrari F40 (slate blue), fastest, finish at the lighthouse
- You pick: Porsche 911 Carrera (silver, grip/brakes), Ferrari 288 GTO (red, balanced-fast), Lamborghini Countach (white, fastest, twitchiest).
- Win by draft: tuck in close behind the rival (tow builds), pull out on a straight, brake later into corners. Contact is bumps and sparks, never destruction. Lose a duel, R restarts it instantly. End card at the lighthouse: total time, first-try wins, best top speed.
- **Civilian traffic** shares the road: generic sedans, vans and box trucks at road speeds, with brake lights and mutual spacing. Both AIs read it and go around; you can too — or use a truck as a rolling draft wall.
- **Off the tarmac?** A 5-second countdown starts the moment both wheels are past the rumble strip. Get back on the road before zero or the racer is reset onto the asphalt at reduced speed.
- **Esc pauses** anywhere in a duel: resume, restart the duel, or exit to the title.
- **Turning shows the flank**: the cars render a 3/4 rear view while steering — steer left, see the left side.

## Controls

- W / Up — throttle
- S / Down — brake
- A D / Left Right — steer
- Esc — pause (resume / restart duel / exit to title)
- R — restart duel · M — sound toggle · Enter — menus

## URL parameters

- `?auto=1` — bot drives the player car through the whole ladder (also the attract-mode brain)
- `?seed=<n>` — repeatable scenery/AI noise
- `?state=duel1..4|summary|end` — start anywhere
- `?t=<seconds>` — simulate silently to that time, render one frozen frame, stop
- `?view=chase|side|onroad` — cameras
- `?tick=<n>` — run n sim steps per frame (fast-forward verification)
- `?nodraw`, `?nograin` — headless/perf switches

## Layout

- `index.html` — page, sound button, script order
- `src/config.js` — all tuning constants: physics, palette, cars, duel ladder
- `src/util.js`, `src/road.js` — math, segment road, projection, strips
- `src/cars.js` — physics + all four car rear views drawn in code (no sprites, no badges)
- `src/sprites.js` — precomputed scenery art, sky/sea/hills backdrop, patterns, grain
- `src/tracks.js` — the four roads + dressing
- `src/ai.js` — rival driver + bot (both drive through the same input interface)
- `src/audio.js` — engine (oscillators+filtered noise), wind, draft, scrub, scrape, bumps
- `src/scene.js` — render pipeline: backdrop, walls, sprites, cars, film passes, sparks
- `src/hud.js` — HUD, rear-view strip, select/summary/end cards
- `src/main.js` — states, input, loop, adaptive resolution

## Verified

- Full bot run: all 4 duels winnable, end card reached (duel 4 by 0.23 s)
- Render cost ~2.3 ms/frame at 1920x1080 (headless) — 60 fps with huge headroom; DPR capped at 2, adaptive internal resolution below that
- Zero console errors across attract, countdown, all four duels, cards, restarts, freeze and camera params

## Known gaps

- Sky dither is visible if you stare; car shapes are stylized silhouettes, not licensed likenesses
- Audio must be enabled per session (hard rule: muted until clicked)