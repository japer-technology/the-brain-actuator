import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// From core/dist/<file>.test.js → repo root is two levels up.
const here = dirname(fileURLToPath(import.meta.url));
export const fixturesDir = join(here, "..", "..", "fixtures");

export const brainzipDir = join(fixturesDir, "brainzip-sample");
export const brzFile = join(fixturesDir, "sample.brz");
export const sqliteFile = join(fixturesDir, "sample.db");

export const HOME = "11111111-1111-1111-1111-111111111111";
export const PROJECTS = "22222222-2222-2222-2222-222222222222";
export const THELOCALBRAIN = "33333333-3333-3333-3333-333333333333";
export const ARCHIVED = "44444444-4444-4444-4444-444444444444";
