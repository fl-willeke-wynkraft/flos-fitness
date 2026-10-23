const assert = require('node:assert/strict');
const { countActualIncreases, parseRun, parseBike, formatPace } = require('../fitness-utils.js');

const fitness = (date, kg) => ({ type: 'fitness', date, exerciseId: 'bd', sets: [{ kg, reps: 10 }] });
assert.equal(countActualIncreases([
  fitness('2026-10-05', 20),
  fitness('2026-10-02', 15),
  fitness('2026-10-03', 20),
  fitness('2026-10-04', 18),
  fitness('2026-10-05', 22)
], 'bd'), 2, 'Repeated daily logs should be deduplicated');
assert.equal(countActualIncreases([], 'bd'), 0);
assert.equal(countActualIncreases([fitness('2026-10-02', 20)], 'bd'), 0);
assert.equal(parseRun({ distance: '0', minutes: 20 }).error !== undefined, true);
assert.equal(parseRun({ distance: '4', minutes: '20', pulse: '' }).pace, 5);
assert.equal(parseRun({ distance: 4, minutes: 20, pulse: '250' }).error !== undefined, true);
assert.equal(parseBike({ distance: 20, minutes: 40, speed: '' }).speed, 30);
assert.equal(parseBike({ distance: '', minutes: 30, speed: 20 }).distance, 10);
assert.equal(parseBike({ distance: 20, minutes: 30, speed: 10 }).error !== undefined, true);
assert.equal(parseBike({ distance: 0, minutes: 0, speed: 10 }).error !== undefined, true);
assert.equal(formatPace(4 + 59.9 / 60), '5:00');
console.log('All Flo Fitness regression tests passed.');
