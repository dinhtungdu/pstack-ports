import { existsSync } from "node:fs";
import { join } from "node:path";

export function ensureDependenciesInstalled(): void {
  if (!existsSync(join(import.meta.dir, "node_modules/commander/package.json"))) {
    throw new Error(
      "Copy the complete scripts directory to writable task scratch and run bun install --frozen-lockfile there. Do not install into Amp's plugin cache."
    );
  }
}
