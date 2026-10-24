import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const ROOT_DIR = fileURLToPath(new URL("../..", import.meta.url));
export const DIST_DIR = join(ROOT_DIR, "dist");
export const PAGES_DIR = join(ROOT_DIR, "src", "pages");
