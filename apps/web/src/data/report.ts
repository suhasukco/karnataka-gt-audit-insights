// Typed accessor for the static report. The Experience reads ONLY from here —
// no backend, no queries. Numbers come from src/data/report.json, which is
// populated strictly from the brief's stated findings.
import reportJson from "./report.json";

export interface ReportCategory {
  name: string;
  /** 0..1 share of outlets carrying the category, or null until baked in. */
  penetration: number | null;
  /** 0..1 remaining whitespace, or null until baked in. */
  whitespace: number | null;
  isOpportunity: boolean;
  note?: string;
}

export interface ReportDistrict {
  name: string;
  outletShare: number;
  tier: number;
  lat: number;
  lng: number;
}

export interface Recommendation {
  title: string;
  body: string;
}

export interface Report {
  meta: { state: string; source: string; note: string };
  headline: { outlets: number; state: string; label: string };
  concentration: {
    topDistrict: string;
    topDistrictShare: number;
    insight: string;
  };
  districts: ReportDistrict[];
  categories: ReportCategory[];
  staples: { rice: { penetration: number } };
  recommendations: Recommendation[];
}

export const report = reportJson as Report;
