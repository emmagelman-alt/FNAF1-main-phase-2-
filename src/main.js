import { CONFIG, CAMERAS, NIGHTS, configForNight } from './config.js';
import { createState, advance, act, startOutage, notify } from './engine.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';

const params = new URLSearchParams(location.search);
const dev = params.get('dev') === '1';
// Deterministic manual mode is reserved for the local browser regression page.
const manual = dev && params.get('manual') === '1';
let state = createState();
// The current night's timing. Nights share routes, names, and duration, so the
// renderer and audio keep using the base CONFIG.
let config = CONFIG;
let speed = 1;
let frameId = null;
let lastTime = null;
let lastRender = 0;
let windowBlurred = false;
const heldLights = new Set();
const render = createRenderer(() => paint(), CONFIG, { forcePlaceholders: dev && params.get('noart') === '1' });
// The regression page records sound cues without playing them.
const sound = createAudio(CONFIG, { silent: manual });
function paint() { render(state, { dev, speed, muted: sound.muted }); sound.update(state); }

function stopLoop() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  lastTime = null;
}
function tick() {
  frameId = null;
  if (state.mode !== 'playing' || state.paused || state.hidden) return;
  // Read the current monotonic clock here. A browser may deliver a queued frame's
  // timestamp after resuming; it must not replace the fresh visibility baseline.
  const now = performance.now();
  if (lastTime !== null) advance(state, (now - lastTime) / 1000 * speed, config);
  lastTime = now;
  if (now - lastRender >= 70 || state.mode !== 'playing') { paint(); lastRender = now; }
  if (state.mode === 'playing') frameId = requestAnimationFrame(tick);
  else { stopLoop(); document.getElementById('result-title').focus(); }
}
function runLoop() {
  if (!manual && frameId === null && state.mode === 'playing' && !state.paused && !state.hidden) {
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  }
}
function releaseLights() {
  for (const side of heldLights) state.lights[side] = false;
  heldLights.clear();
}
function startNight(night = 1) {
  sound.unlock(); stopLoop(); heldLights.clear();
  config = configForNight(night);
  state = createState(config, 'playing', night);
  state.hidden = document.hidden || windowBlurred;
  // Accelerated time is a session setting and deliberately survives retries.
  paint(); runLoop();
  document.getElementById('monitor-toggle').focus({ preventScroll: true });
}
function menu() {
  stopLoop(); heldLights.clear(); state = createState(); paint();
  document.getElementById('start').focus({ preventScroll: true });
}
function pause(toggle = true) {
  if (state.mode !== 'playing') return;
  state.paused = toggle ? !state.paused : false;
  releaseLights(); stopLoop(); paint(); runLoop();
}
function action(value) { act(state, value); paint(); }
function cycleSpeed() { speed = speed === 1 ? 4 : speed === 4 ? 12 : 1; lastTime = performance.now(); paint(); }
function toggleMute() { sound.toggleMute(); paint(); }

document.getElementById('start').addEventListener('click', () => startNight(1));
// After a win the result button starts the next night; after a loss it retries the same one.
document.getElementById('retry').addEventListener('click', () =>
  startNight(state.mode === 'won' ? Math.min(state.night + 1, NIGHTS.length) : state.night));
for (const id of ['result-menu', 'menu-button']) document.getElementById(id).addEventListener('click', menu);
document.getElementById('pause-button').addEventListener('click', () => pause());
document.getElementById('resume').addEventListener('click', () => pause(false));
document.getElementById('mute-button').addEventListener('click', toggleMute);
document.getElementById('monitor-toggle').addEventListener('click', () => action({ type: 'monitor' }));
for (const side of ['left', 'right']) {
  document.getElementById(`${side}-door`).addEventListener('click', () => action({ type: 'door', side }));
  document.getElementById(`${side}-light`).addEventListener('click', () => action({ type: 'light', side }));
}
document.getElementById('map-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-camera]');
  if (button) action({ type: 'camera', id: button.dataset.camera });
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (dev && event.shiftKey && key === 'f' && !event.repeat) { event.preventDefault(); cycleSpeed(); return; }
  // Mute works on every screen, including the title.
  if (key === 'm' && !event.repeat) { toggleMute(); return; }
  if (state.mode !== 'playing') return;
  if ([' ', 's', 'a', 'd', 'q', 'e', 'p', 'escape', ...CAMERAS.map(c => c.key)].includes(key)) event.preventDefault();
  if (event.repeat) return;
  if (key === 'escape') return menu();
  if (key === 'p') return pause();
  if (key === ' ' || key === 's') action({ type: 'monitor' });
  if (key === 'a' || key === 'd') action({ type: 'door', side: key === 'a' ? 'left' : 'right' });
  if (key === 'q' || key === 'e') {
    const side = key === 'q' ? 'left' : 'right';
    if (act(state, { type: 'light', side, on: true })) heldLights.add(side);
    paint();
  }
  const camera = CAMERAS.find(c => c.key === key);
  if (camera) action({ type: 'camera', id: camera.id });
});
document.addEventListener('keyup', event => {
  const side = event.key.toLowerCase() === 'q' ? 'left' : event.key.toLowerCase() === 'e' ? 'right' : null;
  if (side && heldLights.has(side)) { heldLights.delete(side); state.lights[side] = false; paint(); }
});
window.addEventListener('blur', () => {
  windowBlurred = true;
  state.hidden = true;
  releaseLights(); stopLoop(); paint();
});
window.addEventListener('focus', () => {
  windowBlurred = false;
  state.hidden = document.hidden;
  stopLoop(); paint(); runLoop();
});
document.addEventListener('visibilitychange', () => {
  state.hidden = document.hidden || windowBlurred;
  releaseLights(); stopLoop(); paint(); runLoop();
});
window.addEventListener('pagehide', stopLoop);
window.addEventListener('pageshow', () => { state.hidden = document.hidden || windowBlurred; runLoop(); });

if (dev) {
  const debug = {
    snapshot: () => structuredClone(state),
    sound: () => sound.status(),
    night: number => startNight(number),
    advance: seconds => { advance(state, seconds, config); paint(); if (state.mode !== 'playing') stopLoop(); lastTime = performance.now(); },
    power: amount => { if (state.mode !== 'playing') return; state.power = Math.max(0, Math.min(100, amount)); if (state.power === 0) startOutage(state, config); paint(); },
    nearDawn: () => { if (state.mode !== 'playing') return; state.elapsed = config.nightDuration - 5; notify(state, 'Development shortcut: five seconds until dawn.'); paint(); },
    threat: (id = 'bonnie', room = 'door') => {
      const enemy = state.enemies[id];
      if (state.mode !== 'playing' || state.outage || !enemy) return;
      const position = config.enemies[id].route.indexOf(room);
      if (position < 0) return;
      enemy.position = position;
      enemy.attackIn = room === 'door' ? config.enemies[id].attackDelay : null;
      enemy.blockedFor = 0;
      if (id === 'foxy') {
        enemy.sprintIn = room === '2A' ? config.enemies.foxy.sprintDelay : null;
        enemy.coveStage = room === '1C' ? 0 : 3;
      }
      notify(state, `Development shortcut: ${config.enemies[id].name} at ${room === 'door' ? `the ${config.enemies[id].side} door` : `CAM ${room}`}.`, 'danger'); paint();
    },
    cove: stage => {
      if (state.mode !== 'playing' || state.outage || !state.enemies.foxy || !Number.isInteger(stage) || stage < 0 || stage > 3) return;
      const foxy = state.enemies.foxy;
      foxy.coveStage = stage;
      foxy.activity = stage === 0 ? 0 : config.enemies.foxy.thresholds[stage - 1];
      foxy.position = stage === 3 ? 1 : 0;
      foxy.sprintIn = stage === 3 ? config.enemies.foxy.sprintDelay : null;
      foxy.attackIn = null;
      foxy.blockedFor = 0;
      paint();
    },
  };
  Object.defineProperty(window, 'nightDebug', { value: Object.freeze(debug) });
  document.getElementById('dev-speed').addEventListener('click', cycleSpeed);
  document.getElementById('dev-advance').addEventListener('click', () => debug.advance(10));
  document.getElementById('dev-threat').addEventListener('click', () => debug.threat());
  document.getElementById('dev-outage').addEventListener('click', () => debug.power(0));
  document.getElementById('dev-dawn').addEventListener('click', debug.nearDawn);
  document.getElementById('dev-night').addEventListener('click', () => startNight(state.night % NIGHTS.length + 1));
}
paint();
