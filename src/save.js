import { NIGHTS } from './config.js';

// Development pages (including every regression-test frame) save under their own key,
// so testing never touches a player's real progress.
export const SAVE_KEYS = { play: 'fnaf1-progress', dev: 'fnaf1-progress-dev' };
// One star for beating the final night; Night 6 and Custom Night stars would raise this.
export const MAX_STARS = 1;
const fresh = () => ({ night: 1, stars: 0, muted: false });

// Anything missing, unreadable, or out of range falls back to the fresh value for that field.
export function parseSave(text) {
  let data;
  try { data = JSON.parse(text); } catch { return fresh(); }
  if (!data || typeof data !== 'object') return fresh();
  const whole = (value, min, max, fallback) => Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  return {
    night: whole(data.night, 1, NIGHTS.length, 1),
    stars: whole(data.stars, 0, MAX_STARS, 0),
    muted: data.muted === true,
  };
}

// A win unlocks the next night (never moving progress backwards); beating the last night earns a star.
export function afterWin(progress, night) {
  return {
    ...progress,
    night: Math.max(progress.night, Math.min(night + 1, NIGHTS.length)),
    stars: night >= NIGHTS.length ? Math.max(progress.stars, 1) : progress.stars,
  };
}

// Browsers can block storage (private windows, disabled site data); the game then plays without saving.
export function createSave(key = SAVE_KEYS.play, storage = () => window.localStorage) {
  let progress = fresh();
  try { progress = parseSave(storage().getItem(key)); } catch { /* play unsaved */ }
  const write = () => { try { storage().setItem(key, JSON.stringify(progress)); } catch { /* play unsaved */ } };
  return {
    get: () => ({ ...progress }),
    // Like the original, New Game starts over at Night 1 but keeps earned stars.
    newGame() { progress = { ...progress, night: 1 }; write(); },
    win(night) { progress = afterWin(progress, night); write(); },
    setMuted(muted) { progress = { ...progress, muted }; write(); },
  };
}
