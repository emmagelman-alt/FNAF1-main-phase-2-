export const CAMERAS = [
  { id: '1A', name: 'Show Stage', key: '1', column: 2, row: 1 },
  { id: '1B', name: 'Dining Area', key: '2', column: 2, row: 2 },
  { id: '1C', name: 'Pirate Cove', key: '3', column: 1, row: 3 },
  { id: '2A', name: 'West Hall', key: '4', column: 1, row: 4 },
  { id: '2B', name: 'West Hall Corner', key: '5', column: 1, row: 5 },
  { id: '3', name: 'Supply Closet', key: '6', column: 2, row: 4 },
  { id: '4A', name: 'East Hall', key: '7', column: 3, row: 4 },
  { id: '4B', name: 'East Hall Corner', key: '8', column: 3, row: 5 },
  { id: '5', name: 'Backstage', key: '9', column: 1, row: 1 },
  { id: '6', name: 'Kitchen', key: '0', column: 3, row: 3, audioOnly: true },
  { id: '7', name: 'Restrooms', key: '-', column: 3, row: 2 },
];

// Seconds and percentage points per second; no timing depends on frame counts.
export const CONFIG = {
  nightDuration: 360,
  startingPower: 100,
  maxStep: 0.05,
  power: { base: 0.14, door: 0.22, light: 0.13, monitor: 0.10 },
  outageAttackDelay: 18,
  enemies: {
    bonnie: {
      enabled: true, name: 'Bonnie', side: 'left', color: '#b79ae8',
      route: ['1A', '1B', '2A', '2B', 'door'],
      startAt: 35, moveInterval: [16, 24], attackDelay: 7, blockDuration: 3,
      retreatIndex: 1,
    },
    chica: {
      enabled: true, name: 'Chica', side: 'right', color: '#e3c56e',
      route: ['1A', '1B', '7', '6', '4A', '4B', 'door'],
      startAt: 65, moveInterval: [18, 26], attackDelay: 7, blockDuration: 3,
      retreatIndex: 2,
    },
    freddy: {
      enabled: true, name: 'Freddy', side: 'right', color: '#d8a07b',
      route: ['1A', '1B', '7', '6', '4A', '4B', 'door'],
      startAt: 190, moveInterval: [22, 28], attackDelay: 5, blockDuration: 3,
      retreatIndex: 1,
    },
    foxy: {
      enabled: true, name: 'Foxy', side: 'left', color: '#e78674',
      route: ['1C', '2A', 'door'], startAt: 75,
      progressionPerSecond: 0.46, watchedRecoveryPerSecond: 2.5,
      thresholds: [25, 55, 85], sprintDelay: 5, attackDelay: 1,
      blockDuration: 0.5, knockPower: 3,
    },
  },
};

// Nights 2–5 scale Night 1's timing; routes, names, and device costs never change.
// Below 1: earlier starts, faster moves, shorter doorway/sprint warnings. Above 1: faster
// Foxy and more base power drain.
export const NIGHTS = [
  { start: 1, move: 1, warning: 1, foxy: 1, drain: 1 },
  { start: 0.85, move: 0.9, warning: 0.92, foxy: 1.15, drain: 1.05 },
  { start: 0.7, move: 0.8, warning: 0.85, foxy: 1.3, drain: 1.1 },
  { start: 0.55, move: 0.72, warning: 0.75, foxy: 1.45, drain: 1.15 },
  { start: 0.45, move: 0.65, warning: 0.66, foxy: 1.6, drain: 1.2 },
];

export function configForNight(night = 1) {
  const index = Math.min(Math.max(Math.trunc(night) || 1, 1), NIGHTS.length) - 1;
  const scale = NIGHTS[index];
  const config = structuredClone(CONFIG);
  config.power.base *= scale.drain;
  for (const rule of Object.values(config.enemies)) {
    rule.startAt *= scale.start;
    rule.attackDelay *= scale.warning;
    if (rule.moveInterval) rule.moveInterval = rule.moveInterval.map(seconds => seconds * scale.move);
    if (rule.sprintDelay) rule.sprintDelay *= scale.warning;
    if (rule.progressionPerSecond) rule.progressionPerSecond *= scale.foxy;
  }
  return config;
}
