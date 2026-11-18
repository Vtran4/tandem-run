# The tandem run

I will open your build on screen and show it to an audience for 20 to 60 seconds. Quality is the goal. Take the time that quality needs.

## Your build: The tandem run

The request: a behind-the-car road racer with door-to-door tandem duels — you against one rival at a time, in exotic cars, on a closed coastal highway at golden hour.

Direction. The reference: the segment-scaled pseudo-3D roads of the late-eighties arcade racers, redrawn with modern light — a road built from projected road segments on a 2D canvas, every car and prop drawn in code, lit like a photograph.

It is realistic on purpose, and it is committed: one light, one time of day, one medium — a coastal highway at golden hour. Before you write code, decide the rules of the medium: what each surface is made of, how it is worn, where the sun sits, how light sits on paint, asphalt, steel and stone, and how each thing moves. The finish must be extremely high: a frozen frame should pass for a photo of a real coastal road at golden hour, taken through the windshield of a chasing car. No cookie-cutter look: no pixel art, no flat two-tone cartoon road stripes, no neon synthwave grid, no purple-sunset clip art with palms, no glass UI, no grey-box environment, no unshaded sprites, no default canvas look.

The racing is closed-road and clean. The road is closed for the duel: no pedestrians, no traffic to dodge. No blood, no injury, no destruction: contact between the cars is metal scuffs and sparks, and every car finishes the duel, winner and loser. The rival is a driver with a name, a car and a line, never a target.

This is a tandem racing game, and it must feel like one. It must be fun for two minutes on camera: a clear goal inside 5 seconds (the hint line says who to beat and where the finish is), an attract mode that races until the first input, instant restart on one key, and strong feedback on every input: the engine rises through its gears (sound made in WebAudio), the car leans, squats and dips, the tires scrub and howl on hard cornering, the draft pulls you in close behind the rival, the gap counter ticks, a bump throws sparks. The design is your own: do not copy the rules, characters, tracks or look of a specific existing game, film or television show. Use invented names for drivers and places.

Controls: W or Up is the throttle, S or Down is the brake, A and D or Left and Right steer. The first key or click starts the duel from the attract mode; show that in the hint line. The page never scrolls; the arrow keys belong to the game. Steering is smooth, with a small ramp so the car does not twitch. The camera rides low behind the roof with a small lift as speed rises; the projection is fixed, and the horizon never shifts. The car never leaves the road, never sticks on a guardrail, a rock wall or a tunnel wall, and never snags on the rival: use simple, robust collision (the road as a width function of distance; the cars as circles or boxes against the edges and against each other). No forced camera shake.

Keep the HUD quiet: the title and one hint line at the top left. Bottom right, a small speed and gear read. Bottom left, the live gap to the rival in seconds, positive when you trail, negative when you lead. A thin progress strip along the bottom edge shows both cars on the road. A thin rear-view strip at the top centre shows the road behind — the rival filling it is the best pressure cue in the game. Nothing else floats on the road.

The game is a ladder of four point-to-point duels on one coastal highway, about 10 to 12 minutes for a full run, each duel 90 to 150 seconds. You pick one car before the first duel and keep it: a Porsche 911 Carrera, a Ferrari 288 GTO or a Lamborghini Countach, each with its own character — grip, top speed, braking, engine note. The rivals climb the ladder: Ellis in the Porsche 911 Carrera, Marco in the Ferrari 288 GTO, Sable in the Lamborghini Countach, and Vera in the Ferrari F40, each a little faster and smarter than the last; if your pick collides with a rival's car, recolor the rival. Lose a duel and one key restarts it at once, not the whole ladder. Winning costs nothing but time; the end card tracks first-try wins.

The rival races, it does not follow a rail: it takes the racing line, breathes the brakes where the road narrows, moves to break the draft on the straights, closes the door late in the last two duels, and makes one scripted mistake in the first duel so an honest player wins it. Contact resolves as a bump: sparks, a wobble, a little speed lost on both sides, never a stuck overlap and never a spin-lock. Passing must feel earned through the draft and later braking, not through rubber-band mercy.

Tune the first 30 seconds for the camera. I have never played it. The countdown is short, the rival starts beside me, the first road is wide and generous, the grip is forgiving, and the first throttle press already rises through two gears. The draft whoosh and the gap counter make the first pass feel earned. Then the road narrows and the rivals sharpen.

Playtest (required). A game that looks excellent and plays badly fails. Add `?auto=1`: a bot drives the player's car through all four duels with the same steering and throttle the game exposes to a human (it does not read the rival's state), and it reaches the lighthouse; it doubles as your attract mode. Add `?seed=<n>` for a repeatable run and `?state=<duel1..4, summary, end>` to start at any duel or card. Before you call a version done, play one full run with scripted input in the headless browser (held throttle, held steering through every bend, brakes into each tunnel) and read the screenshots: the attract mode, the countdown, each duel at its slowest and its fastest point, a pass and a bump, the summary card, the end card, and the game after a restart. Also drive the full width of the road in duel 2 — verge, guardrail scrape, rock wall, tunnel wall — to prove the car cannot leave the road or stick on anything, and bump the rival on every side to prove contact never locks.

Your medium: a two-lane coastal highway at golden hour, drawn on a 2D canvas. The sun hangs low ahead over the sea, which keeps to the right of the road; every surface is lit from ahead, so long shadows stretch back toward the camera and the far road glares. The asphalt is warm where the sun hits and blue-grey in the shade of the cuttings, polished darker along the racing line, speckled with aggregate, seamed with tar, patched in rectangles. The edge lines are worn paint, not bright white, and the reflector posts glint. The guardrails are galvanized bands with dents and stone chips on posts touched with rust. The rock cuts are warm stratified stone with dark seep stains. Palms lean over the wall, their fronds translucent where the sun is behind them; the grass is dry gold; the sea carries a slow swell and a glitter path under the sun. Heat haze eats contrast with distance: the haze is your depth cue.

The camera sits low behind the car: the roof and rear deck show at the bottom of the frame, with weight. The car leans into corners, squats under throttle, dips under brakes, and its long shadow reaches back toward the camera. The paint carries a clear-coat highlight that slides as the road bends; the chrome trim holds the sky gradient; the windows reflect the sky and the warm haze; the wheels blur at speed and the brake discs glow under hard braking in the last duels. Draw every car in code from its real silhouette — the 911's flyline, the 288 GTO's box flares, the Countach's wedge, the F40's wing — recognizable at a glance at 40 pixels and at 400, with no badge artwork and no photographed or ripped sprites.

The highway, of your design, for example: Duel 1, the harbor road — an open boulevard with gentle bends, harbor cranes on the left, a short first tunnel. Duel 2, the cuttings — the rock walls close in, two tunnels with a strobe of light at each exit. Duel 3, the palm terraces — slower hairpins above the sea, with the drop behind the wall. Duel 4, the lighthouse run — the fastest road, long straights with sea glitter, and the finish at the lighthouse. A summary card after each duel shows the time, the final gap and the top speed; at the lighthouse, an end card shows the total time, the duels won first-try and the best top speed.

Look: light is the hero. One low sun ahead, one long-shadow direction, one warm key over everything. The sky is a graded ramp with the sun disc and thin cloud bands catching pink; the sea glitters under the sun path; the far hills step back in haze. The road strips carry a precomputed shade ramp, not flat colors. Sprites for palms, posts, signs and rails scale with distance and darken into the haze. Grain, a gentle vignette, a little bloom on the sun path, the reflector posts and the wheel glints. Sound, all in WebAudio: the engine built from oscillators and filtered noise, pitched to RPM with audible gear steps and load; wind and road roar rising with speed; tire scrub on hard cornering; the draft whoosh tucked close behind the rival and the dip when you pull out; guardrail scrape; the rival's engine panned toward its side; the start beeps.

Rendering: keep it cheap and disciplined. Precompute every gradient, ramp and sprite once; allocate nothing in the frame loop. Sky, sea and hills are painted layers; the road is drawn as scaled segments from a camera-projected distance; everything on the road is a sprite scaled by the same projection. Darken the ambient ramp inside tunnels. Cap the device pixel ratio at 2 and drop the internal resolution before you drop frames. Keep 60 fps at 1920x1080. For this build: the low sun ahead is the key light, the haze is the depth, and the long shadows are the drama.

Profile the frame loop in the headless browser before you add detail. Test every change at a low internal resolution first; a new effect must earn its milliseconds. Check every screenshot after each round — a change can break the road.

Bar: a frozen frame passes for a photo of a real coastal highway at golden hour taken through the windshield, and winning the first duel by half a car length feels as good as it looks.

## Tools and files

- Work in the current folder. The entry file is `index.html`. Put your other files (modules, generated sprites) in a subfolder beside it.
- No libraries and no build step: ES modules, Canvas 2D and WebAudio only. No CDN. The only network request that the finished page may make is Google Fonts.
- Every asset is drawn or generated in code: no photographed sprites, no ripped game art, no logo or badge artwork.
- Check your work in a headless browser on the real GPU (for example Playwright with Chrome): load the page, send input steps (held keys, taps on the brake), take screenshots and measure the frame rate. Read every screenshot that you take.

## Hard rules

- The page looks alive at load with no input: the attract mode races from the first frame. It reacts to the first key or click inside one second.
- It fills the window. Target 60 fps at 1920x1080 on a recent laptop GPU. Cap the device pixel ratio at 2, and lower the internal resolution when a frame takes too long.
- A quiet title and one hint line at the top left. No other HUD clutter; the build is the picture.
- Sound: start muted. Show a clear "Enable sound" control and make no sound before a click on it. Make all sound in code (WebAudio). The build must look complete with the sound off.
- Make time controllable: `?t=<seconds>` freezes the duel at that time, and `?view=<name>` selects a camera (chase, side, on-road, attract) where that helps. Use them to look at exact moments.
- The car names are real (Porsche 911 Carrera, Ferrari 288 GTO, Lamborghini Countach, Ferrari F40); drivers, places and every other word are invented. Draw the cars in original code from their real silhouettes — no photographed or ripped sprites, no logo or badge artwork. This build is a personal project: it must not be published. Do not copy the rules, tracks, characters or look of a specific existing game; the segment-road technique and the genre are fine.
- Copy: real words for the subject, sentence case, no lorem ipsum, no emoji as icons. State only facts that you are sure of.

## Process

1. Build a complete v1. Check it in the headless browser. Fix every error.
2. Run at least 6 improvement rounds. In each round: take three or more screenshots of different moments, views and input states. Read them. Judge them as a harsh art director who compares the picture with the best work of this kind. Name the three weakest things. Fix them. Check again.
3. Measure the frame rate. Under 50 fps at 1920x1080: make it faster before you add anything.
4. Stop when one more round would not show on camera, or at 150 minutes from your start.
5. Final reply, five lines or fewer: what to do in the first five seconds, the best moment and how to reach it, what you used, any known flaw.