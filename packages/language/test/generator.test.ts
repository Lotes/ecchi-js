import { test, expect, describe, beforeAll } from "vitest";
import { EcchiGenerator } from "../src/ecchi-generator.js";
import { createEcchiServices } from "../src/ecchi-module.js";
import { EmptyFileSystem } from "langium";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

describe("ecchi-generator", async () => {
  let generator: EcchiGenerator;
  beforeAll(async () => {
    const services = createEcchiServices(EmptyFileSystem);
    generator = new EcchiGenerator(services.Ecchi);
  });

  test("blog", async () => {
    const content = await readFile(join(__dirname, "..", "..", "..", "resources", "Blog.ecchi"), "utf-8");
    const model = await generator.parse(content);
    const pkg = await generator.build(model);
    const result = await generator.generate(pkg);
    expect(result).toMatchSnapshot();
  });

  test.only("conditions", async () => {
    const content = await readFile(join(__dirname, "..", "..", "..", "resources", "Conditions.ecchi"), "utf-8");
    const model = await generator.parse(content);
    const pkg = await generator.build(model);
    const result = await generator.generate(pkg);
    writeFile("conditions.txt", result);
  });
});