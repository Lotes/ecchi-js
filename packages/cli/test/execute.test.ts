import { expect, test } from "vitest";
import { execute } from "../src/execute.js";
import { join } from "path";

test("execute", async () => {
  const fileName = join(__dirname, "..", "..", "..", "resources", "OneType.ecchi");
  const result = await execute(fileName);
  expect(result).toMatchSnapshot();
});