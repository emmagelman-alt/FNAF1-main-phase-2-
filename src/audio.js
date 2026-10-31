import { CONFIG } from './config.js';
import { roomOf } from './engine.js';

// Original sounds synthesized with the Web Audio API: no audio files, licenses, or network
// requests. Like render.js, this only reads state; cues come from changes between updates.
export function createAudio(config = CONFIG, { silent = false } = {}) {
  const Context = window.AudioContext || window.webkitAudioContext;
  let context = null, master = null, noise = null, hum = null;
  const buzz = {};
  const active = new Set();
  const recent = [];
  let unlocked = false, muted = false, running = false;
  let tracked = null, last = null, nextClatter = 0;

  function build() {
    context = new Context();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.connect(context.destination);
    master = context.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(limiter);
    noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    // Office hum: mains drone plus a filtered fan. Doorway lights add a panned buzz.
    hum = context.createGain(); hum.gain.value = 0; hum.connect(master);
    for (const [frequency, level] of [[55, 0.5], [110, 0.3]]) {
      const osc = context.createOscillator(); const gain = context.createGain();
      osc.frequency.value = frequency; gain.gain.value = level; osc.connect(gain).connect(hum); osc.start();
    }
    const fan = context.createBufferSource(); fan.buffer = noise; fan.loop = true;
    const fanFilter = context.createBiquadFilter(); fanFilter.type = 'bandpass'; fanFilter.frequency.value = 420; fanFilter.Q.value = 0.5;
    fan.connect(fanFilter).connect(hum); fan.start();
    for (const side of ['left', 'right']) {
      const osc = context.createOscillator(); const filter = context.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.value = 120; filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 1.2;
      buzz[side] = context.createGain(); buzz[side].gain.value = 0;
      osc.connect(filter).connect(buzz[side]).connect(output(pan(side))); osc.start();
    }
  }

  const pan = side => side === 'left' ? -0.75 : 0.75;
  function output(position) {
    if (!position || !context.createStereoPanner) return master;
    const panner = context.createStereoPanner(); panner.pan.value = position; panner.connect(master);
    return panner;
  }
  function envelope(start, duration, gain, attack) {
    const env = context.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    return env;
  }
  function track(node, stop) {
    active.add(node); node.onended = () => active.delete(node);
    node.stop(stop);
  }
  function burst({ at = 0, duration, gain, type = 'bandpass', frequency = 1000, q = 1, position = 0, attack = 0.005 }) {
    const start = context.currentTime + at;
    const source = context.createBufferSource(); source.buffer = noise;
    const filter = context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    source.connect(filter).connect(envelope(start, duration, gain, attack)).connect(output(position));
    source.start(start, Math.random() * Math.max(0, 1.9 - duration)); track(source, start + duration + 0.05);
  }
  function tone({ at = 0, duration, gain, type = 'sine', from, to = from, position = 0, attack = 0.005 }) {
    const start = context.currentTime + at;
    const osc = context.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    osc.connect(envelope(start, duration, gain, attack)).connect(output(position));
    osc.start(start); track(osc, start + duration + 0.05);
  }

  const CUES = {
    door: ({ position, closing }) => {
      burst({ duration: 0.32, gain: 0.55, type: 'lowpass', frequency: closing ? 650 : 900, position });
      tone({ duration: 0.28, gain: 0.35, type: 'triangle', from: closing ? 160 : 90, to: closing ? 60 : 170, position });
    },
    click: ({ position }) => tone({ duration: 0.03, gain: 0.18, type: 'square', from: 1800, to: 900, position }),
    monitor: ({ open }) => {
      burst({ duration: 0.28, gain: 0.16, frequency: 1700, q: 0.8 });
      tone({ duration: 0.25, gain: 0.07, type: 'sawtooth', from: open ? 240 : 720, to: open ? 720 : 240 });
    },
    static: () => burst({ duration: 0.16, gain: 0.2, type: 'highpass', frequency: 900 }),
    steps: ({ position, gain, count = 3, gap = 0.34 }) => {
      for (let i = 0; i < count; i++) {
        const level = gain * (0.8 + Math.random() * 0.3);
        // Small speakers drop most sound below ~150 Hz, so each step keeps some low-mid thud.
        burst({ at: i * gap, duration: 0.11, gain: level, type: 'lowpass', frequency: 480, position });
        tone({ at: i * gap, duration: 0.08, gain: level * 0.6, type: 'triangle', from: 150, to: 80, position });
      }
    },
    run: () => CUES.steps({ position: -0.8, gain: 0.6, count: 9, gap: 0.14 }),
    bang: () => {
      for (let i = 0; i < 3; i++) {
        burst({ at: i * 0.32, duration: 0.2, gain: 0.7, type: 'lowpass', frequency: 600, position: -0.75 });
        tone({ at: i * 0.32, duration: 0.18, gain: 0.45, type: 'triangle', from: 140, to: 70, position: -0.75 });
      }
    },
    clatter: ({ gain }) => {
      for (let i = 0, hits = 3 + Math.floor(Math.random() * 4); i < hits; i++) {
        const at = Math.random() * 0.6;
        tone({ at, duration: 0.06 + Math.random() * 0.1, gain, type: 'square', from: 1100 + Math.random() * 2600, position: 0.45 });
        burst({ at, duration: 0.07, gain: gain * 0.7, type: 'highpass', frequency: 3000, position: 0.45 });
      }
    },
    rustle: () => burst({ duration: 0.45, gain: 0.09, frequency: 700, q: 0.6, position: -0.5, attack: 0.12 }),
    powerDown: () => {
      tone({ duration: 1.8, gain: 0.3, type: 'sawtooth', from: 220, to: 28 });
      burst({ duration: 0.5, gain: 0.3, type: 'lowpass', frequency: 600 });
    },
    jumpscare: () => {
      for (const detune of [0, 7, -11]) tone({ duration: 1.3, gain: 0.28, type: 'sawtooth', from: 420 + detune * 10, to: 1500 + detune * 20, attack: 0.01 });
      burst({ duration: 1.3, gain: 0.5, type: 'highpass', frequency: 1200, attack: 0.01 });
    },
    // The clock strikes six.
    chime: () => {
      for (let i = 0; i < 6; i++) {
        for (const [ratio, gain, duration] of [[1, 0.22, 1.6], [2.76, 0.08, 1.1], [5.4, 0.05, 0.8]]) tone({ at: i * 0.75, duration, gain, from: 523 * ratio });
      }
    },
  };

  function play(name, options = {}) {
    recent.push(name);
    if (recent.length > 30) recent.shift();
    if (context && !muted) CUES[name](options);
  }
  function stopAll() {
    for (const node of active) { node.onended = null; node.stop(); }
    active.clear();
  }
  const level = (node, value) => { if (context) node.gain.setTargetAtTime(value, context.currentTime, 0.08); };

  const snapshot = state => ({
    mode: state.mode, paused: state.paused, hidden: state.hidden, outage: state.outage,
    monitor: state.monitor, camera: state.camera, doors: { ...state.doors }, lights: { ...state.lights },
    rooms: Object.fromEntries(Object.values(state.enemies).map(enemy => [enemy.id, roomOf(enemy, config)])),
    coveStage: state.enemies.foxy?.coveStage ?? 0,
  });

  function cues(before, now) {
    if (now.mode !== before.mode && now.mode === 'lost') return play('jumpscare');
    if (now.mode !== before.mode && now.mode === 'won') return play('chime');
    if (now.mode !== 'playing') return;
    if (now.outage && !before.outage) play('powerDown');
    for (const side of ['left', 'right']) {
      if (now.doors[side] !== before.doors[side]) play('door', { position: pan(side), closing: now.doors[side] });
      if (now.lights[side] !== before.lights[side] && !now.outage) play('click', { position: pan(side) });
    }
    if (now.monitor !== before.monitor && !now.outage) play('monitor', { open: now.monitor });
    else if (now.monitor && now.camera !== before.camera) play('static');
    for (const [id, room] of Object.entries(now.rooms)) {
      const was = before.rooms[id];
      if (room === was) continue;
      const rule = config.enemies[id];
      if (id === 'foxy') {
        // Foxy only returns to the Cove after a blocked sprint, even if updates skipped his doorway moment.
        if (room === '2A') play('run');
        else if (room === '1C') play('bang');
      } else if (room === 'door') play('steps', { position: pan(rule.side), gain: 0.8 });
      else if (was === 'door') play('steps', { position: pan(rule.side), gain: 0.35 });
      else {
        const near = rule.route.indexOf(room) / (rule.route.length - 1);
        play('steps', { position: pan(rule.side) * near, gain: 0.1 + 0.45 * near });
      }
    }
    if (now.coveStage > before.coveStage && now.rooms.foxy === '1C') play('rustle');
  }

  return {
    // Call from a user gesture (Start or Retry); browsers block audio before one.
    unlock() {
      unlocked = true;
      if (silent || !Context) return;
      if (!context) build();
      if (context.state === 'suspended') context.resume().catch(() => {});
    },
    update(state) {
      const now = snapshot(state);
      if (state !== tracked) {
        // A new run or the menu: cut anything left over from the previous night.
        tracked = state;
        if (context) stopAll();
      } else if (last) cues(last, now);
      last = now;
      const live = now.mode === 'playing' && !now.paused && !now.hidden;
      if (context) {
        level(hum, live && !now.outage ? 0.06 : 0);
        for (const side of ['left', 'right']) level(buzz[side], live && now.lights[side] ? 0.04 : 0);
      }
      const cooking = Object.values(now.rooms).includes('6');
      const time = context?.currentTime ?? performance.now() / 1000;
      if (live && !now.outage && cooking && time >= nextClatter) {
        play('clatter', { gain: now.monitor && now.camera === '6' ? 0.22 : 0.06 });
        nextClatter = time + 1.6 + Math.random() * 2.4;
      }
      // Paused, hidden, and menu screens are silent; results keep their final cue.
      const shouldRun = unlocked && !now.hidden && !now.paused && now.mode !== 'menu';
      if (shouldRun !== running && context) (shouldRun ? context.resume() : context.suspend()).catch(() => {});
      running = shouldRun;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, context.currentTime, 0.02);
    },
    get muted() { return muted; },
    status: () => ({ ready: unlocked, running, muted, recent: [...recent] }),
  };
}
