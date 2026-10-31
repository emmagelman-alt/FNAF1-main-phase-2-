# Prompt log: FNAF1 Phase 2

This log explains how the code got the way it is, so you don't have to work it out from the code. My prompts are quoted exactly as I typed them, typos included. The text under each prompt is a short note on what it changed. Those notes are not part of the prompts.

## AI model and tools

| What | Used for |
|---|---|
| **Claude Code** (desktop app, Code tab) | All of the planning, coding, testing and pushing below, in one session on Oct 30–31, 2026 |
| **Claude Opus 5.5** (`claude-opus-5-5`) | The model behind Claude Code. A second Claude agent, started by Claude Code, wrote the preservation review in prompt 8 |
| **Plain HTML, CSS and JavaScript modules** | The game itself, as received. No build step and no libraries were added |
| **Web Audio API** | All the new sounds, made in code. There are no audio files |
| **Node 24** | Ran the engine and save tests, and the simulations used to tune each night |
| **Python's `http.server`** | Served the game at http://localhost:8000 while testing |

How Claude tested its work: it ran the engine and save tests in Node, and it ran the repo's own regression page (`tests/browser-tests.html`) in Claude Code's built-in browser after every step. To tune difficulty, it wrote scripts (not in the repo) that played 1,000–2,000 simulated nights on the real `src/engine.js`, with scripted players who react at different speeds. No human has playtested the new timing or listened to the sound on real speakers yet.

## Where the design came from

Claude didn't pick the next step. It came from what the previous author left:
- **`IMPLEMENTATION_PLAN.md`**: its Phase 4 is "nights 1–5", saving after wins, and sound. It had already proposed `src/audio.js` and `src/save.js`.
- **`README.md`**: its "Next concrete task" said to tune Night 1, then add sound and a mute control, before adding Night 2.
- **`Game Spec.docx`**: the original game description.

The rule from my assignment was to keep at least 75% of the original work and build inside their design. Everything below adds to their code. The baseline to compare against is commit `01b6c10`, "Initial commit: unmodified code as received."

---

## 1. Getting started

**Me:**

> access the FNAF main phase 2 repo

Claude found the folder `FNAF1-main (phase 2)` in my Downloads and confirmed it is linked to this GitHub repo.

## 2. A question about power

**Me:**

> does holding the doors closed drain power?

Yes. Each closed door uses 0.22% power per second, on top of the 0.14% per second the office always uses (`power` in `src/config.js`). No code changed.

## 3. The assignment and a plan

**Me:**

> The assignment is to take this game repo and create the required next step. parameters are "You must keep at least 75% of the original work. You may reorganize, refactor, extend, and fix. You may not quietly discard the foundation and rebuild it in your own image. We compare your final submission against the initial commit of what you received.
> Note that we said work, not lines. Some refactoring is ok. Splitting a 400-line file into four sensible modules is fine for example. What you can't do is throw out their logic and write your own. If you restructure anything substantial, say so in your README and say why.
> The spirit of the rule: work inside the other person's design. If they used a class, keep using the class. If they named things a certain way, match it." read through ther ead me and help me outline a plan

Claude read the README, the implementation plan, the spec and the code, then wrote a plan. No code changed. It also listed the design rules to match:
- `engine.js` has no page code. It is plain functions (`createState`, `act`, `advance`, `finish`, `notify`), and each takes `config` as a parameter.
- All tuning numbers live in `config.js`.
- `render.js` only draws the state. `main.js` handles input, the animation loop and pausing.
- Tests use a hand-written `test(name, run)` and a browser page that drives the real game through `window.nightDebug`.

The plan:

| Step | What |
|---|---|
| 0 | Baseline: run the regression page before changing anything |
| 1 | Tune Night 1 |
| 2 | Sound and a mute control, in a new `src/audio.js` |
| 3 | Nights 1–5 |
| 4 | Saving, Continue and a star, in a new `src/save.js` |
| 5 | Tests and handoff notes |

## 4. Step 1: tune Night 1

**Me:**

> start with just step 1 for now

Only two numbers in `src/config.js` changed:
- **`freddy.startAt` 135 → 190 seconds.** Chica and Freddy were reaching the right door at the same time in about 30% of simulated nights, and every simulated loss came from that. Now 0%.
- **`foxy.watchedRecoveryPerSecond` 0.9 → 2.5.** Checking Pirate Cove (CAM 1C) barely slowed Foxy down. Now regular checks keep him behind the curtain, and an ignored Foxy behaves exactly as before.

The README's "Night 1 tuning" section has the full before/after numbers.

## 5. Step 2: sound and mute

**Me:**

> start step 2

This added `src/audio.js`. It's built like their `createRenderer`: `createAudio(config, options)` only reads the game state, compares it with the last state, and plays a sound for whatever changed. `engine.js` still has no browser code. The sounds:
- the office hum
- door and light sounds, played from their side
- camera static
- footsteps that get louder as an enemy gets closer
- kitchen clatter on CAM 6
- Foxy's running and banging
- the power-down
- the jumpscare
- the 6 AM chimes

**M** or the Mute button mutes on every screen. Sound only starts after a click, because browsers block it before that.

## 6. Step 3: Nights 2–5

**Me:**

> moe to step 3

Instead of copying every enemy setting five times, `NIGHTS` in `src/config.js` holds five multipliers per night: start time, move speed, warning time, Foxy's speed and power drain. `configForNight(n)` returns a scaled copy of `CONFIG`. Night 1's multipliers are all 1, so all the original tests still run against the same numbers. `engine.js` changed by one line: `createState` takes the night number instead of always using 1.

Winning now starts the next night, and losing retries the same night. In the simulations, a careful player wins every night, and a first-time player wins 3% of Night 5.

## 7. Step 4: saving, Continue and a star

**Me:**

> step 4 now

This added `src/save.js`. It saves the next unlocked night, the star and the mute setting in the browser's `localStorage`. Missing or broken save data starts fresh, and blocked storage (some private windows) just plays without saving. The title screen now has **New Game** and **Continue · Night N**, and beating Night 5 shows a star.

While testing, Claude found that the original live-loop test clicked New Game and would have overwritten a real save. All `?dev=1` pages now save under a separate key.

## Commits

After each of steps 1–4, and again after prompt 9, I sent:

> Commit the working tree changes with a sensible message.

| Commit | Message |
|---|---|
| `1ebe2d4` | Tune Night 1 right-door spacing and Pirate Cove watching |
| `c726e12` | Add synthesized sound cues and a mute control |
| `80f2e14` | Add Nights 2-5 with scaled difficulty |
| `1bd7ca5` | Save progress with New Game, Continue, and a Night 5 star |
| `e768d36` | Document the baseline and tighten preservation details |

## 8. A preservation review

**Me:**

> Spawn an agent that reviews the original code i inherited and the adjustments we made. have it return a preservation score 1-100. take this for consideration "On the 75% rule: discarding more than a quarter of the original work rather than building on it will result in a much lower grade. Refactoring that keeps the logic intact isn't discarding, so don't avoid cleaning something up out of fear of the diff. Just document the restructure."

A separate Claude agent compared `01b6c10` with our branch. It was given the code and the rule, but not Claude's own opinion of the work. It scored **95/100**: no original file was removed, renamed or split, about 3% of the original lines were edited in place, and all 38 original checks were kept. It flagged:
- a stale README line that said mute isn't remembered
- the README's inherited "32/32 checks" count, when the received code actually had 38
- one original test that now checks something different, because after a win the result button starts the next night instead of replaying
- the README never naming the baseline commit
- that a won Night 1–4 can't be replayed without New Game
- saving a win inside `paint()`, which in the original only draws

## 9. Applying the review's fixes

**Me:**

> Yes, apply them

Claude fixed the README (baseline commit named, counts corrected, the lost replay documented). It renamed the original test from "replay reset" to "next-night reset", made it check that Night 2 started, and added a reset check to the Night 5 replay. It also moved win saving out of `paint()` into a small `recordWin()` in `main.js`. The regression page still passed 46 of 47 checks. The one failure is an artwork check that also fails on the code as received, because one corner pixel of `freddy-camera.png` isn't fully transparent.

## 10. Getting it onto GitHub

These prompts were about finding the README and uploading, not code:

> where is the readme with our documented changes

> in this repo https://github.com/emmagelman-alt/FNAF1-main-phase-2-?

> Yes, push it

> Yes, merge it

> where is the read me

All the work was on a local `phase-2` branch. Pushing over HTTPS failed because there's no GitHub login saved on my computer, so Claude pushed over my SSH key instead. Then it merged `phase-2` into `main` alongside my `HANDOFF-REPORT.MD` and pushed `main`. The `phase-2` branch is still on GitHub too. The documented changes are in the README's **Phase 2 changes** section.

## 11. This log

**Me:**

> make a prompt log in the same style as the on e i asked for mosaic gane and upload to main for FNAF -main-phase-2

---

## Still to do

- **Step 5 of the plan, partly:** the boxes in `IMPLEMENTATION_PLAN.md` are still unchecked, even for the parts that work now.
- **A human playtest** of Nights 1–5, and listening to the sound on real speakers. All the tuning so far is from simulations.
- **Phase 5 of their plan:** Night 6 (add a sixth row to `NIGHTS`), a second star (raise `MAX_STARS` in `src/save.js`), then Custom Night.

## Quirks worth knowing

- Only the engine gets each night's config. The renderer and audio still use the base `CONFIG`, which works because every night has the same routes, names and length. If a night ever changes those, pass the night's config to them too.
- Test pages (`?dev=1`) save under `fnaf1-progress-dev`, and real play saves under `fnaf1-progress`. The regression page clears the dev save when it finishes.
- Keep the regression page's tab visible while it runs. Background tabs stop decoding images, and the page stalls. The live-loop check is timing-sensitive and sometimes fails on a first run.
- The browser caches the game's files. After editing a module, do a hard reload, or you may test old code.
- The simulation scripts used for tuning aren't in the repo. The results are in the README.
