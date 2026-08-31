import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const prettierBinary = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prettier.cmd" : "prettier"
);

if (!existsSync(prettierBinary)) {
  process.exit(0);
}

const result = spawnSync(prettierBinary, ["--write", "src/generated/prisma"], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
