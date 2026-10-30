# FNAF1 — first playable

A local browser survival game: last from midnight to 6 AM using cameras, independent doors and door lights, and limited power. **Night 1 is playable with Bonnie, Chica, Freddy, and Foxy.** Plain HTML, CSS, and JavaScript; no install, build, account, or external service required.

## Launch

Open this repository folder in VS Code, then run this in its terminal:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [http://localhost:8000](http://localhost:8000) in a current Chrome, Firefox, Edge, or Safari browser, and click **Start Night 1**. Keep the terminal running; press Ctrl+C there to stop the server. If port 8000 is occupied, use 8001 in both the command and URL. VS Code Live Server also works when serving the repository root. Opening `index.html` directly as a `file://` URL does not support the JavaScript modules reliably.

The game fits its complete scene into a responsive 16:9 area. A wide window or landscape phone gives the controls more room. Gameplay is entirely local and makes no external network requests. Nothing has been pushed to GitHub by this implementation.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Left / right door | Click the corresponding door button to toggle | A / D |
| Left / right doorway light | Click Light to toggle | Hold Q / E; release to turn off |
| Raise / lower camera monitor | Click the monitor button | Space or S |
| Select camera | Click the camera map button | See mapping below |
| Pause / resume | Click Pause / Resume | P |
| Return to title | Click Menu | Esc |
| Retry / replay Night 1 | Click the result-screen button | Tab to the button, then Enter |
| Mute / unmute sound | Click Mute below the game | M (works on every screen) |

Camera keys: **1 → 1A**, **2 → 1B**, **3 → 1C**, **4 → 2A**, **5 → 2B**, **6 → 3**, **7 → 4A**, **8 → 4B**, **9 → 5**, **0 → 6**, **− → 7**. Camera selection works while the monitor is open. Door and light controls remain available while viewing cameras. Held keyboard lights release on keyup, window blur, pause, or tab hiding. Click-toggled lights remain on until toggled off or power fails.

Sound starts when you click **Start Night 1**, because browsers block audio until the player interacts with the page. It goes silent while paused, while the tab is hidden, and on the title screen.

## How Night 1 works

- A normal night lasts **360 real seconds**. Each minute advances the clock one hour, from 12 AM through 6 AM. The smaller HUD timer shows real shift progress.
- Bonnie follows Stage → Dining → West Hall → West Hall Corner → left doorway. Chica and Freddy take the right-side route through Restrooms, Kitchen, East Hall, and East Hall Corner. Freddy starts later and gives a shorter doorway warning.
- A camera nameplate indicates an actual enemy position. Decorative heads in supplied room images are scenery. Doorway movement indicators remain visible even before checking a light; lights reveal the threat's identity.
- Close the **left** door for Bonnie or Foxy and the **right** door for Chica or Freddy. Hold it closed until the threat retreats (normally three seconds; Foxy half a second). A retreat notice tells you whether another enemy still occupies that doorway. The wrong door and the camera monitor provide no protection.
- Foxy progresses from closed curtains to peeking, emerged, and empty at Pirate Cove. Watching **CAM 1C** reduces his activity; a few seconds of watching rolls him back a stage. If ignored, he appears in West Hall with a persistent five-second sprint warning; close the left door. A blocked sprint costs an extra three power points.
- Base drain is **0.14 power points/second**. Each closed door adds **0.22**, each light **0.13**, and the monitor **0.10**. All add together. Keeping both doors shut throughout the night will exhaust power.
- Zero power opens both doors and disables lights and cameras. Other enemy attacks stop and an **18-second outage attack** begins. You can still win if dawn arrives first. Reaching 6 AM wins a simultaneous tie with a new attack.
- Loss, win, retry, and menu transitions resolve once. Each retry starts with full power, midnight, open doors, lights and monitor off, fresh enemy timers, and no old outcome. There are no per-enemy browser timers to leak between runs.
- Listen as well as look. Footsteps get louder and pan toward a side as an enemy approaches it. Kitchen clatter means someone is in CAM 6 (louder while you view that feed). Running feet mean Foxy is sprinting, and banging on the west door means you blocked him. The jumpscare sound ends a lost night; six chimes mark 6 AM.
- Switching away from the browser tab or window pauses time, power drain, and enemies. Returning resumes automatically with a new timing baseline. P provides a separate manual pause that stays paused across tab changes.

These are readable, configurable approximations of FNAF 1 mechanics, not a reproduction of its exact AI. The mask, music box, and hallway flashlight from the mixed original spec are intentionally excluded from this version.

## Development shortcuts and verification

Open [http://localhost:8000/?dev=1](http://localhost:8000/?dev=1). The development panel appears below the game:

- **Shift+F** or **Speed** cycles **1× → 4× → 12×**. At 12×, a complete night takes 30 seconds; enemy reaction windows and power drain accelerate too. Speed survives retry; refresh for 1×.
- **+10 seconds** simulates ten seconds, including enemy attacks and power use.
- **Bonnie at left door** places Bonnie at the doorway for defense testing.
- **Drain power** starts an actual outage; it does not instantly lose.
- **5 seconds to dawn** moves the clock near 6 AM. Combine with Drain power to verify winning during an outage.
- Append **&noart=1** to the development URL to force every artwork fallback without changing any image files.
- `nightDebug.sound()` reports whether sound is unlocked, running, or muted, plus the most recent cue names. The regression page's `manual=1` mode records cues without playing them, so running the tests is silent.

The normal URL does not expose development controls or `window.nightDebug`. The regression iframe additionally uses `?dev=1&manual=1` to disable automatic advancement and drive exact elapsed-time steps. Do not use `manual=1` for normal play.

Run the repeatable checks by opening [http://localhost:8000/tests/browser-tests.html](http://localhost:8000/tests/browser-tests.html). This uses the real game in an iframe and the same simulation modules, with no testing dependency. It checks camera buttons/shortcuts and image decoding, independent controls, enemy defenses, outage and 6 AM timing, outcome stability, resets, manual pause, and 390px/1280px layout. Keep the regression tab visible while it runs. See [tests/engine-tests.js](tests/engine-tests.js) and [tests/browser-tests.js](tests/browser-tests.js).

Verified locally in Chrome on **2026-10-28: 32/32 checks passed**, including the live animation loop, visibility/focus pause, all-artwork fallbacks, overlapping doorway threats, and Foxy's full-frame sprint artwork. All 33 files in the current asset manifest matched their recorded checksums. The title and office were also inspected visually in the browser. Run the regression page above to repeat the checks.

Re-run in Chrome on **2026-10-30 after the Phase 2 tuning and sound work: 38/39 browser checks and 16/16 engine checks passed.** The regression page now has 39 checks, including a new sound check. The one failure also occurs on the unmodified code: the artwork check expects fully transparent sprite corners, and one corner pixel of `assets/images/animatronics/freddy-camera.png` has alpha 1/255. Gameplay is unaffected and the artwork was not changed. The live-loop check is timing-sensitive and occasionally fails on a first run; it passes on a rerun with the tab visible.

## Code and artwork integration

| File | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Screens, separate HUD, controls, shared office coordinates, responsive layout |
| `src/main.js` | Inputs, screen lifecycle, one animation loop, tab pause, development controls |
| `src/engine.js` | State creation, elapsed-time simulation, devices, enemies, outcomes; no DOM |
| `src/config.js` | All night/power/AI tuning, enemy routes, and camera definitions |
| `src/render.js` | Asset loading and state-to-DOM rendering; no simulation changes |
| `src/audio.js` | Synthesized sound cues derived from state changes; no simulation changes (added in Phase 2) |
| `src/asset-paths.js` | **All gameplay image paths**, including planned artwork filenames |

The code uses the exact supplied camera paths from [the manifest](assets/asset-manifest.json) and the planned destinations in [ASSETS.md](ASSETS.md). The original office and title screenshots with baked-in UI are retained but unused. Add artwork at its configured path and refresh; no code edit is required. Missing images show labeled temporary backgrounds or threat indicators and do not block gameplay. The loader warns once per missing optional path; the browser may also log its expected 404. A failed image is retried on the next page load.

Every office layer covers the same normalized 16:9 canvas, fitted without stretching. The current office variants are opaque full-scene images: **CSS clips left variants to the left 25% and right variants to the right 25%** before compositing, so one side cannot cover the other. Future transparent full-canvas overlays use the same alignment. Fallback doors and lights use percentages of that canvas. No images, asset inventory, or manifest were edited by the gameplay implementation; artwork supplied by the parallel image task is loaded as it becomes available.

## Phase 2 changes

This phase continues the original design rather than replacing it. Everything listed here is a change to the work received in the initial commit.

### Night 1 tuning (`src/config.js` only)

The previous handoff asked for the six-minute night to be tuned, "especially overlapping right-door threats and Foxy's warning window." Two values changed. No engine, rendering, input, or test code changed.

| Setting | Before | After | Why |
| --- | --- | --- | --- |
| `freddy.startAt` | 135 s | 190 s | Chica's second visit and Freddy's first both reached the right door around 4:20 AM. In roughly 30% of nights both stood there at once, and every simulated loss came from that overlap. Freddy now leaves the stage around 3 AM and reaches the doorway around 5:10 AM. Right-door visits are spaced at least about 35 seconds apart. He is still the late threat with the shorter doorway warning. |
| `foxy.watchedRecoveryPerSecond` | 0.9 | 2.5 | Watching CAM 1C barely mattered. A 2-second check every 25 seconds still let Foxy sprint in every simulated night. Now regular checks (about every 25 seconds) keep the curtain closed all night, and occasional checks (about every 45 seconds) delay the sprint to about 5:35 AM. If ignored, he still sprints at about 4:20 AM. His progression speed is unchanged, so an ignored Foxy behaves exactly as before. |

Kept as is:
- **Foxy's warning window** (a 5-second sprint plus a 1-second doorway delay). No simulated player lost to Foxy, even with 4.5-second reactions. The sprint warning appears in the status line below the scene, though, and that line is easy to miss while viewing cameras. So the generous window stays for Night 1.
- **Power rates.** Careful play ends Night 1 with roughly 25–40% power.

An ignored Foxy can still sprint while Chica is at the right door, which forces a two-door defense (about 7% of nights for a player who never checks the Cove). Watching the Cove prevents this.

**How this was checked.** 2,000 simulated nights per player model ran on the real `src/engine.js`. The scripted players differed in reaction time, how often they checked Pirate Cove, and whether they reopened a door after the first retreat. A full night was then played in the browser through the `?dev=1` debug API to confirm the new timing. These checks are simulated and scripted; a human playtest of the new timing is still worthwhile.

| Measure (2,000 simulated nights each) | Before | After |
| --- | --- | --- |
| Chica and Freddy at the right door at the same time | 28–32% of nights | 0% |
| Foxy sprints despite a CAM 1C check about every 25 s | 100% of nights | 0% |
| Wins, first-time player model (slow reactions, reopens after the first retreat, never checks the Cove) | 98.5% | 100% |

Night 1 remains deliberately forgiving. Difficulty is meant to rise with Nights 2–5.

### Sound and mute (new `src/audio.js`)

The previous handoff asked for "original audio cues and a mute control." The implementation plan had already proposed a separate `src/audio.js`, and the sound follows the existing split between modules:

- **Same pattern as `render.js`.** `createAudio(config, options)` mirrors `createRenderer(...)`. It only reads game state. Each time `main.js` paints, it compares the new state with the previous one and plays cues for what changed. `engine.js` is untouched and still has no browser code.
- **Every sound is synthesized** with the Web Audio API: noise bursts and oscillators, with no audio files. That keeps the "no external requests" promise and needs no licenses. The sounds are original approximations of the FNAF atmosphere, not recordings from the game.
- **Cues:**
  - office hum (stops during an outage)
  - door thunks and light clicks, panned to their side, plus a buzz while a light is on
  - monitor and camera-switch static
  - footsteps that grow louder and pan as enemies approach
  - kitchen clatter while CAM 6 is occupied
  - Pirate Cove curtain rustle
  - Foxy's running feet and door banging
  - power-down
  - jumpscare
  - six 6 AM chimes
- **Lifecycle.** Sound unlocks only from Start or Retry. It suspends while paused, while the tab is hidden, and at the menu. Starting a new run or returning to the menu cuts off any leftover jumpscare or chime.
- **Mute.** M or the Mute button below the game works on every screen, including the title.

Small hooks were added to the original files:
- `main.js`: create and unlock the audio, call it from `paint()`, handle the M key and Mute button, and add `nightDebug.sound()`.
- `render.js`: the Mute/Unmute label.
- `index.html`: the button and the shift-briefing text, which used to say the game is silent.

The regression page gained one check covering the sound lifecycle and cues. Loudness was also measured in Chrome by routing the game's output into an analyser instead of the speakers. Doors, Foxy's banging, and nearby footsteps all stand out above the office hum, and the jumpscare is the loudest cue. Listening on real speakers is still worthwhile; volume balance is a judgment call.

## Known limitations and next task

- Only Night 1 exists. No Continue, saving, other nights, unlocks, stars, Custom Night, or Golden Freddy.
- Sound is synthesized and approximate. There is no phone call, voice, outage music box, or volume slider, and mute is not remembered after a refresh. CAM 6 is explicitly AUDIO ONLY: kitchen clatter plays alongside the textual quiet/clatter cues, and no kitchen picture is shown.
- Fixed office view; no mouse panning or animated jumpscares. Supplied close-up artwork appears behind the loss screen when available.
- Camera character portraits are reusable position markers rather than perspective-matched room sprites. Missing art remains explicitly temporary. Doorway labels keep unfinished Freddy/Foxy office artwork testable.
- Small portrait screens fit the scene but have compact controls; landscape is recommended. Device/browser coverage beyond the verified local Chrome run remains future work.
- The original [Game Spec.docx](Game%20Spec.docx), [implementation plan](IMPLEMENTATION_PLAN.md), and artwork inventory describe broader future work. Their unchecked future features should not be read as implemented.

**Next concrete task:** Night 1 tuning and sound are done (see Phase 2 changes). Next, configure Nights 2–5 with faster movement and shorter reaction windows, keeping Night 1's values unchanged. Then add saving and Continue (Phase 4 of the implementation plan).
