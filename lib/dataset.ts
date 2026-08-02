import { buildDataset } from "./factory";
import type { HrDataset } from "./types";

// Build the relational dataset exactly once (module singleton). Deterministic,
// so server and client render identical data. Replace with an async fetch to
// FastAPI / Azure SQL later.
export const DATASET: HrDataset = buildDataset();
