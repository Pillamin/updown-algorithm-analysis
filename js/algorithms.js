// ─────────────────────────────────────────────
// ALGORITHMS — 5개 탐색 알고리즘 순수 함수
// 시그니처: (secret, min, max, seed?) => { steps, log[] }
// log[] 각 항목: { step, guess, result, low, high }
// ─────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function feedback(guess, secret) {
  return guess === secret ? 'correct' : guess < secret ? 'up' : 'down';
}

const ALGORITHMS = {
  sequential(secret, min, max) {
    const log = [];
    for (let g = min; g <= max; g++) {
      const result = feedback(g, secret);
      log.push({ step: log.length + 1, guess: g, result, low: g, high: max });
      if (result === 'correct') break;
    }
    return { steps: log.length, log };
  },

  binary(secret, min, max) {
    const log = [];
    let low = min, high = max;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const result = feedback(mid, secret);
      log.push({ step: log.length + 1, guess: mid, result, low, high });
      if (result === 'correct') break;
      if (result === 'up') low = mid + 1;
      else high = mid - 1;
    }
    return { steps: log.length, log };
  },

  random_no_dup(secret, min, max, seed = Date.now()) {
    const rng = seededRng(seed);
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const log = [];
    while (pool.length) {
      const idx = Math.floor(rng() * pool.length);
      const g = pool.splice(idx, 1)[0];
      const result = feedback(g, secret);
      log.push({ step: log.length + 1, guess: g, result, low: min, high: max });
      if (result === 'correct') break;
    }
    return { steps: log.length, log };
  },

  random_feedback(secret, min, max, seed = Date.now()) {
    const rng = seededRng(seed);
    const log = [];
    let low = min, high = max;
    while (true) {
      const g = Math.floor(rng() * (high - low + 1)) + low;
      const result = feedback(g, secret);
      log.push({ step: log.length + 1, guess: g, result, low, high });
      if (result === 'correct') break;
      if (result === 'up') low = g + 1;
      else high = g - 1;
      if (low > high) break;
    }
    return { steps: log.length, log };
  },

  random_pure(secret, min, max, seed = Date.now()) {
    const rng = seededRng(seed);
    const log = [];
    const LIMIT = (max - min + 1) * 10;
    while (log.length < LIMIT) {
      const g = Math.floor(rng() * (max - min + 1)) + min;
      const result = feedback(g, secret);
      log.push({ step: log.length + 1, guess: g, result, low: min, high: max });
      if (result === 'correct') break;
    }
    return { steps: log.length, log };
  },
};
