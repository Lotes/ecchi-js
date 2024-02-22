import { spawnSync } from "node:child_process";

export function execute(fileName: string|undefined) {
  if (!fileName) {
    console.error("No filename provided");
    return;
  }
  const mainFile = require.resolve("@ecchi-js/language");
  const args = [mainFile, fileName].map((s) => s.replace(/\\/g, "/"));
  const output = spawnSync(process.execPath, args, { encoding: "utf8" });
  return output.stdout;
}
