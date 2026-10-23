/* Pure training calculations, shared by the app and the Node regression tests. */
(function (root) {
  'use strict';

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function countActualIncreases(logs, exerciseId) {
    if (!Array.isArray(logs)) return 0;
    // A new *daily personal best* counts, not repeated logs or temporary deloads.
    const maxWeightByDate = new Map();
    for (const log of logs) {
      if (!log || log.type !== 'fitness' || log.exerciseId !== exerciseId ||
          !/^\d{4}-\d{2}-\d{2}$/.test(log.date || '') || !Array.isArray(log.sets)) continue;
      const topWeight = log.sets.reduce((best, set) => {
        const kg = Number(set?.kg);
        const reps = Number(set?.reps);
        return Number.isFinite(kg) && kg > 0 && Number.isFinite(reps) && reps > 0
          ? Math.max(best, kg) : best;
      }, 0);
      if (topWeight > 0) {
        maxWeightByDate.set(log.date, Math.max(topWeight, maxWeightByDate.get(log.date) || 0));
      }
    }

    let previousBest = null;
    let increases = 0;
    for (const [, weight] of [...maxWeightByDate].sort(([a], [b]) => a.localeCompare(b))) {
      if (previousBest !== null && weight > previousBest) increases += 1;
      previousBest = Math.max(previousBest ?? 0, weight);
    }
    return increases;
  }

  function parseRun({ distance, minutes, pulse }) {
    const km = positiveNumber(distance);
    const duration = positiveNumber(minutes);
    if (!km || !duration) return { error: 'Bitte Distanz und Zeit größer als 0 eintragen.' };

    const rawPulse = String(pulse ?? '').trim();
    const bpm = rawPulse ? Number(rawPulse) : null;
    if (bpm !== null && (!Number.isFinite(bpm) || bpm < 30 || bpm > 230)) {
      return { error: 'Bitte einen plausiblen Puls zwischen 30 und 230 eingeben.' };
    }
    return { distance: km, minutes: duration, pulse: bpm, pace: duration / km };
  }

  function parseBike({ distance, minutes, speed }) {
    const duration = positiveNumber(minutes);
    const km = positiveNumber(distance);
    const kmh = positiveNumber(speed);
    if (!duration || (!km && !kmh)) {
      return { error: 'Bitte eine Zeit und entweder Distanz oder Geschwindigkeit eintragen.' };
    }
    if (String(distance ?? '').trim() && !km) return { error: 'Die Distanz muss größer als 0 sein.' };
    if (String(speed ?? '').trim() && !kmh) return { error: 'Die Geschwindigkeit muss größer als 0 sein.' };

    const computedSpeed = km ? (km * 60) / duration : kmh;
    if (kmh && km && Math.abs(kmh - computedSpeed) / computedSpeed > 0.15) {
      return { error: 'Distanz, Zeit und Geschwindigkeit passen nicht zusammen. Bitte prüfen.' };
    }
    return {
      distance: km || (kmh * duration) / 60,
      minutes: duration,
      speed: kmh || computedSpeed
    };
  }

  function formatPace(minutesPerKm) {
    if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return '–';
    const totalSeconds = Math.round(minutesPerKm * 60);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  const utils = Object.freeze({ countActualIncreases, parseRun, parseBike, formatPace });
  root.FlosFitnessUtils = utils;
  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
})(typeof window !== 'undefined' ? window : globalThis);
