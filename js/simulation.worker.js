// ─────────────────────────────────────────────
// SIMULATION WEB WORKER
// 메시지 in:  { runs, seed, algoIds, min, max }
// 메시지 out: { type:'progress'|'done', payload }
// ─────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function fb(g, s) { return g === s ? 0 : g < s ? 1 : -1; }

const ALGOS = {
  sequential: (secret, min, max) => {
    let i = min;
    while (i < secret) i++;
    return secret - min + 1;
  },
  binary: (secret, min, max) => {
    let lo = min, hi = max, steps = 0;
    while (lo <= hi) {
      steps++;
      const mid = (lo + hi) >> 1;
      if (mid === secret) break;
      if (mid < secret) lo = mid + 1; else hi = mid - 1;
    }
    return steps;
  },
  random_no_dup: (secret, min, max, rng) => {
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    let steps = 0;
    while (pool.length) {
      const idx = Math.floor(rng() * pool.length);
      const g = pool.splice(idx, 1)[0];
      steps++;
      if (g === secret) break;
    }
    return steps;
  },
  random_feedback: (secret, min, max, rng) => {
    let lo = min, hi = max, steps = 0;
    while (true) {
      const g = Math.floor(rng() * (hi - lo + 1)) + lo;
      steps++;
      const r = fb(g, secret);
      if (r === 0) break;
      if (r === 1) lo = g + 1; else hi = g - 1;
      if (lo > hi) break;
    }
    return steps;
  },
  random_pure: (secret, min, max, rng) => {
    const LIMIT = (max - min + 1) * 10;
    let steps = 0;
    while (steps < LIMIT) {
      const g = Math.floor(rng() * (max - min + 1)) + min;
      steps++;
      if (g === secret) break;
    }
    return steps;
  },
};

self.onmessage = ({ data }) => {
  const { runs, seed, algoIds, min, max } = data;
  const stats = {};
  algoIds.forEach(id => { stats[id] = { min: Infinity, max: 0, sum: 0, count: 0 }; });

  const CHUNK = 500;
  const rng = seededRng(seed);

  function processChunk(start) {
    const end = Math.min(start + CHUNK, runs);
    for (let i = start; i < end; i++) {
      const secret = Math.floor(rng() * (max - min + 1)) + min;
      const iterSeed = (seed + i * 6364136223846793005) | 0;
      algoIds.forEach(id => {
        const algoRng = seededRng(iterSeed ^ id.charCodeAt(0));
        const s = ALGOS[id](secret, min, max, algoRng);
        const st = stats[id];
        if (s < st.min) st.min = s;
        if (s > st.max) st.max = s;
        st.sum += s;
        st.count++;
      });
    }
    const progress = Math.round((end / runs) * 100);
    self.postMessage({ type: 'progress', payload: { progress, done: end } });
    if (end < runs) setTimeout(() => processChunk(end), 0);
    else {
      const result = {};
      algoIds.forEach(id => {
        const st = stats[id];
        result[id] = { min: st.min, max: st.max, avg: +(st.sum / st.count).toFixed(2) };
      });
      self.postMessage({ type: 'done', payload: result });
    }
  }

  processChunk(0);
};
