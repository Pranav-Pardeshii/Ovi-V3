// Emits golden values for the Python RNG port (tests/test_rng.py).
// Function bodies are copied verbatim from frontend/src/lib/rng.ts.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexN(seedStr, n) {
  let h = hash(seedStr);
  let s = '';
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    s += '0123456789ABCDEF'[h % 16];
  }
  return s;
}

const seeds = [
  'NCRP-2026-0918-4471',
  'NCRP-2026-0918-4471#m0',
  'NCRP-2026-0918-4468g',
  'TKN-test-σ',
  '',
  'OVI3',
];
for (const s of seeds) console.log('hash', JSON.stringify(s), hash(s));

for (const a of [0, 1, 42, 2166136261, 4294967295, 123456789]) {
  const g = mulberry32(a);
  const seq = Array.from({ length: 6 }, () => g().toFixed(12));
  console.log('mulberry32', a, seq.join(','));
}

for (const [s, n] of [
  ['NCRP-2026-0918-4471#m0a', 4],
  ['NCRP-2026-0918-4471#m0b', 4],
  ['NCRP-2026-0918-4471blk', 16],
  ['NCRP-2026-0918-4471|rep|1758187800000', 20],
  ['', 8],
]) {
  console.log('hexN', JSON.stringify(s), n, hexN(s, n));
}
