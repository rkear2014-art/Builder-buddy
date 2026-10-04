import { writeFileSync } from "node:fs";
import { renderServiceWorker } from "../src/lib/pwa-cache.ts";

writeFileSync(new URL("../public/sw.js", import.meta.url), renderServiceWorker());
