import { test, expect } from "vitest";
import { EcchiGenerator } from "../src/ecchi-generator.js";
import { createEcchiServices } from "../src/ecchi-module.js";
import { EmptyFileSystem } from "langium";
import { readFile } from "fs/promises";
import { join } from "path";

test("ecchi-generator", async () => {
  const services = createEcchiServices(EmptyFileSystem);
  const generator = new EcchiGenerator(services.Ecchi);
  const content = await readFile(join(__dirname, "..", "..", "..", "resources", "Blog.ecchi"), "utf-8");
  const result = await generator.generate(content);
  expect(result).toMatchSnapshot();
});