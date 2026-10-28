// Deterministic pseudo-random utilities so mock data stays stable across reloads.

export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  let a = seed
  return function random(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRandom(key: string): () => number {
  return mulberry32(hashString(key))
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.round(randRange(rng, min, max))
}

export function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}
