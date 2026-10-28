// One-time (re-runnable) snapshot of the live API's real aggregates into a
// static JSON file, so the cinematic experience shows REAL census numbers with
// zero runtime backend dependency. Run with the API up:
//   node scripts/snapshot-census.mjs   (from apps/web, API on :8000)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = process.env.API_BASE ?? "http://localhost:8000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "census.json");

const ENDPOINTS = {
  districts: "/api/geography/districts",
  segmentation: "/api/segmentation/summary",
  infrastructure: "/api/infrastructure/summary",
  categories: "/api/categories/availability",
  brands: "/api/brands/penetration",
  sales: "/api/sales/summary",
  opportunity: "/api/opportunity/districts",
};

const out = { _meta: { source: API, generatedAt: new Date().toISOString() } };
for (const [key, path] of Object.entries(ENDPOINTS)) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  out[key] = await res.json();
  const n = Array.isArray(out[key]) ? `${out[key].length} rows` : "object";
  console.log(`✓ ${key.padEnd(15)} ${n}`);
}

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`\nWrote ${OUT}`);
