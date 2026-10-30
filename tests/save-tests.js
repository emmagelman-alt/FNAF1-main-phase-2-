import { NIGHTS } from '../src/config.js';
import { parseSave, afterWin, createSave } from '../src/save.js';

export function runSaveTests() {
  const results = [];
  const assert = (condition, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
  const same = (a, b) => assert(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} differs from ${JSON.stringify(b)}`);
  function test(name, run) { try { run(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } }
  const fresh = { night: 1, stars: 0, muted: false };
  function memoryStorage(initial = {}) {
    const items = new Map(Object.entries(initial));
    return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), items };
  }

  test('Missing, corrupted, or out-of-range saves start fresh', () => {
    for (const text of [null, '', 'not json', 'null', '42', '[]', '{"night":"3"}', '{"night":0}', `{"night":${NIGHTS.length + 1}}`, '{"night":2.5}', '{"stars":-1}', '{"stars":7}', '{"muted":"yes"}']) {
      same(parseSave(text), fresh);
    }
    same(parseSave('{"night":3,"stars":1,"muted":true,"extra":"ignored"}'), { night: 3, stars: 1, muted: true });
    same(parseSave('{"night":4,"stars":"lots"}'), { night: 4, stars: 0, muted: false });
  });
  test('Wins unlock the next night, never move progress back, and the final night earns a star', () => {
    same(afterWin(fresh, 1), { night: 2, stars: 0, muted: false });
    same(afterWin({ ...fresh, night: 4 }, 2), { night: 4, stars: 0, muted: false });
    same(afterWin({ ...fresh, night: NIGHTS.length }, NIGHTS.length), { night: NIGHTS.length, stars: 1, muted: false });
    same(afterWin({ night: NIGHTS.length, stars: 1, muted: true }, NIGHTS.length), { night: NIGHTS.length, stars: 1, muted: true });
  });
  test('Saved progress survives a reload; New Game keeps stars; mute is remembered', () => {
    const storage = memoryStorage();
    const first = createSave('key', () => storage);
    first.win(1); first.win(2); assert(createSave('key', () => storage).get().night === 3);
    first.win(NIGHTS.length); first.setMuted(true);
    const second = createSave('key', () => storage);
    same(second.get(), { night: NIGHTS.length, stars: 1, muted: true });
    second.newGame(); same(createSave('key', () => storage).get(), { night: 1, stars: 1, muted: true });
    assert(!storage.items.has('other'), 'Wrote under the wrong key');
  });
  test('Blocked storage plays unsaved instead of failing', () => {
    const blocked = () => { throw new Error('SecurityError'); };
    const save = createSave('key', blocked); save.win(1); save.setMuted(true);
    same(save.get(), { night: 2, stars: 0, muted: true });
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    const unsaved = createSave('key', () => full); unsaved.win(3); assert(unsaved.get().night === 4);
  });
  return results;
}
