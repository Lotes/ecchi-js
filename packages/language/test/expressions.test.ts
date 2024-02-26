import { describe, beforeAll } from "vitest";
import { EcchiServices } from "../src/ecchi-module.js";
import { buildDomain } from "../src/ecchi-model.js";
import { parseHelper } from "langium/test";
import { Model } from "../src/generated/ast.js";

describe("ecchi-expressions", async () => {
  //let getModel: (content: string) => Promise<Model> = undefined!;

  beforeAll(async () => {
    //const services = createEcchiServices(EmptyFileSystem);
    //getModel = getModelFactory(services.Ecchi);
  });

  //test();
});

export function getModelFactory(services: EcchiServices) {
  const parse = parseHelper<Model>(services);
  return async (content: string) => {
    const document = await parse(content);
    return buildDomain(document.parseResult.value);
  };
}