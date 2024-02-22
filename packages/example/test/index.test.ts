import { spawnSync } from "child_process";
import { join } from "path";
import { expect, test } from "vitest";

test("final test", () => {
  const output = spawnSync(process.execPath, [join(__dirname, '..', 'out', 'index.js')], {encoding: 'utf-8'});
  expect(output.stdout).not.toContain("undefined");
});