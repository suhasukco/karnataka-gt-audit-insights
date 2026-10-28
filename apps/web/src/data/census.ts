// Typed accessor for the static census snapshot (scripts/snapshot-census.mjs).
// Real aggregates frozen from the API, for rendering with no runtime backend.
// Types are reused from the live API client so the shapes stay in sync.
// NOTE: unused since the cinematic experience was removed (2026-08-18) — kept
// as the only backend-free snapshot of the census. Safe to delete if unwanted.
import raw from "./census.json";
import type {
  DistrictGeo,
  SegmentationSummary,
  InfraSummary,
  CategoryAvailability,
  BrandPenetration,
  SalesSummary,
  OpportunityDistrict,
} from "@/lib/liveApi";

export interface Census {
  _meta: { source: string; generatedAt: string };
  districts: DistrictGeo[];
  segmentation: SegmentationSummary;
  infrastructure: InfraSummary;
  categories: CategoryAvailability[];
  brands: BrandPenetration;
  sales: SalesSummary;
  opportunity: OpportunityDistrict[];
}

export const census = raw as unknown as Census;
